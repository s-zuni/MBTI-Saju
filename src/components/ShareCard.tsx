import React from 'react';
import { Sparkles, QrCode } from 'lucide-react';

interface ShareCardProps {
    userName: string;
    mbti: string;
    sajuElement: string;
    sajuTrait: string;
    keywords: string[];
}

export const ShareCard = React.forwardRef<HTMLDivElement, ShareCardProps>(({
    userName, mbti, sajuElement, sajuTrait, keywords
}, ref) => {
    return (
        <div ref={ref} className="w-[400px] h-[600px] bg-slate-900 text-white p-8 relative overflow-hidden flex flex-col justify-between shadow-none">
            {/* Background Pattern - Simplified */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600 rounded-full opacity-30 blur-[60px] translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600 rounded-full opacity-30 blur-[60px] -translate-x-1/2 translate-y-1/2"></div>

            {/* Header */}
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-200 mb-6">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-bold tracking-widest uppercase">MBTI x Saju Analysis</span>
                </div>

                <h1 className="text-4xl font-black mb-2 leading-tight">
                    <span className="text-indigo-300">{userName}</span>님의<br />
                    운명적 시너지
                </h1>
            </div>

            {/* Main Content - Solid Background instead of glassmorphism */}
            <div className="relative z-10 bg-white/10 rounded-2xl p-6 border border-white/20">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                        <div className="text-xs text-indigo-300 mb-1">MBTI</div>
                        <div className="text-2xl font-black text-white">{mbti}</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                        <div className="text-xs text-amber-300 mb-1">타고난 기운</div>
                        <div className="text-2xl font-black text-white">{sajuElement}</div>
                    </div>
                </div>

                <div className="text-center mb-6">
                    <p className="text-lg font-bold text-white mb-3 leading-snug">"{sajuTrait}"</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {keywords.slice(0, 3).map((k, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-indigo-500/30 rounded-full text-indigo-100 border border-indigo-400/30">#{k}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-6">
                <div>
                    <p className="text-xs text-indigo-300 font-medium mb-1">당신의 운명을 확인해보세요</p>
                    <p className="text-lg font-bold text-white">MBTI-Saju.com</p>
                </div>
                <div className="bg-white p-2 rounded-xl">
                    <QrCode className="w-10 h-10 text-slate-900" />
                </div>
            </div>
        </div>
    );
});

export default ShareCard;
