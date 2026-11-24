# 🎨 MBTIJU (엠비티아이주) - 디자인 시스템 및 UI/UX 가이드라인 (`design.md`)

> **문서 버전**: v2.1.0 (`2026-11-24`)  
> **대상**: 프론트엔드 개발자, UI/UX 디자이너, AI 코딩 에이전트  
> **언어**: 한국어 (Korean)  
> **목적**: MBTIJU 서비스의 시각적 일관성, 접근성, 모바일 웹 최적화 및 브랜드 아이덴티티를 유지하기 위한 디자인 원칙과 컴포넌트 규격을 정의합니다.

---

## 1. 🌌 디자인 철학 및 브랜드 컨셉

MBTIJU의 디자인은 **"모던 신비주의(Modern Mysticism)"**와 **"절제된 럭셔리(Restrained Luxury)"**를 지향합니다.

### 핵심 디자인 원칙
1. **신비로움과 명확성의 균형**: 전통 사주명리학의 깊이 있는 분위기를 살리되, 정보 전달은 현대적이고 직관적이어야 합니다.
2. **모바일 퍼스트 (Mobile-First) & 무가입 즉시 진입**: 모바일 및 데스크톱 웹 환경에서 최상의 터치 경험과 함께 회원가입 벽 없이 `GuestProfileCard` 인라인 입력으로 바로 결제(490원/990원)·결과 확인이 가능해야 합니다.
3. **고급스러운 여백과 글래스모피즘**: 복잡한 사주 데이터를 부드러운 글래스 카드와 라운드 코너(24px~32px), 섬세한 그림자로 편안하게 시각화합니다.
4. **결제 전 법적 투명성**: 인라인 입력 카드(`GuestProfileCard`) 및 심층 리포트 모달 하단에 약관·개인정보처리방침·청약철회 제한 사전 고지를 항상 노출합니다.

---

## 2. 🎨 색상 시스템 (Color Palette & Semantic Tokens)

### 1) 기본 배경 및 텍스트 (Base Colors)
| 토큰명 | HEX 코드 | 용도 및 설명 |
|---|---|---|
| `slate-canvas` / `soft-ivory-bg` | `#F8FAFC` / `#F9F7F2` | 전체 서비스 기본 캔버스 배경 (`bg-slate-50` / 따뜻한 한지 톤 `.soft-ivory-bg`) |
| `hanji-card-bg` | `#FAF7F0` | 한지(Hanji) 에디토리얼 리포트 카드 배경 (테두리 `#E6DFD1`) |
| `clean-white` | `#FFFFFF` | 카드, 모달, 일반 리포트 내부 배경 |
| `slate-text` | `#0F172A` | 메인 헤드라인 및 본문 텍스트 (Slate 900) |
| `slate-muted` | `#64748B` | 보조 텍스트, 캡션, 비활성 레이블 (Slate 500) |
| `slate-dark-bg` | `#020617` | 신비 테마 모달, 타로/차트 다크 카드 배경 (Slate 950) |

### 2) 브랜드 & 테마 액센트 (Brand Accents)
| 토큰명 | HEX 코드 | 용도 및 설명 |
|---|---|---|
| `celestial-violet` | `#7C3AED` / `#6D28D9` | 신비로운 운명 분석, 프리미엄 강조, 일간/십신(`violet`) 강조, 주요 액션 버튼 |
| `soft-peach` | `#FFDAC1` | 온화한 에너지, 하이라이트 배지 |
| `primary-pink` | `#FFB7B2` | 연애운/궁합 테마 및 PDF 표지 포인트 액센트 |
| `sky-blue` | `#B2E2F2` | 통찰, 여행, 행운 포인트 액센트 |

