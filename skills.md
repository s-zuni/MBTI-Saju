# ⚡ MBTIJU (엠비티아이주) - 도메인 기능 및 스킬 명세서 (`skills.md`)

> **문서 버전**: v1.0.0  
> **대상**: AI 코딩 에이전트 및 개발자  
> **언어**: 한국어 (Korean)  
> **목적**: MBTIJU 서비스의 핵심 도메인 알고리즘, 연산 모듈, AI 오케스트레이션 및 외부 연동 스킬(Capabilities)을 체계적으로 정의하여 AI가 기능을 정확히 파악하고 호출 및 확장할 수 있도록 합니다.

---

## 📋 스킬 카탈로그 요약

| 스킬 코드 | 스킬 명칭 | 주관 파일 / 모듈 | 핵심 역할 |
|---|---|---|---|
| `saju-engine` | 만세력 및 사주명식 연산 | `src/utils/sajuUtils.ts`, `api/_utils/saju.ts` | 생년월일시 기반 4주 8자, 오행 분포, 십신, 신살 정밀 산출 |
| `mbti-fusion` | MBTI x 사주 융합 분석 | `api/analysis-main.ts`, `api/_utils/prompts.ts` | 사주 일간/오행과 MBTI 16유형의 성향 교차 분석 및 공명도 산출 |
| `ai-orchestrator` | AI 멀티 프로바이더 폴백 | `api/_utils/ai-provider.ts`, `src/config/schemas.ts` | Gemini 3.1 Flash / GPT-4o 멀티 스트리밍 및 Zod 구조화 보장 |
| `deep-report` | 심층 리포트 생성 & PDF 출력 | `src/components/pdf/DeepReportReactPDF.tsx`, `api/generate-deep-report.ts` | 20+ 페이지 분량의 고해상도 A4 PDF 및 Word 문서 생성 |
| `toss-bridge` | 앱인토스(AIT) 플랫폼 연동 | `src/payment/ait/`, `granite.config.ts`, `docs/toss/` | 토스 네이티브 로그인, 인앱결제(IAP), Safe Area, 애널리틱스 |
| `credit-payment` | 크레딧 & 결제 관리 | `src/hooks/useCredits.ts`, `src/payment/`, `src/config/creditConfig.ts` | Supabase RPC 원자적 크레딧 차감, 웹/AIT 멀티 결제 라우팅 |
| `specialized-fortune` | 도메인 특화 운세 모듈 | `api/tarot.ts`, `api/gold.ts`, `api/love-saju.ts`, `src/pages/` | 타로 78장, KBO 야구 궁합, 자미두수, 금전/이직/연애 사주 |

---

## 1. 📜 스킬 1: 만세력 및 사주명식 연산 (`saju-engine`)

### 기능 설명
사용자의 양력/음력 생년월일시 및 성별 데이터를 바탕으로 천문학적 절기(24절기) 기준의 사주 4주(년주, 월주, 일주, 시주) 8자를 계산하고, 오행 및 십신을 정밀 분석합니다.

### 핵심 함수 및 인터페이스
```typescript
// 위치: src/utils/sajuUtils.ts & api/_utils/saju.ts
export interface SajuPillars {
  year: { gan: string; zhi: string; ganElement: string; zhiElement: string };
  month: { gan: string; zhi: string; ganElement: string; zhiElement: string };
  day: { gan: string; zhi: string; ganElement: string; zhiElement: string };
  hour: { gan: string; zhi: string; ganElement: string; zhiElement: string };
}

export interface FiveElementsScore {
  wood: number;   // 목 (0~100%)
  fire: number;   // 화 (0~100%)
  earth: number;  // 토 (0~100%)
  metal: number;  // 금 (0~100%)
  water: number;  // 수 (0~100%)
}

// 만세력 계산 메인 진입점
export function calculateSaju(birthDate: string, birthTime: string, isLunar: boolean, gender: 'male' | 'female'): SajuPillars;
export function getFiveElementsDistribution(pillars: SajuPillars): FiveElementsScore;
export function getTenGods(dayMaster: string, pillars: SajuPillars): Record<string, string>;
```

