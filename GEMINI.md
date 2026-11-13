# GEMINI.md — MBTIJU (엠비티아이주) Antigravity 오케스트레이션 규칙

이 저장소는 **MBTIJU (`https://www.mbtiju.com`)** 웹 플랫폼과 `marketing_automation/`(릴스/숏츠/스레드 자동화)을 함께 관리합니다.

## 1. 공식 오케스트레이션 & 2-Tier 모델 라우팅 원칙

- **고성능 모델 (Argon / Carbon — 총괄 팀장 / 기획 / 최종 검수)**:
  - 작업 분해 및 병렬 워커(`ops-checker`, `security-collector`, `marketing-operator`) 조율
  - 워커가 수집한 보안·DB·타입·로그 증거를 실제 파일(`파일:라인`) 및 Supabase MCP(`supabase`, project_id: `tffvsyarxfujmvbqlutr`)로 직접 교차 검증하여 `확정 / 가능성 있음 / 오탐 / 수용` 판정
  - 마케팅 초안 팩트체크(`.agents/product-marketing.md`, `reels-composer` 스펙 대조) 및 오늘의 우선순위·기획 제안 수립
- **저비용 효율 모델 (Hydrogen / Flash — 실무 워커)**:
  - 읽기 전용 상태 수집, 로그/advisor 조회, `tsc`/`npm audit` 실행, `marketing_snapshot.py` 및 `hookscore.py` 실행, 마케팅 초안 작성
  - `invoke_subagent` 사용 시 `Model: "flash"`, `swarm` 사용 시 `gemini-4-hydrogen-medium` 또는 `gemini-3.8-flash-high` 할당

## 2. 참조 문서 우선순위

1. 서비스 점검/보안 기준: `CLAUDE.md`, `agent.md`, `skills.md`
2. 마케팅 팩트/가격/금지 규칙 단일 소스: `.agents/product-marketing.md`
3. 릴스/숏츠/스레드 파이프라인 스펙: `marketing_automation/CLAUDE.md`, `marketing_automation/VIRAL_1M_MASTER_PLAN.md`, `.agents/skills/reels-composer/SKILL.md`
4. 출근 자동화 표준 절차: `.agents/skills/morning-shift/SKILL.md`

## 3. 절대 수칙

- **출근 브리핑(`morning-shift`) 실행 시 전 과정은 읽기 전용**이며, 파일 작성은 `reports/daily/YYYY-MM-DD.md`에만 수행한다.
- `.env`, `*.key`, `*.pem`, `token.json`, `insta-at-*.json`, `client_secret*.json` 등의 비밀 파일 내용을 읽거나 보고서에 출력하지 않는다.
- Supabase MCP 호출 시 반드시 `supabase` 서버(`tffvsyarxfujmvbqlutr`)를 사용한다(`supabase-mcp-server`는 사용하지 않음).
- `CLAUDE.md` §3.1에 이미 해소로 기록된 항목은 회귀 근거가 없는 한 재보고하지 않는다.
