"""
비주얼 컨셉(Human 80% : Animal 20%) 비율 스케줄러 및 고정 동물 캐릭터 일관성(Consistency) 엔진.

핵심 규칙:
1. 10개 영상 생성 시 8개(80%)는 'human'(실제 한국 2030 일상/공감 실사), 2개(20%)는 'animal'(귀여운 동물 짤) 비율로 자동 배정합니다.
   - 5개 단위 미니 블록(human 4개 + animal 1개) 2세트(=10개 중 human 8, animal 2) 셔플 큐를 상태 파일에 유지하여,
     단순 난수의 편향(연속 동물 등장 또는 장기 미등장) 없이 정확히 10개당 8:2 비율을 보장합니다.
2. 'animal' 모드에서는 매 영상마다, 그리고 한 영상 내의 모든 씬(Scene 1~N)마다
   100% 동일한 시그니처 동물 캐릭터(Character Consistency Anchor)가 주인공으로 등장합니다.
"""
import json
import os
import random
import re
from pathlib import Path
from typing import List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = PROJECT_ROOT / "assets" / "output" / ".visual_theme_queue.json"

# 매 동물 영상 & 모든 씬에서 동일하게 유지되는 시그니처 동물 캐릭터 (환경변수 ANIMAL_CHARACTER_PROMPT로 커스텀 가능)
DEFAULT_ANIMAL_CHARACTER = (
    "the exact same cute chubby cream-colored British Shorthair cat with big round expressive amber eyes, "
    "plump fluffy cheeks, a tiny pink nose, and wearing a signature soft pastel sky-blue knitted collar"
)

# 동물 모드임을 프롬프트 텍스트 자체에서도 식별하기 위한 내부 시그니처 키워드
_ANIMAL_MARKER_KEYWORDS = (
    "british shorthair",
    "knitted collar",
    "identical animal character",
    "cute pet",
)

HUMAN_REALISM_SUFFIX = (
    "Candid vertical smartphone photo taken by a real person, authentic Korean everyday scene, "
    "natural available light, realistic skin texture with pores and slight imperfections, "
    "ordinary un-retouched look, slight film grain, shallow but natural depth of field, "
    "not a studio shot, not CGI, not 3D render, not illustration, no airbrushed or doll-like face, "
    "Vertical 9:16 portrait full-screen aspect ratio, subject framed naturally in center-upper area, "
    "no text, no letters, no watermark, no logo."
)

ANIMAL_REALISM_SUFFIX = (
    "Candid vertical smartphone photo of the exact same cute pet taken by a real owner at home, "
    "ultra-realistic soft fur texture, expressive eyes and natural pet body language, "
    "consistent identical animal character appearance across every scene, cozy natural indoor lighting, "
    "slight film grain, shallow depth of field, not CGI, not 3D render, not cartoon, not illustration, "
    "Vertical 9:16 portrait full-screen aspect ratio, animal subject framed naturally in center-upper area, "
    "no human face, no text, no letters, no watermark, no logo."
)

# LLM이나 기본 템플릿이 동물 모드에서 실수로 섞을 수 있는 사람 지칭 표현 정규식
_HUMAN_SUBJECT_RE = re.compile(
    r"\b(two\s+young\s+korean\s+women|a\s+korean\s+woman|a\s+korean\s+man|a\s+young\s+korean\s+woman|"
    r"a\s+young\s+korean\s+man|korean\s+women|korean\s+woman|korean\s+man|young\s+women|young\s+woman|"
    r"young\s+man|in\s+their\s+late\s+20s|in\s+her\s+late\s+20s|in\s+his\s+late\s+20s|"
    r"in\s+her\s+20s|in\s+his\s+20s|in\s+her\s+30s|in\s+his\s+30s)\b",
    re.IGNORECASE,
)


def get_animal_character_anchor() -> str:
    """모든 동물 영상과 씬에서 고정으로 사용할 동물 캐릭터 외형 프롬프트를 반환합니다."""
    custom = os.getenv("ANIMAL_CHARACTER_PROMPT", "").strip()
    return custom if custom else DEFAULT_ANIMAL_CHARACTER


def _build_10_video_deck() -> List[str]:
    """
    10개 영상 중 정확히 human 8개, animal 2개가 되도록 덱을 구성합니다.
    동물 영상이 2연속으로 붙지 않도록 5개 블록(human 4 + animal 1) 2개를 각각 섞어 이어붙입니다.
    """
    first_half = ["human", "human", "human", "human", "animal"]
    second_half = ["human", "human", "human", "human", "animal"]
    random.shuffle(first_half)
    random.shuffle(second_half)
    # 경계(5번째, 6번째)에서 animal이 연속되면 뒤쪽 블록의 위치를 스왑
    if first_half[-1] == "animal" and second_half[0] == "animal":
        second_half[0], second_half[-1] = second_half[-1], second_half[0]
    return first_half + second_half


