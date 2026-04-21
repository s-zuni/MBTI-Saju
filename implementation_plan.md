# TDS Mobile Migration & Violet Theme Integration

이 계획은 기존의 커스텀 UI를 **Toss Design System (TDS) Mobile**로 마이그레이션하고, 서비스의 정체성인 **Violet (#7c3aed)** 컬러를 시스템 전반에 적용하는 것을 목표로 합니다.

## User Review Required
> [!IMPORTANT]
> 1. **브랜드 컬러 적용 방식:** TDS의 기본 파란색(`blue500`)을 전역적으로 Violet으로 덮어씌울 예정입니다. 모든 버튼과 강조 포인트가 보라색으로 변하는 것에 동의하시나요?
> 2. **빌드 에러 해결:** `ListRow.Arrow` 오류는 `Chevron`으로 교체하여 해결되었습니다.

---

## Proposed Changes

### 🔧 빌드 안정화 및 오류 수정 [COMPLETED]
- `src/components/FeatureGrids.tsx`에서 존재하지 않는 `ListRow.Arrow`를 `Chevron`으로 교체하여 Vercel 빌드 실패 문제 해결.

### 🎨 테마 커스텀 (Violet Theme)
#### [MODIFY] `src/index.css`
- `:root` 및 `.tds-theme-light` 클래스에서 TDS의 핵심 컬러 변수들을 오버라이드.
  - `--adaptiveBlue500`: `#7c3aed` (Violet)
  - '--adaptiveBlue600`: `#6d28d9` (Deep Violet)
  - 기타 관련 뱃지 및 배경 리소스들 보라색 계열로 조정.

---

### 📱 컴포넌트 고도화
#### [MODIFY] `src/pages/FortunePage.tsx`
- 리스트 항목 우측의 코인 아이콘 및 가격 텍스트에 보라색 포인트 적용.
- `ListRow` 기반 레이아웃의 완성도 제고.

#### [MODIFY] `src/components/HeroSection.tsx`
- 메인 CTA 버튼 등에 `TDS Button` 컴포넌트 적용 및 테마 컬러 반영.

---

## Open Questions
- [ ] 현재 `TDSMobileAITProvider`를 사용 중인데, 다크 모드 지원 여부에 따라 변수 오버라이드 범위를 확정해야 합니다. (현재는 라이트 모드 우선 적용)

## Verification Plan
### Automated Tests
- `npm run build`: 전체 빌드 성공 여부 확인.
- `ait build`: AIT 패키징 정합성 확인.

### Manual Verification
- 브라우저에서 모든 버튼과 링크가 보라색(Violet)으로 정상 출력되는지 확인.
- 리스트 레이아웃의 상하 여백 및 클릭 반응성(Active State) 확인.