### 3) 오행(五行) 및 일간·십신 시각화 색상 (`src/constants/saju.ts`, `MyPage.tsx`)
| 구분 | 대표 상징 | Tailwind 스타일 클래스 |
|---|---|---|
| **목 (Wood)** | 성장, 나무, 봄 | `bg-emerald-100 text-emerald-700 border-emerald-200` (단일 톤: `emerald`) |
| **화 (Fire)** | 열정, 불, 여름 | `bg-rose-100 text-rose-700 border-rose-200` (단일 톤: `rose`) |
| **토 (Earth)** | 포용, 흙, 환절기 | `bg-amber-100 text-amber-700 border-amber-200` (단일 톤: `amber`) |
| **금 (Metal)** | 결단, 쇠/바위, 가을 | `bg-slate-100 text-slate-700 border-slate-200` (단일 톤: `slate`) |
| **수 (Water)** | 지혜, 물, 겨울 | `bg-blue-100 text-blue-700 border-blue-200` (단일 톤: `blue`) |
| **일간 / 십신** | 사주 주체(日干) 및 십신 배지 | `violet` (`bg-violet-50` / `text-violet-700` / `border-violet-200`) |

---

## 3. 🔤 타이포그래피 (Typography Hierarchy)

```text
[Font Family Matrix]
- 정통/명식 헤더/리포트 표지 : 'NanumMyungjo', 'Noto Serif KR', serif
- 본문/UI/버튼/입력창 : 'Pretendard', 'Inter', -apple-system, sans-serif
- 영문/수치/지표/로고 : 'Epilogue', 'Manrope', sans-serif
- PDF 리포트 CJK 렌더링 : 'NotoSansKR' (로컬 TTF 임베딩)
```

### 텍스트 스케일 가이드
- **Hero Title (H1)**: `text-3xl md:text-5xl font-black tracking-tight leading-tight`
- **Section Title (H2)**: `text-xl md:text-2xl font-bold tracking-tight text-slate-900`
- **Report Section Title (`.report-section-title`)**: `text-base sm:text-lg font-extrabold text-slate-900`
- **Card Subtitle (H3)**: `text-base md:text-lg font-bold text-slate-800`
- **Body Text**: `text-sm md:text-base text-slate-600 leading-relaxed font-normal`
- **Caption / Meta**: `text-xs font-semibold text-slate-400 tracking-wide`

> [!IMPORTANT]
> **모바일 iOS Safari 자동 줌 방지 규칙**  
> `input`, `textarea`, `select` 입력 필드는 모바일 포커스 시 Safari의 강제 줌인을 방지하기 위해 반드시 `font-size: 16px !important;`를 준수해야 합니다.

---

## 4. 🧩 UI 컴포넌트 표준 규격

### 1) 버튼 (Buttons)
- **메인 CTA (`.btn-primary`)**:
  ```css
  @apply px-8 py-4 bg-slate-900 text-white rounded-[24px] font-black tracking-tight 
         transition-all hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-200 
         flex items-center justify-center gap-2;
  ```
- **신비 테마 CTA (`.btn-celestial`)**:
  ```css
  @apply px-8 py-4 bg-slate-950 text-white rounded-[24px] font-black tracking-tight 
         transition-all hover:bg-black active:scale-95 shadow-xl shadow-slate-100 
         flex items-center justify-center gap-2;
  ```
- **보조 버튼 (Secondary / Outline)**:
  `px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50`

### 2) 카드 (Cards)
- **글래스 카드 (`.glass-card`)**:
  `bg-white/80 backdrop-blur-xl border border-slate-100/60 shadow-[0_12px_40px_rgba(15,23,42,0.03)] rounded-3xl p-6`
- **셀레스티얼 카드 (`.celestial-card`)**:
  `bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_16px_48px_rgba(15,23,42,0.02)] hover:shadow-[0_24px_64px_rgba(124,58,237,0.05)] hover:-translate-y-1 transition-all duration-500`
- **리포트 카드 (`.report-card`)**:
  `bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/90 mb-5 transition-colors duration-200` (에디토리얼 한지 테마 카드 적용 시 배경 `#FAF7F0`, 테두리 `#E6DFD1`)

