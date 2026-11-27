"""
구글 시트(30일_게시계획) 소진 시 새로운 30일치(90행) Threads 게시 계획을
자동 생성하여 시트에 이어쓰는 모듈.

설계 원칙:
1. 30일 = 90행 (매일 morning / afternoon / evening 3슬롯), 15컬럼(A:O, 이미지 URL·위치 포함).
2. 카테고리 비중: 사주 60%(54) / MBTI 20%(18) / 운세 20%(18: 타로 3택 6, 자미두수 6, 일반 운세 6).
3. CTA & 이미지 정책 (무료 분석 중심, 가격 표기 0건):
   - 직접 링크 댓글(URL 포함): 매일 evening 1회 (30일당 정확히 30회 유지) — 무료 만세력/카톡 1:1 질문 1개 무료/3년 점수표 무료 미리보기/무료 오늘의 운세/말랑 사주 메이트 무료 미리보기.
   - 간접 유도 댓글(URL 없음): morning/afternoon 60행 중 48행(80%) — '프로필에서 무료 만세력 분석 하고 가' / '카톡 1:1 질문 1개 무료' 계열.
   - 순수 무CTA('없음'): 나머지 12행.
   - 이미지 배치: 신규 치이카와 감성 '말랑 사주 메이트' 글(30일당 6편)은 **본문**에 캐릭터 사진 첨부, 나머지 CTA 답글이 있는 행은 **CTA** 답글에 실제 서비스 이미지 첨부.
   - 폐지 정책('크레딧', '가입 무료', '첫 분석 무료', '회원가입 필수')·가격('원')·이모지·존댓말·한자·해시태그 절대 금지.
4. 무중복 보장: 기존 시트의 모든 제목 + 이미 생성된 배치 제목과 정규화 대조하여 중복 제거.
"""
import datetime
import os
import re
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Sequence, Tuple

from pydantic import BaseModel, Field

from pipeline.script_gen import generate_json
from pipeline.threads_content import (
    STYLE_GUIDE,
    _clean_post,
    _ensure_bracket_title,
    _has_polite_ending,
    _sanitize_tag,
)
from pipeline.threads_sheet import (
    DEFAULT_THREADS_SHEET_ID,
    DEFAULT_THREADS_SHEET_TAB,
    ScheduledSheetPost,
    _load_sheets_credentials,
    _normalize_for_dedup,
    count_pending_posts,
    extract_bracket_title,
    get_kst_today_str,
    load_sheet_rows,
)

DEFAULT_REFILL_DAYS = 30
BATCH_DAYS = 5  # 5일(15개) x 6배치 = 30일(90개)

BASE_SITE = "https://www.mbtiju.com"

SAJU_MATE_IMAGE_SETS: List[List[str]] = [
    [f"{BASE_SITE}/images/saju-mates/mochi.jpg", f"{BASE_SITE}/images/saju-mates/bory.jpg", f"{BASE_SITE}/images/saju-mates/ttokki.jpg"],
    [f"{BASE_SITE}/images/saju-mates/yuzu.jpg", f"{BASE_SITE}/images/saju-mates/dori.jpg"],
    [f"{BASE_SITE}/images/saju-mates/horang.jpg", f"{BASE_SITE}/images/saju-mates/sori.jpg"],
    [f"{BASE_SITE}/images/saju-mates/maru.jpg", f"{BASE_SITE}/images/saju-mates/poni.jpg"],
    [f"{BASE_SITE}/images/saju-mates/mochi.jpg", f"{BASE_SITE}/images/saju-mates/horang.jpg", f"{BASE_SITE}/images/saju-mates/yuzu.jpg"],
    [f"{BASE_SITE}/images/saju-mates/bory.jpg", f"{BASE_SITE}/images/saju-mates/dori.jpg", f"{BASE_SITE}/images/saju-mates/poni.jpg"],
]

SERVICE_CTA_IMAGES = {
    "natal": f"{BASE_SITE}/assets/premium/report-natal.jpg",
    "year": f"{BASE_SITE}/assets/premium/report-year.jpg",
    "summary": f"{BASE_SITE}/assets/premium/report-summary.jpg",
    "map": f"{BASE_SITE}/assets/premium/report-map.jpg",
    "cover": f"{BASE_SITE}/assets/premium/report-cover.jpg",
    "og": f"{BASE_SITE}/og-image.png",
}

