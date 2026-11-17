import os, sys, json, random
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
    except: pass

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.script_gen import ReelsScript, Scene, generate_json
from pipeline.text_utils import sanitize_title
from pipeline.visual_theme import (
    build_llm_visual_instruction,
    enforce_scene_visual_consistency,
    resolve_visual_theme,
)

MBTI_TYPES = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"]
MBTI_KEYWORDS = {
    "INTJ":("전략가","냉철한 비전","독립적 완벽주의"),"INTP":("논리학자","사색과 분석","내향적 천재성"),
    "ENTJ":("통솔자","리더십 본능","목표 달성 집착"),"ENTP":("토론가","아이디어 폭발","변화 추구"),
    "INFJ":("옹호자","깊은 공감","이상주의적 직관"),"INFP":("중재자","섬세한 감수성","내면의 가치"),
    "ENFJ":("선도자","인간관계 마스터","타인 성장 지원"),"ENFP":("활동가","열정적 창의성","연결과 자유"),
    "ISTJ":("현실주의자","책임감과 원칙","묵묵한 신뢰"),"ISFJ":("수호자","따뜻한 헌신","세심한 배려"),
    "ESTJ":("경영자","체계와 효율","강한 실행력"),"ESFJ":("집정관","사회적 조화","타인 중심 돌봄"),
    "ISTP":("장인","현장 문제 해결","말보다 행동"),"ISFP":("모험가","감각적 자유","조용한 예술혼"),
    "ESTP":("사업가","순간 포착 실행","현실 적응력"),"ESFP":("연예인","에너지와 재미","삶을 축제로"),
}
FIVE_ELEMENTS = {
    "목(木)":{"color":"초록","symbol":"🌿","booster":"성장·추진력"},
    "화(火)":{"color":"빨강","symbol":"🔥","booster":"열정·인기"},
    "토(土)":{"color":"황색","symbol":"🌍","booster":"안정·포용"},
    "금(金)":{"color":"흰색","symbol":"⚡","booster":"결단·원칙"},
    "수(水)":{"color":"파랑","symbol":"💧","booster":"지혜·유연성"},
}

