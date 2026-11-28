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
   - 이미지 배치: 신규 오리지널 캐릭터 '말랑 사주 메이트' 글(30일당 6편)은 **본문**에 캐릭터 사진 첨부, 나머지 CTA 답글이 있는 행은 **CTA** 답글에 실제 서비스 이미지 첨부.
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
    "AI 분석",
    "AI분석",
)

# 5일 단위 순환 패턴 (6회 반복 = 30일, 90행)
# 합계(5일당 15행): 사주 9 (60%), MBTI 3 (20%), 운세 3 (20%: 타로 1, 자미두수 1, 운세 1)
# 매 5일 중 1편(offset 3 morning)은 말랑 사주 메이트 본문 이미지 전용 슬롯 -> 30일 6편
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
    # offset 3 — 말랑 사주 메이트(오리지널 캐릭터) 본문 사진 슬롯 포함
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


# ─────────────────────────────────────────────────────────────
# 시즌 테마: 2027 정미년 신년 시리즈 (THREADS_REFILL_THEME=jeongmi 또는 CLI --theme jeongmi)
# 2026-11 실측(최근 60일 156개 글): MBTI 조회 중앙값 496 vs 사주 171 vs 타로 90 / 자미두수 110.
# 최고 글(118,452회)은 '상황 하나 + MBTI 4그룹 한 줄 반응 + 마지막 반말 질문' 형식, 오후 1~2시 발행.
# 그래서 오후 슬롯은 매일 그 검증된 형식으로 고정하고, 타로·자미두수는 이 시즌에 뺀다.
# 5일 15행: MBTI 6(40%) / 사주 7 / 사주 메이트 2
# ─────────────────────────────────────────────────────────────
_MBTI_SITUATION_HINT = (
    "검증된 MBTI 4그룹 반응 형식: 첫 줄 <상황 + MBTI별 진짜 반응> 제목, 빈 줄, 상황을 눈앞에 그리는 공감 한 줄, "
    "빈 줄, 그다음 'ISTJ·INTJ —' 처럼 MBTI 2개씩 묶은 4줄(각 줄은 구체적 행동 하나, 25~45자), 빈 줄, "
    "'니 ○○은 이 중 몇 번이었냐' 같은 반말 질문 한 줄로 끝. 16유형이 모두 자기를 찾을 수 있게 4그룹이 서로 겹치지 않게 묶을 것. 상황: "
)
_JEONGMI_FIVE_DAY_PATTERN: List[List[Tuple[str, str, str, str, str, bool]]] = [
    [
        ("morning", "사주", "사주", "병오년이 끝나기 전에 정리하면 정미년에 확 풀리는 것 3가지 (인간관계·돈 습관·미뤄둔 결정) 사주 단독 글", "indirect", False),
        ("afternoon", "MBTI", "MBTI", _MBTI_SITUATION_HINT + "연말 모임에서 전 애인 소식 들었을 때", "indirect", False),
        ("evening", "사주", "사주", "정미년에 재물·커리어 흐름이 크게 바뀌는 태어난 계절(봄·여름·가을·겨울생) 비교 단독 글, 단정 대신 '흐름이 바뀌는 시기' 톤", "direct", False),
    ],
    [
        ("morning", "사주", "사주", "인생 크게 풀리기 직전에 나타나는 징조를 정미년 입춘(2월 4일) 전후 시기와 엮은 단독 글. 제목은 짧고 결론을 숨길 것", "indirect", False),
        ("afternoon", "MBTI", "MBTI", _MBTI_SITUATION_HINT + "새해 첫날 썸 상대한테 새해 인사 먼저 받았을 때", "indirect", False),
        ("evening", "사주", "사주", "말랑 사주 메이트 캐릭터(모찌·보리·토끼링·유자·도리·호랑·소리·마루·포니 중 2~3종)별로 정미년에 제일 잘 풀리는 메이트와 조심할 메이트 단독 글", "direct", True),
    ],
    [
        ("morning", "MBTI", "MBTI", "한 유형 저격형: '겉으론 착한 <MBTI 1개>, 실은 제일 무서운 이유'처럼 MBTI 하나를 집어 겉과 속 반전 + 그 반전이 사주 일간 기운 때문이라는 한 줄 + '주변에 이런 <MBTI> 하나쯤 있지 않냐'로 끝 (지난번 INFP 편과 다른 유형)", "none", False),
        ("afternoon", "MBTI", "MBTI", _MBTI_SITUATION_HINT + "회사 송년회에서 상사가 2차 가자고 할 때", "indirect", False),
        ("evening", "사주", "사주", "재회·연락 고민을 연말연시 시기와 엮은 처방 단독 글 (지금 절대 하면 안 되는 행동 2가지 + 양자택일 질문)", "direct", False),
    ],
    [
        ("morning", "사주", "사주", "정미년에 유독 사람이 꼬이는 사주 vs 사람을 정리하게 되는 사주 비교 단독 글 (일간·태어난 계절 단서 함께)", "indirect", False),
        ("afternoon", "MBTI", "MBTI", _MBTI_SITUATION_HINT + "새해 목표 세워놓고 3일 만에 무너졌을 때", "indirect", False),
        ("evening", "사주", "사주", "말랑 사주 메이트 9종 중 연애할 때 제일 피곤한 메이트 순위 TOP 3 단독 글 (3위부터 공개)", "direct", True),
    ],
    [
        ("morning", "MBTI", "MBTI", "같은 MBTI인데 정미년 흐름이 완전히 갈리는 이유를 사주 일간 차이로 푸는 단독 글 (예: 같은 ENFP라도 화 기운 강한 사람 vs 수 기운 강한 사람)", "indirect", False),
        ("afternoon", "MBTI", "MBTI", _MBTI_SITUATION_HINT + "연인이 크리스마스·새해 계획 아무것도 안 세웠을 때", "indirect", False),
        ("evening", "사주", "사주", "앞으로 3년 대운 흐름이 정미년부터 바뀌는 사람 특징 단독 글 (올해 하반기에 겪었을 법한 일 3가지로 자기 대입 유도)", "direct", False),
    ],
]

