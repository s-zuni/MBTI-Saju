# CLAUDE.md — MBTIJU(엠비티아이주) 서비스 종합 점검 가이드

> 이 문서는 AI 코딩 에이전트가 이 저장소에서 **코드 리뷰 / 보안 점검 / 구조 개선 작업**을 수행할 때
> 참고해야 할 컨텍스트와 체크리스트입니다. 서비스 아키텍처 전반은 `agent.md`, 디자인 시스템은
> `design.md`를 함께 참고하세요. 이 문서는 그 둘을 대체하지 않고, **"무엇을 점검해야 하는가"**에 집중합니다.
>
> **최종 갱신: 2026-10-10** — §3의 위험 신호는 코드를 직접 읽고 재검증한 결과입니다. 이전 버전에 "미해결"로
> 적혀 있던 항목 대부분이 이미 수정되어 있어 §3.1로 옮겼습니다. 같은 항목을 다시 "취약점"으로 보고하지 말고,
> **코드 근거(파일:라인)를 먼저 확인**한 뒤 판단하세요.

## 0. 서비스 한 줄 요약

한국 20대 여성 타깃, 사주명리학 + MBTI 융합 운세 웹앱(React SPA + Vercel Serverless, 독립 웹
플랫폼 전용 — 과거 지원하던 토스 앱인토스(AIT) 미니앱 연동은 제거됨). AI(OpenAI GPT 주 모델 /
Gemini 폴백)가 사주 데이터를 기반으로 리포트를 생성하고, 크레딧 결제(TossPayments 웹 위젯)로
과금한다. 핵심 상품은 **3년 심층 사주 리포트**(`/premium`, 정가 49,000원 → 판매가 29,000원, A4 20장 내외 PDF)이며,
결제 후 관리자가 생성·점검해 이메일로 전달하는 수동 운영 구조다. 사용자가 결제 정보, 생년월일시, MBTI 등
민감한 개인정보를 입력하므로 **개인정보보호법/전자상거래법 관점의 신뢰성**이 매우 중요한 서비스다.

## 1. 기술 스택

- Frontend: React 18 + TypeScript + Tailwind, CRA(craco) 빌드, react-router-dom
- Backend: Vercel Serverless Functions (`api/*.ts`, Node/Edge 혼재, `maxDuration` 60초 — `vercel.json`)
- DB/Auth: Supabase (PostgreSQL + RLS + Auth), 클라이언트는 `/backend` 프록시 경유
- AI: `ai` SDK 통한 OpenAI GPT(1차, 기본 `gpt-4o-mini`, 심층 리포트는 `REPORT_OPENAI_MODEL`로 교체) → Google Gemini(폴백)
- 결제: TossPayments 웹 위젯 (`api/payment.ts`가 서버에서 승인/취소/조회를 직접 처리)
- 사주 계산: `manseryeok`(한국천문연구원 기준 오픈소스 만세력, 진태양시 보정)
- PDF/DOCX: `@react-pdf/renderer`, `docx`

## 2. 디렉터리 개요 (상세는 `agent.md` §3 참고)

```
api/          Vercel 서버리스 API — AI 호출, 결제, 만세력 연산, 무료 점수표(report-preview)
api/_utils/   auth/cors/ai-provider 공통 + 심층 리포트 엔진(report-*.ts, §10)
src/
  components/ 모달/카드 등 재사용 UI (pdf/ 하위에 PDF 리포트 컴포넌트)
  hooks/      useAuth, useCredits, useShop*, useSubscription 등 상태 훅
  pages/      라우트 단위 페이지 (admin/ 하위는 관리자 전용, DeepReportLandingPage = /premium)
  payment/    웹 TossPayments 결제 핸들러
  config/     크레딧 단가, 심층 리포트 가격(deepReportConfig), Zod 스키마, 상수
supabase/migrations/  DB 스키마 + RLS 정책 (01~12, 추적되지 않는 운영 DB 변경이 있을 수 있음)
public/assets/premium/ /premium 랜딩의 샘플 리포트 캡처 (가상 인물 "서연")
```

## 3. 보안 위험 신호 (코드 재검증 결과)

### 3.1 이미 해소된 항목 (재보고 금지, 회귀 여부만 확인)

