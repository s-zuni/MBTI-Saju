"""
Google Sheet 기반 30일 무중복 Threads 게시 계획 로더 및 발행 완료 상태 업데이터.

1. 기본 대상 시트: 1Ty-mQNQYD0lS6xFXx66Jn3ML54V583tDHURoX5VXWnc / 탭: '30일_게시계획'
2. 읽기 우선순위:
   - GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_OAUTH_TOKEN_JSON / token.json 기반 Sheets API v4
   - 인증 미설정 또는 권한 부족 시 링크 공개 GViz CSV 엔드포인트 자동 폴백
3. 발행 후(가능한 인증이 있는 경우):
   - 해당 행의 '상태' = '발행완료', '게시일시', '스레드 링크' 자동 기록
"""
import csv
import datetime
import io
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote

import requests

DEFAULT_THREADS_SHEET_ID = "1Ty-mQNQYD0lS6xFXx66Jn3ML54V583tDHURoX5VXWnc"
DEFAULT_THREADS_SHEET_TAB = "30일_게시계획"
PROJECT_ROOT = Path(__file__).resolve().parent.parent

SHEETS_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_DONE_STATUSES = {"발행완료", "완료", "published", "done", "posted"}
_SKIP_STATUSES = {"건너뜀", "스킵", "skip", "skipped", "hold", "보류"}


@dataclass
class ScheduledSheetPost:
    row_number: int  # 1-based sheet row
    day_label: str
    scheduled_date: str
    slot: str
    category: str
    topic_tag: str
    status: str
    posts: List[str]
    cta_kind: str
    has_cta: bool
    col_map: Dict[str, int]


def get_kst_today_str(now: Optional[datetime.datetime] = None) -> str:
    if now is None:
        try:
            import zoneinfo
            now = datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Seoul"))
        except Exception:
            now = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    return now.date().isoformat()


def get_kst_timestamp_str(now: Optional[datetime.datetime] = None) -> str:
    if now is None:
        try:
            import zoneinfo
            now = datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Seoul"))
        except Exception:
            now = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    return now.strftime("%Y-%m-%d %H:%M KST")


def extract_bracket_title(text: str) -> str:
    first_line = (text or "").strip().splitlines()[0].strip() if (text or "").strip() else ""
    m = re.match(r"^<([^<>]+)>$", first_line)
    if m:
        return m.group(1).strip()
    return first_line.strip("<>").strip()


def _normalize_for_dedup(text: str) -> str:
    return re.sub(r"[\s<>\"'·.,!?]+", "", (text or "").lower())


def _col_index_to_letter(idx: int) -> str:
    res = ""
    n = idx + 1
    while n > 0:
        n, rem = divmod(n - 1, 26)
        res = chr(65 + rem) + res
    return res