# 같은 패턴을 6번 돌리면 MBTI 상황이 반복되므로, 회차(0~5)별로 상황을 바꿔 끼운다.
_JEONGMI_MBTI_SITUATIONS: List[List[str]] = [
    ["연말 모임에서 전 애인 소식 들었을 때", "새해 첫날 썸 상대한테 새해 인사 먼저 받았을 때", "회사 송년회에서 상사가 2차 가자고 할 때", "새해 목표 세워놓고 3일 만에 무너졌을 때", "연인이 크리스마스·새해 계획 아무것도 안 세웠을 때"],
    ["단톡방에서 나만 빼고 약속 잡힌 걸 알았을 때", "연인이 갑자기 '우리 얘기 좀 해'라고 카톡 보냈을 때", "월급날 통장 보고 현타 왔을 때", "친구가 내 비밀을 다른 사람한테 말한 걸 알았을 때", "좋아하는 사람이 내 스토리만 보고 답장은 안 할 때"],
    ["전 애인한테 새벽 2시에 '자니?' 왔을 때", "소개팅 상대가 첫 만남에 지각했을 때", "상사가 퇴근 10분 전에 일 던졌을 때", "연인이 이성 친구랑 단둘이 밥 먹는다고 할 때", "설 연휴에 친척이 연애·취업 질문할 때"],
    ["썸 상대가 내 카톡에 'ㅇㅇ'만 보냈을 때", "친한 친구가 갑자기 연락 끊었을 때", "연인이 기념일을 까먹었을 때", "회사에서 억울하게 혼났을 때", "헤어지고 일주일 됐을 때"],
    ["좋아하는 사람이 다른 사람이랑 웃고 있는 걸 봤을 때", "모임에서 아무도 내 말에 리액션 안 할 때", "연인이 '나 요즘 좀 지쳐'라고 할 때", "새해 첫 출근날 아침", "전 애인이 결혼한다는 소식 들었을 때"],
    ["연인이 핸드폰 화면 뒤집어 놓을 때", "친구가 내 연애에 훈수 둘 때", "썸 상대가 '우리 무슨 사이야?' 물었을 때", "연차 쓰고 쉬는데 회사 단톡 울릴 때", "입춘 앞두고 올해 운세 보러 갈지 고민될 때"],
]