| 이전 지적 | 현재 상태 | 근거 |
|---|---|---|
| AI 엔드포인트 인증 부재 | **해소(예외 2건 아래)**. `analysis-main/special`, `chat`, `compatibility`, `gold`, `love-saju`, `tarot`, `daily_relationship`, `generate-deep-report`(+admin 확인), 상담 API가 모두 `authenticateUser`(JWT 검증 + 서버 크레딧 차감 RPC) 사용 | `api/_utils/auth.ts`, 각 `api/*.ts` |
| 결제 금액/상품 검증 누락 | **해소**. 심층 리포트는 서버 상수 `DEEP_REPORT_SALE_PRICE`와 승인 금액을 대조, 상담권 19,900/9,900원·이벤트 9,900원 고정 대조, 일반 크레딧은 `pricing_plans.price`와 대조 | `api/payment.ts` `confirmPayment` |
| 결제 취소 권한 검증 없음 | **해소**. Bearer 토큰 → `getUser` → 구매 소유자 또는 `profiles.role='admin'`만 허용 | `api/payment.ts` `cancelPayment` |
| 하드코딩 Toss 시크릿 fallback | **해소**. 환경변수 없으면 예외로 fail-fast, 소스에 `test_sk_`/`live_sk_` 없음 | `getTossAuthHeader()` |
| `credit_purchases` 클라이언트 직접 INSERT | **해소(저장소 기준)**. 사용자 INSERT/UPDATE 정책 DROP, 조회는 본인만, admin 전체. `useCredits.purchaseCredits`는 더 이상 INSERT하지 않고 잔액만 새로고침 | `supabase/migrations/04_security_patches.sql`, `src/hooks/useCredits.ts` |
| 관리자 RLS 미확인 | **부분 해소**. `pricing_plans`, `deep_report_requests`, `inquiries`, `deep_reports`에 본인/admin 정책 존재 | `05_admin_rls_coverage.sql` — 단, **운영 DB 실제 상태는 확인 불가** |
| `REACT_APP_`에 서버 키 노출 | **해소**. `.env`의 `REACT_APP_*`는 Supabase URL/anon key, Toss **클라이언트** 키뿐(서비스 롤·AI·Toss 시크릿은 접두사 없음). `.env`는 gitignore, `build/`도 미추적 | `.env`(변수명만 확인), `.gitignore` |
| CORS `*` | **대부분 해소**. 허용 오리진 화이트리스트(`mbtiju.com`, localhost, `*.vercel.app`) | `api/_utils/cors.ts` `getAllowedOrigin` (잔여 이슈는 §3.2-7) |

### 3.2 아직 남아 있는 위험 (우선순위 순)

1. **`api/generate-and-save-report.ts` — JWT 없음 + 동시 호출 경쟁 (Medium)**
   `orderId`와 DB의 `status='paid'`만 보고 AI 생성(약 20회 호출)을 수행한다. 유효한 paid 주문번호가 필요해 외부 남용 여지는 작지만,
   `generated_data` 존재 확인과 저장 사이가 원자적이지 않아 **같은 주문에 동시 호출 시 AI 비용이 중복 발생**하고 마지막 쓰기가 덮어쓴다.
   `catch`에서 `error.message`를 그대로 반환한다. 권장: `status`를 `generating`으로 조건부 UPDATE(`... WHERE generated_data IS NULL`)해 선점, 에러는 일반화.

2. **요청 빈도 제한(rate limit) 전무 (Medium)**
   `chat.ts` 등 인증된 AI 호출과 공개 엔드포인트 `api/report-preview.ts`(AI 없는 순수 계산, 비용은 CPU뿐) 모두 제한이 없다. 로그인 사용자 기준으로도
   크레딧이 있으면 병렬 폭주가 가능하다. 권장: Vercel/Upstash 기반 IP·사용자 단위 제한.

3. **클라이언트 환불 요청이 RLS와 충돌할 가능성 (확인 필요)**
   `useCredits.requestRefund`가 `credit_purchases`를 클라이언트에서 `UPDATE`(`status='pending_refund'`)하는데, `04_security_patches.sql`이
   사용자 UPDATE 정책을 DROP했다. 운영 DB에 별도 정책이 없으면 환불 요청이 항상 실패한다. 서버 API(service role)로 옮기는 것이 맞다.

4. **`confirmPayment`가 `userId`를 요청 body에서 우선 신뢰 (Low~Medium)**
   `bodyUserId || tossData.metadata?.userId || customerKey` 순으로 사용자를 정한다. 공격자가 **자기 결제로 타인 계정**에 크레딧을 넣거나,
   `event_credit_500`을 피해자 ID로 선점해 피해자의 이벤트 참여를 막을 수 있다. 권장: Bearer 토큰의 사용자 ID와 대조(비회원 deep_report 제외).

