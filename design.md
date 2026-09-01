# 🎨 MBTIJU (엠비티아이주) - 디자인 시스템 및 UI/UX 가이드라인 (`design.md`)

> **문서 버전**: v1.0.0  
> **대상**: 프론트엔드 개발자, UI/UX 디자이너, AI 코딩 에이전트  
> **언어**: 한국어 (Korean)  
> **목적**: MBTIJU 서비스의 시각적 일관성, 접근성, 모바일/앱인토스(AIT) 최적화 및 브랜드 아이덴티티를 유지하기 위한 디자인 원칙과 컴포넌트 규격을 정의합니다.

---

## 1. 🌌 디자인 철학 및 브랜드 컨셉

MBTIJU의 디자인은 **"모던 신비주의(Modern Mysticism)"**와 **"절제된 럭셔리(Restrained Luxury)"**를 지향합니다.

### 핵심 디자인 원칙
1. **신비로움과 명확성의 균형**: 전통 사주명리학의 깊이 있는 분위기를 살리되, 정보 전달은 현대적이고 직관적이어야 합니다.
2. **모바일 퍼스트 (Mobile-First)**: 토스(Toss) 슈퍼앱 미니앱 및 모바일 웹 환경에서 최상의 터치 경험과 부드러운 반응성을 제공합니다.
3. **고급스러운 여백과 글래스모피즘**: 복잡한 사주 데이터를 부드러운 글래스 카드와 라운드 코너(24px~32px), 섬세한 그림자로 편안하게 시각화합니다.

---

## 2. 🎨 색상 시스템 (Color Palette & Semantic Tokens)

### 1) 기본 배경 및 텍스트 (Base Colors)
| 토큰명 | HEX 코드 | 용도 및 설명 |
|---|---|---|
| `soft-ivory-bg` | `#F9F7F2` | 전체 서비스 메인 캔버스 배경 (따뜻하고 편안한 전통 한지 느낌) |
| `clean-white` | `#FFFFFF` | 카드, 모달, 리포트 내부 배경 |
| `slate-text` | `#0F172A` | 메인 헤드라인 및 본문 텍스트 (Slate 900) |
| `slate-muted` | `#64748B` | 보조 텍스트, 캡션, 비활성 레이블 (Slate 500) |
| `slate-dark-bg` | `#020617` | 신비 테마 모달, 타로/차트 다크 카드 배경 (Slate 950) |

### 2) 브랜드 & 테마 액센트 (Brand Accents)
| 토큰명 | HEX 코드 | 용도 및 설명 |
|---|---|---|
| `celestial-violet` | `#7C3AED` / `#6D28D9` | 신비로운 운명 분석, 프리미엄 강조, 주요 액션 버튼 |
| `soft-peach` | `#FFDAC1` | 온화한 에너지, 하이라이트 배지 |
| `primary-pink` | `#FFB7B2` | 연애운/궁합 테마 하이라이트 |
| `sky-blue` | `#B2E2F2` | 통찰, 여행, 행운 포인트 액센트 |

### 3) 오행(五行) 전용 시각화 색상 (`src/constants/saju.ts`)
| 오행 (Five Elements) | 대표 상징 | Tailwind 스타일 클래스 |
|---|---|---|
| **목 (Wood)** | 성장, 나무, 봄 | `bg-emerald-50 text-emerald-700 border-emerald-100` |
| **화 (Fire)** | 열정, 불, 여름 | `bg-rose-50 text-rose-700 border-rose-100` |
| **토 (Earth)** | 포용, 흙, 환절기 | `bg-amber-50 text-amber-700 border-amber-100` |
| **금 (Metal)** | 결단, 쇠/바위, 가을 | `bg-slate-50 text-slate-700 border-slate-200` |
| **수 (Water)** | 지혜, 물, 겨울 | `bg-blue-50 text-blue-700 border-blue-100` |

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

### 3) 입력창 (Input Fields)
- **표준 입력 필드 (`.input-field`)**:
  `w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-950/10 focus:border-slate-950 outline-none transition-all shadow-sm text-[16px]`

### 4) 모달 (Modals & Bottom Sheets)
- **오버레이**: `fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4`
- **컨테이너**: `bg-white w-full max-w-lg rounded-[32px] p-6 md:p-8 shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto`
- **모바일 바텀시트 대응**: 모바일 뷰포트에서는 화면 하단에 밀착되는 시트 형태로 자연스럽게 전환.

---

## 5. 📱 앱인토스(AIT) & 모바일 뷰포트 최적화

1. **Safe Area 인셋 대응**:
   - 상단 헤더: `padding-top: env(safe-area-inset-top)` 또는 `.pt-safe`
   - 하단 내비게이션 바: `padding-bottom: env(safe-area-inset-bottom)` 또는 `.pb-safe`
2. **웹뷰 오버스크롤 방지**:
   - `body { overscroll-behavior-y: none; }` 적용으로 모바일 앱과 같은 네이티브 조작감 유지.
3. **하단 내비게이션 바 (`BottomNav.tsx`)**:
   - 고정 높이 64px + Safe Area Padding
   - 활성 탭: Violet Accent 아이콘 + 레이블 볼드
   - 비활성 탭: Slate 400 + 터치 피드백(`active:scale-90`)

---

## 6. 📄 PDF 및 인쇄 레이아웃 표준 (`DeepReportReactPDF.tsx`)

- **용지 규격**: A4 (210mm x 297mm), 인쇄 여백 `padding: '20mm'`
- **텍스트 색상 강제**: 인쇄 시 가독성을 위해 본문은 고대비 다크 텍스트 (`#0F172A`) 강제.
- **페이지 나눔 방지 (`page-break-inside: avoid`)**:
  - 사주 명식표 테이블, 대운 그래프, 개운법 박스가 페이지 중간에 잘리지 않도록 React-PDF의 `wrap={false}` 속성 적용.
- **표지 디자인**: 딥 네이비/슬레이트 배경 (`#0F172A`)에 골드/화이트 타이틀로 웅장하고 격조 높은 표지 구성.