_BANNED_PHRASES = (
    "크레딧",
    "가입 무료",
    "첫 분석 무료",
    "회원가입 필수",
    "1,000만",
    "만족도 99",
    "실시간 상담",
)

# 5일 단위 순환 패턴 (6회 반복 = 30일, 90행)
# 합계(5일당 15행): 사주 9 (60%), MBTI 3 (20%), 운세 3 (20%: 타로 1, 자미두수 1, 운세 1)
# 매 5일 중 1편(offset 3 morning)은 말랑 사주 메이트(치이카와 감성) 본문 이미지 전용 슬롯 -> 30일 6편
# CTA 모드(5일당 15행): evening 5개 direct, morning/afternoon 10개 중 8개 indirect + 2개 none
_FIVE_DAY_PATTERN: List[List[Tuple[str, str, str, str, str, bool]]] = [
    # offset 0: (slot, category, topic_tag, format_hint, cta_mode, is_mate)
    [
        ("morning", "사주", "사주", "일간/십성/신살 기반 직장·인간관계 팩폭 단독 글", "indirect", False),
        ("afternoon", "MBTI", "MBTI", "같은 MBTI라도 사주 기질에 따라 갈리는 반전 또는 연애 속마음 비교 단독 글", "indirect", False),
        ("evening", "사주", "사주", "재회·이별·썸·연애 사주 급소 고민 처방 단독 글", "direct", False),
    ],
    # offset 1
    [
        ("morning", "사주", "사주", "재물운·돈 습관·사업/창업/이직 사주 팩폭 단독 글", "indirect", False),
        ("afternoon", "운세", "타로", "타로 3택 선택형 글 (본문에 1번/2번/3번 선택지, reply1에 1번 해석, reply2에 2번·3번 해석)", "indirect", False),
        ("evening", "사주", "사주", "대운·내년 흐름·3년 전환기 징조 사주 단독 글", "direct", False),
    ],
    # offset 2
    [
        ("morning", "사주", "사주", "특정 일간(갑을병정무기경신임계 중 택1) 또는 신살 일상 증거 팩폭 단독 글", "none", False),
        ("afternoon", "MBTI", "MBTI", "연애·카톡·질투·권태기 상황별 MBTI 3~4유형 리얼 반응 비교 단독 글", "indirect", False),
        ("evening", "사주", "사주", "남녀 극단 궁합·계절생 케미·부부/연인 궁합 포인트 단독 글", "direct", False),
    ],
    # offset 3 — 말랑 사주 메이트(치이카와 감성 캐릭터) 본문 사진 슬롯 포함
    [
        ("morning", "사주", "사주", "말랑 사주 메이트 캐릭터(모찌·보리·토끼링·유자·도리·호랑·소리·마루·포니 중 2~3종 활용)와 사주 오행·일간 성격 매칭 팩폭 단독 글", "indirect", True),
        ("afternoon", "운세", "자미두수", "자미두수 12궁(명궁·부처궁·재백궁·천이궁·복덕궁·관록궁 중 택1) 일상 풀이 단독 글", "indirect", False),
        ("evening", "운세", "운세", "올해·이번 달 운세 흐름·인간관계 정리·개운 루틴·대운 징조 단독 글", "direct", False),
    ],
    # offset 4
    [
        ("morning", "사주", "사주", "역발상 통념 파괴(착해서가 아니라 ~/무재 사주/무관 사주 등) 사주 팩폭 단독 글", "indirect", False),
        ("afternoon", "MBTI", "MBTI", "남녀 MBTI 조합 궁합 또는 짝사랑/이별 심리 해부 단독 글", "none", False),
        ("evening", "사주", "사주", "이직·퇴사·짝사랑·결혼 타이밍·반복 고민 등 현실 고민 처방 단독 글", "direct", False),
    ],
]


@dataclass(frozen=True)
class SlotBlueprint:
    day_num: int
    scheduled_date: str
    slot: str
    category: str
    topic_tag: str
    format_hint: str
    cta_mode: str  # "direct" | "indirect" | "none"
    is_mate: bool = False