5. **게스트 PII 접근 제어 (확인 필요)**
   `deep_report_requests`에는 비회원(`user_id` null)의 이메일·생년월일·카카오 ID가 저장된다. `05_admin_rls_coverage.sql`의 `select_own` 정책이
   `user_id IS NULL` 행을 어떻게 다루는지, 예약 날짜 집계용 공개 SELECT 정책이 남아 있지 않은지 **운영 DB에서 직접 확인**할 것.

6. **프롬프트 인젝션 방어 미흡 (Low)**
   고객 요청사항(`specialRequest`)과 파트너 정보가 프롬프트에 원문 삽입된다. 결과는 관리자가 점검 후 발송하므로 영향은 제한적이나, 입력 길이/패턴 제한과
   시스템 프롬프트 분리 점검은 여전히 유효하다. (사실 검증기 `report-verify.ts`는 간지·연도 환각만 막으며 인젝션을 막지 않는다.)

7. **CORS 잔여 이슈 (Low)**
   `cors.ts`의 `corsHeaders` 상수는 여전히 `Allow-Origin: *`이고 `auth.ts`의 에러 응답이 이를 사용한다. `getAllowedOrigin`은 Origin 헤더가 없으면 `*`를 반환한다.

8. **운영 DB와 저장소 마이그레이션 불일치 위험**
   마이그레이션은 01~12만 추적된다. RLS는 반드시 운영 DB에서 `select`/`insert`/`update`/`delete` 정책을 직접 조회해 확인하고,
   확인 못 한 부분은 "확인 불가, 운영 DB 직접 확인 필요"로 명시한다.

## 4. 보안 점검 체크리스트

- [x] 모든 AI 호출 `api/*.ts`가 `authenticateUser`로 JWT 검증 (예외: `generate-and-save-report`, `report-preview` — §3.2-1, §2 참고)
- [x] 크레딧 차감은 서버 RPC(`deduct_credits`)로 수행 (클라이언트 단독 차감 구조 제거)
- [x] `payment.ts`가 상품별 정가와 Toss 승인 금액을 서버에서 대조
- [x] 환불/취소 API에 소유권·관리자 검증
- [x] 하드코딩 시크릿 제거, 환경변수 누락 시 fail-fast (`getTossAuthHeader`)
- [x] `REACT_APP_` 변수에 서버 전용 키 없음 (신규 변수 추가 시 재확인)
- [ ] 크레딧 차감과 AI 결과 생성이 같은 요청에서 **원자적**인지 (차감 후 AI 실패 시 환불 처리 여부)
- [ ] CORS 잔여 `*` 제거 (§3.2-7)
- [ ] Supabase RLS 운영 DB 전수 확인: `profiles`, `credit_purchases`, `credit_usages`, `orders`, `deep_reports`,
      `deep_report_requests`, `chat_messages`, `user_relationships` (저장소에 정책이 없는 테이블은 특히 위험군)
- [ ] AI 프롬프트 인젝션 방어 (§3.2-6)
- [ ] `chat.ts` 등 요청 빈도 제한 (§3.2-2)
- [ ] `html2canvas`/PDF/DOCX 생성 시 사용자 입력이 그대로 렌더링되어 XSS로 이어질 가능성
- [ ] `confirmPayment`의 사용자 식별 신뢰 문제 (§3.2-4)

## 5. 코드 구조/품질 점검 체크리스트

- [ ] `api/payment.ts`(약 600줄)에 confirm/cancel/info가 한 파일에 몰려 있음 — Toss 클라이언트 생성, 상품별 처리를 모듈로 분리할 여지
- [ ] `getSupabaseAdmin`이 `payment.ts`와 `_utils/auth.ts`에 중복 정의됨 — 공통 모듈로 통합
- [ ] `useCredits.ts`가 조회/차감/구매 후 갱신/환불 요청 등을 모두 담당 — 책임 분리 가능성
- [ ] Zod 스키마(`src/config/schemas.ts`)와 `api/*.ts` 내 스키마 정의 중복 여부
- [ ] `any` 타입(`VercelRequest = any` 등) 남용 — `api/payment.ts`, `generate-and-save-report.ts` 등
- [ ] 에러 처리 시 `error.message`를 그대로 반환하는 곳(`generate-and-save-report`, `generate-deep-report`)
- [ ] `console.log`/`console.error`가 프로덕션에 남아 민감 정보(세션, 사용자 ID)를 노출하는지
- [ ] 자동화된 테스트가 없다 — 심층 리포트 엔진(§10)은 순수 함수 위주라 단위 테스트 추가 효과가 크다

