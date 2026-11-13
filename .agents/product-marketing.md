# Product Marketing Context — MBTIJU (엠비티아이주)

**Document version:** v1
**Last updated:** 2026-11-13

> 출처: `CLAUDE.md`, `agent.md`, `skills.md`, `src/config/creditConfig.ts`, `src/config/deepReportConfig.ts`, `marketing_automation/CLAUDE.md`, `marketing_automation/VIRAL_1M_MASTER_PLAN.md`, `.agents/skills/reels-composer/SKILL.md`.
> 코드/문서에서 확인되지 않은 항목은 `(미확인)`으로 표시한다. **숫자·통계·후기·실존하지 않는 기능을 절대 지어내지 않는다.**

## Product Overview
**One-liner:** 정통 사주명리학(만세력 8자·일간·십성·대운/세운/월운)과 서양 MBTI 성격 유형을 융합한 하이브리드 운세·심층 리포트 플랫폼.
**Web URL:** `https://www.mbtiju.com` (React SPA + Vercel Serverless + Supabase + TossPayments 웹 위젯).
**Core Offerings & Confirmed Pricing:**
1. **무료 & 크레딧 기반 라이트/스탠다드/프리미엄 운세 (`src/config/creditConfig.ts`)**:
   - **무료 (0 C)**: 오늘의 운세 (`FORTUNE_TODAY`), 무료 3년 점수표 미리보기 (`/api/report-preview`, 점수표만 제공)
   - **라이트 (2 C)**: 신비타로 (일일/연애/커리어 3카드 스프레드)
   - **스탠다드 (5 C)**: 내일 운세, 1:1 궁합, 여행지 추천, KBO 구단 궁합, 금전/재물/사업/취업/이직 사주, 연애/부부/결혼/재회/짝사랑 사주
   - **프리미엄 (10~20 C)**: 재분석(10 C), 자미두수(15 C), MBTI & 사주 메인 분석(20 C, 가입 후 첫 1회 무료 체험 슬롯 `claim_mbti_saju_free_slot` 지원), AI 1:1 심층 상담 5회(20 C)
2. **3년 심층 사주 리포트 (`/premium`, `src/config/deepReportConfig.ts`)**:
   - **가격 (확정)**: 정가 **49,000원** → 판매가 **29,000원** (A4 20장 내외 PDF/DOCX, 비회원 신청·결제 가능)
   - 결정론적 만세력·대운/세운/월운/합충 계산 + 스토리 아크 + 사실 검증기(`report-verify.ts`) + 관리자 검수 후 이메일 발송
3. **카카오톡 채널 1:1 사주·MBTI 상담 (`https://pf.kakao.com/_xcdXJX/chat`)**:
   - **가격 (확정)**: 1가지 고민 **9,900원** / 3문항 패키지 **19,900원**
   - **확인된 운영 사실**: "AI 분석을 바탕으로 운세 서비스 전문가가 직접 검수", "평일 기준 24시간 이내 답변 전달" (**실시간 채팅/예약 상담 언급 금지**)

## Target Audience
- **핵심 타깃**: 한국 2030 여성 (연애·썸·재회·궁합·이직/퇴사·금전·자아탐구 관심층)
- **콘텐츠 투트랙 퍼널 (`VIRAL_1M_MASTER_PLAN.md`)**:
  - **트랙 1 (대중 확장형 80%)**: `viral_checklist`, `viral_fakeout`, `viral_pov`, `viral_mystery`, `viral_balance`, `top3_ranking` — 첫 3초는 누구나 자기 대입 가능한 일상/연애/심리 훅으로 멈춰 세우고 중반(씬 4~6)에 사주 일간·십성·신살(도화살/홍염살/역마살/화개살)로 반전 해부
  - **트랙 2 (사주 코어 핀셋형 20%)**: 일간+성별/MBTI 교차·궁합·3년 대운 흐름 중심의 고관여 전환 콘텐츠

## Brand Voice & Channel Guardrails (절대 준수)
1. **나레이션 & 제목에 한자 금지**:
   - TTS 엔진이 한글+한자를 중복 발음(`토(土)` → `"토토"`)하므로 `narration`과 `title`에 한자를 넣지 않는다.
2. **초반 1초 훅 규칙 (`HOOK_BAN_BIRTHYEAR`, `HOOK_BAN_MBTI`)**:
   - 릴스/숏츠의 제목·훅·씬 1 음성에서 특정 출생연도·띠(`98년생`, `범띠` 등)나 MBTI 4글자(`INFP`, `ENTJ` 등)를 첫 문장부터 직접 호명하지 않는다(조회수 하락 방지, 대중 확장 훅 우선).
3. **인스타그램 (릴스/캐러셀) 표기 제한**:
   - 영상 나레이션과 인스타 캡션에 **URL 및 가격을 직접 표기하지 않는다**. `"프로필 링크에서 확인"` / `"프로필 링크에서 카톡 1:1 상담"` 형태로만 안내한다.
   - 봇 자동 DM 발송 기능이 없으므로 `"댓글 남기면 링크/DM 바로 보내드려요"`처럼 거짓 약속을 하지 않고, `"댓글에 [사주] / [상담] 남겨주세요"` 수준으로만 작성한다.
4. **Threads 표기 규칙**:
   - Threads 답글 CTA에는 사이트(`https://www.mbtiju.com`) 또는 카톡 채널 주소(`https://pf.kakao.com/_xcdXJX/chat`)와 확정 가격(9,900원 / 19,900원 / 29,000원)을 직접 기재 가능하다.
5. **YouTube Shorts 표기 규칙**:
   - `adapt_caption_for_youtube`로 "프로필 링크" 문구가 설명란의 실제 URL(`https://www.mbtiju.com`, 카톡 채널 링크)로 치환된다.
6. **근거 없는 과장/허위 수치 금지**:
   - `"1,000만 건 데이터"`, `"만족도 99%"`, `"실존하지 않는 후기"` 등 근거 없는 수치와 최상급 표현(`1위`, `무조건 적중`)을 절대 쓰지 않는다.
   - 크롤링 기반 타사 상품/외부 뉴스 주제를 섞지 않는다.
