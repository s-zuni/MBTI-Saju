---
name: reels-composer
description: insta_auto 저장소의 MBTI×사주 릴스/숏츠 파이프라인을 만들거나 수정할 때 따라야 할 디자인/엔지니어링 스펙(프레임 레이아웃, 폰트/한자 처리, 자막 줄바꿈, 씬 전환, 하이브리드 비디오/Google Flow 연동, -30dB 무음 칼컷, 100만 바이럴 투트랙 기획). "릴스 레이아웃/자막/폰트/전환 고쳐줘", "영상이 미숙해 보인다", "100만 바이럴 기획" 같은 요청에 사용.
---

# Reels Composer 스펙

이 파일은 `insta_auto` 파이프라인이 생성하는 영상의 디자인/동작 규격을 정의합니다. 아래 수치와
규칙은 이번 프로젝트에서 여러 차례 시행착오(카드형 박스 디자인 거부, 한자 중복 발음 버그, 단어수
기반 자막 분할의 부자연스러움 등)를 거쳐 확정된 것이므로, 코드를 다시 설계하기 전에 먼저 읽으세요.

## 1. 프레임 레이아웃 (`pipeline/visual_gen.py :: compose_reels_frame`) — 2차 기획안 확정

캔버스 1080x1920 (9:16). 카드형 박스는 사용하지 않는다(거부된 디자인).

- **제목**: Pretendard Bold 128px, 가운데 정렬, 텍스트 상단 Y=265, 검정 외곽선(stroke 8). 최대 2줄
  (이미지 침범 방지) — 2줄을 넘으면 폰트를 8px씩 줄여(최소 88) 맞춘다. 줄바꿈은 `wrap_by_pixel_width()`.
  카테고리 태그/액센트 라인은 제거됨.
- **이미지/비디오 스트립**: 16:9(1080x608)를 캔버스 세로 정중앙(y=656)에 배치.
- **자막**: `composer.py` ASS 하드번인. 96px, 흰 글씨 + 검정 박스(BorderStyle=3), 상단 Y=1423
  (Alignment=8, MarginV=`SUBTITLE_Y`), 가운데 정렬.
  Inter는 한글 글리프가 없어 Inter 기반 한글 폰트인 Pretendard Bold로 대체.
- 배경: 다크 그라디언트 `#111121` → `#08080d`.

## 2. 폰트 / 한자 처리

- 사용 폰트: `assets/fonts/Pretendard-Bold.otf` (제목/태그/자막/커버/캐러셀 공통, 파일이 없으면 NanumGothic-Bold로 대체). ASS Fontname은 `Pretendard`.
- **나레이션(narration)과 제목(title)에는 한자를 절대 포함하지 않는다.** TTS 엔진이 같은 발음의 한글+한자를
  중복으로 읽는 버그가 있었음(`"토(土)사주"` → 음성 `"토토 사주"`), 제목은 폰트 글리프 누락 방지. 방어는 2중:
  1. 프롬프트 지시: `script_gen.py` SYSTEM_PROMPT, `mbti_saju_content.py` REELS_PERSONA에 한자 금지 문구가 있음.
  2. 코드 세이프넷: `pipeline/text_utils.sanitize_narration()`, `sanitize_title()`을 대본 생성 직후 적용.

## 3. 자막 (`pipeline/composer.py`, `pipeline/text_utils.py`)

- **정적 자막 원칙 (카라오케/단어색상 변경 금지)**:
  - ASS 하드번인 시 음성 타이밍에 따라 단어 색이나 채우기가 변하는 카라오케 효과(`\kf`) 및 단어별 색상 강조(`_colorize_token`)는 사용하지 않는다.
  - 모든 자막은 깔끔한 정적 흰 글씨(`&H00FFFFFF`) + 검정 박스(`BorderStyle=3`), 80px(`Pretendard-Bold`), 상단 Y=1430(`Alignment=8`), 가운데 정렬로 표시한다.
