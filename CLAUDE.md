# CLAUDE.md — MBTIJU(엠비티아이주) 서비스 종합 점검 가이드

> 이 문서는 AI 코딩 에이전트가 이 저장소에서 **코드 리뷰 / 보안 점검 / 구조 개선 작업**을 수행할 때
> 참고해야 할 컨텍스트와 체크리스트입니다. 서비스 아키텍처 전반은 `agent.md`, 디자인 시스템은
> `design.md`를 함께 참고하세요. 이 문서는 그 둘을 대체하지 않고, **"무엇을 점검해야 하는가"**에 집중합니다.
>
> **최종 갱신: 2026-11-23 (보안·운영 확정 반영)** — **비회원 기본 즉시 이용(선택적 카카오·구글 소셜 로그인 & 후기 작성 로그인 유지) + 크레딧 폐지 + 서비스당 원화 단건 결제(사주·자미두수 990원 / 나머지 490원) + 카카오톡 채널 1:1 상담 일원화 + 굿즈 장바구니 준비 중 유지** 모델(v2) 전환 반영.
> §3.1에 이미 해소/종료로 기록된 항목을 다시 "취약점"으로 보고하지 말고, **코드 근거(파일:라인)를 먼저 확인**한 뒤 판단하세요.

## 0. 서비스 한 줄 요약

한국 2030 여성 타깃, 만세력 기반 정통 사주명리학 + MBTI 융합 운세 웹앱(React SPA + Vercel Serverless, 독립 웹 플랫폼).
일반 운세·사주·자미두수·타로·여행·KBO·AI 채팅은 **회원가입·로그인 없이** 브라우저 인라인 입력(`useGuestProfile`) 후 **건별 원화 결제(TossPayments 웹 SDK: 사주·자미두수 990원 / 운세·타로·여행·KBO·AI채팅 5회권 490원)** 로 이용한다.
추후 확장을 위해 카카오·구글 **선택적 소셜 로그인(`/mypage`)** 은 유지하며, **이용후기 작성(`/reviews`)은 로그인 회원 전용**으로 유지한다.
고가 핵심 상품은 **3년 심층 사주 리포트**(`/premium`, 정가 49,000원 → 판매가 29,000원, A4 20장 내외 PDF)와 **카카오톡 채널 1:1 상담**(`/chat`, `/room` 일원화, 9,900원/19,900원)이며, 굿즈 상점·장바구니(`/shop`, `/shop/cart`)는 클릭 진입 가능하나 `"준비 중"` 상태를 유지한다.
이용자가 생년월일시·MBTI·이메일·결제 정보를 입력하므로 **개인정보보호법 및 전자상거래법(청약철회 제한 고지·장애 환불 기준)** 준수와 비회원 API 남용·우회 결제 방어가 핵심이다.

> **주의 (`main` 점검 모드)**: `main` 브랜치는 서비스 개편 중 전면 점검 화면(`src/App.tsx` `IS_MAINTENANCE_MODE = true`) 및 API 503 차단(`api/_utils/auth.ts`, `api/_utils/rate-limit.ts`) 상태일 수 있으므로 점검 시 현재 브랜치와 플래그를 확인한다.

## 1. 기술 스택

- Frontend: React 18 + TypeScript + Tailwind, CRA(craco) 빌드, `react-router-dom`
- Backend: Vercel Serverless Functions (`api/*.ts`, Node/Edge 혼재, `maxDuration` 60초 — `vercel.json`)
- DB/Auth: Supabase (PostgreSQL + RLS + Auth) — 일반 서비스는 비로그인 기본 + 선택적 소셜 로그인(`/mypage`, `/reviews` 후기 작성 로그인 유지), `/admin` 관리자·어드민 전용 생성 API·결제 조회/취소 API Auth 필수
- AI: `ai` SDK 통한 OpenAI GPT(1차, 기본 `gpt-4o-mini`, 심층 리포트는 `REPORT_OPENAI_MODEL`) → Google Gemini(폴백)
- 결제: TossPayments 웹 SDK v2 (`src/payment/web/webPaymentHandler.ts`, `src/utils/servicePayCheckout.ts` + `api/payment.ts` 서버 승인/취소/조회)
- 사주 계산: `manseryeok` (한국천문연구원 기준 만세력, 진태양시 보정)
- PDF/DOCX: `@react-pdf/renderer`, `docx`