class GeneratedSlotItem(BaseModel):
    day_num: int = Field(..., description="배정된 Day 번호 (정수)")
    slot: str = Field(..., description="morning | afternoon | evening")
    main_post: str = Field(
        ...,
        description="본문 첫 쓰레드. 첫 줄은 반드시 <제목> 꺽새 형식 + 빈 줄 + 100% 반말, 이모지/해시태그/마크다운/한자/가격/URL 금지, 220~350자",
    )
    reply1: str = Field(
        default="",
        description="타로 3택 글일 때만 '1번 고른 사람' 해석 작성. 일반 단독 글은 빈 문자열('')",
    )
    reply2: str = Field(
        default="",
        description="타로 3택 글일 때만 '2번 고른 사람'과 '3번 고른 사람' 해석 작성. 일반 단독 글은 빈 문자열('')",
    )


class GeneratedBatchPlan(BaseModel):
    items: List[GeneratedSlotItem] = Field(..., description="요청된 슬롯 순서대로 정확히 1:1 작성된 글 목록")


def compute_next_plan_anchor(
    existing_rows: Sequence[ScheduledSheetPost],
    today_kst: Optional[str] = None,
    min_start_date: Optional[str] = None,
) -> Tuple[int, datetime.date]:
    """기존 시트의 마지막 Day/예정일을 분석해 다음 30일 계획의 시작 (day_num, start_date)을 계산합니다."""
    max_day = 0
    max_date: Optional[datetime.date] = None

    for row in existing_rows:
        m = re.search(r"(\d+)", row.day_label or "")
        if m:
            max_day = max(max_day, int(m.group(1)))
        ds = (row.scheduled_date or "").strip()
        if ds:
            try:
                d = datetime.date.fromisoformat(ds[:10])
                if max_date is None or d > max_date:
                    max_date = d
            except ValueError:
                pass

    today_str = today_kst or get_kst_today_str()
    floor_str = min_start_date or today_str
    floor_date = datetime.date.fromisoformat(floor_str[:10])

    next_day = max_day + 1
    if max_date is not None:
        candidate = max_date + datetime.timedelta(days=1)
        start_date = max(candidate, floor_date)
    else:
        start_date = floor_date
    return next_day, start_date


def build_30day_blueprint(
    start_day: int,
    start_date: datetime.date,
    days: int = DEFAULT_REFILL_DAYS,
) -> List[SlotBlueprint]:
    """지정한 일수(기본 30일 = 90행)의 슬롯·카테고리·CTA 모드 청사진을 생성합니다."""
    plan: List[SlotBlueprint] = []
    for d_idx in range(days):
        day_num = start_day + d_idx
        date_str = (start_date + datetime.timedelta(days=d_idx)).isoformat()
        pattern_day = _FIVE_DAY_PATTERN[d_idx % len(_FIVE_DAY_PATTERN)]
        for slot, category, topic_tag, fmt_hint, cta_mode, is_mate in pattern_day:
            plan.append(
                SlotBlueprint(
                    day_num=day_num,
                    scheduled_date=date_str,
                    slot=slot,
                    category=category,
                    topic_tag=topic_tag,
                    format_hint=fmt_hint,
                    cta_mode=cta_mode,
                    is_mate=is_mate,
                )
            )
    return plan


def pick_service_images_for_row(
    cta_type: str,
    cta_text: str,
    is_mate: bool = False,
    day_num: int = 1,
    slot: str = "morning",
) -> Tuple[str, str]:
    """
    글 유형에 맞춰 (image_urls_str, image_target_label)을 반환합니다.
    - 말랑 사주 메이트(치이카와 감성) 글: 본문('본문')에 캐릭터 이미지 2~3장 캐러셀 첨부
    - 그 외 CTA 답글이 있는 행: CTA 답글('CTA')에 실제 서비스 이미지 1장 첨부
    - CTA 답글이 없는 순수 글('없음'): ('', '')
    """
    if is_mate:
        img_set = SAJU_MATE_IMAGE_SETS[day_num % len(SAJU_MATE_IMAGE_SETS)]
        return ", ".join(img_set), "본문"

    if not cta_text or cta_type == "없음":
        return "", ""

    slot_offset = {"morning": 0, "afternoon": 1, "evening": 2}.get(slot, 0)
    seed = day_num * 3 + slot_offset

    if "3년점수표" in cta_type:
        pool = [SERVICE_CTA_IMAGES["year"], SERVICE_CTA_IMAGES["map"], SERVICE_CTA_IMAGES["summary"]]
    elif "카톡1:1" in cta_type:
        pool = [SERVICE_CTA_IMAGES["og"], SERVICE_CTA_IMAGES["natal"]]
    elif "오늘운세" in cta_type:
        pool = [SERVICE_CTA_IMAGES["summary"], SERVICE_CTA_IMAGES["og"]]
    else:
        pool = [SERVICE_CTA_IMAGES["natal"], SERVICE_CTA_IMAGES["summary"], SERVICE_CTA_IMAGES["cover"]]

    return pool[seed % len(pool)], "CTA"