- **자연스러운 한국어 줄바꿈 & 줄넘김 (`split_into_clauses`, `wrap_balanced_subtitle_lines`)**:
  1. `split_into_clauses()` — 문장부호(`. ! ? ,`)와 한국어 어미(`~요/~죠/~다/~는데/~지만/~거든/~니까` 뒤) 기준으로 자연스러운 구(clause) 단위로 분할. 단, `아니면/화면/내면/반면` 등 `면`으로 끝나는 접속사·명사는 분리하지 않으며, 쉼표 뒤의 짧은 접속/수식 어절은 앞 구절이 아닌 뒤 구절(forward merge)로 병합하고 의존 서술어 꼬리(`거예요./있어요./있잖아요./있거든요.`)만 앞 구절과 함께 유지한다.
  2. `wrap_balanced_subtitle_lines()` — 각 구절을 ASS 스타일과 동일한 폰트/크기(`Pretendard` 80px)로 실측하여 픽셀 폭(940px, `SUBTITLE_MAX_WIDTH`) 기준 균형 2줄 분할($\min |W_1 - W_2| + \text{GrammarPenalty}$)을 적용한다. 의존명사·보조용언(`해야 할지`, `막막할 때`, `짚어준다는 거예요`, `볼 수도 있거든요`, `알고 싶은 분들은`, `실천 체크리스트까지`) 사이가 찢어지거나 3번째 줄 외톨이 블록(2+1 스필오버)이 생기지 않도록 2줄 초과 구절은 중간 의미 경계에서 균등 재분할한다.
  3. 각 자막 블록은 `align_word_times()`(TTS `word_timings` 기반, 미제공 시 글자 수 비례 배분)로 실제 발화 구간과 정확히 동기화된다 (`build_caption_chunks`).

## 4. 씬 전환 & 하이브리드 비디오/모션 (`pipeline/composer.py`, `pipeline/flow_automation.py`)

- **절제된 모션 그래픽스 표준 (`remotion-dev/skills` · `video-agent-skills` 적용)**:
  - 과도하거나 산만한 효과는 지양하고, 핵심 정보 전달을 돕는 절제된 모션만 사용한다.
  - **큐빅 베지어(Cubic-Bezier) Ease-Out 등장 & 미세 부유**: 첫 `0.38s` 동안 부드러운 스케일/슬라이드 등장(`scale 0.95 -> 1.0`, `y +16px -> 0px`) 후 미세한 연속 부유(`1.00 -> 1.035`).
  - **스태거(Stagger) & 팬아웃(Fan-out)**: 복수 카드 씬은 주 카드 `0.0s` 등장 후 보조 카드를 `0.18s` 지연 등장시키며, 3장 펼침 씬은 좌우 카드가 중앙 뒤에서 부채꼴(`1.5° -> 7.5°`)로 펼쳐진다.
  - **좌→우 형광펜 스윕(Highlighter Sweep)**: `0.45s ~ 1.05s` 구간에 핵심 문구/수치 하이라이트 박스가 왼쪽에서 오른쪽으로 스윕(`0% -> 100%`)되며 시선을 집중시킨다.
  - **상단 진행 바**: 영상 최상단(`Y=0..6`)에 얇은 골드-바이올렛 진행 바가 전체 진행률을 표시한다.
- **하이브리드 비디오 오버레이 (`render_video_scene_clip`)**:
  - 초반 1~2씬(`VIDEO_HOOK_SCENES=2` 기본) 또는 `scene.media_type == "video"`인 씬은 `pipeline/flow_automation.py`를 통해
    (1) Google Gemini Flow 브라우저 자동화(`USE_GOOGLE_FLOW=true`), (2) Pexels/Pixabay 무료 HD 스톡 영상 API(`PEXELS_API_KEY`),
    (3) Veo API(`USE_VEO_API=true`) 순으로 실제 MP4 영상을 확보하여 9:16(1080x1920) 프레임에 오버레이한다.
- **다이내믹 카메라 모션 (`render_scene_clip`)**:
  - 이미지 씬의 경우 씬 1(훅)은 빠른 22% 펀치인 줌, 홀수 씬은 사인 이즈인아웃 줌인(15%), 짝수 씬은 줌아웃(15%).
- **트랜지션 & SFX (`pipeline/sfx_gen.py`)**:
  - 씬 간 `TRANSITION_DUR = 0.24`초 디졸브(`xfade`+`acrossfade`)로 병합. 실패 시 하드컷 폴백(`_concat_copy_merge`).
  - `sfx_gen.py`가 순수 Python 파형 합성으로 씬 1 `hook_pop.wav`, 전환 씬 `whoosh_soft.wav`, 반전/핵심 씬 `ding_reveal.wav`를 자동 생성·믹스(`ENABLE_SFX=true`).

## 5. 100만 바이럴 투트랙 주제 기획 (`pipeline/topic_planner.py`)

