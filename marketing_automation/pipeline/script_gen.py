"""
Instagram Reels Script Generation Module using LLM JSON output (Gemini free tier first, OpenAI gpt-4o-mini fallback).
"""
import os
import json
from typing import List, Optional
from pydantic import BaseModel, Field
import sys
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()


class Scene(BaseModel):
    scene_id: int = Field(
        ...,
        description="장면 순번 (1부터 순서대로 증가)"
    )
    narration: str = Field(
        ...,
        description="실제 한국 사람이 일상에서 마주 보고 말하는 생생한 구어체 대화 대사(AI 성우 설명조 금지). 한 씬 = 짧은 대화 한 마디(공백 포함 18~34자), Flow 영상 속 인물 립싱크·음성 대사로 사용."
    )
    visual_prompt: str = Field(
        ...,
        description="비주얼/영상 생성용 구체적 영문 프롬프트. Vertical 9:16 세로(portrait) 풀스크린 구도, 따뜻하고 밝은 자연광 카페/실내에서 표정이 선명하게 보이는 한국 2030 인물이 대화하는 장면 묘사, 텍스트 배제 지침 포함."
    )
    duration_estimate: int = Field(
        ...,
        description="해당 장면의 예상 재생 시간 (초 단위, 대화 길이에 따라 3~5초 내외)"
    )
    media_type: str = Field(
        default="image",
        description="비주얼 소스 타입: 본문 대화 씬은 'video'"
    )


class ReelsScript(BaseModel):
    title: str = Field(
        ...,
        description="영상 제목 (공백 포함 14~22자 내외, 다른 부연 없이 핵심 주제만 직관적으로 적고 말이 끊기지 않고 명사·서술어로 완결되는 제목)"
    )
    hook: str = Field(
        ...,
        description="초반 2.5초 안에 시청자의 이탈을 막는 강력한 후킹 멘트"
    )
    scenes: List[Scene] = Field(
        ...,
        description="영상을 구성하는 씬 리스트 (총 8~10개 씬으로 전체 길이 20~30초 구성, 씬이 짧고 빠르게 넘어가야 함)"
    )
    instagram_caption: str = Field(
        ...,
        description="인스타그램 업로드용 본문 캡션 (핵심 요약 + 독자 댓글/공유 유도 콜투액션 + 관련 인기 해시태그 8~12개)"
    )


def get_gemini_client():
    """
    환경 변수에 따라 google-genai Client를 적절한 모드(API Key 또는 Vertex AI)로 초기화합니다.
    """
    from google import genai

    api_key = os.getenv("GEMINI_API_KEY")
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("GCP_LOCATION", "us-central1")
    service_account = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    force_vertex = os.getenv("USE_VERTEX_GEMINI", "").strip().lower() in ("1", "true", "yes")

    # 1. AI Studio API Key 모드 (기본 우선순위: 서비스 계정 키가 있어도 Vertex AI API가
    #    비활성화되어 있을 수 있으므로, 명시적으로 강제하지 않는 한 API 키를 우선 사용합니다.)
    if api_key and not api_key.startswith("your_") and not force_vertex:
        return genai.Client(api_key=api_key)

    # 2. Vertex AI 모드 (USE_VERTEX_GEMINI=true 로 명시했거나 API 키가 없는 경우)
    if service_account and os.path.isfile(service_account):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = service_account
        return genai.Client(vertexai=True, project=project, location=location)

    # 3. 환경 변수 기본값 시도
    return genai.Client()


DEFAULT_LLM_MODEL = "gpt-4o-mini"
DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash"


def get_llm_model(model_name: Optional[str] = None) -> str:
    """텍스트 생성에 쓸 OpenAI 모델명 (인자 > OPENAI_MODEL 환경변수 > gpt-4o-mini)."""
    return model_name or os.getenv("OPENAI_MODEL") or DEFAULT_LLM_MODEL


def get_openai_client():
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
    return OpenAI(api_key=api_key)


def _llm_providers() -> List[str]:
    """LLM_PROVIDER(gemini|openai)를 1순위로, 나머지를 폴백으로 둔 호출 순서."""
    first = os.getenv("LLM_PROVIDER", "gemini").strip().lower()
    first = first if first in ("gemini", "openai") else "gemini"
    return [first, "openai" if first == "gemini" else "gemini"]


def _parse_json_text(raw: str):
    raw = (raw or "").strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


