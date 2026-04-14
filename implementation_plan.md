# MBTI-Saju UI/UX Revamp & Engagement Strategy

이 계획은 **Stitch MCP**를 직접 활용하여 서비스를 10~20대 여성 타겟의 **심플하고 깨끗한 화이트 디자인**으로 개편하고, 요청하신 **구매 유도 아이디어 1(궁합 공유)과 2(매력 스탯/OOTD)**를 구현하는 것을 목표로 합니다.

## User Review Required
> [!IMPORTANT]
> 1. **Stitch 디자인 시스템:** 제가 `create_design_system`을 통해 생성할 테마(White + Soft Pink/Peach)가 마음에 드시는지 확인이 필요합니다.
> 2. **궁합 공유 링크:** 친구에게 공유할 링크 형식을 `domain.com/share/compatibility/[userId]` 형태로 구성하려 합니다.

---

## Proposed Changes

### 🎨 디자인 개편 (Stitch MCP 활용)

#### [MODIFY] `src/components/HeroSection.tsx`
- **배경 변경:** `mystical_hero_bg.png` 및 어두운 오버레이 제거.
- **스타일:** 깨끗한 화이트 배경에 은은한 파스텔 그라이데이션 및 Stitch 스타일의 둥근 입체 버튼 적용.
- **카피:** "가장 신비로운 거울" -> "나를 찾는 가장 깨끗한 거울" 등 톤앤매너 수정.

#### [MODIFY] `src/index.css` & `tailwind.config.js`
- Stitch MCP로 정의된 토큰(Soft Pink, Peach, Large Roundness)을 전역 스타일에 반영.
- 다크/네이비 톤의 변수들을 밝은 톤으로 전면 교체.

---

### 🚫 기능 제거

#### [DELETE] `src/components/SocialProofToast.tsx`
#### [MODIFY] `src/App.tsx`
- 실시간 활동 알림 컴포넌트 삭제 및 모든 렌더링 참조 제거.

---

### ✨ 신규 기능 구현

#### 1. "우리 얼마나 찰떡일까?" (궁합 공유 시스템)
- **[NEW] `src/pages/CompatibilitySharePage.tsx`**: 친구가 링크를 타고 들어왔을 때 보이는 초대 페이지. 초대자의 이름/MBTI를 보여주고 자신의 정보를 입력하게 유도.
- **[MODIFY] `src/App.tsx`**: `/share/compatibility/:userId` 라우트 추가.
- **[MODIFY] `src/components/CompatibilityModal.tsx`**: 결과 화면에 "친구에게 공유하기" 버튼 추가 및 공유 링크 생성 로직 구현.

#### 2. "퍼스널 매력 스탯 & 오늘의 하이틴 OOTD"
- **[MODIFY] `src/config/schemas.ts`**: `dailyFortuneSchema`에 `charm_stats` (매력 지수 배열) 및 `lucky_ootd` 필드 추가.
- **[MODIFY] `api/analysis-special.ts`**: 운세 생성 시 매력 스탯과 OOTD를 함께 생성하도록 AI 프롬프트 및 스키마 업데이트.
- **[MODIFY] `src/components/FortuneModal.tsx`**: 운세 결과 화면에 매력 스탯 차트와 OOTD 추천 위젯을 시각적으로 배치 (Stitch 감성 반영).

---

## Open Questions
- 공유 링크 클릭 시 초대자의 사주 정보를 Supabase 등에서 가져와야 하는데, 현재 `profiles` 테이블에 해당 정보가 모두 저장되어 있는지 확인이 필요합니다.

## Verification Plan

### Automated Tests
- `npm run build`: Vercel 배포 전 빌드 에러 및 린트 체크.
- `/api/fortune` API 응답 스키마 정합성 확인.

### Manual Verification
- 브라우저를 통해 메인 화면의 배경색 및 버튼 스타일이 개편되었는지 확인.
- 공유 링크를 통해 신규 인원 정보 입력 및 궁합 결과 확인 테스트.
