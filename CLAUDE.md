# CLAUDE.md — MBTIJU(엠비티아이주) 서비스 종합 점검 가이드

> 이 문서는 AI 코딩 에이전트가 이 저장소에서 **코드 리뷰 / 보안 점검 / 구조 개선 작업**을 수행할 때
> 참고해야 할 컨텍스트와 체크리스트입니다. 서비스 아키텍처 전반은 `agent.md`, 디자인 시스템은
> `design.md`를 함께 참고하세요. 이 문서는 그 둘을 대체하지 않고, **"무엇을 점검해야 하는가"**에 집중합니다.

## 0. 서비스 한 줄 요약

한국 20대 여성 타깃, 사주명리학 + MBTI 융합 운세 웹앱(React SPA + Vercel Serverless, 독립 웹
플랫폼 전용 — 과거 지원하던 토스 앱인토스(AIT) 미니앱 연동은 제거됨). AI(OpenAI GPT 주 모델 /
Gemini 폴백)가 사주 데이터를 기반으로 리포트를 생성하고, 크레딧 결제(TossPayments 웹 위젯)로
과금한다. 사용자가 결제 정보, 생년월일시, MBTI 등 민감한 개인정보를 입력하므로 **개인정보보호법/
전자상거래법 관점의 신뢰성**이 매우 중요한 서비스다.

## 1. 기술 스택

- Frontend: React 18 + TypeScript + Tailwind, CRA(craco) 빌드, react-router-dom
- Backend: Vercel Serverless Functions (`api/*.ts`, Node/Edge 혼재)
- DB/Auth: Supabase (PostgreSQL + RLS + Auth), 클라이언트는 `/backend` 프록시 경유
- AI: `ai` SDK 통한 OpenAI GPT(1차, `gpt-4o-mini`) → Google Gemini(폴백, `gemini-3.1-flash-lite`)
- 결제: TossPayments 웹 위젯 (`api/payment.ts`가 서버에서 승인/취소/조회를 직접 처리)
- PDF/DOCX: `@react-pdf/renderer`, `docx`

## 2. 디렉터리 개요 (상세는 `agent.md` §3 참고)

```
api/          Vercel 서버리스 API — AI 호출, 결제, 만세력 연산
src/
  components/ 모달/카드 등 재사용 UI
  hooks/      useAuth, useCredits, useShop*, useSubscription 등 상태 훅
  pages/      라우트 단위 페이지 (admin/ 하위는 관리자 전용)
  payment/    웹 TossPayments 결제 핸들러
  config/     크레딧 단가, Zod 스키마, 상수
supabase/migrations/  DB 스키마 + RLS 정책 (일부만 추적됨: reviews, shop, event_claims)
```

## 3. 이미 확인된 주요 위험 신호 (우선순위 최상위)

에이전트는 아래 항목을 반드시 재검증하고, 실제 익스플로잇 가능 여부를 코드 근거와 함께 판단할 것.

1. **AI 엔드포인트 인증 부재 (비용 남용/DoS 위험 — Critical)**
   `api/analysis-main.ts`, `api/analysis-special.ts`, `api/tarot.ts`, `api/gold.ts`,
   `api/love-saju.ts`, `api/compatibility.ts`, `api/chat.ts`, `api/generate-deep-report.ts` 등
   AI를 호출하는 엔드포인트 대부분이 **요청자의 Supabase JWT를 검증하지 않는다.** 크레딧 차감은
   프론트엔드(`useCredits.ts`)에서 별도 RPC로만 이뤄지며, API 자체는 이 차감 여부를 확인하지 않는다.
   즉 인증 없이 API를 직접 호출(curl/스크립트)하면 무제한으로 Gemini/OpenAI 비용을 발생시킬 수 있다.
   `Access-Control-Allow-Origin: '*'`(`api/_utils/cors.ts`)까지 겹쳐 임의 출처에서 호출 가능.

2. **결제 금액/상품 검증 누락 (금전적 손실 위험 — Critical)**
   `api/payment.ts`의 `confirmPayment`는 클라이언트가 보낸 `amount`, 그리고 Toss 응답의
   `metadata.productId`를 그대로 신뢰해 크레딧/상품을 지급한다. `pricing_plans` 테이블 가격과
   실제 결제 승인 금액이 일치하는지 서버가 검증하는 로직이 없다. Toss 위젯 `requestPayment` 호출 시
   클라이언트가 임의로 넣을 수 있는 `metadata`(예: `productId: 'event_credit_500'`,
   `productId: 'deep_report'`)를 최소 금액 결제와 조합하면 헐값에 고가 상품/크레딧을 획득할 수 있는지
   확인 필요.