## 2. 디렉터리 개요 (상세는 `agent.md` §3 참고)

```text
api/          Vercel 서버리스 API — AI 호출, 결제, 만세력 연산, 무료 점수표(report-preview)
api/_utils/   auth / rate-limit / cors / ai-provider 공통 + 심층 리포트 엔진(report-*.ts, §10)
src/
  components/ 모달/카드(GuestProfileCard, MbtiSajuModal, CompatibilityModal, DeepReportModal 등) + pdf/
  hooks/      useGuestProfile(비회원 localStorage 프로필), useAuth(관리자/레거시), useCredits(레거시 유지), useModalStore 등
  pages/      라우트 페이지 (PricingPage=/pricing, TermsPage=/terms, PrivacyPage=/privacy, SupportPage=/support, PaymentSuccess, MyLuckPage, RelationshipPage, GoldPage, ChatPage, DeepReportLandingPage, admin/)
  payment/    웹 TossPayments v2 결제 핸들러
  utils/      servicePayCheckout.ts(SVC_* 단건 결제 주문/티켓 관리), sajuUtils.ts, chatService.ts 등
  config/     creditConfig.ts(SERVICE_COSTS 990/490원 단가), deepReportConfig.ts(29,000원), schemas.ts
supabase/migrations/  DB 스키마 + RLS 정책 (01~14+, 운영 DB 별도 변경 존재 가능)
```

## 3. 보안 위험 신호 (코드 재검증 결과)

### 3.1 이미 해소되거나 크레딧 폐지로 종료된 항목 (재보고 금지, 회귀 여부만 확인)

| 이전 지적 | 현재 상태 | 근거 |
|---|---|---|
| 결제 금액/상품 검증 및 `COMPATIBILITY_TRIP` 매칭 | **해소**. `SVC_*` 단건 결제(`SERVICE_COSTS` 490/990원, 최장 접두사 우선 매칭), 심층 리포트(`DEEP_REPORT_SALE_PRICE`) 등 Toss `/confirm` 호출 **전** 금액 검증 + 불일치 시 보상 취소(`compensateTossCancel`) | `api/payment.ts` `parseSingleServiceType`, `confirmPayment` |
| 비회원 AI API 무료 직접 호출 우회 & `SVC_*` DB 미적재 | **코드 해소 (운영 DB 수동 마이그레이션 필요)**. `service_orders` 테이블 적재 + 랜덤 `receipt_token` 발급, 유료 8개 AI 엔드포인트(`requirePaymentReceipt: true`)가 `X-Service-Receipt` 를 원자적 RPC(`consume_service_receipt`)로 검증·소진 및 실패 시 복구(`releaseServiceReceipt`), `AdminDashboard`/`PaymentManagement` 연동. **단, `supabase/migrations/18_service_orders.sql` 운영 DB 수동 실행 확인 필수** | `supabase/migrations/18_service_orders.sql`, `api/_utils/auth.ts`, `api/payment.ts`, `src/utils/servicePayCheckout.ts` |
| 결제 취소 및 결제 상세조회 권한 검증 | **해소**. `cancelPayment` (`credit`/`deep_report`: 소유자 또는 admin, `single_service`: admin 전용) 및 `getPaymentInfo`(`action=info`: admin JWT 필수) 강화 | `api/payment.ts` `cancelPayment`, `getPaymentInfo` |
| 하드코딩 Toss 시크릿 fallback | **해소**. 환경변수 없으면 예외로 fail-fast, 소스에 `test_sk_`/`live_sk_` 없음 | `api/payment.ts` `getTossAuthHeader()` |
| 요청 빈도 제한(Rate Limit) 전무 | **해소(IP 기반)**. Edge `authenticateUser` 및 Node `enforceNodeRateLimit` 가 Supabase 기반 Rate Limit 적용 | `api/_utils/rate-limit.ts`, `api/_utils/auth.ts` |
| `credit_purchases` 클라이언트 INSERT / `requestRefund` RLS / 크레딧 `deduct_credits` 경합 | **크레딧 폐지로 종료(단, 미사용 기존 크레딧 CS 안내 및 어드민 환불 코드 유지)**. 신규 일반 서비스는 건별 결제 + `X-Service-Receipt` 모델 사용 | `api/_utils/auth.ts`, `src/config/creditConfig.ts`, `src/pages/MyPage.tsx` |
| 관리자 RLS 미확인 | **부분 해소**. `pricing_plans`, `deep_report_requests`, `inquiries`, `deep_reports`, `service_orders` RLS 정의 존재 | `05_admin_rls_coverage.sql`, `18_service_orders.sql` — 단, **운영 DB 실제 상태는 직접 확인 필요** |
| `REACT_APP_`에 서버 키 노출 | **해소**. `REACT_APP_*`에는 공개 URL/anon/Toss 클라이언트 키만 존재. `.env` gitignore 적용 | `.env`(키 이름만 확인), `.gitignore` |
| CORS `*` 대부분의 허용 오리진 제한 | **해소**. `getAllowedOrigin` 및 정적 `corsHeaders` 모두 `https://www.mbtiju.com` 기본 오리진 사용(`*` 폴백 제거), `x-service-receipt` 헤더 허용 | `api/_utils/cors.ts` |

