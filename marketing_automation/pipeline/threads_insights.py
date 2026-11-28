"""
Threads 게시글 성과 수집 & 리포트.

- GET /{user_id}/threads 로 최근 본문 글 목록을 받고, 글마다 GET /{id}/insights
  (views, likes, replies, reposts, quotes, shares)를 조회합니다.
- GitHub Actions에서는 state.db가 매번 사라지므로, 결과는 같은 구글 시트의 별도 탭
  ('인사이트', THREADS_INSIGHTS_TAB 로 변경 가능)에 통째로 덮어씁니다. 게시 계획 탭(A:O)은 건드리지 않습니다.
- --telegram 을 주면 조회수 중앙값 대비 배수 기준 상위/하위 글을 텔레그램으로 보냅니다.

필요 권한: Threads 토큰에 threads_manage_insights 스코프.

사용:
  python -m pipeline.threads_insights                 # 콘솔 리포트만
  python -m pipeline.threads_insights --sheet         # 인사이트 탭 갱신
  python -m pipeline.threads_insights --sheet --telegram --days 30
"""
import argparse
import datetime
import os
import re
import statistics
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from pipeline.threads_publisher import _url, clean_token  # noqa: E402

METRICS = ("views", "likes", "replies", "reposts", "quotes", "shares")
DEFAULT_INSIGHTS_TAB = "인사이트"
HEADER = [
    "게시시각(KST)", "제목", "카테고리추정", "조회", "좋아요", "답글", "리포스트", "인용", "공유",
    "참여율(%)", "조회 중앙값 대비(배)", "링크", "post_id", "수집시각(KST)",
]
KST = datetime.timezone(datetime.timedelta(hours=9))


def _token() -> str:
    return clean_token(os.getenv("THREADS_ACCESS_TOKEN", ""))


def fetch_threads(days: int = 30, max_posts: int = 300) -> List[Dict[str, Any]]:
    """최근 days일 이내 본문 글 목록 (페이지네이션)."""
    uid, token = os.getenv("THREADS_USER_ID", ""), _token()
    if not uid or not token:
        raise RuntimeError("THREADS_USER_ID / THREADS_ACCESS_TOKEN 이 필요합니다.")
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    url = _url(f"{uid}/threads")
    params: Optional[Dict[str, Any]] = {
        "fields": "id,text,timestamp,permalink,media_type", "limit": 100, "access_token": token,
    }
    out: List[Dict[str, Any]] = []
    while url and len(out) < max_posts:
        res = requests.get(url, params=params, timeout=20)
        if not res.ok:
            raise RuntimeError(f"글 목록 조회 실패: HTTP {res.status_code} {res.text[:200]}")
        body = res.json()
        stop = False
        for p in body.get("data", []):
            ts = datetime.datetime.fromisoformat(p["timestamp"].replace("+0000", "+00:00"))
            if ts < since:
                stop = True
                break
            out.append(p)
        if stop:
            break
        url = (body.get("paging") or {}).get("next")
        params = None  # next URL에 쿼리가 포함됨
    return out


def fetch_insights(post_id: str) -> Dict[str, int]:
    res = requests.get(
        _url(f"{post_id}/insights"),
        params={"metric": ",".join(METRICS), "access_token": _token()},
        timeout=15,
    )
    if not res.ok:
        raise RuntimeError(f"인사이트 조회 실패({post_id}): HTTP {res.status_code} {res.text[:200]}")
    vals: Dict[str, int] = {}
    for m in res.json().get("data", []):
        if m.get("values"):
            vals[m["name"]] = int(m["values"][0].get("value") or 0)
        else:
            vals[m["name"]] = int((m.get("total_value") or {}).get("value") or 0)
    return {k: vals.get(k, 0) for k in METRICS}


def _title(text: str) -> str:
    text = (text or "").strip()
    m = re.match(r"<([^>]{2,80})>", text)
    if m:
        return m.group(1).strip()
    return text.split("\n", 1)[0][:60]


def _guess_category(text: str) -> str:
    t = text or ""
    if "메이트" in t or "말랑" in t:
        return "사주메이트"
    if re.search(r"\b[EI][NS][FT][JP]\b", t) or "MBTI" in t.upper():
        return "MBTI"
    if "타로" in t:
        return "타로"
    if "자미두수" in t:
        return "자미두수"
    return "사주/운세"


def collect(days: int = 30) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for p in fetch_threads(days=days):
        try:
            ins = fetch_insights(p["id"])
        except RuntimeError as e:
            print(f"[THREADS-INSIGHTS][WARN] {e}")
            continue
        ts = datetime.datetime.fromisoformat(p["timestamp"].replace("+0000", "+00:00")).astimezone(KST)
        eng = ins["likes"] + ins["replies"] + ins["reposts"] + ins["quotes"] + ins["shares"]
        rows.append({
            "id": p["id"],
            "ts": ts,
            "title": _title(p.get("text", "")),
            "category": _guess_category(p.get("text", "")),
            "permalink": p.get("permalink", ""),
            **ins,
            "eng_rate": round(eng / ins["views"] * 100, 2) if ins["views"] else 0.0,
        })
    med = statistics.median([r["views"] for r in rows]) if rows else 0
    for r in rows:
        r["x_median"] = round(r["views"] / med, 1) if med else 0.0
    rows.sort(key=lambda r: r["ts"], reverse=True)
    return rows