3. **결제 취소(`cancelPayment`) 권한 검증 없음 — High**
   `purchaseId`만 알면(추측/열거 가능하면) 누구나 환불 API를 호출할 수 있어 보인다. 호출자가
   해당 구매 건의 소유자이거나 관리자인지 확인하는 인증/인가 로직이 보이지 않는다.

4. **하드코딩된 결제 시크릿 키 fallback — High**
   `TOSS_SECRET_KEY` 환경변수가 없을 때 `'test_sk_Z1aOwX7K8m2Y2a7Wq9Lp8yQxzvNP'` 같은 값이
   소스코드에 하드코딩되어 3곳(`confirmPayment`, `cancelPayment`, `getPaymentInfo`)에 반복되고
   있다. 운영 환경변수 누락 시 조용히 테스트 키로 폴백되는 구조 자체가 위험하며, git 히스토리에
   이 값이 이미 노출되어 있다.

5. **`credit_purchases` 테이블 클라이언트 직접 INSERT — Critical 가능성**
   `useCredits.ts`의 `purchaseCredits()`가 익명(anon) 키를 쓰는 브라우저 클라이언트에서
   `credit_purchases`에 `purchased_credits`, `price_paid`, `status: 'active'`를 직접 insert한다.
   저장소에 추적된 마이그레이션(`01_reviews.sql`, `02_shop.sql`, `03_event_claims.sql`)에는 이
   테이블의 RLS 정책이 없다 — Supabase 대시보드에서 별도로 설정됐을 수 있으니, **실제 운영 DB의
   RLS 정책을 직접 확인**해 인증된 사용자가 결제 없이 브라우저 콘솔에서 크레딧을 자가 지급할 수
   있는지 검증할 것. 결제 검증 후 크레딧 지급은 반드시 서버(service role, 결제 승인 API 내부)에서만
   이뤄져야 한다.

6. **관리자 권한 검사가 클라이언트 사이드 전용**
   `AdminLoginPage.tsx` 등에서 `profiles.role === 'admin'` 체크가 프론트엔드 라우팅 가드로만
   쓰인다. 실질적 보호는 Supabase RLS에 위임되는 구조인데, `admin/` 하위 각 페이지(`UserManagement`,
   `PlanManagement`, `PaymentManagement` 등)가 다루는 테이블에 대해 RLS가 실제로 `role = 'admin'`을
   강제하는지 전수 확인 필요. 하나라도 누락되면 일반 사용자가 API 호출만으로 관리자 데이터에
   접근/변조 가능.

