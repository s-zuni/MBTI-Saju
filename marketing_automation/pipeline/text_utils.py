"""
나레이션/자막 텍스트 가공 유틸리티.
- 한자(漢字) 제거: TTS 엔진이 한글과 한자를 중복 발음하는 문제 방지
  (예: "토(土)사주" -> 음성 "토토 사주" 로 겹쳐 읽히는 현상)
- MBTI 영문 표준화: 한글 음차(인프피, 엠비티아이) -> 표준 영문 대문자(INFP, MBTI)
- 픽셀 폭 기반 자연스러운 줄바꿈: 구분 기호 인식 + 시각적 폭 균형(외톨이 단어 방지)
"""
import re
from typing import List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from PIL import ImageFont

# "(土)" 처럼 괄호로 감싼 한자 구간을 통째로 제거
_HANJA_PAREN_RE = re.compile(r"[\(（]\s*[㐀-䶿一-鿿]+\s*[\)）]")
# 괄호 밖에 홀로 남은 한자도 제거
_HANJA_RE = re.compile(r"[㐀-䶿一-鿿]")
_MULTI_SPACE_RE = re.compile(r"\s{2,}")

# MBTI 한글 음차 표기 -> 표준 영문 대문자 매핑 사전
MBTI_KOREAN_MAP = {
    "엠비티아이": "MBTI",
    # 16가지 축약형
    "인프피": "INFP",
    "인팁": "INTP",
    "인티제": "INTJ",
    "인프제": "INFJ",
    "엔프피": "ENFP",
    "엔팁": "ENTP",
    "엔티제": "ENTJ",
    "엔프제": "ENFJ",
    "잇프피": "ISFP",
    "잇팁": "ISTP",
    "잇티제": "ISTJ",
    "잇프제": "ISFJ",
    "엣프피": "ESFP",
    "엣팁": "ESTP",
    "엣티제": "ESTJ",
    "엣프제": "ESFJ",
    # 음절별 발음 표기
    "아이엔에프피": "INFP",
    "아이엔티피": "INTP",
    "아이엔티제이": "INTJ",
    "아이엔티제": "INTJ",
    "아이엔프제이": "INFJ",
    "아이엔프제": "INFJ",
    "이엔에프피": "ENFP",
    "이엔티피": "ENTP",
    "이엔티제이": "ENTJ",
    "이엔티제": "ENTJ",
    "이엔프제이": "ENFJ",
    "이엔프제": "ENFJ",
    "아이에스티제이": "ISTJ",
    "아이에스에프제이": "ISFJ",
    "이에스티제이": "ESTJ",
    "이에스에프제이": "ESFJ",
    "아이에스티피": "ISTP",
    "아이에스에프피": "ISFP",
    "이에스티피": "ESTP",
    "이에스에프피": "ESFP",
}

_MBTI_KOR_PATTERN = re.compile("|".join(re.escape(k) for k in sorted(MBTI_KOREAN_MAP.keys(), key=len, reverse=True)))
_MBTI_ENG_PATTERN = re.compile(
    r"(?i)(?<![a-zA-Z0-9])(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP|MBTI)(?![a-zA-Z0-9])"
)


def normalize_mbti_to_english(text: str) -> str:
    """
    한글로 작성된 MBTI 용어(예: '인프피', '엠비티아이', '엔티제') 및 소문자/혼용 MBTI 영문을
    표준 영문 대문자(INFP, MBTI, ENTJ 등)로 일괄 변환합니다.
    """
    if not text:
        return text
    # 1. 한글 음차 표기 변환
    res = _MBTI_KOR_PATTERN.sub(lambda m: MBTI_KOREAN_MAP[m.group(0)], text)
    # 2. 영문 소문자/혼용 표기 대문자화
    res = _MBTI_ENG_PATTERN.sub(lambda m: m.group(0).upper(), res)
    return res