## 6. 비즈니스 로직 점검 체크리스트

- [ ] 크레딧 단가 정책(`creditConfig.ts`, `api/_utils/auth.ts`의 `SERVICE_COSTS`)과 실제 차감 RPC 로직 일치
- [ ] 환불 정책(`REFUND_PERIOD_DAYS`, 크레딧 미사용 시에만 환불)이 서버 RPC/DB 트리거에서도 강제되는지 (§3.2-3)
- [ ] 이벤트 크레딧(`event_claims`) 중복 참여 방지에 동시성 문제(레이스 컨디션)가 없는지 — `confirmPayment`는 SELECT 후 INSERT 구조
- [ ] 게스트(비회원) 결제 허용 범위(`deep_report`)와 주문 추적/CS 대응 구조
- [ ] 심층 리포트 가격은 `src/config/deepReportConfig.ts` **한 곳**에서 프런트(랜딩·모달)와 서버(`payment.ts`)가 공유한다. 가격 변경 시 이 파일만 수정한다.
- [ ] 카카오 알림톡은 휴대폰 번호가 필요한데 신청 폼은 카카오톡 **ID**만 받는다(보류 중인 알림 기능의 선결 과제).

## 7. 프런트엔드/UX 특이사항 (참고용, `design.md` 병행 확인)

- 모바일 Safari 세션/쿠키 이슈 대응 코드(`supabaseClient.ts`의 재시도/캐시 로직)가 과도하게 복잡해져 유지보수 부담이 되는지
- 20대 여성 타깃 서비스 특성상 생년월일시·연애 상담 내용 등 민감 개인정보가 로컬스토리지/콘솔에 평문 노출되지 않는지
- `/premium` 랜딩: 근거가 확인되지 않는 수치 문구("1,000만 건 데이터" 등)와 후기를 넣지 않는다. 신청 모달 상단에는 일부 남아 있다.
- 샘플 캡처(`public/assets/premium/report-*.jpg`)는 가상 인물이며 랜딩에 그 사실을 명시한다. 리포트 레이아웃을 바꾸면 재생성해야 한다.

## 8. 실행/검증 방법

```bash
npm start                      # 웹 개발 서버 (craco start) — /api 는 package.json proxy 로 운영 서버로 간다
npm run build                  # 프로덕션 빌드
npx tsc --noEmit -p api        # 서버(api/) 타입 체크
npx tsc --noEmit -p .          # 프런트(src/) 타입 체크
npx eslint <파일>               # 변경 파일 린트
```
- 개발 서버의 `/api/*`는 운영으로 프록시되므로 **새로 만든 API는 `vercel dev` 또는 배포 후**에야 호출 검증이 가능하다.
- 실제 결제 플로우는 Toss 테스트 키로만 검증하고 운영 시크릿으로 직접 테스트하지 말 것.
- 리포트 엔진은 `ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node","esModuleInterop":true}'`로
  Node에서 직접 실행해 결정론 계산을 검증할 수 있다. `ai` SDK를 `Module._load`로 가짜로 바꾸면 AI 호출 없이 조립 로직을 검증할 수 있다.

## 9. 점검 결과 산출 형식 (에이전트 준수 사항)

리뷰 결과는 다음 형식을 따를 것:
- **심각도**(Critical/High/Medium/Low) — **파일:라인** — **문제 요약** — **구체적 악용/실패 시나리오**
  — **권장 수정 방향**
- 추측성 지적 금지: 반드시 실제 코드를 읽고 근거를 인용할 것 (RLS처럼 저장소에 정의가 없는
  부분은 "확인 불가, 운영 DB 직접 확인 필요"로 명시)
- **이미 해소된 항목(§3.1)을 다시 취약점으로 보고하지 말 것.** 회귀가 의심되면 근거 코드를 함께 제시한다.
- 즉시 수정 가능한 항목과 설계 변경이 필요한 항목을 분리해서 제시

## 10. 3년 심층 리포트 엔진 (`api/_utils/report-*.ts`, schemaVersion 3)

### 10.1 설계 불변식 — 수정 시 반드시 지킬 것

1. **사실은 코드가 계산하고 AI는 해석만 한다.** 원국, 일간 강약·용신, 대운·세운·월운, 합충, 분야별 점수, 월별 점수, 좋은/조심할 달은
   모두 결정론적이다. 프롬프트에는 "코드 계산값, 임의 변경 금지"로 주입한다. 같은 입력이면 점수가 항상 같아야 한다.