### 3.2 현재 우선순위별 점검 대상 위험 (v2 기준)

1. **[운영 확인 필수] `supabase/migrations/18_service_orders.sql` 운영 DB 미적용 여부 확인**
   - 코드상 `service_orders` 테이블과 `consume_service_receipt` / `release_service_receipt_use` RPC가 필수 구현되어 있으나, 운영 Supabase 프로젝트(`tffvsyarxfujmvbqlutr`)에 SQL Editor 또는 `supabase db push`로 수동 적용되기 전까지는 단건 결제 승인(`confirmPayment`)·영수증 검증이 실패한다. 서비스 재개 전 반드시 운영 DB 반영을 확인한다.

2. **`api/generate-and-save-report.ts` — JWT 없음 + 동시 호출 경쟁 + `error.message` 노출 (Medium)**
   - `orderId`와 DB `status='paid'`만 보고 AI 생성(약 20회 호출)을 수행한다. `generated_data` 확인~저장 간 원자성이 없어 동시 호출 시 AI 비용 중복 발생. `status='generating'` 조건부 UPDATE 선점 및 에러 메시지 일반화 권장.

3. **클라이언트 `localStorage` 민감정보 노출 및 XSS/티켓 조작 위험 (Low~Medium)**
   - 비회원 프로필(`mbtiju_guest_profile`), 결제 대기/완료 티켓(`mbtiju_pending_service_order`, `mbtiju_paid_service_tickets`), 채팅 영수증 토큰(`mbtiju_guest_chat_token_*`), 채팅 이력, `MBTI × 사주` 캐시 결과가 평문 `localStorage`에 저장된다. XSS 취약점이나 `html2canvas`/PDF/DOCX 렌더링 시 사용자 입력 이스케이프 누락이 있으면 탈취/조작 가능.

4. **게스트 PII 접근 제어 (확인 필요)**
   - `deep_report_requests`에는 비회원(`user_id IS NULL`) 이메일·카카오 ID·생년월일시가 저장된다. 운영 DB에서 `user_id IS NULL` 행에 대한 비인증 SELECT 노출이 없는지 직접 확인.

5. **프롬프트 인젝션 방어 미흡 (Low)**
   - `specialRequest`, 타로 질문, 채팅 질문, 상대방 정보가 프롬프트에 삽입됨. 입력 길이 제한, 시스템/사용자 프롬프트 경계 강화 필요.

6. **운영 DB와 저장소 마이그레이션 불일치 + 점검 플래그(`IS_MAINTENANCE_MODE`) 일원화 위험**
   - 마이그레이션 SQL 누락/수동 변경 여부를 운영 DB `pg_policies`/`pg_proc` 조회로 확인. 프런트/백엔드 점검 플래그(`main`의 `IS_MAINTENANCE_MODE = true`)를 수동 상수로 두는 경우 배포·머지 전 일관성 점검 필요.

## 4. 보안 점검 체크리스트 (v2)

