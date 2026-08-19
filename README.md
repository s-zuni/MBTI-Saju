# 🔮 MBTIJU (엠비티아이주)

> **사주명리학(四柱命理學)과 MBTI 성격 유형을 융합한 AI 기반 차세대 심층 성격 & 운세 분석 서비스**  
> 토스 앱인토스(Apps in Toss, AIT) 미니앱 및 독립 웹 플랫폼 지원.

---

## 📁 프로젝트 폴더 구조 (Project Architecture)

```text
MBTI-Saju/
├── api/                     # Vercel Serverless Functions (AI 분석, 결제, 리포트 생성 백엔드)
│   ├── _utils/              # API 공통 유틸리티 (AI Provider, CORS, 프롬프트, 사주 만세력 로직)
│   └── ...                  # 도메인별 엔드포인트 (*.ts)
├── docs/                    # 프로젝트 레퍼런스 및 플랫폼 연동 문서
│   ├── toss/                # Apps-in-Toss(AIT) 출시 및 인앱결제 가이드
│   └── llms.md              # AI 프롬프트 및 LLM 가이드
├── public/                  # 정적 웹 에셋
│   ├── assets/              # 아이콘, 로고, 디자인 에셋, 프리미엄 샘플
│   └── fonts/               # 웹 폰트 (나눔명조, 나눔고딕 등)
├── scripts/                 # 유틸리티 스크립트 (사이트맵 생성 등)
├── src/                     # React 프론트엔드 애플리케이션 소스코드
│   ├── assets/              # 컴포넌트 내부 에셋 (폰트, 배경 이미지 등)
│   ├── components/          # 재사용 가능한 UI 컴포넌트 & 모달
│   │   ├── admin/           # 관리자 대시보드 레이아웃/사이드바
│   │   ├── auth/            # 인증 콜백 컴포넌트
│   │   ├── pdf/             # @react-pdf 기반 심층 리포트 PDF 렌더러
│   │   ├── saju/            # 사주 명식 테이블/그리드
│   │   └── tarot/           # 타로 스프레드 선택기
│   ├── config/              # 서비스 설정 (크레딧 비용, 스키마, 로딩 메시지)
│   ├── constants/           # 사주/MBTI 상수 데이터
│   ├── data/                # 타로 덱 및 정적 데이터
│   ├── hooks/               # 커스텀 React Hooks (인증, 크레딧, 결제, 장바구니 등)
│   ├── pages/               # 라우트 페이지 컴포넌트
│   │   └── admin/           # 관리자 기능 페이지
│   ├── payment/             # 결제 핸들러 (AIT 인앱결제 및 웹 결제 추상화)
│   └── utils/               # 유틸리티 (사주 계산, 내보내기, AI 챗 서비스 등)
├── supabase/                # 데이터베이스 설정 및 마이그레이션
│   └── migrations/          # SQL 마이그레이션 스크립트
├── .gitignore               # 최적화된 Git 무시 규칙 (AIT 번들, 환경변수 등)
├── granite.config.ts        # 앱인토스(AIT) Granite 프레임워크 설정
├── craco.config.js          # CRA 빌드 오버라이드 설정 (Tailwind, PostCSS)
├── vercel.json              # Vercel 배포 및 API 라우팅 설정
└── package.json             # 의존성 및 스크립트 설정
```

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React
- **Platform**: Apps in Toss (AIT) Framework (`@apps-in-toss/web-framework`, Granite)
- **Backend / Serverless**: Vercel Serverless Functions (`api/*.ts`)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)
- **AI Engine**: Google Gemini API (`@ai-sdk/google`, `@google/generative-ai`), OpenAI (`@ai-sdk/openai`)
- **Document & Export**: `@react-pdf/renderer`, `html2canvas`, `jspdf`, `docx`, `exceljs`
- **Saju Astrology Engine**: `manseryeok`

---

## 🚀 시작하기 (Getting Started)

### 환경 변수 설정
루트 디렉터리에 `.env` 파일을 생성하고 필요한 키를 설정합니다:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 실행 및 빌드 명령어

| 명령어 | 설명 |
|---|---|
| `npm start` | 로컬 웹 개발 서버 실행 (`http://localhost:3000`) |
| `npm run build` | 프로덕션 웹 빌드 (`build/` 디렉터리 산출) |
| `npm run dev` | 앱인토스 Granite 로컬 개발 환경 실행 |
| `npm run package` | 앱인토스 바이너리 아티팩트 빌드 (`mbtiju.ait` 생성) |
| `npm run deploy` | 앱인토스 콘솔로 배포 |

---

## 📜 라이선스 및 문의
- 문의: axw0208@gmail.com
- 저작권: &copy; MBTIJU. All rights reserved.