def _load_sheets_credentials():
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if sa_json:
        try:
            from google.oauth2.service_account import Credentials as SACredentials
            info = json.loads(sa_json)
            return SACredentials.from_service_account_info(info, scopes=SHEETS_SCOPES)
        except Exception:
            pass

    token_json = os.getenv("GOOGLE_OAUTH_TOKEN_JSON", "").strip()
    token_path = os.getenv("GOOGLE_OAUTH_TOKEN_PATH", "").strip() or str(PROJECT_ROOT / "token.json")
    try:
        from google.oauth2.credentials import Credentials as UserCredentials
        from google.auth.transport.requests import Request
        creds = None
        if token_json:
            creds = UserCredentials.from_authorized_user_info(json.loads(token_json), scopes=SHEETS_SCOPES)
        elif os.path.isfile(token_path):
            creds = UserCredentials.from_authorized_user_file(token_path, scopes=SHEETS_SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        return creds
    except Exception:
        return None


def fetch_sheet_values(
    sheet_id: Optional[str] = None,
    tab_name: Optional[str] = None,
) -> List[List[str]]:
    sid = (sheet_id or os.getenv("THREADS_SHEET_ID") or DEFAULT_THREADS_SHEET_ID).strip()
    tab = (tab_name or os.getenv("THREADS_SHEET_TAB") or DEFAULT_THREADS_SHEET_TAB).strip()

    creds = _load_sheets_credentials()
    if creds is not None:
        try:
            from googleapiclient.discovery import build
            svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
            resp = svc.spreadsheets().values().get(
                spreadsheetId=sid,
                range=f"'{tab}'!A:M",
            ).execute()
            values = resp.get("values", [])
            if values:
                return values
        except Exception as e:
            print(f"[SHEET][INFO] Sheets API 조회 건너뜀 (공개 CSV로 전환): {e}")

    csv_url = (
        f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq"
        f"?tqx=out:csv&headers=1&sheet={quote(tab)}"
    )
    res = requests.get(csv_url, timeout=15)
    if not res.ok:
        raise RuntimeError(f"구글 시트 CSV 조회 실패: HTTP {res.status_code}")

    raw_text = res.content.decode("utf-8-sig", errors="replace")
    if raw_text.lstrip().lower().startswith("<!doctype") or raw_text.lstrip().lower().startswith("<html"):
        raise RuntimeError("구글 시트가 비공개 상태이거나 인증 페이지가 반환되었습니다.")

    reader = csv.reader(io.StringIO(raw_text))
    return [row for row in reader]


def _resolve_columns(header_row: List[str]) -> Dict[str, int]:
    col_map: Dict[str, int] = {}
    for idx, cell in enumerate(header_row):
        h = (cell or "").strip()
        if not h:
            continue
        if h.lower() == "day" or "day" in h.lower().split():
            col_map["day"] = idx
        elif "예정일" in h or "날짜" in h:
            col_map["date"] = idx
        elif "슬롯" in h:
            col_map["slot"] = idx
        elif "카테고리" in h or "주제" in h:
            col_map["category"] = idx
        elif "토픽" in h or "태그" in h:
            col_map["tag"] = idx
        elif "상태" in h:
            col_map["status"] = idx
        elif "본문" in h:
            col_map["main"] = idx
        elif "답글 1" in h or h == "답글1":
            col_map["r1"] = idx
        elif "답글 2" in h or h == "답글2":
            col_map["r2"] = idx
        elif "답글 3" in h or h == "답글3":
            col_map["r3"] = idx
        elif "CTA" in h.upper():
            col_map["cta_kind"] = idx
        elif "게시일시" in h:
            col_map["published_at"] = idx
        elif "링크" in h:
            col_map["permalink"] = idx
    return col_map


def _get_cell(row: List[str], col_map: Dict[str, int], key: str) -> str:
    idx = col_map.get(key)
    if idx is None or idx >= len(row):
        return ""
    return (row[idx] or "").strip()


def parse_scheduled_posts(values: List[List[str]]) -> List[ScheduledSheetPost]:
    from pipeline.threads_content import _clean_post, _ensure_bracket_title, _sanitize_tag

    header_idx = None
    col_map: Dict[str, int] = {}
    for idx, row in enumerate(values):
        resolved = _resolve_columns(row)
        if "main" in resolved and "slot" in resolved:
            header_idx = idx
            col_map = resolved
            break

    if header_idx is None:
        return []

    parsed: List[ScheduledSheetPost] = []
    for r_idx in range(header_idx + 1, len(values)):
        row = values[r_idx]
        if not row or not any((c or "").strip() for c in row):
            continue

        main_raw = _get_cell(row, col_map, "main")
        if not main_raw:
            continue

        posts: List[str] = [_ensure_bracket_title(_clean_post(main_raw))]
        for r_key in ("r1", "r2", "r3"):
            r_raw = _get_cell(row, col_map, r_key)
            if r_raw:
                cleaned_r = _clean_post(r_raw)
                if cleaned_r:
                    posts.append(cleaned_r)

        cta_kind = _get_cell(row, col_map, "cta_kind")
        r3_raw = _get_cell(row, col_map, "r3")
        has_cta = bool(r3_raw) or (bool(cta_kind) and cta_kind not in ("없음", "none", "-"))
        category = _get_cell(row, col_map, "category") or "사주"
        tag = _sanitize_tag(_get_cell(row, col_map, "tag")) or category

        parsed.append(
            ScheduledSheetPost(
                row_number=r_idx + 1,
                day_label=_get_cell(row, col_map, "day"),
                scheduled_date=_get_cell(row, col_map, "date"),
                slot=_get_cell(row, col_map, "slot").lower(),
                category=category,
                topic_tag=tag,
                status=_get_cell(row, col_map, "status"),
                posts=posts,
                cta_kind=cta_kind or "없음",
                has_cta=has_cta,
                col_map=col_map,
            )
        )
    return parsed


def _is_already_published(post: ScheduledSheetPost, recent_published_texts: List[str]) -> bool:
    if not recent_published_texts:
        return False
    title_norm = _normalize_for_dedup(extract_bracket_title(post.posts[0]))
    if len(title_norm) < 4:
        return False
    for recent in recent_published_texts:
        recent_norm = _normalize_for_dedup(recent)
        if title_norm in recent_norm:
            return True
    return False


def select_post_from_sheet(
    rows: List[ScheduledSheetPost],
    slot: str,
    today_kst: Optional[str] = None,
    recent_published_texts: Optional[List[str]] = None,
    category: Optional[str] = None,
) -> Optional[ScheduledSheetPost]:
    today_str = today_kst or get_kst_today_str()
    recent = recent_published_texts or []

    def eligible(row: ScheduledSheetPost) -> bool:
        st = (row.status or "").strip().lower()
        if st in _DONE_STATUSES or st in _SKIP_STATUSES:
            return False
        if category and row.category != category:
            return False
        if _is_already_published(row, recent):
            return False
        return True

    # 1순위: 오늘 날짜 + 현재 슬롯 정확 일치
    for row in rows:
        if row.scheduled_date == today_str and row.slot == slot and eligible(row):
            return row

    # 2순위: 같은 슬롯 중 아직 게시되지 않은 가장 앞선 대기 글
    for row in rows:
        if row.slot == slot and eligible(row):
            return row

    return None


def mark_sheet_row_published(
    post: ScheduledSheetPost,
    permalink: str = "",
    published_at_kst: Optional[str] = None,
    sheet_id: Optional[str] = None,
    tab_name: Optional[str] = None,
) -> bool:
    creds = _load_sheets_credentials()
    if creds is None:
        print("[SHEET][INFO] 쓰기 인증 정보가 없어 시트 상태('발행완료') 자동 기록을 건너뜁니다.")
        return False

    sid = (sheet_id or os.getenv("THREADS_SHEET_ID") or DEFAULT_THREADS_SHEET_ID).strip()
    tab = (tab_name or os.getenv("THREADS_SHEET_TAB") or DEFAULT_THREADS_SHEET_TAB).strip()
    ts = published_at_kst or get_kst_timestamp_str()

    updates = []
    for key, value in (
        ("status", "발행완료"),
        ("published_at", ts),
        ("permalink", permalink or ""),
    ):
        col_idx = post.col_map.get(key)
        if col_idx is not None:
            col_letter = _col_index_to_letter(col_idx)
            updates.append({
                "range": f"'{tab}'!{col_letter}{post.row_number}",
                "values": [[value]],
            })

    if not updates:
        return False

    try:
        from googleapiclient.discovery import build
        svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
        svc.spreadsheets().values().batchUpdate(
            spreadsheetId=sid,
            body={"valueInputOption": "USER_ENTERED", "data": updates},
        ).execute()
        print(f"[SHEET] ✅ {post.day_label or f'Row {post.row_number}'} '발행완료' 상태 기록 완료")
        return True
    except Exception as e:
        print(f"[SHEET][WARN] 시트 상태 기록 실패 (발행 자체는 정상 완료됨): {e}")
        return False


def count_pending_posts(
    rows: List[ScheduledSheetPost],
    recent_published_texts: Optional[List[str]] = None,
    slot: Optional[str] = None,
    category: Optional[str] = None,
) -> int:
    """아직 발행되지 않은(상태 대기/미완료 + 최근 발행 중복 제외) 글 개수를 반환합니다."""
    recent = recent_published_texts or []
    count = 0
    for row in rows:
        st = (row.status or "").strip().lower()
        if st in _DONE_STATUSES or st in _SKIP_STATUSES:
            continue
        if slot and row.slot != slot:
            continue
        if category and row.category != category:
            continue
        if _is_already_published(row, recent):
            continue
        count += 1
    return count


def load_sheet_rows(
    sheet_id: Optional[str] = None,
    tab_name: Optional[str] = None,
) -> List[ScheduledSheetPost]:
    values = fetch_sheet_values(sheet_id=sheet_id, tab_name=tab_name)
    return parse_scheduled_posts(values)


def load_and_pick_scheduled_post(
    slot: str,
    category: Optional[str] = None,
    recent_published_texts: Optional[List[str]] = None,
    sheet_id: Optional[str] = None,
    tab_name: Optional[str] = None,
    today_kst: Optional[str] = None,
) -> Optional[ScheduledSheetPost]:
    rows = load_sheet_rows(sheet_id=sheet_id, tab_name=tab_name)
    return select_post_from_sheet(
        rows=rows,
        slot=slot,
        today_kst=today_kst,
        recent_published_texts=recent_published_texts,
        category=category,
    )