- [x] 모든 AI 호출 `api/*.ts`가 `authenticateUser` 또는 `enforceNodeRateLimit` 로 IP/사용자 Rate Limit 적용
- [x] `api/payment.ts`가 `SVC_*` (490/990원, 최장 접두사 우선 매칭) 및 `deep_report` 가격을 Toss `/confirm` 호출 **전** 서버 상수와 대조 및 불일치 시 보상 취소
- [x] 환불/취소(`cancelPayment`) 및 결제 조회(`getPaymentInfo`)에 소유권·관리자 JWT 검증 및 환경변수 fail-fast(`getTossAuthHeader`) 적용
- [x] 유료 8개 비회원 AI 엔드포인트(`analysis-main`, `analysis-special`, `compatibility`, `daily_relationship`, `tarot`, `gold`, `love-saju`, `chat`)가 `X-Service-Receipt` 서버 발급 영수증을 원자적 RPC로 검증·소진 및 실패 시 복구 (단, `18_service_orders.sql` 운영 DB 반영 필요)
- [x] `SVC_*` 단건 결제 내역이 `service_orders` DB에 적재되고 `AdminDashboard`/`PaymentManagement` 어드민 환불·매출 집계와 연동 (단, `18_service_orders.sql` 운영 DB 반영 필요)
- [x] CORS `*` 폴백 제거 및 `x-service-receipt` 허용 (`api/_utils/cors.ts`)
- [ ] `generate-and-save-report.ts` 동시 호출 선점(`generating`) 및 에러 일반화 (§3.2-2)
- [ ] `localStorage` / `html2canvas` / PDF / DOCX 출력 시 XSS 이스케이프 점검 (§3.2-3)
- [ ] Supabase RLS 운영 DB 전수 확인: `profiles`, `deep_reports`, `deep_report_requests`, `orders`, `service_orders`, `rate_limits`, `inquiries`, `chat_messages`, `reviews`, `credit_purchases`(레거시)
- [ ] AI 프롬프트 인젝션 방어 강화 (§3.2-5)

## 5. 코드 구조/품질 점검 체크리스트

- [ ] `api/payment.ts` 책임 분리 (Toss 승인/취소/상품별 핸들러 모듈화)
- [ ] Zod 스키마(`src/config/schemas.ts`)와 `api/*.ts` 내 스키마 정의 일원화
- [ ] `any` 타입 축소 및 프로덕션 `console.log`/`error.message` 민감정보 노출 점검
- [ ] 레거시 크레딧 잔재(`CreditPurchaseModal`, `DeepReportEventModal`, `PaymentManagement` 내 크레딧 전용 분기 등)가 신규 비회원 흐름과 충돌하거나 오작동하지 않는지 확인
- [ ] 심층 리포트 엔진(§10) 단위 테스트 보강

## 6. 비즈니스 로직 및 법적 컴플라이언스 체크리스트

- [ ] **가격 단일 소스 정합성**: `src/config/creditConfig.ts` ↔ `api/_utils/auth.ts` (`SERVICE_COSTS`: 사주·자미두수 990원 / 나머지 490원) ↔ 화면 버튼 문구(`490원` / `990원`) 일치
- [ ] **심층 리포트 가격 단일 소스**: `src/config/deepReportConfig.ts` (49,000원 → 29,000원) 프런트-서버 일치
- [x] **약관/개인정보/결제 전 청약철회 제한 고지 일치**: `TermsPage.tsx`, `PrivacyPage.tsx`, `PricingPage.tsx`, `SupportPage.tsx`, `GuestProfileCard.tsx`, `DeepReportModal.tsx`가 비회원 기본 이용·선택 로그인(`/mypage`, `/reviews` 후기 작성 로그인 유지), 카카오톡 채널 1:1 상담 일원화(`/chat`, `/room`), 굿즈 상점/장바구니 준비 중 유지(`/shop`, `/shop/cart`), 단건 결제 청약철회 제한 및 기존 유상 크레딧 경과 조치를 일관되게 안내하는지 확인
- [ ] **금지 표현**: 홈페이지(`HeroSection`, `TermsPage`, `PrivacyPage`, `DeepReportModal` 등)와 마케팅 초안에 `"1,000만 건 데이터"` 등 근거 없는 수치나 `"크레딧 충전"`, `"가입 필수"` 표현이 없는지 확인

## 7. 프런트엔드/UX 특이사항 (참고용, `design.md` 병행 확인)

- 게스트 입력 UX: `GuestProfileCard` 및 `useGuestProfile`가 `localStorage`(`mbtiju_guest_profile`)를 통해 페이지/모달 이동 간 입력값을 원활히 유지하는지 확인
- 모바일 Safari 입력창 16px 강제 줌 방지(`design.md`), 결제 완료 후 `/payment/success` → `returnPath` 자동 복귀 및 1회 티켓 소비(`consumePaidServiceTicket`) 동작 검증
- 샘플 캡처(`public/assets/premium/report-*.jpg`)는 가상 인물이며 랜딩에 그 사실을 명시한다.

