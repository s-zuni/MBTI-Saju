import React from 'react';
import { Sparkles } from 'lucide-react';

interface DetailedReportCardProps {
    userName: string;
    mbti: string;
    sajuElement: string;
    analysis: {
        sajuReading?: string;
        mbtiCompatibility?: string;
        fortune2026?: string;
        otherLuck?: string;
        advice?: string;
        keywords?: string;
    };
}

export const DetailedReportCard = React.forwardRef<HTMLDivElement, DetailedReportCardProps>(({
    userName, mbti, sajuElement, analysis
}, ref) => {
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div ref={ref} className="w-[800px] min-h-[1200px] bg-white p-12 text-slate-800 relative shadow-none font-sans">
            {/* Header */}
            <div className="text-center mb-10 border-b-2 border-slate-100 pb-8">
                <div className="flex justify-center items-center gap-2 text-indigo-600 mb-2 font-bold uppercase tracking-wider text-sm">
                    <Sparkles className="w-5 h-5" /> MBTI x Saju Premium Analysis
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-2">
                    {userName}님의 심층 분석 리포트
                </h1>
                <p className="text-slate-500 font-medium">발행일: {today}</p>
            </div>

            {/* Core Identity */}
            <div className="flex justify-center gap-6 mb-10">
                <div className="bg-indigo-50 px-8 py-4 rounded-2xl border border-indigo-100 text-center">
                    <div className="text-sm font-bold text-indigo-400 mb-1">MBTI</div>
                    <div className="text-3xl font-black text-indigo-700">{mbti}</div>
                </div>
                <div className="bg-amber-50 px-8 py-4 rounded-2xl border border-amber-100 text-center">
                    <div className="text-sm font-bold text-amber-500 mb-1">일주(日柱) 오행</div>
                    <div className="text-3xl font-black text-amber-700">{sajuElement}</div>
                </div>
            </div>

            {/* 5 Sections */}
            <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="text-xl font-bold text-indigo-800 mb-3 flex items-center gap-2">
                        📜 1. 사주 풀이
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.sajuReading}</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="text-xl font-bold text-indigo-800 mb-3 flex items-center gap-2">
                        💞 2. MBTI와 궁합
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.mbtiCompatibility}</p>
                </div>

                <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                    <h3 className="text-xl font-bold text-amber-800 mb-3 flex items-center gap-2">
                        📅 3. 2026 대운세
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.fortune2026}</p>
                </div>

                <div className="bg-rose-50 p-6 rounded-xl border border-rose-200">
                    <h3 className="text-xl font-bold text-rose-800 mb-3 flex items-center gap-2">
                        💰 4. 재물 & 애정운
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.otherLuck}</p>
                </div>

                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                    <h3 className="text-xl font-bold text-emerald-800 mb-3 flex items-center gap-2">
                        ✅ 5. 조언 (Do & Don't)
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.advice}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-slate-400 text-sm font-medium border-t border-slate-100 pt-8">
                www.mbti-saju.com | 당신의 운명을 확인하세요
            </div>
        </div>
    );
});