REELS_PERSONA = """[릴스 100만 바이럴 디렉터 페르소나]
당신은 대한민국 2030 타겟 인스타그램 릴스 & 유튜브 숏츠 100만 뷰 바이럴 전문 디렉터이자, '사주 분석 기반 MBTI 맞춤 조언 및 예측 서비스(mbtiju.com)'의 총괄 콘텐츠 디렉터입니다.
딱딱한 AI 성우 나레이션("첫째 ~입니다, 둘째 ~입니다")은 시청자가 바로 넘깁니다. 실제 한국인 친구/연인이 밝고 따뜻한 카페나 일상 공간에서 마주 앉아 생생하게 주고받는 현실 대화(Google Flow 음성·립싱크 대사)로 15~20초를 구성합니다.
전체 분량 15~20초, 씬 3~4개(시스템이 뒤에 CTA 씬 1개를 덧붙여 총 4~5씬 완성). 씬 1개 = 실제 입으로 바로 내뱉는 짧은 구어체 대화 한 마디(공백 포함 18~34자).
서론·부연·설명조 독백 금지!

[초고속 15초 현실 대화 구조 - 씬별 필수 전개]
1. [1단계: 대화 속 직격 훅 - 씬 1] (2.0~3.0초)
   - 카페에서 친구/연인이 눈을 마주치며 툭 던지는 현실 한마디로 0.5초 만에 스크롤을 멈춥니다.
   - 예시: "야 겉으로는 제일 다정한데 손절은 칼같이 치는 사람 특징 알아?"
   - 절대 금지: "안녕하세요", "오늘은 ~를 알아볼게요", "첫째 ~입니다" 같은 나레이션투 금지!

2. [2단계: 리액션 & 하이퍼 리얼리즘 공감 대화 - 씬 2~3] (2.5~3.5초씩)
   - 상대방이나 화자가 카톡, 연애 갈등, 일상 장면을 실제 대화체로 티키타카처럼 짚어줍니다.
   - 예시: "맞아, 평소엔 다 받아주다가 한 번 선 넘으면 미련 없이 차단하더라.", "진짜 나도 그래, 밖에서는 잘 웃는데 집에 오면 연락 다 끄고 싶음."

3. [3단계: 사주 타고난 기운 & 반전 풀이 - 씬 4] (3.0~3.5초) (mbtiju 핵심 전문성)
   - 친구가 짚어주듯, 성격 문제가 아니라 타고난 사주 원국의 오행이나 신살/일간 에너지 충돌임을 명쾌하게 풀어줍니다.
   - 예시: "근데 그게 냉정한 게 아니라 사주에 금(金) 기운이 강해서 선이 명확한 거래."

[narration & title 작성 규칙 - 절대 엄수]
- [제목(title) 작성 규칙 - 절대 엄수]: 제목에는 INFP, ESTJ 같은 특정 MBTI 4글자나 을목, 임수 같은 특정 사주 일간을 절대 직접 쓰지 마세요! 다른 부연 설명이나 괄호 태그 없이 핵심 주제만 직관적으로 작성하세요. (좋은 예: "겉은 다정한데 손절 칼같은 이유", "정 떨어지면 뒤도 안 돌아보는 이유", "헤어진 그 사람, 연락하면 망하는 이유") (절대 금지: "INFP 특징", "00년생 ESFJ", "을목 여자 특징", 말 끊기는 표현)
- 제목(title)은 공백 포함 14~20자 내외로, 말이 중간에 끊기지 않고 명사(이유/특징/신호 등)나 서술어로 완결되는 핵심 주제 문장이어야 합니다.
- 제목(title)에 한자 금지, 한글/영문 대문자/숫자만 사용.
- MBTI 유형(예: INFP, ENTJ, ESFJ) 및 'MBTI' 단어는 본문 대사 작성 시 한글 음차(인프피, 엠비티아이)가 아닌 반드시 표준 영문 대문자(예: INFP, MBTI)로 작성하세요.
- narration 필드에는 한자(漢字)를 절대 포함하지 마세요. 실제 사람이 말하는 자연스러운 순수 한글 대화체로 작성합니다.
- [용어 금지 - 절대 엄수] 제목(title), 훅(hook), 씬 1 narration(첫 대사)에는 일간(갑목·을목·병화 등)·신살(도화살 등)·십성(식신·정인 등)·대운·오행 같은 사주 전문 용어를 쓰지 마세요. 누구나 바로 대입되는 일상 대화로 열고, 이런 용어는 씬 3~4 대화에서 풀어주세요."""

FIXED_SHORTFORM_CTA = "내 생년월일과 MBTI 조합의 삼 년 운세와 솔루션은 댓글에 분석 남기거나 프로필 링크에서 무료로 확인해보세요!"
FIXED_CAPTION_CTA = "💬 댓글에 [분석] 남겨주세요!\n👉 프로필 링크에서 내 생년월일 x MBTI 조합의 3년 운세와 솔루션을 무료로 확인하세요!"


DOMAIN_LABELS = {
    "SAJU": "사주", "SHINJEOM": "신점", "JAMIDOSU": "자미두수", "TAROT": "타로",
}