### 오행 및 십신 매핑 상수 (`src/constants/saju.ts`)
- **천간(10간)**: 갑(甲/목), 을(乙/목), 병(丙/화), 정(丁/화), 무(戊/토), 기(己/토), 경(庚/금), 신(辛/금), 임(壬/수), 계(癸/수)
- **지지(12지)**: 자(子/수), 축(丑/토), 인(寅/목), 묘(卯/목), 진(辰/토), 사(巳/화), 오(午/화), 미(未/토), 신(申/금), 유(酉/금), 술(戌/토), 해(亥/수)
- **십신(10신)**: 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인

---

## 2. 🧬 스킬 2: MBTI x 사주 융합 분석 엔진 (`mbti-fusion`)

### 기능 설명
동양 철학의 일간(Day Master) 특성 및 오행의 조화와, 서양 심리학의 MBTI 4대 축(E/I, S/N, T/F, J/P)을 결합하여 고유한 페르소나와 인생 전략을 도출합니다.

### 융합 매트릭스 알고리즘
1. **일간(Day Master)과 MBTI 태도 지표 결합**:
   - 예: `갑목(甲木)`의 진취성과 `ENTJ`의 리더십 -> 대담한 개척자형 페르소나
   - 예: `계수(癸水)`의 유연함과 `INFP`의 공감력 -> 심해의 치유자형 페르소나
2. **오행 결핍 보완 전략**:
   - 화(Fire) 기운 부족 시 -> MBTI의 E(외향) 및 Action 지향 전략 권장
   - 금(Metal) 기운 부족 시 -> MBTI의 T(사고) 및 J(계획) 기반 결단력 솔루션 제안
3. **분석 엔드포인트 (`api/analysis-main.ts`)**:
   - `part=core`: 본질적 성격 융합 분석
   - `part=fortune`: 올해 및 평생 운의 흐름
   - `part=strategy`: 관계/직업/재물 실전 솔루션
   - `part=full`: 종합 리포트

---

## 3. 🧠 스킬 3: AI 프롬프트 오케스트레이션 & 폴백 체인 (`ai-orchestrator`)

### 기능 설명
고품질의 운세 텍스트 생성을 위해 다중 LLM 프로바이더(Google Gemini, OpenAI)를 지능적으로 오케스트레이션하고, 장애 발생 시 자동으로 즉시 폴백합니다.

### 폴백 아키텍처 (`api/_utils/ai-provider.ts`)
```text
[요청 시작 (Attempt 0)]
     ↓
1순위: Google Gemini 3.1 Flash Lite (빠른 속도 & 정밀 한국어)
     ↓ (실패 또는 Rate Limit 시)
2순위: OpenAI GPT-4o-mini (Attempt 1)
     ↓ (실패 시)
3순위: Google Gemini Fallback (Attempt 2)
     ↓ (실패 시)
4순위: OpenAI GPT-4o-mini Fallback (Attempt 3)
```

### Zod 응답 스키마 강제 (`src/config/schemas.ts`)
모든 AI 응답은 자유 텍스트가 아닌 Zod 스키마 기반의 JSON 객체로 파싱되어 프론트엔드 UI 컴포넌트에 안전하게 바인딩됩니다.

---

## 4. 📑 스킬 4: 고품질 심층 리포트 생성 및 PDF 엔진 (`deep-report`)

### 기능 설명
20~30페이지에 이르는 전문 사주 감명서 수준의 '심층 분석 리포트'를 서버리스 백엔드에서 비동기 생성하고, 클라이언트에서 `@react-pdf/renderer`를 통해 고해상도 인쇄용 PDF로 변환합니다.