def resolve_visual_theme(explicit_theme: Optional[str] = None, consume_queue: bool = True) -> str:
    """
    이번 영상의 비주얼 테마('human' 또는 'animal')를 결정합니다.
    - explicit_theme 인자 또는 VISUAL_THEME 환경변수가 'human'/'animal'이면 해당 모드로 고정.
    - 'auto'(기본값)이면 10개 중 human 8개(80%), animal 2개(20%) 큐에서 하나를 꺼냅니다.
    """
    raw = (explicit_theme or os.getenv("VISUAL_THEME", "auto") or "auto").strip().lower()
    if raw in ("human", "person", "real"):
        return "human"
    if raw in ("animal", "pet", "cat", "meme"):
        return "animal"

    if not consume_queue:
        return "animal" if random.random() < 0.2 else "human"

    # GitHub Actions 같은 무상태(ephemeral) 환경에서는 run_number 기반 결정적 8:2 비율 보장
    run_num_raw = os.getenv("GITHUB_RUN_NUMBER", "").strip()
    if run_num_raw.isdigit() and not STATE_FILE.is_file():
        return "animal" if (int(run_num_raw) % 5 == 0) else "human"

    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        queue: List[str] = []
        history: List[str] = []
        if STATE_FILE.is_file():
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            queue = [x for x in (data.get("remaining_deck") or []) if x in ("human", "animal")]
            history = list(data.get("recent_history") or [])

        if not queue:
            queue = _build_10_video_deck()

        chosen = queue.pop(0)
        history.append(chosen)
        history = history[-20:]

        STATE_FILE.write_text(
            json.dumps(
                {
                    "remaining_deck": queue,
                    "recent_history": history,
                    "ratio_rule": "8 human : 2 animal per 10 videos",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        return chosen
    except Exception:
        # 파일 I/O가 불가능한 읽기 전용 환경 폴백 (80:20 확률)
        return random.choices(["human", "animal"], weights=[80, 20], k=1)[0]


def detect_theme_from_prompt(prompt: str, explicit_theme: Optional[str] = None) -> str:
    """프롬프트 문자열 또는 명시된 테마를 바탕으로 'animal'인지 'human'인지 판별합니다."""
    if explicit_theme and explicit_theme.strip().lower() in ("animal", "human"):
        return explicit_theme.strip().lower()
    env_theme = os.getenv("VISUAL_THEME", "").strip().lower()
    if env_theme in ("animal", "human"):
        return env_theme
    p_low = (prompt or "").lower()
    anchor_low = get_animal_character_anchor().lower()[:35]
    if anchor_low in p_low or any(k in p_low for k in _ANIMAL_MARKER_KEYWORDS):
        return "animal"
    return "human"


def build_llm_visual_instruction(theme: str) -> str:
    """대본 생성 LLM(mbti_saju_content.py, script_gen.py)에 주입할 테마별 visual_prompt 작성 규칙."""
    flow_on = os.getenv("USE_GOOGLE_FLOW", "").strip().lower() in ("1", "true", "yes")
    motion_scope = "모든 본문 씬" if flow_on else "씬 1~2"
    if theme == "animal":
        anchor = get_animal_character_anchor()
        return (
            f"영문(English), Vertical 9:16 세로 풀스크린 구도. "
            f"[고정 동물 캐릭터 모드 - 절대 엄수] 이 영상의 모든 씬(씬 1~마지막 씬)에는 사람이 아닌 반드시 동일한 시그니처 동물 캐릭터({anchor})만 주인공으로 등장해야 합니다! "
            f"씬마다 다른 동물로 바꾸거나 사람을 등장시키지 마세요. "
            f"각 씬의 한국어 대사(예: 밖에서는 텐션 높음, 집에 오자마자 현관에 뻗음, 스마트폰 보며 귀찮아함, 이불 돌돌 말고 숨음, 새침하게 삐짐)에 맞춰 "
            f"이 똑같은 동물 캐릭터의 귀여운 행동·표정·포즈만 상황에 맞게 바꾸어 묘사하세요. "
            f"모든 씬의 visual_prompt는 반드시 'Featuring {anchor}, '로 시작하세요. "
            f"{motion_scope}는 영상(video) 클립용으로 귀여운 미세 움직임(blinking big eyes, flopping down on rug, pawing at smartphone, twitching ears)을 포함하세요. "
            f"no human face, no text, no watermark, no CGI, no cartoon."
        )
    return (
        "영문(English), Vertical 9:16 세로 풀스크린 구도. "
        "감성적이고 시네마틱한 조명(어두운 밤, 은은한 조명, 미스틱한 보케, 네온, 도시 야경 등)과 자연스러운 한국 2030의 일상 장면. "
        f"{motion_scope}는 영상(video) 클립용으로 미세한 움직임(looking at smartphone, turning head, deep breathing)을 묘사. "
        "no text, no watermark, no CGI, no cartoon."
    )


def enforce_scene_visual_consistency(scenes: list, theme: str) -> None:
    """
    대본 생성 후 코드 레벨 세이프넷:
    - theme == 'animal'일 때 모든 씬(CTA 포함)의 visual_prompt가 100% 동일한 시그니처 동물 캐릭터(anchor)를
      사용하도록 강제 보정하고, 실수로 들어간 사람 묘사를 동물 캐릭터로 치환합니다.
    """
    if theme != "animal" or not scenes:
        return

    anchor = get_animal_character_anchor()
    default_animal_actions = [
        "sitting on a cozy sofa staring at a glowing smartphone screen with a relatable exhausted expression, blinking slowly",
        "flopping flat onto a warm living room rug right by the front door as if completely drained after coming home",
        "burrito-wrapped in a soft blanket on bed at night, peeking out with big round eyes under warm lamp light",
        "tilting its head with a sassy knowing expression beside an iced coffee cup on a wooden cafe table",
        "curled up comfortably by a sunlit window, looking softly at the camera and twitching its fluffy ears",
    ]

    for idx, sc in enumerate(scenes):
        raw_prompt = getattr(sc, "visual_prompt", sc.get("visual_prompt") if isinstance(sc, dict) else "") or ""
        raw_low = raw_prompt.lower()

        # 만약 기본 사람 템플릿(CTA 기본 문구 또는 샘플 문구)이면 시그니처 동물 캐릭터 전용 장면으로 완전 교체
        if (
            not raw_prompt.strip()
            or "two young korean women" in raw_low
            or "holding a smartphone by a warm window" in raw_low
            or "hands holding" in raw_low
            or "korean woman" in raw_low
        ):
            action = default_animal_actions[idx % len(default_animal_actions)]
            cleaned = f"Vertical 9:16 portrait ratio, Featuring {anchor}, {action}, cozy natural lighting, no human face, no text, no watermark"
        else:
            cleaned = _HUMAN_SUBJECT_RE.sub("the cute cat", raw_prompt).strip()
            if anchor.lower()[:30] not in cleaned.lower():
                cleaned = f"Featuring {anchor}, {cleaned}"

        if hasattr(sc, "visual_prompt"):
            sc.visual_prompt = cleaned
        elif isinstance(sc, dict):
            sc["visual_prompt"] = cleaned


def format_flow_prompt(
    prompt: str,
    theme: Optional[str] = None,
    asset_type: str = "video",
) -> str:
    """Google Flow(Gemini Omni / Veo) 브라우저 자동화 입력용 고품질 영문 프롬프트를 생성합니다."""
    resolved = detect_theme_from_prompt(prompt, theme)
    clean = (prompt or "").strip().rstrip(".")
    is_image = str(asset_type or "video").strip().lower() == "image"
    omni_quality = (
        "smooth natural handheld smartphone motion, realistic physics, "
        "rich dynamic range and cohesive natural lighting continuity, expressive micro-expressions"
    )
    if resolved == "animal":
        anchor = get_animal_character_anchor()
        if anchor.lower()[:30] not in clean.lower():
            clean = f"Featuring {anchor}. {clean}"
        if is_image:
            return (
                f"Vertical 9:16 portrait smartphone photo: {clean}. "
                f"Ultra-realistic cute pet meme photo filmed on smartphone, consistent identical animal character appearance, "
                f"expressive face, cozy natural lighting, 9:16 vertical full-screen mobile framing, "
                f"centered subject, no human face, no text, no watermark, no CGI, no cartoon."
            )
        return (
            f"Vertical 9:16 portrait smartphone pet video: {clean}. "
            f"Ultra-realistic cute pet meme video filmed on smartphone, consistent identical animal character appearance, "
            f"{omni_quality}, cozy natural lighting, 9:16 vertical full-screen mobile framing, "
            f"centered subject, no human face, no text, no watermark, no CGI, no cartoon."
        )
    if is_image:
        return (
            f"Vertical 9:16 portrait smartphone photo: {clean}. "
            f"Candid realistic Korean everyday scene, natural lighting, "
            f"9:16 vertical full-screen mobile framing, centered subject, no text, no watermark."
        )
    return (
        f"Vertical 9:16 portrait smartphone video: {clean}. "
        f"Candid realistic Korean everyday scene, {omni_quality}, natural lighting, "
        f"9:16 vertical full-screen mobile framing, centered subject, no text, no watermark."
    )


def format_image_prompt(prompt: str, theme: Optional[str] = None) -> str:
    """Gemini 2.5 Flash Image / FLUX / Vertex Imagen 입력용 최종 영문 프롬프트를 생성합니다."""
    resolved = detect_theme_from_prompt(prompt, theme)
    clean = (prompt or "").replace("\n", " ").strip().rstrip(".")
    if resolved == "animal":
        anchor = get_animal_character_anchor()
        if anchor.lower()[:30] not in clean.lower():
            clean = f"Featuring {anchor}. {clean}"
        return f"{clean}. {ANIMAL_REALISM_SUFFIX}"
    return f"{clean}. {HUMAN_REALISM_SUFFIX}"
