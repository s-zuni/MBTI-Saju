import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, MessageCircle, ArrowRight } from 'lucide-react';
import { DEEP_REPORT_ORIGINAL_PRICE, DEEP_REPORT_SALE_PRICE } from '../config/deepReportConfig';
import { KAKAO_CHANNEL_CHAT_URL, KAKAO_CONSULT_PRODUCTS } from '../config/kakaoConsult';
import { track } from '../utils/analytics';

interface FunnelBottomCtaProps {
  from?: string;
  onOpenDeepReport?: () => void;
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
    <section className="mt-10 pt-8 border-t-2 border-slate-100 space-y-5 text-left animate-fade-up">
      <div className="text-center space-y-1.5 px-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-black">
          <Sparkles className="w-3.5 h-3.5" /> 심층 해답 &amp; 1:1 전문가 솔루션
        </span>
        <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight break-keep">
          {title}
        </h4>
        <p className="text-xs text-slate-500 font-medium break-keep max-w-lg mx-auto">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. 3년 심층 사주 리포트 받기 */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white p-5 sm:p-6 shadow-xl flex flex-col justify-between border border-violet-500/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-[10px] font-black">
                <FileText className="w-3 h-3" /> A4 20장 분량 · 전문가 수기 검수
              </span>
              <span className="text-[11px] font-black text-amber-300">베스트셀러</span>
            </div>

            <h5 className="text-lg font-black leading-snug tracking-tight">
              3년 심층 사주 · MBTI 통합 리포트 받기
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed break-keep">
              향후 3년간의 대운·세운·월별 흐름부터 재물·이직·연애·결혼 타이밍까지 10년차 명리 전문가가 직접 대조·검수하여 PDF 리포트로 발송해 드립니다.
            </p>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-xs text-slate-400 line-through font-bold">
                {DEEP_REPORT_ORIGINAL_PRICE.toLocaleString()}원
              </span>
              <span className="text-xl font-black text-amber-300">
                {DEEP_REPORT_SALE_PRICE.toLocaleString()}원
              </span>
              <span className="text-[10px] text-violet-200 font-bold">· 비회원 즉시 신청</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReportClick}
            className="mt-5 w-full py-3.5 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>3년 심층 리포트 받기</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* 2. 카카오톡 1:1 상담하기 */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50/70 to-white border-2 border-amber-200/80 p-5 sm:p-6 shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEE500] text-[#191919] text-[10px] font-black">
                <MessageCircle className="w-3 h-3" /> 카카오톡 채널 1:1 상담
              </span>
              <span className="text-[10px] font-black text-amber-800">평일 24시간 내 답변</span>
            </div>

            <h5 className="text-lg font-black text-slate-900 leading-snug tracking-tight">
              전문가 1:1 맞춤 사주 · 심리 상담하기
            </h5>
            <p className="text-xs text-slate-600 leading-relaxed break-keep">
              “이 사람과 재회할 수 있을까요?”, “지금 이직해도 될까요?” 내 사주·MBTI 결과를 바탕으로 가장 절실한 고민을 전문가에게 1:1로 직접 물어보세요.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {Object.values(KAKAO_CONSULT_PRODUCTS).map((p) => (
                <div
                  key={p.id}
                  className="bg-white/90 border border-amber-200/70 rounded-xl px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-[11px] font-bold text-slate-700">{p.name}</span>
                  <span className="text-xs font-black text-slate-900">{p.price.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleKakaoConsultClick}
            className="mt-5 w-full py-3.5 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
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