2. **스토리 아크 선행.** 3년의 관통 주제·은유·연도별 역할을 먼저 한 번 생성해 모든 항목에 주입한다. 실패해도 리포트는 계속 생성한다(아크 없이).
3. **사실 검증.** 본문의 한자 간지·연도가 허용 목록(원국·대운·세운·월운·과거·올해)에 없으면 오류 목록과 함께 재생성한다. 끝내 실패하면 문제 간지 병기만 제거한다.
   `pastCheck`는 허용 연도를 지난 3개 연도로 더 좁힌다(`onlyYears`).
4. **분량 목표: A4 20장 내외.** 소제목당 약 360~600자(`chars`), 항목 수는 본문 약 21개. 분량을 늘리면 페이지가 바로 22쪽 이상으로 늘어난다.
5. **'올해'의 기준은 입춘.** 1월~2월 초에는 사주상 아직 작년이므로 `getReportBaseYear`를 쓴다(`new Date().getFullYear()` 직접 사용 금지).
6. **무료 미리보기와 유료 리포트의 점수는 같은 함수**(`computeYearFortune`, 올해 남은 기간은 `computeRemainingScores`)를 쓴다. 한쪽만 바꾸면 불일치가 생긴다.
7. 무료 응답(`report-preview`)에는 **점수표만** 담는다. 총평·월별 지도·점수 근거·본문은 유료.

### 10.2 모듈

| 파일 | 역할 |
|---|---|
| `report-generator.ts` | 진입점 `generateDeepReport`. 아크 → 병렬 본문 생성 → 사실 검증 → 결과 조립 |
| `report-score.ts` | 일간 강약(억부)·용신/기신, 연·월 점수 엔진, 올해 남은 기간 점수 |
| `report-relations.ts` | 합·충·형·파·해, 삼합·반합·방합, 천간합충, 천을귀인, 공망 |
| `report-terms.ts` | 연도별 절기월 시작일(21세기 근사식, 일자 단위) |
| `report-years.ts` | 올해(입춘 기준)·로드맵 3개년·지난 3년 계산, 로드맵 제목 |
| `report-fortune.ts` | 위 계산값을 프롬프트용 텍스트로 변환 |
| `report-mbti.ts` | 사주 십성·오행 ↔ MBTI 4축 일치/상반 판정(재미용 가설 규칙) |
| `report-verify.ts` | 환각 간지·연도 검증 |
| `report-preview.ts` | 결제 전 무료 점수표 계산 (`api/report-preview.ts`가 노출) |

### 10.3 결과 구조와 렌더러

- 결과 JSON의 새 필드(`storyArc`, `strength`, `pastCheck`, `currentYear`, `calendar`, `partnerOverlap`, `summary.concernAnswer`)는 **모두 선택값**이다.
  `schemaVersion` 2 리포트도 `DeepReportReactPDF.tsx`/`docxGenerator.ts`가 그대로 렌더링해야 한다(필드 누락 허용).
- PDF 페이지 흐름: 표지 → 목차 → 한눈에 보기 → 01~06 장 → 07 올해 남은 기간 → 08 3년 개요(스토리 아크+36개월 지도) → 연도별 2쪽 → 09 에필로그.
- 표지는 흰 바탕·검정 글씨, 브랜드 포인트(바이올렛 `#7C3AED`, 로고 핑크 `#FFB7B2`)만 사용한다. 안쪽 페이지의 어두운 카드와는 톤이 다르다.
- **react-pdf 주의:** 고정 길이 페이지(목차)는 `wrap={false}`로 둔다. 하단 여백만 넘쳐도 빈 페이지가 생긴다. 본문 마지막 줄은 `marginBottom: 0`으로 처리한다.
  페이지 수는 가짜 본문 또는 실제 생성 결과로 렌더링해 직접 세어 확인한다(`pymupdf`로 PNG 변환 가능).

### 10.4 알려진 한계

- 절기월 시작은 **일자** 단위 근사다(절입 시각 미반영, 경계일 ±1일 오차 가능).
- 용신은 억부 기준 단순 판정이다(조후용신·격국·합화 여부 미반영).
- 심층 리포트 기본 모델 `gpt-4o-mini`는 일반론적 문장이 나오는 경우가 있다. 상위 모델은 병렬 호출 시 429 위험이 있어 `REPORT_OPENAI_MODEL`로만 교체한다.
- 보류 중인 기능: 결제 후 자동 이메일 발송, 토큰 링크 웹 뷰어(체크리스트·피드백), 카카오 알림톡(휴대폰 번호 수집 필요), 월 1회 월운 메일(수신 동의 필요).
