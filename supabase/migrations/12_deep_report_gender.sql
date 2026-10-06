-- 심층 리포트 신청 시 성별 수집 (대운 순행/역행 계산에 필요)
alter table public.deep_report_requests
  add column if not exists gender text;
