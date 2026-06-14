import React, { forwardRef } from 'react';

interface TripShareCardProps {
    result: {
        concept?: string;
        places?: Array<{
            name: string;
            reason: string;
            activity: string;
            photoSpot?: string;
            food?: string;
        }>;
        companion?: string;
        luckyItem?: string;
        summary?: string;
    };
    userName: string;
}

const TripShareCard = forwardRef<HTMLDivElement, TripShareCardProps>(({ result, userName }, ref) => {
    const concept = result?.concept || '행운의 여행지 추천';
    const places = result?.places || [];
    const companion = result?.companion || '';
    const luckyItem = result?.luckyItem || '';

    return (
        <div
            ref={ref}
            className="relative w-[1000px] h-[1000px] bg-gradient-to-br from-sky-400 via-sky-100 to-indigo-300 overflow-hidden flex flex-col p-16 select-none"
            style={{ 
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
        >
            {/* Decorative circles */}
            <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-150px] left-[-150px] w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-center z-10 pb-8 border-b border-white/30">
                <div className="space-y-1">
                    <h1 className="text-[32px] font-black tracking-tight text-slate-900 leading-none">MBTIJU</h1>
                    <p className="text-[12px] font-bold text-slate-700 tracking-[0.2em]">사주 × MBTI 행운 분석</p>
                </div>
                <div className="text-right">
                    <span className="inline-block px-4 py-1.5 bg-slate-950 text-white rounded-full text-xs font-black tracking-widest uppercase">
                        TRAVEL REPORT
                    </span>
                </div>
            </div>

            {/* User Title & Concept */}
            <div className="mt-12 mb-8 z-10 text-center">
                <h2 className="text-[28px] font-black text-slate-900 mb-4">
                    {userName}님의 운명적 여행 테마
                </h2>
                <div className="inline-block bg-white/80 backdrop-blur-md px-8 py-5 rounded-[24px] border border-white/50 shadow-md max-w-[850px] mx-auto">
                    <p className="text-[24px] font-black text-slate-800 leading-snug break-keep">
                        "{concept}"
                    </p>
                </div>
            </div>

            {/* Best Places (Grid) */}
            <div className="grid grid-cols-3 gap-6 z-10 my-auto">
                {places.slice(0, 3).map((place, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white/95 backdrop-blur-sm p-6 rounded-[28px] border border-white/60 shadow-lg flex flex-col justify-between h-[360px]"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                                    0{idx + 1}
                                </span>
                                <h3 className="text-[20px] font-black text-slate-900 truncate">
                                    {place.name}
                                </h3>
                            </div>
                            <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">추천 이유</p>
                            <p className="text-[14px] font-semibold text-slate-700 leading-relaxed break-keep line-clamp-4">
                                {place.reason}
                            </p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mb-1">인생샷 스팟</p>
                            <p className="text-[13px] font-bold text-slate-800 truncate">
                                {place.photoSpot || '핫플레이스'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Companion & Lucky Item */}
            <div className="grid grid-cols-2 gap-6 z-10 mt-8">
                {companion && (
                    <div className="bg-slate-950 text-white p-6 rounded-[24px] shadow-lg flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-sky-400 uppercase tracking-widest mb-1">최고의 여행 메이트</span>
                        <p className="text-[16px] font-bold break-keep">{companion}</p>
                    </div>
                )}
                {luckyItem && (
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[24px] border border-white/60 shadow-md flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-1">행운의 아이템</span>
                        <p className="text-[16px] font-bold text-slate-900 break-keep">{luckyItem}</p>
                    </div>
                )}
            </div>

            {/* Watermark */}
            <div className="mt-auto pt-8 flex items-center justify-center gap-4 opacity-40 z-10">
                <div className="w-16 h-[1px] bg-slate-900"></div>
                <span className="text-[11px] font-bold text-slate-950 tracking-[0.4em] uppercase">
                    MBTIJU SPECIAL REPORT
                </span>
                <div className="w-16 h-[1px] bg-slate-900"></div>
            </div>
        </div>
    );
});

TripShareCard.displayName = 'TripShareCard';

export default TripShareCard;
