# ⚡ MBTIJU (엠비티아이주) - 도메인 기능 및 스킬 명세서 (`skills.md`)

> **문서 버전**: v2.0.0 (`2026-11-23`)  
> **대상**: AI 코딩 에이전트 및 개발자  
> **언어**: 한국어 (Korean)  
> **목적**: MBTIJU 서비스의 핵심 도메인 알고리즘, 비회원 건별 결제 모듈, AI 오케스트레이션 역량(Capabilities)을 정의합니다.

---

## 📋 스킬 카탈로그 요약

| 스킬 코드 | 스킬 명칭 | 주관 파일 / 모듈 | 핵심 역할 |
|---|---|---|---|
| `saju-engine` | 만세력 및 사주명식 연산 | `src/utils/sajuUtils.ts`, `api/_utils/saju.ts` | 생년월일시 기반 4주 8자, 오행 분포, 십신, 신살 산출 |
| `mbti-fusion` | MBTI x 사주 융합 분석 | `api/analysis-main.ts`, `api/_utils/prompts.ts` | 사주 일간/오행과 MBTI 16유형 교차 분석 |
| `ai-orchestrator` | AI 멀티 프로바이더 폴백 | `api/_utils/ai-provider.ts`, `src/config/schemas.ts` | GPT-4o-mini(주) / Gemini(폴백) 스트리밍 및 Zod 구조 검증 |
| `deep-report` | 심층 리포트 생성 & PDF 출력 | `src/components/pdf/DeepReportReactPDF.tsx`, `api/_utils/report-*.ts` | 20장 내외 고해상도 A4 PDF 및 DOCX 생성 (29,000원) |
| `pay-per-service` | 비회원 건별 결제 & 게스트 관리 | `src/utils/servicePayCheckout.ts`, `src/hooks/useGuestProfile.ts`, `src/config/creditConfig.ts`, `api/payment.ts` | 게스트 `localStorage` 프로필 공유, 490/990원 `SVC_*` TossPayments 단건 결제 승인 및 티켓 복원 |
| `specialized-fortune` | 도메인 특화 운세 & AI 채팅 | `api/tarot.ts`, `api/gold.ts`, `api/love-saju.ts`, `api/analysis-special.ts`, `api/chat.ts`, `src/pages/` | 오늘/내일 운세·타로·여행·KBO·AI 채팅(490원), 자미두수·재물·연애 사주(990원) |

---

## 1. 📜 `saju-engine`: 만세력 및 사주명식 연산

- `src/utils/sajuUtils.ts` & `api/_utils/saju.ts`: 한국천문연구원 기준 만세력(`manseryeok`)으로 년·월·일·시 4주 8자, 오행 비율(목·화·토·금·수), 십신, 신살을 결정론적으로 산출합니다.

## 2. 🧬 `mbti-fusion`: MBTI x 사주 융합 분석

- `api/analysis-main.ts` (`allowAnonymous: true`, `cost: 0`): 사주 일간/오행 결핍과 MBTI 4축(E/I, S/N, T/F, J/P)을 결합해 성격·운의 흐름·실전 전략(`MbtiSajuModal.tsx`, 990원)을 스트리밍합니다.

## 3. 🧠 `ai-orchestrator`: AI 멀티 프로바이더 & Rate Limit

- `api/_utils/ai-provider.ts`: `OpenAI GPT-4o-mini`(주) → `Google Gemini`(폴백) 재시도 체인을 유지하며 `src/config/schemas.ts` Zod 스키마로 JSON을 강제합니다.
- `api/_utils/rate-limit.ts` + `api/_utils/auth.ts`: 비회원 요청에도 IP 기반 Rate Limit을 적용하며, 점검 모드(`IS_MAINTENANCE_MODE = true`) 활성화 시 즉시 503을 반환합니다.

## 4. 📑 `deep-report`: 3년 심층 리포트 & PDF/DOCX 엔진

- `api/_utils/report-preview.ts` (`api/report-preview.ts`): 결제 전 무료 3년 점수표만 계산·노출.
- `api/_utils/report-*.ts` + `src/components/pdf/DeepReportReactPDF.tsx` + `src/utils/docxGenerator.ts`: 비회원도 `/premium` 에서 `29,000원` (`deepReportConfig.ts`) 결제로 신청 가능한 A4 20장 내외 정밀 리포트 생성.

## 5. 💳 `pay-per-service`: 비회원 건별 결제 & 게스트 상태 관리

- **`useGuestProfile.ts` + `GuestProfileCard.tsx`**:
  - 생년월일·태어난 시간·성별·MBTI·이름을 `localStorage`(`mbtiju_guest_profile`)에 저장·동기화해 전 서비스에서 재입력 없이 사용.
  - 카드 하단에 약관·개인정보처리방침·청약철회 제한(전자상거래법 제17조 제2항) 사전 고지를 일괄 노출.
- **`servicePayCheckout.ts` + `api/payment.ts` + `PaymentSuccess.tsx`**:
  - `startServicePayment({ serviceType, serviceName, returnPath, payload })`: `SVC_{serviceType}_...` 주문 생성 및 입력값 임시 저장 후 `requestPayment()` 로 TossPayments v2 결제창 호출.
  - `api/payment.ts` `confirmPayment`: `SERVICE_COSTS[serviceType]` (`490원` / `990원`)과 Toss 승인 금액을 서버에서 1원 단위 검증 후 승인.
  - `PaymentSuccess.tsx` → `promotePendingOrderToTicket()` → 원래 `returnPath` 복귀 → 각 페이지의 `consumePaidServiceTicket()` 으로 1회 소비 후 즉시 AI 분석 실행.

## 6. 🔮 `specialized-fortune`: 도메인 특화 서비스 및 요금 매핑

| 서비스 | 요금 | 진입점 & API |
|---|---|---|
| **MBTI × 사주 / 재생성** | 990원 | `MbtiSajuModal.tsx` / `api/analysis-main.ts` |
| **심층 궁합 분석** | 990원 | `CompatibilityModal.tsx` / `api/compatibility.ts` |
| **자미두수 (紫微斗數)** | 990원 | `JamidusuPage.tsx` (`/myluck?type=jamidusu`) / `api/analysis-special.ts` |
| **연애·부부·결혼·재회·짝사랑 사주** | 990원 | `RelationshipPage.tsx` (`/relationship`) / `api/love-saju.ts` |
| **재물·창업·취직·이직 사주** | 990원 | `GoldPage.tsx` (`/gold`) / `api/gold.ts` |
| **오늘 / 내일의 운세** | 490원 | `TodayFortunePage.tsx` (`/myluck?type=today`) / `api/fortune` |
| **신비타로 3카드 리딩** | 490원 | `TarotPage.tsx` (`/myluck?type=tarot`) / `api/tarot.ts` |
| **행운의 여행지 추천** | 490원 | `TripPage.tsx` (`/myluck?type=trip`) / `api/analysis-special.ts` |
| **KBO 야구 팬 궁합** | 490원 | `KboPage.tsx` (`/myluck?type=kbo`) / `api/analysis-special.ts` |
| **AI 사주·타로 채팅 (5회권)** | 490원 | `ChatPage.tsx` (`/tarot`, `/saju`) / `api/chat.ts` |