def make_title_inclusive(title: str) -> str:
    """
    영상 제목에서 특정 MBTI(INFP, ESTJ 등)나 특정 사주 일간(을목, 임수 등)처럼 한정적인 지칭을
    '사람 특징', 'MBTI', '사주' 등의 포괄적인 대중 언어로 자연스럽게 치환합니다.
    (예: '겉은 다정한데 손절 제일 칼같은 INFP' -> '겉은 다정한데 손절 제일 칼같은 사람 특징')
    """
    if not title:
        return ""
    t = normalize_mbti_to_english(title.strip())

    # 1. 극과 극/궁합형: INFP vs ESTJ / INFP x ESTJ
    t = re.sub(r"[A-Z]{4}\s*(?:vs|VS|x|X|×)\s*[A-Z]{4}", "극과 극 MBTI 유형", t)

    # 2. [MBTI] 특징 / [MBTI] 성향 / [MBTI] 심리 -> 사람 특징 / 성향 / 심리
    t = re.sub(
        r"\b(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)\b\s*(특징|성향|심리)?",
        lambda m: f"사람 {m.group(2)}" if m.group(2) else "사람 특징",
        t,
        flags=re.IGNORECASE,
    )

    # 3. 주격/소유격: INFP가, INFP는, INFP의 등 -> 이런 사람이
    t = re.sub(
        r"\b(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)(이|가|는|은|의|도)\b\s*",
        "이런 사람이 ",
        t,
        flags=re.IGNORECASE,
    )

    # 4. 사주 일간(을목, 임수 등) 치환: '을목 여자 특징' -> '사주로 본 여자 특징'
    t = re.sub(
        r"(갑목|을목|병화|정화|무토|기토|경금|신금|임수|계수)\s*(여자|남자|사람)?",
        lambda m: "사주로 본 " + (m.group(2) if m.group(2) else "사람"),
        t,
    )

    # 5. 중복 단어 정리
    t = re.sub(r"사람\s+사람\s+특징", "사람 특징", t)
    t = re.sub(r"사람\s+사람", "사람", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    return t


# 문장부호/구어체 어미/연결 어미 뒤에서 자연스럽게 끊어 자막/음성 호흡 단위를 만들기 위한 경계
# 주의: '아니면/화면/내면/반면/돌아서면' 등 명사·접속사성 '면'을 잘못 쪼개지 않도록 검증된 활용 어미만 명시한다.
_CLAUSE_BOUNDARY_RE = re.compile(
    r"(?<=[.!?,])\s+"                  # 마침표/느낌표/물음표/쉼표 뒤
    r"|(?<=요)\s+(?=[가-힣0-9A-Za-z])"   # '~해요' 뒤
    r"|(?<=죠)\s+(?=[가-힣0-9A-Za-z])"   # '~하죠' 뒤
    r"|(?<=(?:습니다|입니다|됩니다|합니다|줍니다|집니다))\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=(?:한다|했다|였다|됐다|봤다|났다|졌다|겠다|있다|없다))\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=는데)\s+(?=[가-힣0-9A-Za-z])" # '~보이는데' 뒤
    r"|(?<=지만)\s+(?=[가-힣0-9A-Za-z])" # '~하지만' 뒤
    r"|(?<=거든)\s+(?=[가-힣0-9A-Za-z])" # '~하거든' 뒤
    r"|(?<=거든요)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=니까)\s+(?=[가-힣0-9A-Za-z])" # '~하니까' 뒤
    r"|(?<=으면)\s+(?=[가-힣0-9A-Za-z])" # '~있으면/넣으면' 뒤
    r"|(?<=하면)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=되면)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=보면)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=가면)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=오면)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=해서)\s+(?=[가-힣0-9A-Za-z])"
    r"|(?<=아서)\s+(?=[가-힣0-9A-Za-z])" # '~좋아서' 뒤
    r"|(?<=어서)\s+(?=[가-힣0-9A-Za-z])" # '~강해서' 뒤
    r"|(?<=(?:하고|오고|가고|보고|되고|있고|없고))\s+(?=[가-힣0-9A-Za-z])" # '~하고/오고/있고' 뒤
)

# 쉼표 뒤 짧은 접속어·도입부는 앞 구절이 아니라 뒤 구절로 합쳐야 자연스럽다.
_FORWARD_MERGE_PREFIXES = (
    "아니면", "하지만", "그런데", "그래서", "그리고", "심지어",
    "보통", "솔직히", "당장", "결국", "물론", "게다가", "특히", "네,", "예,"
)


def sanitize_narration(text: str) -> str:
    """TTS가 한글과 한자를 중복 발음하지 않도록 나레이션에서 한자를 제거하고,
    MBTI 용어를 표준 영문 대문자로 변환합니다."""
    if not text:
        return text
    cleaned = _HANJA_PAREN_RE.sub("", text)
    cleaned = _HANJA_RE.sub("", cleaned)
    cleaned = _MULTI_SPACE_RE.sub(" ", cleaned)
    cleaned = normalize_mbti_to_english(cleaned)
    return cleaned.strip()


def sanitize_title(text: str) -> str:
    """화면 표시용 제목/헤드라인에서 한자를 제거하고 MBTI를 표준 영문 대문자로 변환합니다.
    Pretendard에는 한자 글리프가 없어 두부(□)로 깨지므로 '을목(乙木)' -> '을목' 처럼 한글만 남깁니다."""
    if not text:
        return text
    return sanitize_narration(text).replace("( )", "").replace("()", "").strip()


def split_into_clauses(text: str) -> List[str]:
    """문장부호/어미를 기준으로 나레이션을 자연스러운 구(clause) 단위로 분할합니다.
    명시적 블록 구분자('|' 또는 빈 줄 '\\n\\n')가 있으면 그 단위를 우선 존중합니다."""
    text = text.strip()
    if not text:
        return []

    if "|" in text or "\n\n" in text:
        explicit = [p.strip() for p in re.split(r"\s*\|\s*|\n{2,}", text) if p and p.strip()]
        if explicit:
            return explicit

    parts = [p.strip() for p in _CLAUSE_BOUNDARY_RE.split(text) if p and p.strip()]
    if not parts:
        return [text]

    # 너무 짧은 조각(6자 미만) 병합:
    # - 문장부호 직후거나 도입부 접속어('네,', '아니면')면 뒤 구절로 forward merge
    # - 용언 어미나 서술어 꼬리('손절해요', '거예요.')는 앞 구절로 backward merge
    merged: List[str] = []
    i = 0
    while i < len(parts):
        part = parts[i]
        is_short = len(part) < 6
        prev_ended_punct = bool(merged and merged[-1][-1] in ".!?,")
        is_intro = any(part.startswith(px) for px in _FORWARD_MERGE_PREFIXES)
        if is_short and (not merged or prev_ended_punct or is_intro) and i + 1 < len(parts):
            parts[i + 1] = f"{part} {parts[i + 1]}"
        elif is_short and merged:
            merged[-1] = f"{merged[-1]} {part}"
        else:
            merged.append(part)
        i += 1
    return merged


# 한국어 자막 줄바꿈/줄넘김 시 절대로 찢어지면 안 되는 통사 결속 패턴
_BOUND_NOUN_OR_AUX_RE = re.compile(
    r"^(때|수|수도|수는|수가|것|것이|것은|것을|게|거|거야|거예요|겁니다|건|걸|줄|"
    r"분|분은|분들|분들은|해|해인지|치|동안|듯|듯이|채|쪽|바|뿐|만큼|대로|밖에|"
    r"대해|통해|위해|관해|따라|처럼|까지|부터|"
    r"할지|하는지|있는지|없는지|되는지|인지|볼지|갈지|"
    r"있잖아요|있어요|있거든요|있고|있을|있음|없어요|없다|"
    r"되는데|되네요|됩니다|돼요|싶은|싶은지|싶다|싶어|"
    r"보러|가면|적혀|알고|모르고|넣어서|넣으면|"
    r"시작해야|움직여야|조심해야|버텨야|유지할지|이직할지|흘러갈지|"
    r"짚어준다는|정리해주더라고요|비교해줍니다|구매하실|확인하실|체크리스트까지)"
)
_SHORT_MODIFIER_WORDS = {
    "내", "네", "제", "이", "그", "저", "한", "두", "세", "몇", "뭘", "뭐",
    "다", "딱", "싹", "더", "잘", "안", "못", "꼭", "좀", "막", "왜", "늘",
    "곧", "참", "큰", "새", "지금", "앞으로", "당장", "같이", "실천", "프로필",
    "심층", "사주", "신청", "현실", "한눈에", "무료로", "미리", "바로",
    "그냥", "스무", "3년", "20장짜리",
}
_ADNOMINAL_MODIFIER_RE = re.compile(r"(해야|여야|아야|어야|할|갈|볼|올|될|줄|던|았던|었던|였던)$")
_CLAUSE_TAIL_BONUS_RE = re.compile(r"(할지|는지|인지|해서|으면|하면|되면|보면|가면|오면|고|게|데)$")
_UNIT_MODIFIER_RE = re.compile(r"^[0-9]+(년|개월|달|주|일|시|분|장|개|번|가지|살|명|원|%|배)$")


def _korean_split_penalty(prev_word: str, next_word: str) -> float:
    """
    두 어절 사이를 줄바꿈 또는 자막 블록 경계로 삼을 때의 부자연스러움 점수.
    점수가 작을수록 자연스러운 끊김, 클수록 피해야 할 찢김(의존명사·보조용언·수식어 분리)을 뜻한다.
    """
    p_clean = re.sub(r"[,?!.]+$", "", prev_word).strip()
    n_clean = re.sub(r"[,?!.]+$", "", next_word).strip()

    penalty = 0.0

    # 1. 쉼표/마침표 뒤는 가장 자연스러운 분절점
    if prev_word.endswith((",", ".", "!", "?")):
        return -450.0

    # 2. 연결어미 뒤는 좋은 분절점 (단, 바로 뒤 어절이 보조용언/의존명사면 제외)
    if _BOUND_NOUN_OR_AUX_RE.match(n_clean):
        penalty += 850.0
    elif _CLAUSE_TAIL_BONUS_RE.search(p_clean):
        penalty -= 240.0

    # 3. 관형형/필수어미(-해야, -할, -던) 뒤에서 명사·보조용언과 찢어지는 것 방지
    if _ADNOMINAL_MODIFIER_RE.search(p_clean):
        penalty += 720.0

    # 4. 단음절/짧은 수식어('내', '다', '딱', '싹', '몇', '뭘', '실천', '프로필', '사주', '3년') 뒤 분리 방지
    if p_clean in _SHORT_MODIFIER_WORDS or _UNIT_MODIFIER_RE.match(p_clean):
        penalty += 650.0

    # 5. 줄 끝이나 줄 시작에 1음절 단어만 덩그러니 남는 현상 방지
    if len(p_clean) <= 1 or len(n_clean) <= 1:
        penalty += 550.0

    # 6. 목적격/부사격 조사로 끝난 어절 뒤는 서술어/다음 구와 나누기 무난함
    if p_clean.endswith(("을", "를", "은", "는", "에", "에서", "까지", "부터", "으로", "로", "와", "과")) and len(p_clean) >= 3:
        penalty -= 90.0

    return penalty


def _best_two_line_split(
    words: List[str],
    font: "ImageFont.FreeTypeFont",
    max_width: int,
) -> Tuple[Optional[List[str]], float]:
    """2줄 분할 가능 여부와 최적 분할(및 문법 페널티)을 반환합니다."""
    best_split = None
    best_score = float("inf")
    best_penalty = float("inf")
    for i in range(1, len(words)):
        p1 = " ".join(words[:i])
        p2 = " ".join(words[i:])
        w1 = font.getlength(p1)
        w2 = font.getlength(p2)
        if w1 <= max_width and w2 <= max_width:
            pen = _korean_split_penalty(words[i - 1], words[i])
            score = abs(w1 - w2) + pen
            if score < best_score:
                best_score = score
                best_penalty = pen
                best_split = [p1, p2]
    return best_split, best_penalty


def wrap_balanced_subtitle_lines(
    text: str,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
) -> List[str]:
    """
    단일 자막 블록을 1줄 또는 균형 잡힌 2줄로 래핑합니다.
    - 한 줄 폭이 여유 있으면 1줄 유지
    - 2줄로 들어오면 실측 폭 균형(|W1 - W2|) + 한국어 통사 결속 페널티가 최소인 지점에서 분할
    """
    clean = " ".join(text.split())
    if not clean:
        return []

    total_w = font.getlength(clean)
    if total_w <= min(max_width * 0.86, 820):
        return [clean]

    words = clean.split()
    if len(words) <= 1:
        return [clean]

    best_split, _ = _best_two_line_split(words, font, max_width)
    if best_split:
        return best_split
    if total_w <= max_width:
        return [clean]
    return wrap_by_pixel_width(clean, font, max_width)


def _split_clause_into_balanced_blocks(
    clause: str,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
    max_lines: int = 2,
) -> List[List[str]]:
    """
    한 구절이 최대 줄 수(2줄)를 넘거나 문법적으로 부자연스러운 2줄 분할('몇 / 월에' 등)만 가능할 때,
    의미 경계에서 균등하게 재분할해 각 블록을 1~2줄로 반환합니다.
    """
    if "\n" in clause:
        explicit_lines = [ln.strip() for ln in clause.splitlines() if ln.strip()]
        if explicit_lines:
            return [explicit_lines[i:i + max_lines] for i in range(0, len(explicit_lines), max_lines)]

    words = clause.split()
    if not words:
        return []

    # 1. 1줄 이내에 여유롭게 들어오면 1블록 1줄 유지
    if len(words) == 1 or font.getlength(clause) <= min(max_width * 0.86, 820):
        return [[clause]]

    # 2. 문법적으로 자연스러운 2줄 분할이 가능한지 검사 (페널티가 350 초과인 찢어짐만 있는 경우 재분할)
    best_split, best_pen = _best_two_line_split(words, font, max_width)
    if best_split and best_pen <= 350:
        return [best_split]

    # 3. 2줄을 초과하거나 부자연스러운 분할만 가능하면, 중간 부근의 가장 자연스러운 문법 경계에서 2분할 후 재귀 처리
    if len(words) >= 3:
        best_k = None
        best_score = float("inf")
        for k in range(1, len(words)):
            left = " ".join(words[:k])
            right = " ".join(words[k:])
            w1 = font.getlength(left)
            w2 = font.getlength(right)
            ratio = w1 / (w1 + w2) if (w1 + w2) > 0 else 0.5
            balance_penalty = 0.0 if 0.28 <= ratio <= 0.72 else 450.0
            score = abs(w1 - w2) * 0.35 + balance_penalty + _korean_split_penalty(words[k - 1], words[k])
            if score < best_score:
                best_score = score
                best_k = k

        if best_k is not None:
            left_s = " ".join(words[:best_k])
            right_s = " ".join(words[best_k:])
            if left_s != clause and right_s != clause:
                # 2분할한 쪽이 1줄짜리보다 더 안 좋은 쪼개짐을 만들면 기존 2줄 분할을 유지
                if not (best_split and best_score >= 450):
                    return (
                        _split_clause_into_balanced_blocks(left_s, font, max_width, max_lines)
                        + _split_clause_into_balanced_blocks(right_s, font, max_width, max_lines)
                    )

    if best_split:
        return [best_split]
    wrapped = wrap_by_pixel_width(clause, font, max_width)
    return [wrapped[i:i + max_lines] for i in range(0, len(wrapped), max_lines)]


def wrap_by_pixel_width(text: str, font: "ImageFont.FreeTypeFont", max_width: int) -> List[str]:
    """주어진 폰트/크기 기준 실측 픽셀 폭에 맞춰 텍스트를 여러 줄로 래핑하며,
    마지막 줄에 단어가 1개만 덜렁 남는 외톨이 단어(Orphan word) 현상을 방지하도록 균형을 맞춥니다."""
    words = text.split()
    if not words:
        return []
    lines: List[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if font.getlength(candidate) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)

    # 외톨이 단어(Orphan word) 방지: 마지막 줄 단어가 1개이고 바로 앞 줄 단어가 3개 이상이면 앞 줄 마지막 단어를 넘김
    for i in range(len(lines) - 1, 0, -1):
        cur_words = lines[i].split()
        prev_words = lines[i - 1].split()
        if len(cur_words) == 1 and len(prev_words) >= 3:
            cand_cur = f"{prev_words[-1]} {lines[i]}"
            if font.getlength(cand_cur) <= max_width:
                lines[i - 1] = " ".join(prev_words[:-1])
                lines[i] = cand_cur

    return lines


def wrap_natural_title(
    title: str,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
    max_lines: int = 2
) -> List[str]:
    """
    릴스/숏츠 상단 타이틀 및 썸네일 커버용 고품질 줄바꿈 함수.
    1. 자연스러운 의미 경계(쉼표, 물음표, 콜론, '+', 'vs' 등) 분할을 최우선 시도.
    2. 모든 가능한 2분할 지점 중 두 줄의 실측 픽셀 폭 차이(|W1 - W2|)를 최소화하는 균형 분할 적용.
    3. 1단어만 다음 줄로 떨어져 나가는 외톨이 단어(Orphan word) 원천 차단.
    """
    clean = title.replace("\r", "").replace("\n", " ").strip()
    clean = normalize_mbti_to_english(clean)
    words = clean.split()
    if not words:
        return []
    if len(words) <= 2:
        return [clean]

    # 1. 의미적 구분 기호(쉼표, 물음표, 느낌표, 콜론, '+', 'vs' 등) 기준 분할
    delimiters = [", ", "? ", "! ", ": ", " + ", " x ", " X ", " vs ", " VS "]
    for delim in delimiters:
        if delim in clean:
            idx = clean.find(delim)
            part1 = clean[:idx + len(delim.rstrip())].strip()
            part2 = clean[idx + len(delim):].strip()
            if part1 and part2:
                w1 = font.getlength(part1)
                w2 = font.getlength(part2)
                if w1 <= max_width and w2 <= max_width:
                    return [part1, part2]

    # 2. 픽셀 너비 균형 분할 + 한국어 의미 구(절 연결어미 / 수식어-명사 결속) 반영
    clause_end_re = re.compile(r"(는데|한데|던데|지만|거든|니까|으면|다면|자마자|할\s*때|을\s*때|일\s*때|직전)$")
    modifier_end_re = re.compile(r"(적|한|된|할|날|는|은|이|그|저|제일|가장|진짜|너무|완전|절대|갑자기)$")

    best_split = None
    min_score = float("inf")
    for i in range(1, len(words)):
        p1 = " ".join(words[:i])
        p2 = " ".join(words[i:])
        w1 = font.getlength(p1)
        w2 = font.getlength(p2)
        if w1 <= max_width and w2 <= max_width:
            penalty = 0
            # 뒤 줄에 단어가 1개만 남는데 전체 단어가 4개 이상이면 페널티
            if len(p2.split()) == 1 and len(words) >= 4:
                penalty += 350

            p1_clean = re.sub(r"[,?!.]+$", "", p1).strip()
            last_w = re.sub(r"[,?!.]+$", "", words[i - 1]).strip()
            if clause_end_re.search(p1_clean):
                penalty -= 280
            elif modifier_end_re.search(last_w):
                penalty += 220

            score = abs(w1 - w2) + penalty
            if score < min_score:
                min_score = score
                best_split = [p1, p2]

    if best_split:
        return best_split

    # 3. 폴백: 폭에 맞춰 줄바꿈. max_lines로 자르지 않는다 — 예전에는 lines[:max_lines]로 넘치는 글자를 버려
    # 호출부의 '2줄 이하면 통과' 루프가 글자 크기를 줄이지 못하고 제목 끝("진짜 이유")이 사라졌다.
    # 2줄을 넘으면 호출부가 글자 크기를 줄이도록 전체 줄을 그대로 돌려준다.
    return wrap_by_pixel_width(clean, font, max_width)


_PUNCT_RE = re.compile(r"[^\w가-힣]", re.UNICODE)


def _norm(token: str) -> str:
    return _PUNCT_RE.sub("", token)


def align_word_times(
    words: List[str],
    word_timings: list,
    scene_start: float,
    scene_end: float,
) -> List[Tuple[float, float]]:
    """
    나레이션 어절(words)마다 (start, end) 시각을 돌려줍니다.
    word_timings(TTS 단어 경계)와 어절이 1:1이 아니어도(예: edge-tts가 어절을 다르게 쪼갬)
    글자 누적 위치로 대응시키고, 대응이 안 되면 씬 구간을 글자 수 비례로 나눕니다.
    word_timings 항목은 .word/.start_time/.end_time 속성 또는 dict 키를 가진 객체여야 합니다.
    """
    def g(o, k):
        return getattr(o, k) if hasattr(o, k) else o[k]

    n = len(words)
    if n == 0:
        return []

    def proportional() -> List[Tuple[float, float]]:
        weights = [max(len(_norm(w)), 1) for w in words]
        total = sum(weights)
        out, cur = [], scene_start
        for w in weights:
            nxt = cur + (scene_end - scene_start) * w / total
            out.append((cur, nxt))
            cur = nxt
        return out

    if not word_timings:
        return proportional()

    timings = [(_norm(str(g(t, "word"))), float(g(t, "start_time")), float(g(t, "end_time"))) for t in word_timings]
    timings = [t for t in timings if t[0]]
    t_chars = sum(len(t[0]) for t in timings)
    w_chars = sum(len(_norm(w)) for w in words)
    if not timings or t_chars == 0 or abs(t_chars - w_chars) > max(3, 0.1 * w_chars):
        return proportional()

    # 글자 누적 위치 -> 해당 글자가 속한 TTS 단어 인덱스
    char_to_timing: List[int] = []
    for ti, t in enumerate(timings):
        char_to_timing += [ti] * len(t[0])

    result: List[Tuple[float, float]] = []
    pos = 0
    for w in words:
        ln = len(_norm(w))
        if ln == 0:
            prev_end = result[-1][1] if result else scene_start
            result.append((prev_end, prev_end))
            continue
        first = char_to_timing[min(pos, len(char_to_timing) - 1)]
        last = char_to_timing[min(pos + ln - 1, len(char_to_timing) - 1)]
        result.append((timings[first][1], timings[last][2]))
        pos += ln

    # 시작 시각이 역행하지 않도록 정리
    fixed: List[Tuple[float, float]] = []
    for s, e in result:
        if fixed and s < fixed[-1][0]:
            s = fixed[-1][0]
        fixed.append((s, max(e, s)))
    return fixed


HIGHLIGHT_KEYWORDS = {
    "1위", "2위", "3위", "대박", "조심", "소름", "대운", "운세", "궁합", "후회", "비밀", "특징", "팩트", "MBTI",
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"
}


def _colorize_token(word: str, kf_prefix: str = "") -> str:
    """핵심 키워드(MBTI, 순위, 자극적 단어)에 골드/옐로우 컬러 코드를 부여합니다."""
    clean_w = re.sub(r"[^\w가-힣A-Za-z]", "", word).upper()
    is_highlight = any(kw in clean_w for kw in HIGHLIGHT_KEYWORDS)
    if is_highlight:
        # 노란색(&H002BF7FF&) 액센트 부여 후 원래 흰색(&H00FFFFFF&)으로 복귀
        return f"{kf_prefix}{{\\c&H002BF7FF&}}{word}{{\\c&H00FFFFFF&}}"
    return f"{kf_prefix}{word}"


def build_karaoke_blocks(
    narration: str,
    word_timings: list,
    scene_start: float,
    scene_end: float,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
    max_lines: int = 2,
    time_shift: float = 0.0,
) -> List[Tuple[float, float, str]]:
    """
    단어 단위 하이라이트(ASS \\kf)가 들어간 자막 블록 (start, end, text)들을 만듭니다.
    블록 분할은 build_caption_chunks와 동일(문장부호/어미 기준 구 + 실측 픽셀 폭 줄바꿈, 최대 2줄).
    time_shift는 씬 전환 겹침 보정용(초)으로, 모든 시각에서 차감됩니다.
    """
    words_all = narration.split()
    times = align_word_times(words_all, word_timings, scene_start, scene_end)
    if not words_all:
        return []

    # 블록 -> (줄 리스트, 어절 인덱스 범위)
    blocks: List[List[List[str]]] = []
    for clause in split_into_clauses(narration):
        wrapped = wrap_by_pixel_width(clause, font, max_width)
        for i in range(0, len(wrapped), max_lines):
            blocks.append([line.split() for line in wrapped[i:i + max_lines]])

    out: List[Tuple[float, float, str]] = []
    wi = 0
    for bi, lines in enumerate(blocks):
        block_words = sum(len(l) for l in lines)
        if block_words == 0:
            continue
        idxs = list(range(wi, wi + block_words))
        wi += block_words

        b_start = times[idxs[0]][0]
        next_start = times[wi][0] if wi < len(times) else scene_end
        b_end = max(next_start, times[idxs[-1]][1])

        parts: List[str] = []
        k = 0
        for li, line in enumerate(lines):
            tokens = []
            for w in line:
                s = times[idxs[k]][0]
                nxt = times[idxs[k + 1]][0] if k + 1 < len(idxs) else b_end
                cs = max(int(round((nxt - s) * 100)), 1)
                tokens.append(_colorize_token(w, f"{{\\kf{cs}}}"))
                k += 1
            parts.append(" ".join(tokens))
        out.append((max(b_start - time_shift, 0.0), max(b_end - time_shift, 0.0), "\\N".join(parts)))

    # 블록이 겹치거나 비는 부분 정리: 각 블록은 다음 블록 시작까지 유지
    for i in range(len(out) - 1):
        s, e, t = out[i]
        out[i] = (s, max(min(e, out[i + 1][0]), s + 0.05), t)
    return out


def build_caption_chunks(
    narration: str,
    start_time: float,
    end_time: float,
    font: "ImageFont.FreeTypeFont",
    max_width: int,
    max_lines: int = 2,
    word_timings: Optional[list] = None,
    time_shift: float = 0.0,
) -> List[Tuple[float, float, str]]:
    """
    나레이션을 자연스러운 한국어 구/의미 단위로 분할하고 균형 잡힌 1~2줄 정적 자막 블록을 만듭니다.
    - 카라오케(\\kf) 및 단어별 색상 변경 태그를 붙이지 않는 깔끔한 정적 자막을 출력합니다.
    - word_timings가 주어지면 실제 발화 시각(align_word_times)에 맞춰 각 블록 시작/종료를 동기화합니다.
    """
    duration = max(end_time - start_time, 0.01)
    clauses = split_into_clauses(narration)
    if not clauses:
        clean_single = " ".join(narration.split())
        return [(max(start_time - time_shift, 0.0), max(end_time - time_shift, 0.0), clean_single)]

    block_lines_list: List[List[str]] = []
    for clause in clauses:
        block_lines_list.extend(_split_clause_into_balanced_blocks(clause, font, max_width, max_lines))

    # 인접한 짧은 1줄 블록이 쉼표/마침표로 끝나지 않은 경우 하나의 균형 잡힌 2줄 블록으로 병합 (자막 깜빡임 완화)
    if max_lines >= 2 and "|" not in narration and "\n\n" not in narration:
        paired: List[List[str]] = []
        idx_b = 0
        while idx_b < len(block_lines_list):
            cur = block_lines_list[idx_b]
            if (
                idx_b + 1 < len(block_lines_list)
                and len(cur) == 1
                and len(block_lines_list[idx_b + 1]) == 1
                and not cur[0].endswith((".", "!", "?", ","))
                and font.getlength(cur[0]) <= max_width
                and font.getlength(block_lines_list[idx_b + 1][0]) <= max_width
                and len(cur[0]) <= 13
                and len(block_lines_list[idx_b + 1][0]) <= 14
            ):
                paired.append([cur[0], block_lines_list[idx_b + 1][0]])
                idx_b += 2
            else:
                paired.append(cur)
                idx_b += 1
        block_lines_list = paired

    if not block_lines_list:
        clean_single = " ".join(narration.split())
        return [(max(start_time - time_shift, 0.0), max(end_time - time_shift, 0.0), clean_single)]

    # word_timings가 존재하고 어절 수가 일치하면 실제 발화 타이밍을 사용
    words_all = " ".join(" ".join(lines) for lines in block_lines_list).split()
    if word_timings and words_all:
        times = align_word_times(words_all, word_timings, start_time, end_time)
        out: List[Tuple[float, float, str]] = []
        wi = 0
        for lines in block_lines_list:
            block_words = sum(len(ln.split()) for ln in lines)
            if block_words == 0:
                continue
            idxs = list(range(wi, wi + block_words))
            wi += block_words
            b_start = times[idxs[0]][0]
            next_start = times[wi][0] if wi < len(times) else end_time
            b_end = max(next_start, times[idxs[-1]][1])
            c_text = "\\N".join(lines)
            out.append((max(b_start - time_shift, 0.0), max(b_end - time_shift, 0.0), c_text))

        for i in range(len(out) - 1):
            s, e, t = out[i]
            out[i] = (s, max(min(e, out[i + 1][0]), s + 0.05), t)
        if out:
            return out

    # word_timings가 없는 경우 글자 수 비례 배분
    blocks = ["\\N".join(lines) for lines in block_lines_list]
    weights = [max(len(b.replace("\\N", "")), 1) for b in blocks]
    total_weight = sum(weights)

    chunks: List[Tuple[float, float, str]] = []
    cursor = start_time
    for idx, (block, w) in enumerate(zip(blocks, weights)):
        c_end = end_time if idx == len(blocks) - 1 else cursor + duration * (w / total_weight)
        chunks.append((max(cursor - time_shift, 0.0), max(c_end - time_shift, 0.0), block))
        cursor = c_end
    return chunks
