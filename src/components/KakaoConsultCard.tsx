import React from 'react';
import { MessageCircle, ChevronRight } from 'lucide-react';
import {
    KAKAO_CHANNEL_CHAT_URL,
    KAKAO_CONSULT_PRODUCTS,
    KAKAO_CONSULT_RESPONSE_TEXT,
} from '../config/kakaoConsult';
import { track } from '../utils/analytics';

interface KakaoConsultCardProps {
    /** 퍼널 측정용 노출 위치 (예: 'home', 'support', 'premium', 'consultation') */
    from: string;
    /** compact: 한 줄 버튼형, full: 가격까지 보여주는 카드형 */
    variant?: 'compact' | 'full';
    className?: string;
}

const KakaoConsultCard: React.FC<KakaoConsultCardProps> = ({ from, variant = 'full', className = '' }) => {
    const handleClick = () => track('kakao_consult_click', { from });
    const { single, triple } = KAKAO_CONSULT_PRODUCTS;

    if (variant === 'compact') {
        return (
            <a
                href={KAKAO_CHANNEL_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className={`w-full p-5 bg-[#FEE500] rounded-3xl flex items-center gap-4 hover:brightness-95 transition-all ${className}`}
            >
                <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center text-[#191919] shrink-0">
                    <MessageCircle size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                    <h3 className="font-black text-[#191919]">카톡으로 1:1 사주 상담받기</h3>
                    <p className="text-xs text-[#191919]/70 font-medium mt-0.5">
                        {single.price.toLocaleString()}원부터 · {KAKAO_CONSULT_RESPONSE_TEXT}
                    </p>
                </div>
                <ChevronRight className="text-[#191919]/50 shrink-0" size={20} />
            </a>
        );
    }

    return (
        <div className={`bg-white rounded-3xl border border-slate-200 p-6 md:p-8 ${className}`}>
            <p className="text-xs font-black text-violet-600 tracking-widest mb-2">KAKAOTALK 1:1</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-2">
                고민 하나만 콕 집어, 카톡으로 물어보세요
            </h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-5">
                사주와 MBTI를 함께 보고, AI 분석을 바탕으로 운세 서비스 전문가가 직접 검수해 답변드려요.
            </p>

            <ul className="space-y-2 mb-6">
                {[single, triple].map(p => (
                    <li key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm font-bold text-slate-800">{p.name}</span>
                        <span className="text-sm font-black text-slate-900">{p.price.toLocaleString()}원</span>
                    </li>
                ))}
            </ul>

            <a
                href={KAKAO_CHANNEL_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className="w-full py-4 bg-[#FEE500] text-[#191919] rounded-2xl font-black flex items-center justify-center gap-2 hover:brightness-95 transition-all"
            >
                <MessageCircle size={20} />
                카카오톡 채널로 상담 시작하기
            </a>
            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed text-center">
                {KAKAO_CONSULT_RESPONSE_TEXT} · 계좌이체 결제 · 답변 발송 전 전액 환불
            </p>
        </div>
    );
};

export default KakaoConsultCard;
