-- 16_deep_report_status_check.sql
-- deep_report_requests.status CHECK 제약조건에 'generating', 'refunded' 허용 추가
-- (api/generate-and-save-report.ts 원자적 생성 락 및 api/payment.ts 환불 상태 동기화 지원)

ALTER TABLE public.deep_report_requests
  DROP CONSTRAINT IF EXISTS deep_report_requests_status_check;

ALTER TABLE public.deep_report_requests
  ADD CONSTRAINT deep_report_requests_status_check
  CHECK (status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'generating'::text, 'completed'::text, 'refunded'::text]));
