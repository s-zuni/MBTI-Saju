import React, { forwardRef } from 'react';
import { Moon, Sparkles } from 'lucide-react';

interface TarotShareCardProps {
    reading: {
        cardReadings?: Array<{
            cardName: string;
            interpretation: string;
        }>;
        overallReading?: string;
        advice?: string;
    };
    question: string;
    userName: string;
}

const TarotShareCard = forwardRef<HTMLDivElement, TarotShareCardProps>(({ reading, question, userName }, ref) => {
    const cardReadings = reading?.cardReadings || [];
    const advice = reading?.advice || '';

    return (
        <div
            ref={ref}
            className="relative w-[1000px] h-[1000px] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 overflow-hidden flex flex-col p-16 select-none border border-purple-500/20"
            style={{ 
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
        >
            {/* Celestial stars and aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-12 right-24 opacity-20"><Sparkles className="w-12 h-12 text-purple-300" /></div>
            <div className="absolute bottom-24 left-16 opacity-20"><Moon className="w-8 h-8 text-purple-400 fill-purple-400/20" /></div>

            {/* Header */}
            <div className="flex justify-between items-center z-10 pb-8 border-b border-purple-500/20">
                <div className="space-y-1">
                    <h1 className="text-[32px] font-black tracking-tight text-white leading-none">MBTIJU</h1>
                    <p className="text-[12px] font-bold text-purple-400/80 tracking-[0.2em]">운명의 타로 오라클</p>
                </div>
                <div className="text-right">
                    <span className="inline-block px-4 py-1.5 bg-purple-900/60 border border-purple-500/30 text-purple-200 rounded-full text-xs font-black tracking-widest uppercase">
                        TAROT REPORT
                    </span>
                </div>
            </div>

            {/* User Question */}
            <div className="mt-10 mb-8 z-10 text-center space-y-4">
                <p className="text-[18px] font-bold text-purple-400">{userName}님의 고민</p>
                <div className="inline-block bg-slate-900/80 backdrop-blur-md px-8 py-5 rounded-[24px] border border-purple-500/20 shadow-xl max-w-[850px] mx-auto">
                    <p className="text-[24px] font-black text-white leading-snug break-keep">
                        "{question}"
                    </p>
                </div>
            </div>

            {/* Selected Cards (Flex) */}
            <div className="flex justify-center gap-8 z-10 my-auto">
                {cardReadings.map((card, idx) => (
                    <div 
                        key={idx} 
                        className="bg-slate-900/90 border border-purple-500/30 p-6 rounded-[28px] shadow-2xl flex flex-col items-center w-[220px] text-center"
                    >
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4">
                            CARD 0{idx + 1}
                        </span>
                        
                        {/* Elegant Card Back representation */}
                        <div className="w-[140px] h-[210px] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 rounded-xl flex items-center justify-center p-2 border border-purple-500/40 relative shadow-inner mb-6">
                            <div className="absolute inset-1 border border-purple-500/10 rounded-lg"></div>
                            <Moon className="w-8 h-8 text-purple-400/30 fill-purple-400/5" />
                        </div>
                        
                        <h3 className="text-[18px] font-black text-white truncate max-w-full">
                            {card.cardName}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Practical Advice Guide */}
            {advice && (
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-[24px] border border-purple-500/10 shadow-lg text-center z-10 mt-6 max-w-[700px] mx-auto">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1.5 block">실천 가이드</span>
                    <p className="text-[16px] font-bold text-purple-200 leading-relaxed break-keep italic">
                        "{advice}"
                    </p>
                </div>
            )}

            {/* Watermark */}
            <div className="mt-auto pt-8 flex items-center justify-center gap-4 opacity-40 z-10">
                <div className="w-16 h-[1px] bg-purple-500/30"></div>
                <span className="text-[11px] font-bold text-purple-400 tracking-[0.4em] uppercase">
                    MBTIJU TAROT ORACLE
                </span>
                <div className="w-16 h-[1px] bg-purple-500/30"></div>
            </div>
        </div>
    );
});

TarotShareCard.displayName = 'TarotShareCard';

export default TarotShareCard;