# ─────────────────────────────────────────────────────────────
# 무료 분석 중심 주제별 1:1 맞춤형 CTA 빌더 (가격 표기 0건)
# ─────────────────────────────────────────────────────────────
def build_v2_custom_cta(
    main_post: str,
    category: str,
    topic_tag: str,
    cta_mode: str,
    day_num: int = 1,
    slot: str = "morning",
    is_mate: bool = False,
) -> Tuple[str, str]:
    """
    가격 언급 없이 실제 무료 진입 4대 축(무료 만세력 분석 / 카톡 1:1 질문 1개 무료 /
    3년 점수표 무료 미리보기 / 무료 오늘의 운세 / 사주 메이트 무료 미리보기) 중심으로
    (cta_type, reply3_text)를 반환합니다.
    """
    if cta_mode == "none":
        return "없음", ""

    text = f"{main_post or ''} {topic_tag or ''} {category or ''}"
    first_line = extract_bracket_title(main_post or "")
    t_title = first_line + " " + (topic_tag or "")
    slot_offset = {"morning": 0, "afternoon": 1, "evening": 2}.get(slot, 0)
    v_seed = day_num * 3 + slot_offset

    is_3y = any(k in t_title for k in ("3년", "대운", "내년", "전환기", "징조", "공망")) or ("3년" in text and "대운" in text)
    is_reunion = any(k in text for k in ("재회", "전 애인", "헤어지", "이별", "연락 올"))
    is_crush = "짝사랑" in text
    is_job = any(k in t_title for k in ("이직", "퇴사", "직장", "취직", "승진", "창업", "사업", "회사", "상사", "일머리"))
    is_couple_worry = any(k in t_title for k in ("썸", "답장", "속마음", "권태기", "남자복", "소개팅", "고민"))
    is_tarot = topic_tag == "타로" or "타로" in t_title

    if cta_mode == "direct":
        if is_mate:
            return (
                "직접-사주메이트무료",
                "회원가입 없이 생년월일이랑 MBTI만 넣으면 무료 만세력 4주 원국표랑 내 말랑 사주 메이트 무료 미리보기 바로 확인됨\nhttps://www.mbtiju.com/mate",
            )
        if is_3y or (is_job and day_num % 2 == 0):
            return (
                "직접-3년점수표무료",
                "앞으로 3년 중 언제 밟고 언제 조심해야 할지 대운 타이밍부터 숫자로 찍어봐\n회원가입 없이 올해 남은 기간+3년 치 재물·커리어·인연·건강 점수표를 무료로 먼저 확인할 수 있음\nhttps://www.mbtiju.com/premium",
            )
        if is_reunion or is_crush or is_couple_worry:
            return (
                "직접-카톡1:1무료",
                "혼자 끙끙 앓던 그 고민 하나, 사주랑 MBTI 같이 넣고 카톡으로 짚어봐\n회원가입 없이 카톡 채널 1:1 사주·MBTI 상담에서 질문 1개 무료로 먼저 물어볼 수 있음\nAI 분석을 바탕으로 운세 서비스 전문가가 직접 검수해 평일 기준 24시간 이내 답변해줌\nhttps://pf.kakao.com/_xcdXJX/chat",
            )
        if category == "운세" and not ("자미두수" in text):
            return (
                "직접-무료오늘운세",
                "요즘 흐름이 헷갈리면 오늘 조심해야 할 포인트부터 매일 체크해봐\n회원가입 없이 오늘의 운세랑 만세력 4주 원국 분석 모두 무료로 바로 확인할 수 있음\nhttps://www.mbtiju.com/myluck?type=today",
            )
        return (
            "직접-무료만세력",
            "내 사주 8글자에 어떤 오행·신살이 깔려 있는지부터 알아야 패턴이 보임\n회원가입 없이 생년월일만으로 무료 만세력 4주 원국 분석이랑 사주 프리뷰 바로 확인해봐\nhttps://www.mbtiju.com",
        )

    # ── cta_mode == "indirect" (URL 절대 금지, 무료 분석 중심 프로필 유입 유도) ──
    if is_mate:
        return (
            "간접-사주메이트무료",
            "내 사주랑 똑 닮은 말랑 사주 메이트가 뭔지 궁금하면 프로필에서 무료 만세력 분석이랑 메이트 무료 미리보기 찍고 가",
        )
    if is_reunion or is_crush or is_couple_worry:
        variants = [
            ("간접-카톡1:1무료", "혼자 밤새 고민하다 지치지 말고 프로필 카톡 1:1 상담에서 질문 1개 무료로 먼저 물어보고 가\n회원가입 없이 바로 접수됨"),
            ("간접-카톡1:1무료", "지금 답답한 연애·속마음 고민 하나만 프로필 카톡 1:1 상담에서 질문 1개 무료로 먼저 받아보고 가"),
        ]
        return variants[v_seed % len(variants)]
    if is_tarot:
        variants = [
            ("간접-무료오늘운세", "오늘 내 운 흐름이 어느 쪽으로 열리는지 프로필에서 무료 오늘의 운세랑 무료 만세력 분석부터 보고 가"),
            ("간접-카톡1:1무료", "3택 말고 내 상황 그대로 짚어서 물어보려면 프로필 카톡 1:1 상담에서 질문 1개 무료로 먼저 물어보고 가"),
        ]
        return variants[v_seed % len(variants)]
    if is_3y:
        return (
            "간접-3년점수표무료",
            "내 앞으로 3년 대운 흐름이 어떤지 궁금하면 프로필에서 무료 만세력 분석이랑 3년 운세 점수표 무료 미리보기 찍고 가",
        )
    if category == "MBTI":
        variants = [
            ("간접-무료만세력", "같은 MBTI라도 사주 오행 따라 성향이 완전 갈림\n프로필에서 회원가입 없이 무료 만세력 분석부터 하고 가"),
            ("간접-무료만세력", "겉 MBTI랑 다른 내 진짜 속기질 궁금하면 프로필에서 무료 만세력 분석부터 찍고 가"),
        ]
        return variants[v_seed % len(variants)]

    base_variants = [
        ("간접-무료만세력", "내 사주에 이 글자 있는지 아직 모르면 프로필에서 무료 만세력 분석 하고 가\n회원가입 없이 생년월일만 넣으면 4주 원국표 바로 나옴"),
        ("간접-무료만세력", "본인 일간이랑 부족한 오행이 뭔지 모르면 프로필에서 무료 만세력 분석부터 찍고 가\n회원가입 없이 바로 확인됨"),
        ("간접-무료만세력", "내 사주 원국에 어떤 신살·십성 깔려 있는지 프로필에서 무료 만세력 분석 하고 가\n가입 절차 없이 바로 볼 수 있음"),
    ]
    return base_variants[v_seed % len(base_variants)]