### 3) 입력창 (Input Fields)
- **표준 입력 필드 (`.input-field`)**:
  `w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all shadow-sm text-[16px]`

### 4) 모달 (Modals & Bottom Sheets)
- **오버레이**: `fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex justify-center items-end sm:items-center z-[1000] p-0 sm:p-6 overflow-y-auto` (모달 루트에 `role="dialog" aria-modal="true"` 및 백드롭 클릭 닫기 필수 적용)
- **컨테이너**: `w-full max-w-3xl max-h-[92vh] bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col sm:my-auto shadow-2xl`
- **모바일 바텀시트 대응**: 모바일 뷰포트(`items-end p-0`)에서는 화면 하단에 밀착되는 시트(`rounded-t-[32px] sm:rounded-[32px] max-h-[92vh]`) 형태로 자연스럽게 전환.

---

## 5. 📱 모바일 웹 뷰포트 최적화

1. **Safe Area 인셋 대응** (노치/홈 인디케이터가 있는 기기의 모바일 웹 브라우저 대응):
   - 상단 헤더: `padding-top: env(safe-area-inset-top)` 또는 `.pt-safe`
   - 하단 내비게이션 바: `padding-bottom: env(safe-area-inset-bottom)` 또는 `.pb-safe`
2. **웹뷰 오버스크롤 방지**:
   - `body { overscroll-behavior-y: none; }` 적용으로 모바일 앱과 같은 네이티브 조작감 유지.
3. **하단 내비게이션 바 (`BottomNav.tsx`)**:
   - 고정 높이 `h-14` (56px) + Safe Area Padding (`.pb-safe`)
   - 활성 탭: Violet Accent (`text-violet-600`) 아이콘 + 볼드 레이블 (`font-bold`)
   - 비활성 탭: Slate 400 (`text-slate-400`) + 터치 피드백 (`active:scale-95`)
4. **모바일 바텀시트 & 입력 그리드 반응형 규격**:
   - 모달 컨테이너는 모바일에서 `rounded-t-[32px] sm:rounded-[32px] max-h-[92vh]` 바텀시트로 전환
   - `GuestProfileCard.tsx`의 생년월일·태어난 시간 행은 좁은 모바일 화면에서 16px 입력창 잘림을 방지하기 위해 `grid-cols-1 sm:grid-cols-2` 1~2열 반응형 그리드를 적용

---

## 6. 📄 PDF 및 인쇄 레이아웃 표준

### 1) 3년 심층 리포트 (`DeepReportReactPDF.tsx`)
- **용지 및 여백 규격**: A4 (210mm × 297mm), 본문 페이지 여백 `16mm 17mm 20mm 17mm`
- **화이트 미니멀 표지 디자인**:
  - 배경 `#FFFFFF`, 기본 타이포그래피 `#0F172A`, 포인트 액센트 `#7C3AED` (Celestial Violet) / `#FFB7B2` (Primary Pink)
  - 동적 표지 타이틀 및 의뢰인 이름(한자 병기 포함)의 완벽한 CJK 한자 렌더링을 위해 `NotoSansKR` 폰트 적용
- **페이지 나눔 방지 (`wrap={false}`)**:
  - 사주 명식표 테이블, 대운 그래프, 개운법 박스가 페이지 중간에 잘리지 않도록 React-PDF의 `wrap={false}` 속성 적용

### 2) 웹 단건 사주 리포트 (`pdfGenerator.ts`)
- **다중 페이지 A4 자동 분할**: 단일 긴 DOM 캡처 시 페이지 경계가 잘리지 않도록 A4 비율 단위로 자동 슬라이싱(`addPage`)하여 다중 페이지 PDF 생성
- **비인쇄 UI 제외 규칙 (`data-pdf-ignore="true"`)**: 버튼, 스트리밍/완료 배너, 하단 CTA 등 인쇄·PDF 저장 시 불필요한 UI 요소에는 `data-pdf-ignore="true"` 속성을 부여해 캡처 대상에서 제외
