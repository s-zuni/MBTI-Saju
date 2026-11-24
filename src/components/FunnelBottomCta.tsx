import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageCircle, ArrowRight } from 'lucide-react';
import { DEEP_REPORT_ORIGINAL_PRICE, DEEP_REPORT_SALE_PRICE } from '../config/deepReportConfig';
import { KAKAO_CHANNEL_CHAT_URL, KAKAO_CONSULT_PRODUCTS } from '../config/kakaoConsult';
import { track } from '../utils/analytics';

interface FunnelBottomCtaProps {
  from?: string;
  onOpenDeepReport?: (() => void) | undefined;
  title?: string;
  subtitle?: string;
}

const FunnelBottomCta: React.FC<FunnelBottomCtaProps> = ({
  from = 'analysis_result',
  onOpenDeepReport,
  title = '방금 확인한 분석을 넘어, 내 인생의 결정적 해답이 필요하다면?',
  subtitle = '단건 요약 분석에서 다 다루지 못한 향후 3년 정밀 대운 리포트와 1:1 전문가 맞춤 상담을 이어서 받아보세요.',
}) => {
  const navigate = useNavigate();

  const handleReportClick = () => {
    track('funnel_bottom_report_click', { from });
    if (onOpenDeepReport) {
      onOpenDeepReport();
    } else {
      navigate('/premium');
    }
  };

  const handleKakaoConsultClick = () => {
    track('funnel_bottom_kakao_consult_click', { from });
    window.open(KAKAO_CHANNEL_CHAT_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="mt-10 pt-8 border-t border-stone-200 space-y-5 text-left animate-fade-up">
      <div className="space-y-1.5 px-1">
        <p className="text-sm font-bold text-stone-500">심층 해답 · 1:1 전문가 솔루션</p>
        <h4 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight break-keep">
          {title}
        </h4>
        <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed break-keep">
          {subtitle}
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. 3년 심층 사주 리포트 받기 */}
        <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-7 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-200">
              <FileText className="w-4 h-4" /> A4 20장 분량 · 전문가 수기 검수
            </span>
            <span className="text-xs font-bold text-stone-300">비회원 즉시 신청 가능</span>
          </div>

          <div className="space-y-2">
            <h5 className="text-lg sm:text-xl font-bold leading-snug">
              3년 심층 사주 · MBTI 통합 리포트 받기
            </h5>
            <p className="text-sm sm:text-[15px] text-slate-200 leading-relaxed break-keep">
              향후 3년간의 대운·세운·월별 흐름부터 재물·이직·연애·결혼 타이밍까지 10년차 명리 전문가가 직접 대조·검수하여 PDF 리포트로 발송해 드립니다.
            </p>
          </div>

          <div className="flex items-baseline gap-2.5 pt-1">
            <span className="text-sm text-slate-400 line-through">
              {DEEP_REPORT_ORIGINAL_PRICE.toLocaleString()}원
            </span>
            <span className="text-xl font-bold text-amber-300">
              {DEEP_REPORT_SALE_PRICE.toLocaleString()}원
            </span>
          </div>

          <button
            type="button"
            onClick={handleReportClick}
            className="w-full py-4 px-5 rounded-xl bg-white hover:bg-stone-100 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
          >
            <span>3년 심층 리포트 받기</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* 2. 카카오톡 1:1 상담하기 */}
        <div className="rounded-2xl bg-[#FAF7F0] border border-[#E6DFD1] p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE500] text-[#191919] text-xs font-bold">
              <MessageCircle className="w-3.5 h-3.5" /> 카카오톡 채널 1:1 상담
            </span>
            <span className="text-xs sm:text-sm font-semibold text-stone-700">평일 24시간 내 답변</span>
          </div>

          <div className="space-y-2">
            <h5 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              전문가 1:1 맞춤 사주 · 심리 상담하기
            </h5>
            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed break-keep">
              “이 사람과 재회할 수 있을까요?”, “지금 이직해도 될까요?” 내 사주와 성향 결과를 바탕으로 가장 절실한 고민을 전문가에게 1:1로 직접 물어보세요.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {Object.values(KAKAO_CONSULT_PRODUCTS).map((p) => (
              <div
                key={p.id}
                className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                <span className="text-sm sm:text-base font-bold text-slate-950">{p.price.toLocaleString()}원</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleKakaoConsultClick}
            className="w-full py-4 px-5 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>카카오톡 1:1 상담하기</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FunnelBottomCta;