def _sanitize_generated_body(text: str) -> str:
    cleaned = _ensure_bracket_title(_clean_post(text or ""))
    cleaned = re.sub(r"https?://\S+", "", cleaned).strip()
    return _clean_post(cleaned)


def _has_banned_phrase(text: str) -> bool:
    return any(bw in (text or "") for bw in _BANNED_PHRASES)


def _generate_batch_with_llm(
    batch: Sequence[SlotBlueprint],
    avoid_titles: Sequence[str],
    llm_caller: Optional[Callable] = None,
) -> Dict[Tuple[int, str], GeneratedSlotItem]:
    """5일치(15개 슬롯) 배치를 LLM Structured JSON으로 생성합니다."""
    caller = llm_caller or generate_json
    slot_spec_lines = []
    for bp in batch:
        tarot_note = " [타로 3택: 본문 1~3번 선택지 + reply1(1번 풀이) + reply2(2·3번 풀이)]" if bp.topic_tag == "타로" else " [단독 완결: reply1='', reply2='']"
        slot_spec_lines.append(
            f"- Day {bp.day_num} ({bp.scheduled_date}) | slot={bp.slot} | 카테고리={bp.category} | 태그={bp.topic_tag} | 가이드={bp.format_hint}{tarot_note}"
        )

    avoid_sample = list(avoid_titles)[-120:]
    avoid_block = "\n".join(f"- {t}" for t in avoid_sample) if avoid_sample else "(없음)"

    system_prompt = (
        f"{STYLE_GUIDE}\n\n"
        "[배치 생성 추가 규칙]\n"
        "- 본문(main_post)과 답글(reply1, reply2)에 서비스 홍보, URL, 가격(원), '프로필 링크' 언급 절대 금지 (CTA는 시스템이 별도 컬럼에 자동 매핑함).\n"
        "- 모든 글은 서로 주제·일간·신살·MBTI 조합·질문 결이 겹치지 않게 다양하게 작성할 것.\n"
        "- 타로 3택 슬롯이 아닌 일반 슬롯은 reply1과 reply2를 반드시 빈 문자열('')로 둘 것."
    )

    user_prompt = (
        f"아래 {len(batch)}개 슬롯에 맞춰 Threads 게시용 글을 JSON으로 정확히 {len(batch)}개 작성해라.\n"
        "각 항목의 day_num과 slot은 아래 목록과 정확히 일치해야 한다.\n\n"
        "[생성할 슬롯 목록]\n"
        + "\n".join(slot_spec_lines)
        + "\n\n[기존에 이미 작성·발행된 제목 목록 — 절대 주제나 제목이 겹치지 않게 작성]\n"
        + avoid_block
    )

    model_name = os.getenv("THREADS_REFILL_MODEL") or os.getenv("GEMINI_TEXT_MODEL") or None
    last_err: Optional[Exception] = None
    for attempt in range(3):
        try:
            result = caller(
                system_prompt,
                user_prompt,
                GeneratedBatchPlan,
                temperature=0.9,
                model_name=model_name,
            )
            if isinstance(result, dict):
                result = GeneratedBatchPlan.model_validate(result)
            mapped: Dict[Tuple[int, str], GeneratedSlotItem] = {}
            for item in result.items:
                key = (int(item.day_num), (item.slot or "").strip().lower())
                if key not in mapped and (item.main_post or "").strip():
                    mapped[key] = item
            if len(mapped) >= len(batch):
                return mapped
            if attempt == 2 and mapped:
                return mapped
            last_err = RuntimeError(f"배치 슬롯 부족: {len(mapped)}/{len(batch)}")
        except Exception as e:
            last_err = e
            print(f"[SHEET-REFILL][WARN] 배치 생성 재시도 ({attempt + 1}/3): {e}")

    raise RuntimeError(f"30일 시트 배치 생성 실패: {last_err}")