def _generate_json_openai(system_prompt, user_prompt, schema, temperature, model_name):
    client = get_openai_client()
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    model = get_llm_model(model_name if model_name and not model_name.startswith("gemini") else None)

    if schema is not None:
        # json_object 모드는 프롬프트에 'JSON' 언급과 스키마 안내가 있어야 안정적입니다.
        messages[-1]["content"] += (
            "\n\n반드시 아래 JSON 스키마를 따르는 JSON 객체만 출력하세요:\n"
            + json.dumps(schema.model_json_schema(), ensure_ascii=False)
        )
    elif not any("json" in m["content"].lower() for m in messages):
        messages[-1]["content"] += "\n\nJSON 객체만 출력하세요."

    res = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    return _parse_json_text(res.choices[0].message.content)


def _generate_json_gemini(system_prompt, user_prompt, schema, temperature, model_name):
    from google.genai import types

    client = get_gemini_client()
    model = model_name if model_name and model_name.startswith("gemini") else (
        os.getenv("GEMINI_TEXT_MODEL") or DEFAULT_GEMINI_TEXT_MODEL
    )
    config = {"response_mime_type": "application/json", "temperature": temperature}
    if system_prompt:
        config["system_instruction"] = system_prompt
    if schema is not None:
        config["response_schema"] = schema
    response = client.models.generate_content(
        model=model, contents=user_prompt, config=types.GenerateContentConfig(**config)
    )
    parsed = getattr(response, "parsed", None)
    if schema is not None and parsed is not None:
        return parsed if isinstance(parsed, schema) else schema.model_validate(parsed)
    return _parse_json_text(response.text)


def generate_json(system_prompt: Optional[str], user_prompt: str, schema=None,
                  temperature: float = 0.7, model_name: Optional[str] = None):
    """
    LLM으로 JSON 응답을 생성합니다. LLM_PROVIDER(기본 gemini)를 먼저 시도하고,
    실패(무료 한도 초과 등)하면 다른 프로바이더로 자동 폴백합니다.
    schema(pydantic 모델)가 있으면 검증된 인스턴스를, 없으면 dict를 반환합니다.
    """
    runners = {"gemini": _generate_json_gemini, "openai": _generate_json_openai}
    last_err = None
    for provider in _llm_providers():
        try:
            data = runners[provider](system_prompt, user_prompt, schema, temperature, model_name)
            return schema.model_validate(data) if schema is not None and isinstance(data, dict) else data
        except Exception as e:
            last_err = e
            print(f"[LLM][WARN] {provider} 호출 실패, 다음 프로바이더 시도: {str(e)[:200]}")
    raise RuntimeError(f"모든 LLM 프로바이더 호출 실패: {last_err}")


