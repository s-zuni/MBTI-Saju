"""
구글 시트(30일_게시계획) 소진 시 새로운 30일치(90행) Threads 게시 계획을
자동 생성하여 시트에 이어쓰는 모듈.

설계 원칙:
1. 30일 = 90행 (매일 morning / afternoon / evening 3슬롯).
2. 카테고리 비중: 사주 60%(54) / MBTI 20%(18) / 운세 20%(18: 타로 3택 6, 자미두수 6, 일반 운세 6).
3. CTA 정책 (v2 확정 요금제 기준):
   - 직접 링크 댓글(URL 포함): 매일 evening 1회 (30일당 정확히 30회 유지) — 글 주제별 1:1 맞춤 URL·요금제.
   - 간접 유도 댓글(URL 없음): morning/afternoon 60행 중 48행(80%) — '프로필에서 무료 만세력 분석 하고 가' 스타일.
   - 순수 무CTA('없음'): 나머지 12행 (약 2.5일에 1개꼴 완급 유지).
   - 카톡 1:1 상담은 Threads 규칙에 따라 가격 미표기('질문 1회 무료').
   - 폐지 정책('크레딧', '가입 무료', '첫 분석 무료', '회원가입 필수')·이모지·존댓말·한자·해시태그 절대 금지.
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
# CTA 모드(5일당 15행): evening 5개 direct, morning/afternoon 10개 중 8개 indirect + 2개 none
# -> 30일 기준: 사주 54 / MBTI 18 / 운세 18, direct 30 / indirect 48 / none 12
_FIVE_DAY_PATTERN: List[List[Tuple[str, str, str, str, str]]] = [
    # offset 0: (slot, category, topic_tag, format_hint, cta_mode)
    [
        ("morning", "사주", "사주", "일간/십성/신살 기반 직장·인간관계 팩폭 단독 글", "indirect"),
        ("afternoon", "MBTI", "MBTI", "같은 MBTI라도 사주 기질에 따라 갈리는 반전 또는 연애 속마음 비교 단독 글", "indirect"),
        ("evening", "사주", "사주", "재회·이별·썸·연애 사주 급소 고민 처방 단독 글", "direct"),
    ],
    # offset 1
    [
        ("morning", "사주", "사주", "재물운·돈 습관·사업/창업/이직 사주 팩폭 단독 글", "indirect"),
        ("afternoon", "운세", "타로", "타로 3택 선택형 글 (본문에 1번/2번/3번 선택지, reply1에 1번 해석, reply2에 2번·3번 해석)", "indirect"),
        ("evening", "사주", "사주", "대운·내년 흐름·3년 전환기 징조 사주 단독 글", "direct"),
    ],
    # offset 2
    [
        ("morning", "사주", "사주", "특정 일간(갑을병정무기경신임계 중 택1) 또는 신살 일상 증거 팩폭 단독 글", "none"),
        ("afternoon", "MBTI", "MBTI", "연애·카톡·질투·권태기 상황별 MBTI 3~4유형 리얼 반응 비교 단독 글", "indirect"),
        ("evening", "사주", "사주", "남녀 극단 궁합·계절생 케미·부부/연인 궁합 포인트 단독 글", "direct"),
    ],
    # offset 3
    [
        ("morning", "사주", "사주", "오행(목화토금수) 과다/부족 또는 태어난 계절별 성격·돈·인간관계 팩폭 단독 글", "indirect"),
        ("afternoon", "운세", "자미두수", "자미두수 12궁(명궁·부처궁·재백궁·천이궁·복덕궁·관록궁 중 택1) 일상 풀이 단독 글", "indirect"),
        ("evening", "운세", "운세", "올해·이번 달 운세 흐름·인간관계 정리·개운 루틴·대운 징조 단독 글", "direct"),
    ],
    # offset 4
    [
        ("morning", "사주", "사주", "역발상 통념 파괴(착해서가 아니라 ~/무재 사주/무관 사주 등) 사주 팩폭 단독 글", "indirect"),
        ("afternoon", "MBTI", "MBTI", "남녀 MBTI 조합 궁합 또는 짝사랑/이별 심리 해부 단독 글", "none"),
        ("evening", "사주", "사주", "이직·퇴사·짝사랑·결혼 타이밍·반복 고민 등 현실 고민 처방 단독 글", "direct"),
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
        for slot, category, topic_tag, fmt_hint, cta_mode in pattern_day:
            plan.append(
                SlotBlueprint(
                    day_num=day_num,
                    scheduled_date=date_str,
                    slot=slot,
                    category=category,
                    topic_tag=topic_tag,
                    format_hint=fmt_hint,
                    cta_mode=cta_mode,
                )
            )
    return plan


# ─────────────────────────────────────────────────────────────
# v2 확정 요금제 + 글 주제별 1:1 맞춤형 CTA 빌더 (결정론적 규칙)
# ─────────────────────────────────────────────────────────────
def build_v2_custom_cta(
    main_post: str,
    category: str,
    topic_tag: str,
    cta_mode: str,
    day_num: int = 1,
    slot: str = "morning",
) -> Tuple[str, str]:
    """
    글 제목·본문 주제에 맞춰 (cta_type, reply3_text)를 반환합니다.
    - direct: URL 포함 (evening 슬롯 전용, 30일당 30회 유지)
    - indirect: URL 없음 ('프로필에서 무료 만세력 분석 하고 가' 계열 간접 유도)
    - none: ('없음', '')
    """
    if cta_mode == "none":
        return "없음", ""

    text = f"{main_post or ''} {topic_tag or ''} {category or ''}"
    first_line = extract_bracket_title(main_post or "")
    t_title = first_line + " " + (topic_tag or "")
    slot_offset = {"morning": 0, "afternoon": 1, "evening": 2}.get(slot, 0)
    v_seed = day_num * 3 + slot_offset

    is_jamidusu = "자미두수" in text or any(k in text for k in ("명궁", "부처궁", "재백궁", "천이궁", "복덕궁", "관록궁", "수호별"))
    is_tarot = topic_tag == "타로" or "타로" in t_title
    is_3y = any(k in t_title for k in ("3년", "대운", "내년", "전환기", "징조", "공망")) or ("3년" in text and "대운" in text)
    is_reunion = any(k in text for k in ("재회", "전 애인", "헤어지", "이별", "연락 올"))
    is_crush = "짝사랑" in text
    is_marriage = any(k in text for k in ("결혼", "배우자", "부부"))
    is_job = any(k in t_title for k in ("이직", "퇴사", "직장", "취직", "승진", "창업", "사업", "회사", "상사", "일머리"))
    is_money = any(k in t_title for k in ("재물", "돈", "통장", "부자", "재성", "식신생재", "군겁쟁재"))
    is_couple = any(k in t_title for k in ("궁합", "커플", "썸", "연애", "남자복", "권태기", "답장", "속마음")) or (
        not is_job and not is_money and any(k in text for k in ("궁합", "커플", "썸", "연애", "권태기"))
    )
    if not is_job:
        is_job = any(k in text for k in ("이직", "퇴사", "창업", "사업", "취직"))
    if not is_money:
        is_money = any(k in text for k in ("재물운", "돈줄", "식신생재", "군겁쟁재"))
    is_travel = any(k in text for k in ("역마", "여행", "타지", "해외"))
    is_deep_worry = any(k in text for k in ("고민", "남자복", "소개팅", "계속 꼬이", "반복"))

    if cta_mode == "direct":
        if is_jamidusu:
            return (
                "직접-자미두수990",
                "내 자미두수 12궁 수호별이랑 명반 흐름이 어떤지 회원가입 없이 990원으로 바로 열어봐\n기본 4주 원국은 무료 만세력 분석으로 먼저 볼 수 있음\nhttps://www.mbtiju.com/myluck?type=jamidusu",
            )
        if is_3y:
            return (
                "직접-3년리포트",
                "앞으로 3년 중 언제 밟고 언제 조심해야 할지 대운 타이밍부터 숫자로 찍어봐\n회원가입 없이 올해 남은 기간+3년 치 재물·커리어·인연·건강 점수표는 무료 미리보기, 3년 심층 사주 리포트는 29,000원임\nhttps://www.mbtiju.com/premium",
            )
        # 고민형 주제 일부(약 4~5일 주기)는 카톡 1:1 상담(질문 1회 무료, 가격 미표기)으로 연결
        if (is_reunion or is_deep_worry) and (day_num % 7 in (1, 4)):
            return (
                "직접-카톡1:1",
                "혼자 끙끙 앓던 그 고민 하나, 사주랑 MBTI 같이 넣고 카톡으로 짚어봐\n회원가입 없이 카톡 채널 1:1 사주·MBTI 상담에서 질문 1회 무료로 먼저 물어볼 수 있음\nAI 분석을 바탕으로 운세 서비스 전문가가 직접 검수해 평일 기준 24시간 이내 답변해줌\nhttps://pf.kakao.com/_xcdXJX/chat",
            )
        if is_reunion:
            return (
                "직접-재회사주990",
                "전 애인 연락 타이밍이랑 재회 가능성, 회원가입 없이 재회 사주 990원으로 바로 확인해봐\n가볍게 지금 속마음만 뽑아볼 거면 490원 신비타로도 바로 됨\nhttps://www.mbtiju.com/relationship",
            )
        if is_crush:
            return (
                "직접-짝사랑사주990",
                "지금 짝사랑 밀어붙여야 할지 깔끔하게 접어야 할지, 회원가입 없이 짝사랑 사주 990원으로 바로 확인해봐\n상대 속마음은 490원 신비타로 3카드 리딩으로도 볼 수 있음\nhttps://www.mbtiju.com/relationship",
            )
        if is_marriage:
            return (
                "직접-결혼사주990",
                "내 사주 결혼운·배우자 궁합이 어떤 흐름인지, 회원가입 없이 결혼·부부 궁합 사주 990원으로 바로 확인해봐\n내 4주 원국은 무료 만세력 분석부터 찍어볼 수 있음\nhttps://www.mbtiju.com/relationship",
            )
        if is_tarot or ("속마음" in text) or ("답장" in text):
            return (
                "직접-타로490",
                "지금 머릿속에 떠오른 그 사람 속마음이랑 흐름, 회원가입 없이 490원 신비타로 3카드로 바로 뽑아봐\n둘의 사주 궁합까지 깊게 볼 거면 심층 궁합 사주 990원도 바로 됨\nhttps://www.mbtiju.com/myluck?type=tarot",
            )
        if is_couple:
            return (
                "직접-연애궁합990",
                "우리 둘이 서로 살려주는 조합인지 부딪히는 구조인지, 회원가입 없이 MBTI x 사주 심층 궁합 990원으로 바로 확인해봐\n연인·재회·짝사랑 사주도 전부 990원임\nhttps://www.mbtiju.com/relationship",
            )
        if is_job:
            return (
                "직접-이직사주990",
                "지금 움직여도 되는 달인지 버텨야 하는 타이밍인지, 회원가입 없이 이직·취직·창업 사주 990원으로 바로 확인해봐\n기본 사주 원국표는 무료 만세력 분석으로 먼저 볼 수 있음\nhttps://www.mbtiju.com/gold",
            )
        if is_money:
            return (
                "직접-재물사주990",
                "내 사주 돈줄이 언제 뚫리고 어디서 새는지, 회원가입 없이 재물운 사주 990원으로 바로 확인해봐\n오늘의 운세랑 만세력 4주 원국표는 0원 무료로 먼저 찍어볼 수 있음\nhttps://www.mbtiju.com/gold",
            )
        if is_travel:
            return (
                "직접-여행490",
                "내 사주 기운 살려주는 방향이랑 장소가 궁금하면 회원가입 없이 490원 행운의 여행지 분석 바로 확인해봐\n내 사주 역마·오행은 무료 만세력 분석으로 먼저 볼 수 있음\nhttps://www.mbtiju.com/myluck?type=trip",
            )
        if category == "운세":
            if day_num % 2 == 0:
                return (
                    "직접-운세무료490",
                    "오늘 조심해야 할 흐름은 회원가입 없이 무료 오늘의 운세(0원)로 먼저 확인해봐\n내일의 운세랑 신비타로 3카드 리딩도 490원으로 바로 볼 수 있음\nhttps://www.mbtiju.com/myluck?type=today",
                )
            return (
                "직접-타로490",
                "지금 헷갈리는 선택이나 인간관계 흐름, 회원가입 없이 490원 신비타로 3카드 리딩으로 바로 뽑아봐\n오늘의 운세는 0원 무료로 먼저 확인됨\nhttps://www.mbtiju.com/myluck?type=tarot",
            )
        if day_num % 6 == 0:
            return (
                "직접-AI채팅490",
                "내 사주 원국 보면서 궁금한 거 바로 물어보고 싶으면 회원가입 없이 AI 사주·타로 채팅 5회권 490원으로 써봐\n기본 만세력 4주 원국표는 0원 무료로 바로 나옴\nhttps://www.mbtiju.com/saju",
            )
        return (
            "직접-사주990",
            "내 사주 8글자에 어떤 오행·신살이 깔려 있는지 회원가입 없이 무료 만세력 분석부터 찍어봐\nMBTI x 사주 통합 정밀 풀이도 990원으로 바로 확인할 수 있음\nhttps://www.mbtiju.com",
        )

    # ── cta_mode == "indirect" (URL 절대 금지, 프로필 유입 간접 유도) ──
    if is_tarot:
        variants = [
            ("간접-타로490", "3택 말고 내 상황 딱 맞춰서 뽑아보고 싶으면 프로필에서 490원 신비타로 해보고 가\n회원가입 없이 3카드 리딩 바로 나옴"),
            ("간접-타로490/무료운세", "지금 떠오른 고민 더 깊게 보고 싶으면 프로필에서 490원 신비타로 뽑고 가\n무료 오늘의 운세랑 무료 만세력 분석도 바로 됨"),
        ]
        return variants[v_seed % len(variants)]
    if is_jamidusu:
        if is_travel:
            return (
                "간접-자미두수990/여행490",
                "내 자미두수 천이궁·명궁 흐름 궁금하면 프로필에서 990원 자미두수 풀이 보고 가\n내 사주에 맞는 행운의 여행지 분석도 490원임",
            )
        return (
            "간접-자미두수990",
            "내 명궁이랑 수호별이 뭔지 궁금하면 프로필에서 990원 자미두수 풀이 보고 가\n회원가입 없이 무료 만세력 분석부터 먼저 찍어봐도 됨",
        )
    if is_reunion:
        return (
            "간접-재회990/타로490",
            "전 애인 연락 타이밍 혼자 추측하지 말고 프로필에서 990원 재회 사주나 490원 신비타로 보고 가\n회원가입 없이 바로 확인됨",
        )
    if is_crush:
        return (
            "간접-짝사랑990",
            "짝사랑 계속 밀어붙일지 헷갈리면 프로필에서 990원 짝사랑 사주 보고 가\n가볍게 속마음만 볼 거면 490원 타로도 가입 없이 바로 됨",
        )
    if is_job:
        return (
            "간접-만세력/이직990",
            "내 사주에 이동운·직장운 언제 열리는지 프로필에서 무료 만세력 분석부터 하고 가\n취직·이직·창업 사주도 회원가입 없이 990원임",
        )
    if is_money:
        return (
            "간접-만세력/재물990",
            "내 사주 돈 그릇이랑 재성 흐름 궁금하면 프로필에서 무료 만세력 분석부터 하고 가\n재물운 사주도 회원가입 없이 990원이면 바로 나옴",
        )
    if is_marriage or is_couple:
        variants = [
            ("간접-궁합990", "우리 둘 사주랑 MBTI 궁합 어떤지 궁금하면 프로필에서 990원 심층 궁합 보고 가\n무료 만세력 원국 분석부터 가입 없이 바로 됨"),
            ("간접-궁합990/타로490", "지금 상대 속마음이랑 둘 케미 궁금하면 프로필에서 490원 신비타로나 990원 연인 궁합 사주 보고 가"),
            ("간접-만세력/궁합990", "상대랑 내 일간·오행이 맞는지 궁금하면 프로필에서 무료 만세력 분석 하고 가\n연인·부부 궁합 사주도 990원임"),
        ]
        return variants[v_seed % len(variants)]
    if is_travel:
        return (
            "간접-만세력/여행490",
            "내 사주에 역마 기운 있는지 프로필에서 무료 만세력 분석 하고 가\n내 사주에 맞는 행운의 여행지 추천도 490원임",
        )
    if is_3y:
        return (
            "간접-만세력/3년점수표",
            "내 앞으로 3년 대운 흐름이 어떤지 궁금하면 프로필에서 무료 만세력 분석이랑 3년 운세 점수표 무료 미리보기 찍고 가",
        )
    if category == "MBTI":
        variants = [
            ("간접-만세력/사주990", "같은 MBTI라도 사주 오행 따라 성향이 완전 갈림\n프로필에서 무료 만세력 분석 하고 가 (MBTI 사주 통합 풀이도 990원임)"),
            ("간접-사주990", "겉 MBTI랑 다른 내 진짜 속기질 궁금하면 프로필에서 무료 만세력 분석 찍고 990원 MBTI 사주 풀이도 보고 가"),
        ]
        return variants[v_seed % len(variants)]

    # 기본 사주/일간/신살/오행 간접 유도 변주
    base_variants = [
        ("간접-무료만세력", "내 사주에 이 글자 있는지 아직 모르면 프로필에서 무료 만세력 분석 하고 가\n회원가입 없이 생년월일만 넣으면 4주 원국표 바로 나옴"),
        ("간접-무료만세력", "본인 일간이랑 부족한 오행이 뭔지 모르면 프로필에서 무료 만세력 분석부터 찍고 가\n회원가입 없이 바로 확인됨"),
        ("간접-만세력/사주990", "내 사주 원국에 어떤 신살·십성 깔려 있는지 프로필에서 무료 만세력 분석 하고 가\nMBTI x 사주 정밀 풀이도 회원가입 없이 990원임"),
    ]
    return base_variants[v_seed % len(base_variants)]


def _sanitize_generated_body(text: str) -> str:
    cleaned = _ensure_bracket_title(_clean_post(text or ""))
    # 혹시 LLM이 금지 표현이나 URL을 본문에 섞었으면 제거/정리
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

    avoid_sample = list(avoid_titles)[-120:]  # 최근 120개 제목 전달로 중복 원천 차단
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
            # 일부 슬롯만 빠졌더라도 마지막 시도면 있는 것 반환, 아니면 재시도
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
    기존 시트와 겹치지 않는 새 N일치(기본 30일 = 90행) 시트 행(13컬럼)을 생성합니다.
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

        # 누락·중복·금지어 항목이 있으면 누락분만 최대 1회 추가 보충
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
            )
            cta_clean = _clean_post(cta_text) if cta_text else ""

            # 최종 안전 검증
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
        range=f"'{tab}'!A:M",
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

    # 쓰기 직전 라이브 시트 재확인 (동시 실행으로 이미 다른 잡이 채웠는지 이중 방지)
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