- **투트랙 전략 (대중 확장 80% + 사주 코어 20%)**:
  - **트랙 1 (100만 대중 확장형 `viral_*`)**: 첫 3초는 일반 대중 100%가 자기 대입할 수 있는 **체크리스트형(`viral_checklist`)**, **페이크아웃 통념반박형(`viral_fakeout`)**, **카톡/일상 POV형(`viral_pov`)**, **대운 징조 미스터리형(`viral_mystery`)**, **A vs B 밸런스 게임형(`viral_balance`)**으로 후킹하고, 중반(씬 4~6)에 사주 일간·신살(도화살/홍염살/역마살/화개살)·십성으로 원인을 풀어낸다.
  - **트랙 2 (사주 코어 핀셋형)**: 기존 승자 공식(`"을목 여자 특징? 이거 모르면"`, 남녀 일간 궁합, MBTI 교차, 3년 대운 흐름)으로 코어 타겟 전환율을 견인한다.

## 6. 오디오 -30dB 무음 자동 칼컷 (`pipeline/tts_engine.py`)

- TTS 합성 직후 `trim_audio_silence_ffmpeg()` 및 `_apply_silence_trim_to_result()`가 FFmpeg `silenceremove` 필터로
  `-30dB` 이하 무음 구간을 0.1초 단위로 자동 컷편집하고, 줄어든 길이에 맞춰 `word_timings`를 비례 재정렬하여 자막 싱크를 완벽히 유지한다.
- `ELEVENLABS_API_KEY` 설정 시 ElevenLabs Multilingual v2 보이스가 0순위로 자동 활성화되며, 미설정 시 비용 0원인 Google Cloud TTS / Edge-TTS가 동작한다.

## 7. 알고리즘 3중 트리거 CTA (`pipeline/cta.py`)

- 릴스 말미에 (1) **친구 공유/저장 유도 씬**(`SHARE_LINES`) + (2) **댓글 키워드 & 프로필 링크 동시 안내 씬**(`CTA_PLANS`)을 배치하여 댓글·공유·저장 지수와 서비스 유입을 동시에 폭발시킨다.
- **주제별 투트랙 CTA 전환 설계**:
  - **구체적 고민형 주제 (재회, 이별, 썸, 연락, 짝사랑, 이직/퇴사 고민 등)**: 카카오톡 채널 1:1 사주·MBTI 상담(`consult` kind)으로 연결. 댓글 키워드는 `[상담]`.
    - 인스타(릴스/캐러셀): 영상 나레이션과 캡션에 URL 및 가격 표기 금지. "프로필 링크에서 카톡 1:1 상담" 형태로만 안내. 나레이션은 순수 한글(한자 금지).
    - Threads: 답글 CTA에 카톡 채널 주소(`https://pf.kakao.com/_xcdXJX/chat`)를 기재하되, 가격은 명시하지 않고 "질문 1회 무료"로 부담 없이 유입을 유도.
    - 확인된 사실만 표기: "AI 분석을 바탕으로 운세 서비스 전문가가 직접 검수", "평일 기준 24시간 이내 답변 전달". 실시간/예약 상담 언급 금지.
  - **흐름·특징형 주제 (3년 대운, 일간 특징, 궁합, MBTI 융합 등)**: 기존 3년 심층 사주 리포트(`report3y`, `couple`, `career`) 및 무료 체험으로 연결. 댓글 키워드는 `[사주]`, `[궁합]`, `[분석]`.
- **캡션 댓글 약속 금지 규칙**: 봇 자동 DM 발송 기능이 없으므로, "댓글 남기면 링크 전송/안내"처럼 약속하지 않고 "댓글에 [상담] 남겨주세요" 수준으로 작성.
- **YouTube Shorts 자동 변환**: `adapt_caption_for_youtube`를 통해 인스타용 "프로필 링크" 문구가 유튜브 설명란에서는 실제 사이트(`mbtiju.com`) 및 카톡 채널 URL로 자동 치환됨.

## 8. 캐러셀 표지 (Figma MJ_1, node 292:180 — 확정)

`carousel_composer.render_cover`: 1080x1350 풀블리드 이미지(16:9 → 4:5 중앙 크롭) + 위→아래 검정 그라디언트(알파 0→100%).
우상단 슬로건 `MBTIJU: MBTI와 사주가 만나다.`(Black 26, 우측 x=1023, 중심 y=103), 브랜드 `MBTIJU`(Black 48, x=74, 중심 y=829),
헤드라인(SemiBold 68, x=60, top 850, 폭 996, 줄 높이 150, 최대 3줄, 넘으면 비례 축소).