def generate_30day_sheet_rows(
    existing_rows: Sequence[ScheduledSheetPost],
    days: int = DEFAULT_REFILL_DAYS,
    today_kst: Optional[str] = None,
    min_start_date: Optional[str] = None,
    batch_days: int = BATCH_DAYS,
    llm_caller: Optional[Callable] = None,
) -> Tuple[List[List[str]], int, int]:
    """
    기존 시트와 겹치지 않는 새 N일치(기본 30일 = 90행) 시트 행(15컬럼 A:O)을 생성합니다.
    반환: (rows_values, start_day_num, end_day_num)
    """
    start_day, start_date = compute_next_plan_anchor(
        existing_rows=existing_rows,
        today_kst=today_kst,
        min_start_date=min_start_date,
    )
    blueprint = build_30day_blueprint(start_day=start_day, start_date=start_date, days=days)

    used_titles: List[str] = []
    used_norms = set()
    for row in existing_rows:
        if row.posts:
            t = extract_bracket_title(row.posts[0])
            if t:
                used_titles.append(t)
                used_norms.add(_normalize_for_dedup(t))

    batch_size = max(1, batch_days) * 3
    rows_values: List[List[str]] = []

    for offset in range(0, len(blueprint), batch_size):
        batch = blueprint[offset : offset + batch_size]
        generated_map = _generate_batch_with_llm(batch, used_titles, llm_caller=llm_caller)

        missing: List[SlotBlueprint] = []
        accepted: Dict[Tuple[int, str], GeneratedSlotItem] = {}
        for bp in batch:
            item = generated_map.get((bp.day_num, bp.slot))
            if item is None:
                missing.append(bp)
                continue
            body = _sanitize_generated_body(item.main_post)
            title = extract_bracket_title(body)
            norm = _normalize_for_dedup(title)
            if not body or len(norm) < 4 or norm in used_norms or _has_banned_phrase(body):
                missing.append(bp)
                continue
            accepted[(bp.day_num, bp.slot)] = item
            used_titles.append(title)
            used_norms.add(norm)

        if missing:
            retry_map = _generate_batch_with_llm(missing, used_titles, llm_caller=llm_caller)
            for bp in missing:
                item = retry_map.get((bp.day_num, bp.slot))
                if item is None:
                    raise RuntimeError(f"Day {bp.day_num} {bp.slot} 슬롯 생성 누락")
                body = _sanitize_generated_body(item.main_post)
                title = extract_bracket_title(body)
                norm = _normalize_for_dedup(title)
                if not body or _has_banned_phrase(body):
                    raise RuntimeError(f"Day {bp.day_num} {bp.slot} 슬롯 품질 검증 실패")
                accepted[(bp.day_num, bp.slot)] = item
                used_titles.append(title)
                used_norms.add(norm)

        for bp in batch:
            item = accepted[(bp.day_num, bp.slot)]
            main_clean = _sanitize_generated_body(item.main_post)
            r1_clean = _clean_post(item.reply1) if (bp.topic_tag == "타로" and (item.reply1 or "").strip()) else ""
            r2_clean = _clean_post(item.reply2) if (bp.topic_tag == "타로" and (item.reply2 or "").strip()) else ""

            cta_type, cta_text = build_v2_custom_cta(
                main_post=main_clean,
                category=bp.category,
                topic_tag=bp.topic_tag,
                cta_mode=bp.cta_mode,
                day_num=bp.day_num,
                slot=bp.slot,
                is_mate=bp.is_mate,
            )
            cta_clean = _clean_post(cta_text) if cta_text else ""
            img_urls_str, img_target = pick_service_images_for_row(
                cta_type=cta_type,
                cta_text=cta_clean,
                is_mate=bp.is_mate,
                day_num=bp.day_num,
                slot=bp.slot,
            )

            for check_txt in (main_clean, r1_clean, r2_clean, cta_clean):
                if check_txt and _has_banned_phrase(check_txt):
                    raise RuntimeError(f"금지어 감지됨 (Day {bp.day_num} {bp.slot})")
            if cta_clean and _has_polite_ending([cta_clean]):
                raise RuntimeError(f"CTA 존댓말 감지됨 (Day {bp.day_num} {bp.slot})")

            rows_values.append([
                f"Day {bp.day_num}",
                bp.scheduled_date,
                bp.slot,
                bp.category,
                _sanitize_tag(bp.topic_tag) or bp.category,
                "대기",
                main_clean,
                r1_clean,
                r2_clean,
                cta_clean,
                cta_type,
                "",
                "",
                img_urls_str,
                img_target,
            ])

    end_day = start_day + days - 1
    return rows_values, start_day, end_day