### 주요 구성 및 파일
- `api/generate-deep-report.ts`: 섹션별 병렬 AI 생성 엔진
- `api/generate-and-save-report.ts`: 생성된 JSON을 Supabase `deep_reports` 테이블에 영구 저장
- `src/components/pdf/DeepReportReactPDF.tsx`:
  - A4 규격 레이아웃 및 폰트 임베딩 (`NotoSansKR`, CJK 하이픈 처리)
  - 표지, 사주 명식표, 대운/세운 그래프, 분야별 심층 분석, 맞춤 개운법 페이지 구성
- `src/utils/docxGenerator.ts`: Word(.docx) 다운로드 지원
- `src/utils/exportUtils.ts`: html2canvas 기반 SNS 공유용 카드 이미지 저장

---

## 5. 💎 스킬 5: 앱인토스(AIT) 네이티브 통합 브릿지 (`toss-bridge`)

### 기능 설명
토스(Toss) 슈퍼앱 환경에서 원활하게 구동되도록 `@apps-in-toss/web-framework` SDK를 완벽히 연동합니다.

### 연동 인터페이스
1. **환경 감지**: `src/utils/envUtils.ts`의 `isTossApp()` 함수를 통해 실행 환경 분기.
2. **토스 로그인**: 토스 네이티브 계정 인증 및 토큰 교환.
3. **토스 인앱결제 (IAP)**: `src/payment/ait/aitPaymentHandler.ts`를 통해 토스 결제 모달 호출 및 영수증 검증.
4. **UI Safe Area**: CSS `.pt-safe`, `.pb-safe` 유틸리티를 통한 상/하단 인셋 영역 자동 보정.
5. **빌드 도구**: `granite.config.ts` 및 `ait CLI` (`npm run package`, `npm run deploy`).

---

## 6. 💳 스킬 6: 크레딧 및 결제 관리 시스템 (`credit-payment`)

### 기능 설명
사용자의 크레딧 잔액을 안전하게 관리하고, 웹/앱인토스 멀티 플랫폼 결제를 단일 인터페이스로 추상화합니다.

### 크레딧 연산 규칙
- `useCredits.ts`:
  - `deductCredits(amount, serviceType)`: Supabase RPC 호출을 통한 원자적(Atomic) 잔액 차감.
  - `addCredits(amount, reason)`: 결제 승인 후 크레딧 충전.
- `src/payment/index.ts`:
  - `processPayment(packageInfo)`: 플랫폼에 따라 `aitPaymentHandler` 또는 `webPaymentHandler`로 자동 라우팅.

---

## 7. 🔮 스킬 7: 도메인 특화 운세 서브 모듈 (`specialized-fortune`)

| 서브 모듈 | 설명 | 진입점 |
|---|---|---|
| **신비타로** | 78장 라이더-웨이트 타로 덱 기반 일일/연애/커리어 3카드 스프레드 리딩 | `api/tarot.ts`, `src/pages/TarotPage.tsx` |
| **KBO 야구 궁합** | 사주 오행과 10개 KBO 구단 상성 매칭 및 응원 운세 | `src/pages/KboPage.tsx`, `src/config/teamConfig.ts` |
| **자미두수 (紫微斗數)** | 동양의 점성술 12궁 성좌 배치 및 평생 명반 분석 | `src/pages/JamidusuPage.tsx` |
| **금전/사업/이직 사주** | 재물운 흐름, 창업 적기, 이직 타이밍 전문 분석 | `api/gold.ts`, `src/pages/GoldPage.tsx` |
| **인연 관리 & 궁합** | 연인/부부/재회/짝사랑 사주 및 인연 목록 관리 | `api/love-saju.ts`, `src/pages/RelationshipPage.tsx` |
| **궁합 여행지** | 사주 부족 오행을 채워주는 국내/해외 맞춤 여행지 추천 | `src/pages/TripPage.tsx` |