_THEME_CONTEXT = {
    "jeongmi": (
        "[시즌 컨텍스트: 2027 정미년 신년 시리즈]\n"
        "- 지금은 병오년(2026) 마지막 구간이고, 사주에서 새해(정미년)는 2027년 입춘(2월 4일)부터 시작된다. 1월 1일이 아니라 입춘 기준이라는 점을 자연스럽게 활용해도 좋다.\n"
        "- 정미년의 천간 정(丁)은 촛불·등불 같은 음의 불, 지지 미(未)는 여름 끝의 마른 흙. 이 이상의 구체적 날짜·사건 예언은 지어내지 말 것.\n"
        "- '무조건 대박', '반드시 망함' 같은 단정·공포 조장 금지. '흐름이 바뀌는 시기', '이때 조심하면 좋은 것' 톤.\n"
        "- MBTI 슬롯은 정미년을 억지로 넣지 말고 상황 공감에 집중할 것 (실측상 MBTI 상황형이 가장 멀리 퍼짐).\n"
        "- 본문에 한자 표기 금지 규칙은 그대로 유지(정미년, 병오년처럼 한글만)."
    ),
}


def _active_theme(theme: Optional[str] = None) -> str:
    t = (theme if theme is not None else os.getenv("THREADS_REFILL_THEME", "")).strip().lower()
    return t if t in _THEME_CONTEXT else ""