def build_series_prompt(series: str, context: dict) -> str:
    if series == "MBTI":
        mbti = context.get("mbti", "INFP")
        nick, t1, t2 = MBTI_KEYWORDS.get(mbti, ("","",""))
        base = f"{REELS_PERSONA}\n\n[MBTI 시리즈: {mbti} ({nick})]\n핵심: {t1}, {t2}\n일상 공감 후킹으로 시작 → {mbti}의 연애·인간관계 속마음 해부 → 사주 오행/십성 교차 반전 → 현실 팁\n해시태그: #{mbti} #사주 #운세 #MBTI궁합 #병오년 #릴스"
    elif series == "DAILY":
        el = context.get("element", "목(木)")
        el_display = el.split("(")[0]  # 한자 표기는 모델 프롬프트에서 제외해 narration에 새어들어가는 것을 방지
        info = FIVE_ELEMENTS.get(el, {})
        base = f"{REELS_PERSONA}\n\n[오행 랭킹/특성 시리즈: {el_display}]\n색상: {info.get('color','')} | 기운: {info.get('booster','')}\n후킹 → 오행별 순위·특성 설명 → 실생활 팁\n해시태그: #{el_display} #사주 #병오년 #릴스"
    elif series in DOMAIN_LABELS:
        label = DOMAIN_LABELS[series]
        topic = context.get("topic", f"{label} 특성 TOP 랭킹")
        base = f"{REELS_PERSONA}\n\n[{label} 바이럴 시리즈]\n주제 및 기획 설계: {topic}\n초반 1.5초 후킹 → 일상 공감 장면 3연타 → {label} 명리학 핵심 반전 해석(장점 1 : 아픈 점 2) → 현실 솔루션\n해시태그: #{label} #운세 #병오년 #사주풀이 #릴스"
    else:
        base = f"{REELS_PERSONA}\n\n주제: {context.get('topic','운세 릴스')}"

    # MBTI/DAILY 시리즈는 기본 틀만 있으므로, 구체적 주제(기획안/사용자 지정)가 있으면 반드시 반영
    custom_topic = str(context.get("topic", "")).strip()
    if custom_topic and series in ("MBTI", "DAILY", "ELEMENT"):
        base += f"\n\n[이번 영상의 구체적 주제 - 반드시 이 주제를 중심으로 작성]\n{custom_topic}"

    trend_hint = str(context.get("trend_hint", "")).strip()
    if trend_hint:
        base += f"\n\n[참고할 실시간 트렌드 헤드라인]\n\"{trend_hint}\"\n(이 트렌드를 자연스러운 후킹이나 사례로 녹여내되, 억지로 끼워 맞추지는 마세요.)"
    return base


# pipeline.cta 임포트 실패 시에만 쓰는 폴백 (서비스에서 확인된 문구만 사용)
DYNAMIC_SHORTFORM_CTAS = [
    ("내 일간이 궁금하면 댓글에 사주 남기거나 프로필 링크에서 가입 없이 삼십 초 만에 무료로 확인해보세요!", "💬 댓글에 [사주] 남기거나\n👉 프로필 링크에서 가입 없이 30초 무료 체험, 내 일간부터 확인하세요!"),
]


def _enforce_plain_hook(script: ReelsScript, topic: str = "") -> ReelsScript:
    """화면 제목, hook, 첫 장면 음성(씬 1)에 사주 전문 용어가 있으면 쉬운 말로 다시 쓴다.
    재작성 후에도 남으면 제목/훅만 용어 없는 대체안으로 바꾼다(씬 1은 영상 흐름 때문에 그대로 두고 경고만)."""
    from pipeline import hook_guard
    scene1 = script.scenes[0].narration if script.scenes else ""
    fields = {k: v for k, v in
              {"title": script.title or "", "hook": script.hook or "", "scene1": scene1}.items() if v}
    # 재작성 맥락은 주문 주제가 아니라 '실제 대본 내용'이어야 제목과 영상 내용이 어긋나지 않는다
    body = " ".join(sc.narration for sc in script.scenes[:4] if getattr(sc, "narration", ""))
    out, remaining = hook_guard.enforce_plain(fields, context=body or topic or script.title or "")
    if "title" in out:
        script.title = out["title"]
    if "hook" in out:
        script.hook = out["hook"]
    if "scene1" in out and script.scenes:
        script.scenes[0].narration = out["scene1"]
    for key in remaining:
        if key == "title":
            script.title = hook_guard.plain_fallback()[0]
        elif key == "hook":
            s1 = out.get("scene1", "")
            script.hook = s1 if s1 and not hook_guard.find_jargon(s1) else hook_guard.plain_fallback()[1]
        else:
            print("[HOOK_GUARD][WARN] 씬 1 나레이션에 사주 용어가 남아 있습니다(재작성 실패).")
    return script