def append_rows_to_sheet(
    rows_values: List[List[str]],
    sheet_id: Optional[str] = None,
    tab_name: Optional[str] = None,
) -> int:
    """생성된 행들을 구글 시트 하단에 안전하게 추가(INSERT_ROWS)합니다."""
    if not rows_values:
        return 0
    creds = _load_sheets_credentials()
    if creds is None:
        raise RuntimeError("구글 시트 쓰기 인증(GOOGLE_SERVICE_ACCOUNT_JSON / OAuth)이 없어 새 30일 계획을 저장할 수 없습니다.")

    sid = (sheet_id or os.getenv("THREADS_SHEET_ID") or DEFAULT_THREADS_SHEET_ID).strip()
    tab = (tab_name or os.getenv("THREADS_SHEET_TAB") or DEFAULT_THREADS_SHEET_TAB).strip()

    from googleapiclient.discovery import build
    svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
    svc.spreadsheets().values().append(
        spreadsheetId=sid,
        range=f"'{tab}'!A:O",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": rows_values},
    ).execute()
    return len(rows_values)


def replenish_sheet_if_exhausted(
    recent_published_texts: Optional[List[str]] = None,
    days: int = DEFAULT_REFILL_DAYS,
    threshold: int = 0,
    force: bool = False,
    sheet_id: Optional[str] = None,
    tab_name: Optional[str] = None,
    today_kst: Optional[str] = None,
    min_start_date: Optional[str] = None,
    slot_to_check: Optional[str] = None,
    llm_caller: Optional[Callable] = None,
) -> Dict[str, object]:
    """
    시트의 대기 글이 모두 소진(pending <= threshold)되었을 때(또는 force=True일 때)
    새 30일치(90행) 계획을 자동 생성해 구글 시트에 추가합니다.
    """
    existing_rows = load_sheet_rows(sheet_id=sheet_id, tab_name=tab_name)
    pending_total = count_pending_posts(existing_rows, recent_published_texts=recent_published_texts)
    pending_slot = (
        count_pending_posts(existing_rows, recent_published_texts=recent_published_texts, slot=slot_to_check)
        if slot_to_check
        else pending_total
    )

    needs_refill = force or (pending_total <= threshold) or (slot_to_check is not None and pending_slot <= 0)
    if not needs_refill:
        return {
            "refilled": False,
            "pending_total": pending_total,
            "pending_slot": pending_slot,
            "added_rows": 0,
        }

    print(
        f"[SHEET-REFILL] 📋 시트 대기 글 소진 감지 (전체 대기 {pending_total}건"
        + (f", {slot_to_check} 슬롯 {pending_slot}건" if slot_to_check else "")
        + f") → 새 {days}일치({days * 3}행) 자동 작성 시작..."
    )

    rows_values, start_day, end_day = generate_30day_sheet_rows(
        existing_rows=existing_rows,
        days=days,
        today_kst=today_kst,
        min_start_date=min_start_date,
        llm_caller=llm_caller,
    )

    if not force:
        latest_rows = load_sheet_rows(sheet_id=sheet_id, tab_name=tab_name)
        latest_pending = count_pending_posts(latest_rows, recent_published_texts=recent_published_texts)
        latest_slot = (
            count_pending_posts(latest_rows, recent_published_texts=recent_published_texts, slot=slot_to_check)
            if slot_to_check
            else latest_pending
        )
        if latest_pending > threshold and (slot_to_check is None or latest_slot > 0):
            print(f"[SHEET-REFILL] ℹ️ 다른 실행에서 이미 보충됨 (현재 대기 {latest_pending}건). 중복 추가를 건너뜁니다.")
            return {
                "refilled": False,
                "pending_total": latest_pending,
                "pending_slot": latest_slot,
                "added_rows": 0,
            }

    added = append_rows_to_sheet(rows_values, sheet_id=sheet_id, tab_name=tab_name)
    start_date_str = rows_values[0][1] if rows_values else ""
    end_date_str = rows_values[-1][1] if rows_values else ""
    print(f"[SHEET-REFILL] ✅ 새 30일 계획 추가 완료: Day {start_day}~Day {end_day} ({start_date_str} ~ {end_date_str}, {added}행)")

    return {
        "refilled": True,
        "added_rows": added,
        "start_day": start_day,
        "end_day": end_day,
        "start_date": start_date_str,
        "end_date": end_date_str,
        "pending_total": pending_total,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Threads 30일 구글 시트 자동 보충 CLI")
    parser.add_argument("--days", type=int, default=DEFAULT_REFILL_DAYS, help="생성할 일수 (기본 30일 = 90행)")
    parser.add_argument("--force", action="store_true", help="남은 대기 글이 있어도 강제로 새 계획을 시트 하단에 추가")
    parser.add_argument("--sheet-id", type=str, default="", help="구글 시트 ID 덮어쓰기 (선택)")
    args = parser.parse_args()

    res = replenish_sheet_if_exhausted(
        days=args.days,
        force=args.force,
        sheet_id=args.sheet_id or None,
    )
    print(res)