def _pattern_for(theme: str, cycle: int) -> List[List[Tuple[str, str, str, str, str, bool]]]:
    if theme != "jeongmi":
        return _FIVE_DAY_PATTERN
    situations = _JEONGMI_MBTI_SITUATIONS[cycle % len(_JEONGMI_MBTI_SITUATIONS)]
    out = []
    for d, day in enumerate(_JEONGMI_FIVE_DAY_PATTERN):
        new_day = []
        for slot, cat, tag, hint, mode, mate in day:
            if hint.startswith(_MBTI_SITUATION_HINT):
                hint = _MBTI_SITUATION_HINT + situations[d]
            new_day.append((slot, cat, tag, hint, mode, mate))
        out.append(new_day)
    return out


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
    theme: Optional[str] = None,
) -> List[SlotBlueprint]:
    """지정한 일수(기본 30일 = 90행)의 슬롯·카테고리·CTA 모드 청사진을 생성합니다."""
    active = _active_theme(theme)
    plan: List[SlotBlueprint] = []
    for d_idx in range(days):
        day_num = start_day + d_idx
        date_str = (start_date + datetime.timedelta(days=d_idx)).isoformat()
        pattern = _pattern_for(active, d_idx // 5)
        pattern_day = pattern[d_idx % len(pattern)]
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
    - 말랑 사주 메이트 글: 본문('본문')에 캐릭터 이미지 2~3장 캐러셀 첨부
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

    is_3y = any(k in t_title for k in ("3년", "대운", "내년", "전환기", "징조", "공망", "정미년", "새해", "신년", "2027")) or ("3년" in text and "대운" in text)
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
        # 연애·재회 고민 글은 제목에 '새해'·'정미년' 같은 시기어가 섞여도 카톡 상담이 우선
        if is_reunion or is_crush or is_couple_worry:
            return (
                "직접-카톡1:1무료",
                "혼자 끙끙 앓던 그 고민 하나, 사주랑 MBTI 같이 넣고 카톡으로 짚어봐\n회원가입 없이 카톡 채널 1:1 사주·MBTI 상담에서 질문 1개 무료로 먼저 물어볼 수 있음\n전문가가 검증하는 사주·MBTI 답변을 평일 기준 24시간 이내 보내줌\nhttps://pf.kakao.com/_xcdXJX/chat",
            )
        if is_3y or (is_job and day_num % 2 == 0):
            return (
                "직접-3년점수표무료",
                "앞으로 3년 중 언제 밟고 언제 조심해야 할지 대운 타이밍부터 숫자로 찍어봐\n회원가입 없이 올해 남은 기간+3년 치 재물·커리어·인연·건강 점수표를 무료로 먼저 확인할 수 있음\nhttps://www.mbtiju.com/premium",
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


_HANJA_RE = re.compile(r"[一-鿿]")
MIN_BODY_CHARS = 120  # 제목 제외 본문 최소 글자 수 (제목만 있는 글이 발행되던 문제 방지)


def _sanitize_generated_body(text: str) -> str:
    cleaned = _ensure_bracket_title(_clean_post(text or ""))
    cleaned = re.sub(r"https?://\S+", "", cleaned).strip()
    # 괄호 한자 병기 '목(木)', '정미(丁未)' 는 괄호째 제거
    cleaned = re.sub(r"\s?\([一-鿿\s,·]+\)", "", cleaned)
    return _clean_post(cleaned)


def _body_quality_issue(body: str) -> str:
    """발행 불가 사유를 반환(문제 없으면 빈 문자열)."""
    rest = "\n".join((body or "").strip().splitlines()[1:]).strip()
    if len(rest) < MIN_BODY_CHARS:
        return f"본문 부족({len(rest)}자)"
    if _HANJA_RE.search(body or ""):
        return "한자 포함"
    if _has_polite_ending([body]):
        return "존댓말 포함"
    return ""


def _has_banned_phrase(text: str) -> bool:
    return any(bw in (text or "") for bw in _BANNED_PHRASES)


def _generate_batch_with_llm(
    batch: Sequence[SlotBlueprint],
    avoid_titles: Sequence[str],
    llm_caller: Optional[Callable] = None,
    theme: Optional[str] = None,
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
    active = _active_theme(theme)
    if active:
        system_prompt += "\n\n" + _THEME_CONTEXT[active]

    user_prompt = (
        f"아래 {len(batch)}개 슬롯에 맞춰 Threads 게시용 글을 JSON으로 정확히 {len(batch)}개 작성해라.\n"
        "각 항목의 day_num과 slot은 아래 목록과 정확히 일치해야 한다.\n"
        "main_post에는 <제목> 한 줄 + 빈 줄 + 본문(7~12줄, 공백 포함 220~350자)을 모두 넣어라. 제목만 쓰면 실패로 처리된다.\n\n"
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
    theme: Optional[str] = None,
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
    blueprint = build_30day_blueprint(start_day=start_day, start_date=start_date, days=days, theme=theme)

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
        generated_map = _generate_batch_with_llm(batch, used_titles, llm_caller=llm_caller, theme=theme)

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
            if not body or len(norm) < 4 or norm in used_norms or _has_banned_phrase(body) or _body_quality_issue(body):
                missing.append(bp)
                continue
            accepted[(bp.day_num, bp.slot)] = item
            used_titles.append(title)
            used_norms.add(norm)

        for _retry in range(3):
            if not missing:
                break
            # 실패 슬롯은 3개씩 잘게 나눠 재생성 (큰 배치에서 폴백 모델이 제목만 쓰는 문제 완화)
            retry_map: Dict[Tuple[int, str], GeneratedSlotItem] = {}
            for j in range(0, len(missing), 3):
                try:
                    retry_map.update(_generate_batch_with_llm(missing[j:j + 3], used_titles, llm_caller=llm_caller, theme=theme))
                except RuntimeError as e:
                    print(f"[SHEET-REFILL][WARN] 재생성 실패: {e}")
            still: List[SlotBlueprint] = []
            for bp in missing:
                item = retry_map.get((bp.day_num, bp.slot))
                body = _sanitize_generated_body(item.main_post) if item else ""
                title = extract_bracket_title(body)
                norm = _normalize_for_dedup(title)
                if not body or _has_banned_phrase(body) or _body_quality_issue(body) or norm in used_norms:
                    still.append(bp)
                    continue
                accepted[(bp.day_num, bp.slot)] = item
                used_titles.append(title)
                used_norms.add(norm)
            missing = still
        if missing:
            bp = missing[0]
            raise RuntimeError(f"Day {bp.day_num} {bp.slot} 슬롯 품질 검증 실패 (재시도 3회)")

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
    theme: Optional[str] = None,
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
        theme=theme,
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
    parser.add_argument("--theme", type=str, default=None, help="시즌 테마 (jeongmi = 2027 정미년 신년 시리즈). 미지정 시 THREADS_REFILL_THEME")
    parser.add_argument("--dry-run", action="store_true", help="시트에 쓰지 않고 생성 결과만 CSV로 저장")
    parser.add_argument("--out", type=str, default="threads_refill_preview.csv", help="--dry-run 결과 CSV 경로")
    args = parser.parse_args()

    if args.dry_run:
        import csv
        existing = load_sheet_rows(sheet_id=args.sheet_id or None)
        rows, s_day, e_day = generate_30day_sheet_rows(existing_rows=existing, days=args.days, theme=args.theme)
        with open(args.out, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["Day", "예정일", "슬롯", "카테고리", "태그", "상태", "본문", "답글1", "답글2", "CTA", "CTA종류",
                        "발행시각", "링크", "이미지URL", "이미지위치"])
            w.writerows(rows)
        print(f"[SHEET-REFILL] dry-run: Day {s_day}~{e_day} {len(rows)}행 → {args.out}")
    else:
        res = replenish_sheet_if_exhausted(
            days=args.days,
            force=args.force,
            sheet_id=args.sheet_id or None,
            theme=args.theme,
        )
        print(res)