def _enforce_shortform_cta(
    script: ReelsScript,
    series: str = "",
    topic: str = "",
    visual_theme: str = "human",
) -> ReelsScript:
    """숏폼(릴스, 숏츠)의 씬별 media_type 지정(Flow 활성화 시 전 본문 씬 video) 및 마지막 씬 CTA를 적용합니다."""
    from pipeline.flow_automation import is_flow_enabled
    from pipeline.visual_gen import _video_hook_count

    video_limit = _video_hook_count(is_flow_enabled())
    for idx, sc in enumerate(script.scenes):
        sc.media_type = "video" if idx < video_limit else "image"

    # 영상마다 자연스럽게 순환하는 고전환 CTA 멘트 적용
    try:
        from pipeline.cta import apply_reel_cta
        # 15~20초 초고속 템포 유지를 위해 CTA 씬은 1개(use_share=False)로 슬림화하여 완주율 극대화
        chosen_short_cta, chosen_caption_cta = apply_reel_cta(
            script.scenes, script.instagram_caption, series, topic or script.title, use_share=False
        )
    except Exception:
        chosen_short_cta, chosen_caption_cta = random.choice(DYNAMIC_SHORTFORM_CTAS)
        if script.scenes:
            script.scenes[-1].narration = chosen_short_cta
            if script.scenes[-1].duration_estimate < 3:
                script.scenes[-1].duration_estimate = 4

    # CTA 씬 추가 이후 전체 씬의 비주얼 테마(특히 animal 모드의 고정 캐릭터 일관성) 강제 보정
    enforce_scene_visual_consistency(script.scenes, visual_theme)

    # 기존 일반 멘트가 있다면 고전환 멘트로 교체
    script.instagram_caption = script.instagram_caption.replace(FIXED_CAPTION_CTA, "").strip()
    old_cta_pattern = "프로필 링크에서 당신의 모든 운명을 확인하세요!"
    if old_cta_pattern in script.instagram_caption:
        script.instagram_caption = script.instagram_caption.replace(
            f"👉 {old_cta_pattern}", chosen_caption_cta
        ).replace(old_cta_pattern, chosen_caption_cta)
    elif chosen_caption_cta not in script.instagram_caption:
        if "#" in script.instagram_caption:
            parts = script.instagram_caption.split("#", 1)
            script.instagram_caption = f"{parts[0].strip()}\n\n{chosen_caption_cta}\n\n#{parts[1]}"
        else:
            script.instagram_caption = f"{script.instagram_caption.strip()}\n\n{chosen_caption_cta}"

    # 오늘의 운세 관련 해시태그 정리
    script.instagram_caption = script.instagram_caption.replace("#오늘의운세", "#운세").replace("#오늘운세", "#운세")

    # 제목/훅/씬1에서 사주 전문 용어 제거 (hook_guard)
    _enforce_plain_hook(script, topic)

    # 제목에서 특정 MBTI/사주 지칭을 포괄적인 대중 언어('사람 특징', 'MBTI', '사주')로 자동 변환
    from pipeline.text_utils import make_title_inclusive
    script.title = make_title_inclusive(script.title)

    # 제목 줄바꿈 제거 및 길이 제한
    from pipeline.topic_planner import _fit_title
    script.title = _fit_title(script.title, limit=22)
    return script