def summarize(rows: List[Dict[str, Any]]) -> str:
    if not rows:
        return "수집된 글이 없습니다."
    views = [r["views"] for r in rows]
    med = statistics.median(views)
    lines = [
        f"글 {len(rows)}개 | 조회 합계 {sum(views):,} | 중앙값 {med:,.0f} | 최고 {max(views):,}",
        "",
        "[상위 5 — 중앙값 대비]",
    ]
    for r in sorted(rows, key=lambda r: r["views"], reverse=True)[:5]:
        lines.append(f"{r['x_median']:>6}배 {r['views']:>8,}  {r['ts']:%m/%d %H시} [{r['category']}] {r['title']}")
    lines += ["", "[카테고리별 조회 중앙값]"]
    cats: Dict[str, List[int]] = {}
    for r in rows:
        cats.setdefault(r["category"], []).append(r["views"])
    for c, v in sorted(cats.items(), key=lambda kv: -statistics.median(kv[1])):
        lines.append(f"{c:<8} {statistics.median(v):>8,.0f} (n={len(v)})")
    lines += ["", "[시간대별 조회 중앙값]"]
    slots: Dict[str, List[int]] = {}
    for r in rows:
        h = r["ts"].hour
        s = "아침(5-11)" if 5 <= h < 11 else "오후(11-17)" if 11 <= h < 17 else "저녁/밤(17-5)"
        slots.setdefault(s, []).append(r["views"])
    for s, v in slots.items():
        lines.append(f"{s:<12} {statistics.median(v):>8,.0f} (n={len(v)})")
    return "\n".join(lines)


def write_sheet(rows: List[Dict[str, Any]], tab_name: Optional[str] = None, sheet_id: Optional[str] = None) -> int:
    from pipeline.threads_sheet import DEFAULT_THREADS_SHEET_ID, _load_sheets_credentials
    from googleapiclient.discovery import build

    creds = _load_sheets_credentials()
    if creds is None:
        raise RuntimeError("구글 시트 인증 정보가 없습니다.")
    sid = (sheet_id or os.getenv("THREADS_SHEET_ID") or DEFAULT_THREADS_SHEET_ID).strip()
    tab = (tab_name or os.getenv("THREADS_INSIGHTS_TAB") or DEFAULT_INSIGHTS_TAB).strip()
    svc = build("sheets", "v4", credentials=creds, cache_discovery=False)

    meta = svc.spreadsheets().get(spreadsheetId=sid, fields="sheets.properties.title").execute()
    titles = {s["properties"]["title"] for s in meta.get("sheets", [])}
    if tab not in titles:
        svc.spreadsheets().batchUpdate(
            spreadsheetId=sid, body={"requests": [{"addSheet": {"properties": {"title": tab}}}]}
        ).execute()

    now = datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    values = [HEADER] + [_row_values(r, now) for r in rows]
    svc.spreadsheets().values().clear(spreadsheetId=sid, range=f"'{tab}'!A:N").execute()
    svc.spreadsheets().values().update(
        spreadsheetId=sid, range=f"'{tab}'!A1", valueInputOption="RAW", body={"values": values}
    ).execute()
    return len(rows)


def _row_values(r: Dict[str, Any], now: str) -> List[Any]:
    return [
        f"{r['ts']:%Y-%m-%d %H:%M}", r["title"], r["category"], r["views"], r["likes"], r["replies"],
        r["reposts"], r["quotes"], r["shares"], r["eng_rate"], r["x_median"], r["permalink"], r["id"], now,
    ]


def write_csv(rows: List[Dict[str, Any]], path: str) -> None:
    import csv
    now = datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        w.writerows(_row_values(r, now) for r in rows)


def send_telegram(text: str) -> None:
    token, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat:
        print("[THREADS-INSIGHTS] 텔레그램 설정 없음, 전송 생략")
        return
    requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat, "text": f"[Threads 성과 리포트]\n\n{text}"[:4000]},
        timeout=15,
    )


def main() -> None:
    from dotenv import load_dotenv
    load_dotenv()
    ap = argparse.ArgumentParser(description="Threads 성과 수집")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--sheet", action="store_true", help="구글 시트 인사이트 탭에 덮어쓰기")
    ap.add_argument("--telegram", action="store_true")
    ap.add_argument("--csv", type=str, default="", help="결과를 CSV 파일로도 저장 (시트 인증이 없는 로컬용)")
    args = ap.parse_args()

    rows = collect(days=args.days)
    report = summarize(rows)
    print(report)
    if args.csv:
        write_csv(rows, args.csv)
        print(f"\n[THREADS-INSIGHTS] CSV 저장: {args.csv}")
    if args.sheet:
        try:
            n = write_sheet(rows)
            print(f"\n[THREADS-INSIGHTS] 시트 '{os.getenv('THREADS_INSIGHTS_TAB') or DEFAULT_INSIGHTS_TAB}' 탭에 {n}행 기록")
        except Exception as e:
            print(f"\n[THREADS-INSIGHTS][WARN] 시트 기록 실패: {e}")
    if args.telegram:
        send_telegram(report)


if __name__ == "__main__":
    main()
