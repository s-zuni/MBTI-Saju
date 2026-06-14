import React, { forwardRef } from 'react';
import { Heart } from 'lucide-react';

interface CompatibilityShareCardProps {
    result: {
        score?: number;
        summary: string;
        keywords: string[];
        details?: {
            ideal_mbti: string;
            ideal_saju: string;
        };
    };
    isPartnerMode: boolean;
    userName: string;
    targetName: string;
}

const CompatibilityShareCard = forwardRef<HTMLDivElement, CompatibilityShareCardProps>(({ result, isPartnerMode, userName, targetName }, ref) => {
    const score = result?.score || 0;
    const summary = result?.summary || '심층 인연 분석';
    const keywords = result?.keywords || [];
    const idealMbti = result?.details?.ideal_mbti || '';
    const idealSaju = result?.details?.ideal_saju || '';

    return (
        <div
            ref={ref}
            className="relative w-[1000px] h-[1000px] bg-gradient-to-br from-rose-400 via-rose-50 to-pink-200 overflow-hidden flex flex-col p-16 select-none"
            style={{ 
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
        >
            {/* Soft pink blur circles */}
            <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-pink-300/30 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-100px] left-[-100px] w-[450px] h-[450px] bg-rose-400/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-center z-10 pb-8 border-b border-rose-500/20">
                <div className="space-y-1">
                    <h1 className="text-[32px] font-black tracking-tight text-slate-900 leading-none">MBTIJU</h1>
                    <p className="text-[12px] font-bold text-rose-500/80 tracking-[0.2em]">인연 명리학 & 궁합 분석</p>
                </div>
                <div className="text-right">
                    <span className="inline-block px-4 py-1.5 bg-rose-500 text-white rounded-full text-xs font-black tracking-widest uppercase">
                        HARMONY REPORT
                    </span>
                </div>
            </div>

            {/* Title Section */}
            <div className="mt-12 mb-8 z-10 text-center space-y-4">
                <h2 className="text-[32px] font-black text-slate-900">
                    {isPartnerMode ? `${userName} ♡ ${targetName} 궁합 분석` : `${userName}님의 운명적 이상형`}
                </h2>
                <div className="inline-block bg-white/90 backdrop-blur-md px-8 py-4 rounded-[24px] border border-white/60 shadow-md max-w-[850px] mx-auto">
                    <p className="text-[20px] font-black text-rose-600 leading-tight">
                        "{summary}"
                    </p>
                </div>
            </div>

            {/* Big Chemistry Score Card */}
            <div className="flex flex-col items-center my-auto z-10">
                <div className="relative w-[220px] h-[220px] bg-white rounded-full flex flex-col items-center justify-center shadow-xl border border-rose-100">
                    <Heart className="absolute w-[240px] h-[240px] text-rose-200/40 fill-rose-200/5 -z-10 animate-pulse" />
                    <span className="text-[80px] font-black text-slate-950 tracking-tighter leading-none">{score}</span>
                    <span className="text-[13px] font-black text-rose-500 tracking-widest uppercase mt-2">CHEMISTRY SCORE</span>
                </div>

                {/* Hashtags */}
                <div className="flex justify-center gap-3 mt-8 flex-wrap max-w-[700px]">
                    {keywords.map((kw, i) => (
                        <span key={i} className="px-5 py-2.5 bg-white/90 text-rose-600 rounded-[16px] text-[15px] font-extrabold shadow-sm border border-rose-100">
                            #{kw.trim()}
                        </span>
                    ))}
                </div>
            </div>

            {/* Ideal Match details */}
            <div className="grid grid-cols-2 gap-6 z-10 mt-6">
                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[24px] border border-white/60 shadow-md flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-1.5 block">어울리는 이상형 MBTI</span>
                    <p className="text-[15px] font-extrabold text-slate-800 break-keep line-clamp-3">
                        {idealMbti || 'MBTI 조화도 높음'}
                    </p>
                </div>
                <div className="bg-slate-950 text-white p-6 rounded-[24px] shadow-lg flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-pink-300 uppercase tracking-widest mb-1.5 block">어울리는 사주적 기운</span>
                    <p className="text-[15px] font-extrabold text-slate-200 break-keep line-clamp-3">
                        {idealSaju || '사주 오행 조화도 높음'}
                    </p>
                </div>
            </div>

            {/* Watermark */}
            <div className="mt-auto pt-8 flex items-center justify-center gap-4 opacity-40 z-10">
                <div className="w-16 h-[1px] bg-rose-500/30"></div>
                <span className="text-[11px] font-bold text-rose-600 tracking-[0.4em] uppercase">
                    MBTIJU DESTINY HARMONY
                </span>
                <div className="w-16 h-[1px] bg-rose-500/30"></div>
            </div>
        </div>
    );
});

CompatibilityShareCard.displayName = 'CompatibilityShareCard';

export default CompatibilityShareCard;
