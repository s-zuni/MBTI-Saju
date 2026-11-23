# GEMINI.md — MBTIJU (엠비티아이주) Antigravity 오케스트레이션 규칙

이 저장소는 **MBTIJU (`https://www.mbtiju.com`)** 웹 플랫폼과 `marketing_automation/`(릴스/숏츠/스레드 자동화)을 함께 관리합니다.

## 1. 공식 오케스트레이션 & 2-Tier 모델 라우팅 원칙

- **고성능 모델 (Argon / Carbon / Neon — 총괄 팀장 / 기획 / 최종 검수)**:
  - 작업 분해 및 병렬 워커(`ops-checker`, `security-collector`, `marketing-operator`) 조율
  - 워커가 수집한 보안·DB·타입·로그 증거를 실제 파일(`파일:라인`) 및 Supabase MCP(`supabase`, project_id: `tffvsyarxfujmvbqlutr`)로 직접 교차 검증하여 `확정 / 가능성 있음 / 오탐 / 수용` 판정
  - 마케팅 초안 팩트체크(`.agents/product-marketing.md`, `reels-composer` 스펙 대조) 및 오늘의 우선순위·기획 제안 수립
- **저비용 효율 모델 (Hydrogen / Flash — 실무 워커)**:
  - 읽기 전용 상태 수집, 로그/advisor 조회, `tsc`/`npm audit` 실행, `marketing_snapshot.py` 및 `hookscore.py` 실행, 마케팅 초안 작성
  - `invoke_subagent` 사용 시 `Model: "flash"`, `swarm` 사용 시 `gemini-4-hydrogen-medium` 또는 `gemini-3.8-flash-high` 할당

## 2. 현재 운영 및 과금 모델 기준 (v2 — 2026-11-23)

오케스트라의 모든 에이전트(점검·보안·마케팅·기획)는 아래 개편 모델을 단일 기준으로 삼는다.

1. **브랜치/운영 상태 인식**:
   - `main` 브랜치는 서비스 개편을 위해 **점검 모드(`IS_MAINTENANCE_MODE = true`, HTTP 503 차단)** 일 수 있으며, 비회원·건별 결제 전환 구현은 `feat/guest-pay-per-service` 브랜치(및 이후 머지 본)에 있다. 점검 시 현재 체크아웃 브랜치와 `main` 상태를 구분해 보고한다.
2. **비회원 즉시 이용 & 크레딧 폐지 (`SERVICE_COSTS` 원화 단건 과금)**:
   - 일반 운세·사주·타로·채팅 서비스는 **회원가입/로그인 없이 즉시 이용** 가능하며, 입력 프로필과 결제 티켓은 `localStorage`(`useGuestProfile.ts`, `servicePayCheckout.ts`)로 관리된다.
   - **사주·자미두수 계열 (`990원`)**: `MBTI_SAJU`, `REGENERATE_MBTI_SAJU`, `JAMIDUSU`, `COMPATIBILITY`, 재물/창업/취직/이직 사주(`GOLD_*` 4종), 연인/부부/결혼/재회/짝사랑 사주(`LOVE_*` 5종)
   - **나머지 서비스 계열 (`490원`)**: 오늘/내일의 운세(`FORTUNE_TODAY`, `FORTUNE_TOMORROW`), 신비타로(`TAROT`), 여행 추천(`TRIP`, `COMPATIBILITY_TRIP`), KBO 팬궁합(`KBO`), AI 사주·타로 채팅 5회권(`AI_CHAT_5`)
3. **프리미엄 및 별도 채널 상품 (유지)**:
   - **3년 심층 사주 리포트 (`/premium`)**: 정가 49,000원 → 판매가 29,000원 (비회원 신청·결제 가능)
   - **카카오톡 채널 1:1 상담**: 1문항 9,900원 / 3문항 19,900원 (비회원 가능, 평일 24시간 내 답변)
   - **인증 유지 영역**: 관리자 페이지(`/admin`), 어드민 전용 생성 API(`api/generate-deep-report.ts`, `api/generate-consultation-draft.ts`), 기존 회원 데이터/환불 CS 조회.
4. **금지 & 오탐 방지 수칙**:
   - 구 정책 표현(`"크레딧 충전"`, `"가입 무료 1회"`, `"로그인 필수"`, `"1,000만 건 데이터"`)을 마케팅·UI에 쓰지 않는다.
   - 구 `useCredits.requestRefund` / `deduct_credits` 기반 크레딧 점검을 v2 코드에 억지로 대입해 오탐하지 말고, v2 기준인 **`allowAnonymous: true` 환경의 서버측 결제 검증 공백(`SVC_*`)과 Rate Limit** 을 핵심으로 점검한다.

## 3. 참조 문서 우선순위

1. 서비스 점검/보안 기준: `CLAUDE.md`, `agent.md`, `skills.md`
2. 법적/환불/개인정보 기준: `src/pages/TermsPage.tsx`, `src/pages/PrivacyPage.tsx`, `src/pages/PricingPage.tsx`
3. 마케팅 팩트/가격/금지 규칙 단일 소스: `.agents/product-marketing.md`
4. 릴스/숏츠/스레드 파이프라인 스펙: `marketing_automation/CLAUDE.md`, `marketing_automation/VIRAL_1M_MASTER_PLAN.md`, `.agents/skills/reels-composer/SKILL.md`
5. 출근 자동화 표준 절차: `.agents/skills/morning-shift/SKILL.md`

## 4. 절대 수칙

- **출근 브리핑(`morning-shift`) 실행 시 전 과정은 읽기 전용**이며, 파일 작성은 `reports/daily/YYYY-MM-DD.md`에만 수행한다.
- `.env`, `*.key`, `*.pem`, `token.json`, `insta-at-*.json`, `client_secret*.json` 등의 비밀 파일 내용을 읽거나 보고서에 출력하지 않는다.
- Supabase MCP 호출 시 반드시 `supabase` 서버(`tffvsyarxfujmvbqlutr`)를 사용한다(`supabase-mcp-server`는 사용하지 않음).
- `CLAUDE.md` §3.1에 이미 해소/종료로 기록된 항목은 회귀 근거가 없는 한 재보고하지 않는다.