## 8. 실행/검증 방법

```bash
npm start                      # 웹 개발 서버 (craco start)
npm run build                  # 프로덕션 빌드
npx tsc --noEmit -p api/tsconfig.json   # 서버(api/) 타입 체크
npx tsc --noEmit -p tsconfig.json       # 프런트(src/) 타입 체크
npx eslint <파일>                       # 변경 파일 린트
```
- 로컬 `npm start`는 `/api/*`를 운영으로 프록시하거나 미서빙되므로 **전체 결제 승인 → AI 스트리밍은 `vercel dev` 또는 프리뷰 배포**에서 Toss 테스트 키로 검증한다.

## 9. 점검 결과 산출 형식 (에이전트 준수 사항)

리뷰 결과는 다음 형식을 따를 것:
- **심각도**(Critical/High/Medium/Low) — **파일:라인** — **문제 요약** — **구체적 악용/실패 시나리오** — **권장 수정 방향**
- 추측성 지적 금지: 반드시 실제 코드를 읽고 근거를 인용할 것 (운영 DB 상태 미확인 시 "확인 불가, 운영 DB 직접 확인 필요" 명시)
- **§3.1의 이미 해소·종료된 항목을 다시 취약점으로 보고하지 말 것.**
- 즉시 수정 가능한 항목과 설계 변경이 필요한 항목을 분리해서 제시

## 10. 3년 심층 리포트 엔진 (`api/_utils/report-*.ts`, schemaVersion 3)

### 10.1 설계 불변식 — 수정 시 반드시 지킬 것

1. **사실은 코드가 계산하고 AI는 해석만 한다.** 원국, 일간 강약·용신, 대운·세운·월운, 합충, 분야별 점수, 월별 점수, 좋은/조심할 달은 모두 결정론적이다. 같은 입력이면 점수가 항상 같아야 한다.
2. **스토리 아크 선행.** 3년의 관통 주제·은유·연도별 역할을 먼저 생성해 모든 항목에 주입(실패해도 계속 생성).
3. **사실 검증.** 한자 간지·연도 허용 목록 불일치 시 재생성, 끝내 실패 시 문제 간지 병기만 제거.
4. **분량 목표: A4 20장 내외.** 소제목당 약 360~600자(`chars`), 항목 약 21개.
5. **'올해'의 기준은 입춘.** `getReportBaseYear` 사용 (`new Date().getFullYear()` 직접 사용 금지).
6. **무료 미리보기와 유료 리포트의 점수는 같은 함수**(`computeYearFortune`, `computeRemainingScores`) 사용.
7. 무료 응답(`report-preview`)에는 **점수표만** 담는다.

### 10.2 모듈

| 파일 | 역할 |
|---|---|
| `report-generator.ts` | 진입점 `generateDeepReport` |
| `report-score.ts` | 억부·용신/기신, 연·월/남은 기간 점수 엔진 |
| `report-relations.ts` | 합·충·형·파·해, 천을귀인, 공망 |
| `report-terms.ts` | 연도별 절기월 시작일(21세기 근사식) |
| `report-years.ts` | 올해(입춘 기준)·로드맵 3개년·지난 3년 |
| `report-fortune.ts` | 프롬프트용 텍스트 변환 |
| `report-mbti.ts` | 사주 ↔ MBTI 4축 매핑 |
| `report-verify.ts` | 환각 간지·연도 검증 |
| `report-preview.ts` | 무료 점수표 계산 (`api/report-preview.ts`) |

### 10.3 결과 구조와 렌더러

- 선택 필드(`storyArc`, `strength`, `pastCheck`, `currentYear`, `calendar`, `partnerOverlap`, `summary.concernAnswer`)는 `DeepReportReactPDF.tsx`/`docxGenerator.ts`에서 누락 허용 유지.
- `react-pdf` 목차 등 고정 페이지는 `wrap={false}`, 본문 끝 줄 `marginBottom: 0`.

### 10.4 알려진 한계

- 절기월 시작은 일자 단위 근사(경계일 ±1일 오차 가능), 용신은 억부 기준 단순 판정.
- 상위 모델 병렬 호출 시 429 위험으로 `REPORT_OPENAI_MODEL` 로만 교체.
- 보류 기능: 자동 이메일 발송, 웹 뷰어 토큰 링크, 카카오 알림톡(휴대폰 번호 수집 필요), 월운 메일.
