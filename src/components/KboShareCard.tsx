import React, { forwardRef } from 'react';
import { getTeamInfo } from '../config/teamConfig';

interface KboShareCardProps {
    result: {
        score: number;
        winFairyScore: number;
        recommendedSeat: string;
        luckyFood: string;
    };
    selectedTeam: string;
    userName: string;
}

const KboShareCard = forwardRef<HTMLDivElement, KboShareCardProps>(({ result, selectedTeam, userName }, ref) => {
    const teamInfo = getTeamInfo(selectedTeam);
    const primaryColor = teamInfo?.primaryColor || '#000000';

    // score와 winFairyScore가 스트리밍 중인 경우를 대비해 기본값 설정
    const score = result.score || 0;
    const winFairyScore = result.winFairyScore || 0;
    const luckySeat = result.recommendedSeat || '';
    const luckyFood = result.luckyFood || '';

    return (
        <div
            ref={ref}
            className="relative w-[1000px] h-[1000px] bg-white overflow-hidden flex flex-col p-20 select-none"
            style={{ 
                fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                backgroundColor: '#ffffff'
            }}
        >
            {/* Background Grid - Very Subtle */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                    backgroundSize: '125px 125px'
                }} />
            </div>

            {/* Top Header Section */}
            <div className="flex justify-between items-start z-10">
                <div className="space-y-1">
                    <h1 className="text-[36px] font-black tracking-[-0.05em] text-slate-900 leading-none">MBTIJU</h1>
                    <p className="text-[12px] font-bold text-slate-400 tracking-[0.25em] uppercase">정교한 사주 분석 리포트</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-black text-slate-300 tracking-[0.2em] leading-[1.4] uppercase">
                        KBO FAN<br />DESTINY REPORT
                    </p>
                </div>
            </div>

            {/* Main Title Section */}
            <div className="mt-40 flex-grow z-10">
                <p 
                    className="text-[16px] font-black tracking-[0.4em] mb-12 uppercase"
                    style={{ color: primaryColor }}
                >
                    Analytical Record
                </p>
                
                <div className="space-y-4">
                    <h2 className="text-[84px] font-medium leading-none text-slate-900 tracking-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                        {userName}님의
                    </h2>
                    <h2 
                        className="text-[92px] font-bold leading-tight tracking-tight" 
                        style={{ fontFamily: "'Noto Serif KR', serif", color: primaryColor }}
                    >
                        {selectedTeam} 궁합
                    </h2>
                </div>
            </div>

            {/* Bottom Data Section */}
            <div className="grid grid-cols-12 gap-8 items-end z-10 pb-12">
                {/* Compatibility Score */}
                <div className="col-span-5">
                    <p className="text-[12px] font-bold text-slate-400 tracking-[0.15em] mb-8 uppercase">궁합 지수</p>
                    <div className="flex items-baseline">
                        <span className="text-[180px] font-bold leading-none tracking-tighter" style={{ color: primaryColor }}>
                            {score}
                        </span>
                    </div>
                </div>

                {/* Victory Fairy Probability & Lucky Seat */}
                <div className="col-span-4">
                    <p className="text-[12px] font-bold text-slate-400 tracking-[0.15em] mb-8 uppercase">승리 요정 확률</p>
                    <div className="flex items-baseline mb-12">
                        <span className="text-[100px] font-bold leading-none text-slate-900">{winFairyScore}</span>
                        <span className="text-[32px] font-medium text-slate-300 ml-2 tracking-tighter">%</span>
                    </div>
                    
                    <div className="space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>행운의 자리</p>
                        <p className="text-[16px] font-medium leading-relaxed text-slate-600 max-w-[280px] break-keep">
                            {luckySeat}
                        </p>
                    </div>
                </div>

                {/* Lucky Food */}
                <div className="col-span-3">
                    <div className="space-y-3">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">행운의 음식</p>
                        <p className="text-[16px] font-medium leading-relaxed text-slate-600 break-keep">
                            {luckyFood}
                        </p>
                    </div>
                </div>
            </div>

            {/* Subtle Branding Tag */}
            <div className="absolute bottom-10 right-20 flex items-center gap-4 opacity-20 pointer-events-none">
                <div className="w-12 h-[1px] bg-slate-900"></div>
                <span className="text-[10px] font-bold text-slate-900 tracking-[0.4em] uppercase">
                    MBTIJU SPECIAL REPORT
                </span>
            </div>
        </div>
    );
});

export default KboShareCard;