SYSTEM_PROMPT = """
당신은 인스타그램 릴스(Reels) 100만 바이럴 전문 디렉터이자 카피라이터입니다.
주어진 주제를 바탕으로 딱딱한 성우 나레이션 대신, 실제 한국인 친구·연인이 밝고 따뜻한 일상에서 직접 주고받는 생생한 대화로 시청 지속 시간과 공감을 극대화하는 9:16 세로 릴스 대본을 기획하세요.

[100만 바이럴 대화형 구성 법칙]
1. 씬 1 (초반 1.5초 스크롤 정지 대화 훅, media_type="video"):
   - 지루한 인사("안녕하세요", "첫째 ~입니다") 절대 금지!
   - 카페/실내에서 마주 앉아 툭 던지는 현실 대화 한 마디로 시작하세요 ("야 겉으로는 다정한데 손절은 진짜 칼같은 사람 특징 알아?", "야 헤어진 그 사람한테 지금 연락하면 망하는 이유 뭔지 알아?").
2. 씬 2~3 (공감 리액션 & 일상 팩폭 대화, media_type="video"):
   - 상대방이나 화자가 카톡, 퇴근 후 침대, 연애 갈등 등을 실제 대화체("맞아, 평소엔 웃다가도 선 넘으면 바로 차단하더라")로 빠르게 주고받습니다 (1씬 18~34자).
3. 씬 4 (사주 x MBTI 원인 해부 및 반전):
   - "근데 그게 성격 문제가 아니라 사주에 금(金) 기운이 강해서 선이 명확한 거래"처럼 명리학 근거를 대화 속에서 풀어줍니다.
4. 씬 5 (결론/현실 조언):
   - 대화 마무리 한 줄 조언으로 끝내세요. (프로필 링크/댓글 CTA는 시스템이 뒤에 자동 추가합니다.)
5. 대화 대사 & 제목 규칙 (절대 엄수):
   - 제목(title)에는 특정 MBTI(INFP 등)나 특정 사주(을목 등)를 직접 쓰지 말고, 다른 부연 없이 핵심 주제만 '사람 특징', 'MBTI 유형', '사주' 등 포괄적 대중 언어로 쓰세요.
   - MBTI 유형(예: INFP, ENTJ, ESFJ) 및 'MBTI' 단어는 본문 대사 시 반드시 표준 영문 대문자(예: INFP, MBTI)로 작성하세요.
   - narration과 title에는 한자(漢字)를 절대 포함하지 마세요. 본문은 실제 사람이 말하는 순수 한글 대화체만 사용합니다.
   - title(화면 제목)은 공백 포함 14~22자 내외로, 말이 중간에 끊기지 않고 명사나 서술어로 완결되는 핵심 주제 문장으로 작성하세요. (예: "겉은 다정한데 손절 칼같은 이유", "헤어진 그 사람, 연락하면 망하는 이유")
6. visual_prompt (밝은 인물 중심 대화 숏폼 가이드):
   - 반드시 '영문(English)'으로 작성, Vertical 9:16 세로 풀스크린 비율.
   - 어두운 밤/검은 배경 금지! 따뜻하고 밝은 자연광 카페나 실내 조명 아래 한국 2030 인물의 표정과 얼굴이 선명하게 보이는 미디엄 클로즈업 구도(bright warm cafe daylight, clear expressive Korean person portrait centered in medium close-up, speaking naturally in Korean conversation with expressive facial reactions)로 작성하세요. no text, no watermark, no CGI.
"""


from pipeline.text_utils import make_title_inclusive, sanitize_title
from pipeline.topic_planner import _fit_title
from pipeline.visual_theme import (
    build_llm_visual_instruction,
    enforce_scene_visual_consistency,
    resolve_visual_theme,
)


def generate_script(
    topic: str,
    model_name: Optional[str] = None,
    visual_theme: Optional[str] = None,
) -> ReelsScript:
    """
    주제(topic)를 받아 Gemini를 통해 구조화된 ReelsScript 객체를 반환합니다.
    """
    resolved_theme = (
        visual_theme.strip().lower()
        if visual_theme and visual_theme.strip().lower() in ("human", "animal")
        else resolve_visual_theme(visual_theme, consume_queue=False)
    )
    visual_rule = build_llm_visual_instruction(resolved_theme)
    prompt = (
        f"다음 주제에 대해 인스타그램 릴스 대본을 기획해주세요:\n\n"
        f"주제: {topic}\n"
        f"비주얼 컨셉({resolved_theme.upper()}): {visual_rule}"
    )

    script = generate_json(SYSTEM_PROMPT, prompt, ReelsScript, temperature=0.7, model_name=model_name)

    def _enforce_cta(sc: ReelsScript) -> ReelsScript:
        from pipeline.flow_automation import is_flow_enabled
        from pipeline.visual_gen import _video_hook_count

        video_limit = _video_hook_count(is_flow_enabled())
        for idx, s in enumerate(sc.scenes):
            s.media_type = "video" if idx < video_limit else "image"
        is_fortune = any(w in (topic + " " + sc.title) for w in ["사주", "운명", "운세", "타로", "신점", "자미두수", "궁합", "도화살", "대운"])
        if is_fortune:
            try:
                from pipeline.cta import apply_reel_cta
                _, caption_cta = apply_reel_cta(sc.scenes, sc.instagram_caption, "", topic or sc.title, use_share=False)
            except Exception:
                caption_cta = "💬 댓글에 [사주] 남기거나 👉 프로필 링크에서 내 일간부터 무료로 확인하세요!"
        else:
            fixed_cta = "댓글로 의견을 남기거나 프로필 링크에서 더 자세한 전체 내용을 확인해보세요!"
            caption_cta = "👉 프로필 링크에서 더 자세한 꿀팁과 전체 내용을 확인하세요!"
            if sc.scenes:
                sc.scenes[-1].narration = fixed_cta
                if sc.scenes[-1].duration_estimate < 3:
                    sc.scenes[-1].duration_estimate = 4
        if caption_cta not in sc.instagram_caption:
            if "#" in sc.instagram_caption:
                parts = sc.instagram_caption.split("#", 1)
                sc.instagram_caption = f"{parts[0].strip()}\n\n{caption_cta}\n\n#{parts[1]}"
            else:
                sc.instagram_caption = f"{sc.instagram_caption.strip()}\n\n{caption_cta}"
        sc.title = _fit_title(make_title_inclusive(sc.title), limit=22)
        enforce_scene_visual_consistency(sc.scenes, resolved_theme)
        return sc

    return _enforce_cta(script)