def generate_mbti_saju_script(series: str, context: Optional[dict] = None, model_name: Optional[str] = None) -> ReelsScript:
    if context is None: context = {}
    raw_theme = str(context.get("visual_theme", "")).strip().lower()
    visual_theme = raw_theme if raw_theme in ("human", "animal") else resolve_visual_theme(raw_theme or None, consume_queue=False)
    visual_rule = build_llm_visual_instruction(visual_theme)
    system_prompt = build_series_prompt(series, context)
    user_prompt = f"""인스타그램 100만 바이럴 릴스 대본 JSON을 작성하세요.
시리즈: {series} | 비주얼 컨셉: {visual_theme.upper()} | 컨텍스트: {json.dumps(context, ensure_ascii=False)}
JSON 스키마:
- title: 릴스 화면 상단 제목 (14~20자 완성된 훅 제목. INFP 등 특정 MBTI 4글자나 을목 등 특정 사주 일간 직접 지칭 절대 금지! 누구나 호기심을 갖도록 '사람 특징', 'MBTI', '사주' 등 포괄적 대중 언어 사용. 결핍·궁금증 자극, 말 끊김 금지, 한자 절대 금지)
- hook: 초반 2초 후킹 대사 (사주 전문 용어 금지, 일상 장면으로)
- scenes: 씬 리스트 3~4개 (뒤에 시스템이 초고속 CTA 씬 1개를 자동 추가하여 총 4~5씬, 15~18초 완주율 100%+ 완성)
  * scene_id: 1부터 순차 증가
  * narration: 실제 한국 사람이 친구/연인 앞에서 직접 말하는 생생한 구어체 대화 한 마디(공백 포함 18~34자, 한자 절대 금지, TTS 설명조 금지)
  * visual_prompt: {visual_rule}
  * duration_estimate: 3~4초
  * media_type: 씬 1~2는 "video", 씬 3 이후는 "image"
  * 마지막 씬 narration은 대화 속 사주 원인 반전 한 줄로 마무리 (프로필 링크/댓글 CTA 문장은 시스템이 뒤에 자동으로 붙이므로 직접 쓰지 말 것)
- instagram_caption: 공감 요약 + 이모지 + 인기 해시태그 10개 이상 (CTA 문구는 시스템이 자동 삽입)"""
    try:
        script = generate_json(system_prompt, user_prompt, ReelsScript, temperature=0.8, model_name=model_name)
        return _enforce_shortform_cta(script, series, str(context.get("topic", "")), visual_theme=visual_theme)
    except Exception as e:
        print(f"[WARNING] LLM 대본 생성 실패 ({e}). 폴백 대본 사용.")
        return _enforce_shortform_cta(_fallback(series, context), series, str(context.get("topic", "")), visual_theme=visual_theme)


def _fallback(series: str, context: dict) -> ReelsScript:
    mbti = context.get("mbti", "ENFP")
    nick, t1, t2 = MBTI_KEYWORDS.get(mbti, ("활동가","열정","자유"))
    return ReelsScript(
        title="겉은 밝은데 손절 칼같은 이유",
        hook="야 솔직히 겉으로는 다정한데 속은 제일 냉정한 사람 본 적 있지?",
        scenes=[
            Scene(scene_id=1, narration=f"야 솔직히 {mbti} 중에 겉은 웃는데 손절은 진짜 칼같이 치는 사람 많잖아.", duration_estimate=3, media_type="video",
                  visual_prompt="Vertical 9:16 portrait ratio, bright warm sunlit cafe lighting, candid smartphone video of a Korean woman in her late 20s sitting across a wooden table talking naturally in Korean to her friend with expressive face, shallow depth of field, no text"),
            Scene(scene_id=2, narration="맞아, 밖에서는 텐션 엄청 높은데 집에 오면 연락 다 끄고 잠수타더라.", duration_estimate=3, media_type="video",
                  visual_prompt="Vertical 9:16 portrait ratio, bright warm cozy indoor daylight, candid smartphone video of a young Korean friend nodding and speaking warmly with coffee cups on table, no text"),
            Scene(scene_id=3, narration="근데 그게 성격이 나빠서가 아니라 사주에 금 기운이 강해서 선이 명확한 거래.", duration_estimate=4, media_type="video",
                  visual_prompt="Vertical 9:16 portrait ratio, bright warm afternoon window sunlight, Korean woman leaning in and speaking sincerely in Korean conversation, clear natural skin texture, no text"),
            Scene(scene_id=4, narration="진짜 나도 그런 편이라 소름 돋네, 내 사주에도 있나 확인해봐야겠다.", duration_estimate=3, media_type="image",
                  visual_prompt="Vertical 9:16 portrait ratio, bright sunlit Korean cafe table, smiling Korean woman glancing softly at smartphone while chatting, warm daylight, no text"),
        ],
        instagram_caption=f"✨ 겉은 밝은 {mbti} ({nick}), 사주로 본 진짜 속마음\n\n{FIXED_CAPTION_CTA}\n\n#{mbti} #MBTI운세 #사주 #운세 #병오년운세 #MBTI분석 #사주궁합 #도화살 #릴스"
    )
