import React from 'react';
import { getTeamInfo } from '../config/teamConfig';


interface KboShareCardProps {
    result: any;
    selectedTeam: string;
    userName: string;
}

const KboShareCard = React.forwardRef<HTMLDivElement, KboShareCardProps>(({ result, selectedTeam, userName }, ref) => {
    const teamInfo = getTeamInfo(selectedTeam || '');
    const accentColor = '#775a19';
    const primaryColor = '#000666';

    return (
        <div 
            ref={ref}
            className="w-[1080px] h-[1080px] bg-[#F9F7F2] flex flex-col relative overflow-hidden p-24 font-['Manrope']"
        >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: `linear-gradient(${primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${primaryColor} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} 
            />

            {/* Top Brand Header */}
            <div className="flex justify-between items-start mb-24 z-20">
                <div className="flex flex-col gap-2">
                    <span className="text-[#000666] text-3xl font-black tracking-[0.2em]">MBTIJU</span>
                    <span className="text-slate-400 text-[12px] font-bold tracking-[0.4em]">정교한 사주 분석 리포트</span>
                </div>
                <div className="text-slate-300 text-sm tracking-widest font-bold text-right">
                    KBO 팬<br />궁합 분석
                </div>
            </div>

            <div className="flex-1 flex flex-col z-10 relative">
                
                {/* Title Section */}
                <div className="mb-20">
                    <p className="font-bold text-sm tracking-[0.4em] mb-8" style={{ color: accentColor }}>분석 결과 기록</p>
                    <h1 className="text-[100px] font-['Noto_Serif_KR'] text-slate-900 tracking-tighter leading-[1.1] font-bold">
                        {userName}님의<br />
                        <span className="text-[#000666]">
                             {selectedTeam === '없음 (아직 없음)' ? '추천 구단 분석' : `${selectedTeam} 궁합`}
                        </span>
                    </h1>
                </div>

                {/* Score Section */}
                <div className="grid grid-cols-2 gap-20 mb-20 bg-white/40 rounded-[40px] border border-white/60 p-16 shadow-sm">
                    <div>
                        <p className="text-sm font-bold tracking-[0.3em] mb-10 opacity-70" style={{ color: accentColor }}>궁합 지수</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[180px] font-['Noto_Serif_KR'] tracking-[-0.05em] leading-none text-[#000666] font-bold">
                                {result.score}
                            </p>
                            <span className="text-4xl font-['Noto_Serif_KR'] text-[#000666] font-bold">%</span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center gap-12">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em] mb-6">승리 요정 확률</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-[120px] font-['Noto_Serif_KR'] text-slate-900 tracking-[-0.05em] leading-none font-bold">
                                    {result.winFairyScore}
                                </p>
                                <span className="text-2xl font-bold text-slate-300">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendations Area */}
                <div className="flex-1 flex gap-12">
                    <div className="flex-1 bg-white/60 rounded-[32px] p-12 border border-white/40 flex flex-col justify-center space-y-6">
                        {selectedTeam === '없음 (아직 없음)' ? (
                            <>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>최고의 궁합</p>
                                    <p className="text-4xl font-['Noto_Serif_KR'] text-[#000666] font-bold">{result.bestTeam}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">주의할 궁합</p>
                                    <p className="text-4xl font-['Noto_Serif_KR'] text-slate-600 font-bold">{result.worstTeam}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>오늘의 행운 자리</p>
                                    </div>
                                    <p className="text-3xl font-['Noto_Serif_KR'] text-slate-800 font-bold leading-tight break-keep">{result.recommendedSeat}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>오늘의 행운 음식</p>
                                    </div>
                                    <p className="text-3xl font-['Noto_Serif_KR'] text-slate-800 font-bold leading-tight break-keep">{result.luckyFood}</p>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Visual Elements */}
                    <div className="w-[300px] flex items-center justify-center relative">
                        <div className="w-full h-full rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: `${accentColor}33` }}>
                            <div className="w-48 h-48 rounded-full bg-white shadow-xl flex items-center justify-center border border-slate-100 p-8">
                                {teamInfo?.logo ? (
                                    <img src={teamInfo.logo} alt={selectedTeam} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-6xl text-[#000666] font-black">{userName.slice(0, 1)}</span>
                                )}
                            </div>
                        </div>
                        {/* Decorative Star */}
                        <div className="absolute top-0 right-0 animate-pulse">
                            <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current" style={{ color: accentColor }}>
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-20 flex justify-between items-end border-t border-slate-200 pt-12">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-950 font-black tracking-[0.4em]">공식 분석 리포트</p>
                        <p className="text-[12px] text-slate-400 font-bold tracking-[0.2em]">
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <p className="text-sm text-slate-950 font-black tracking-[0.4em]">
                        MBTIJU.COM
                    </p>
                </div>
            </div>
        </div>
    );
});

export default KboShareCard;