def create_sample_script(topic: str, visual_theme: Optional[str] = None) -> ReelsScript:
    """
    API 키가 없거나 테스트/오프라인 환경일 때 파이프라인 전체 동작을 검증하기 위한 샘플 대본입니다.
    """
    resolved_theme = (
        visual_theme.strip().lower()
        if visual_theme and visual_theme.strip().lower() in ("human", "animal")
        else resolve_visual_theme(visual_theme, consume_queue=False)
    )
    fixed_cta = "댓글에 사주라고 남기거나 프로필 링크에서 삼십 초 만에 내 일간을 무료로 확인해보세요!"
    caption_cta = "💬 댓글에 [사주] 남기거나\n👉 프로필 링크에서 가입 없이 30초 무료 체험으로 내 일간부터 확인하세요!"
    sample = ReelsScript(
        title=f"{topic}"[:16],
        hook="여기서 세 개 이상 맞으면 사주에 도화살이 낀 사람입니다.",
        scenes=[
            Scene(
                scene_id=1,
                narration="솔직히 여기서 세 개 이상 해당되면 사주에 도화살이 낀 사람입니다.",
                visual_prompt="Horizontal 16:9 landscape ratio, candid smartphone video of a Korean woman in her late 20s at a cozy cafe window seat looking up from her phone with subtle natural movement, natural daylight, no text, no watermark",
                duration_estimate=3,
                media_type="video",
            ),
            Scene(
                scene_id=2,
                narration="첫째 가만히 있어도 길에서 도를 아십니까나 번호 따이는 일이 유독 잦아요.",
                visual_prompt="Horizontal 16:9 landscape ratio, candid shot of a Korean woman walking down a lively Seoul street in Seongsu at sunset, natural available light, no text",
                duration_estimate=4,
                media_type="video",
            ),
            Scene(
                scene_id=3,
                narration="둘째 겉으로는 엄청 다정해 보이는데 한 번 마음이 식으면 뒤도 안 돌아보고 손절합니다.",
                visual_prompt="Horizontal 16:9 landscape ratio, close-up candid photo of hands holding an iced americano on a wooden table, soft afternoon sunlight, no text",
                duration_estimate=4,
                media_type="image",
            ),
            Scene(
                scene_id=4,
                narration="사실 이게 어장관리가 아니라 사주에 을목이나 홍염살 기운이 강해서 생기는 특징이거든요.",
                visual_prompt="Horizontal 16:9 landscape ratio, candid photo of a Korean woman reading a book quietly in her warm bedroom at night under a desk lamp, no text",
                duration_estimate=4,
                media_type="image",
            ),
            Scene(
                scene_id=5,
                narration=fixed_cta,
                visual_prompt="Horizontal 16:9 landscape ratio, candid photo of a Korean woman holding a smartphone smiling softly at home, natural window light, no text",
                duration_estimate=4,
                media_type="image",
            ),
        ],
        instagram_caption=f"""🔥 {topic}, 내 얘기인지 체크해보세요!

{caption_cta}

#사주 #MBTI #도화살 #운세 #연애심리 #병오년운세 #사주풀이 #릴스"""
    )
    enforce_scene_visual_consistency(sample.scenes, resolved_theme)
    return sample


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Reels 대본 기획 테스트 CLI")
    parser.add_argument("--topic", type=str, default="여기서 3개 이상 맞으면 도화살 사주", help="릴스 주제")
    parser.add_argument("--mock", action="store_true", help="API 호출 없이 샘플 데이터 생성")
    args = parser.parse_args()
    if args.mock:
        print(create_sample_script(args.topic).model_dump_json(indent=2))
    else:
        print(generate_script(args.topic).model_dump_json(indent=2))