7. **`.env`에 실서비스 키 다수 보관** (`REACT_APP_SUPABASE_*`, `OPENAI_API_KEY`, `GEMINI_API_KEY`,
   `TOSS_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) — `.gitignore`에는 포함되어 git 추적은
   안 되고 있음을 확인했으나, 로컬 파일 권한/공유 방식, Vercel 환경변수 설정과의 동기화 여부,
   그리고 과거 커밋 히스토리에 시크릿이 실수로 커밋된 적 없는지 재확인할 것.

## 4. 보안 점검 체크리스트

- [ ] 모든 `api/*.ts`가 호출자의 Supabase Access Token을 검증하는지 (`Authorization: Bearer` →
      `supabase.auth.getUser(token)`)
- [ ] 크레딧 차감과 AI 결과 생성이 원자적으로 같은 요청 트랜잭션 내에서 서버 측에 의해 강제되는지
      (현재처럼 "클라이언트가 차감 RPC 부르고, 별도로 API도 부르는" 구조는 레이스/우회 가능)
- [ ] `payment.ts`가 `pricing_plans`/상품 카탈로그 가격과 Toss 승인 금액을 서버에서 대조하는지
- [ ] 환불/취소 API에 호출자 소유권·관리자 권한 검증이 있는지
- [ ] CORS를 `*`가 아닌 실제 프런트 도메인(`mbtiju.com`)으로 제한할 수 있는지
- [ ] 시크릿(서비스 롤 키, AI 키, 결제 시크릿 키)이 프런트 번들에 유출되지 않는지 (`REACT_APP_`
      접두사가 붙은 변수는 빌드에 인라인되므로 절대 서버 전용 키에 써서는 안 됨)
- [ ] Supabase RLS: `profiles`, `credit_purchases`, `credit_usages`, `orders`, `deep_reports`,
      `deep_report_requests`, `chat_messages`, `user_relationships` 각 테이블에 대해
      select/insert/update/delete 정책이 "본인 것만" 또는 "admin만"으로 제한되는지 전수 점검
      (저장소에 마이그레이션이 없는 테이블은 특히 위험군)
- [ ] AI 프롬프트에 사용자 입력(생년월일, 자유 입력 채팅 등)이 그대로 삽입될 때 프롬프트 인젝션
      방어(시스템 프롬프트 분리, 입력 길이/패턴 검증)가 되어 있는지
- [ ] `chat.ts` 스트리밍 챗봇에 대한 요청 빈도 제한(rate limit)이 있는지 — 없다면 비용 남용 경로
- [ ] `html2canvas`/PDF/DOCX 생성 시 사용자 입력이 그대로 렌더링되어 XSS로 이어질 가능성
- [ ] 하드코딩된 테스트/폴백 시크릿 전부 제거, 환경변수 누락 시 명시적 오류로 fail-fast 처리

## 5. 코드 구조/품질 점검 체크리스트

- [ ] `api/payment.ts`(약 390줄) 등 하나의 파일에 confirm/cancel/info 로직이 몰려있어 관심사 분리
      여지가 있는지 (Toss 클라이언트 생성, RPC 매핑 로직을 유틸로 추출)
- [ ] 여러 API 파일에서 반복되는 `widgetSecretKey`/`encryptedSecretKey` 생성 로직을
      `_utils`로 공통화했는지
- [ ] `useCredits.ts`처럼 하나의 훅이 조회/차감/구매/환불/AIT 복구까지 담당해 비대해진 훅이 있는지,
      책임 분리가 가능한지
- [ ] Zod 스키마(`src/config/schemas.ts`)와 백엔드 `api/*.ts` 내 스키마 정의가 중복되어 있지
      않은지 (`analysis-main.ts` 등은 자체 zod 스키마를 파일 내부에 재정의)
- [ ] `any` 타입(`VercelRequest = any` 등) 남용 여부와 실제 타입 안전성
- [ ] 에러 처리 시 `error.message`를 그대로 클라이언트에 반환하는 부분(`payment.ts`)이 내부
      구현 정보를 과도하게 노출하지 않는지
- [ ] `console.log`/`console.error`가 프로덕션 빌드에 다량 남아있어 민감 정보(세션, 사용자 ID)를
      브라우저 콘솔에 노출하지 않는지
- [ ] `build/`와 `public/`에 동일한 정적 자원이 중복 존재 — `build/`가 저장소에 커밋되어야 하는지
      (일반적으로 빌드 산출물은 `.gitignore`에 있어야 함, 현재 `.gitignore`엔 `/build`가 있는데
      실제로 `build/` 폴더가 워킹 디렉터리에 존재하는 이유 확인)

## 6. 비즈니스 로직 점검 체크리스트

- [ ] 크레딧 단가 정책(`creditConfig.ts`)과 실제 차감 RPC(`deduct_credits`) 로직이 일치하는지
- [ ] 환불 정책(`REFUND_PERIOD_DAYS`, 크레딧 미사용 시에만 환불) 로직이 서버 RPC/DB 트리거에서도
      동일하게 강제되는지, 클라이언트 로직 우회 시 정책 위반 가능한지
- [ ] 이벤트 크레딧(`event_claims`) 중복 참여 방지 로직에 동시성 문제(레이스 컨디션)가 없는지
- [ ] 게스트(비회원) 결제 허용 범위(`deep_report`)가 의도된 것인지, 게스트 주문 추적/CS 대응이
      가능한 구조인지

## 7. 프런트엔드/UX 특이사항 (참고용, `design.md` 병행 확인)

- 모바일 Safari 세션/쿠키 이슈 대응 코드(`supabaseClient.ts`의 재시도/캐시 로직)가 과도하게
  복잡해져 유지보수 부담이 되는지, 근본 원인(ITP) 대응이 더 단순한 방법으로 가능한지
- 20대 여성 타깃 서비스 특성상 생년월일시·연애 상담 내용 등 민감 개인정보가 로컬스토리지/콘솔에
  평문 노출되지 않는지

## 8. 실행/검증 방법

```bash
npm start        # 웹 개발 서버 (craco start)
npm run build     # 프로덕션 빌드
```
Vercel 함수는 `vercel dev`로 로컬 재현 권장. 실제 결제 플로우는 Toss 테스트 키로만 검증하고
운영 시크릿으로 직접 테스트하지 말 것.

## 9. 점검 결과 산출 형식 (에이전트 준수 사항)

리뷰 결과는 다음 형식을 따를 것:
- **심각도**(Critical/High/Medium/Low) — **파일:라인** — **문제 요약** — **구체적 악용/실패 시나리오**
  — **권장 수정 방향**
- 추측성 지적 금지: 반드시 실제 코드를 읽고 근거를 인용할 것 (RLS처럼 저장소에 정의가 없는
  부분은 "확인 불가, 운영 DB 직접 확인 필요"로 명시)
- 즉시 수정 가능한 항목과 설계 변경이 필요한 항목을 분리해서 제시
