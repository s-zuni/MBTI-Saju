import React from 'react';
import { getTeamInfo } from '../config/teamConfig';
import { Sparkles, TrendingUp } from 'lucide-react';

interface KboShareCardProps {
    result: any;
    selectedTeam: string;
    userName: string;
}

const RadarChartSmall = ({ data, color }: { data: any[], color: string }) => {
    const cx = 100;
    const cy = 100;
    const radius = 60;
    const total = 5;

    const getPoint = (index: number, val: number, r: number) => {
        const angle = (index * (360 / total) - 90) * (Math.PI / 180);
        return {
            x: cx + r * (val / 100) * Math.cos(angle),
            y: cy + r * (val / 100) * Math.sin(angle)
        };
    };

    const gridPoints = [50, 100].map(level => {
        return Array.from({ length: total }).map((_, i) => getPoint(i, 100, level * (radius / 100)));
    });

    const dataPoints = Array.from({ length: total }).map((_, i) => getPoint(i, data[i]?.value || 0, radius));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-auto overflow-visible">
                {gridPoints.map((points, i) => (
                    <path
                        key={i}
                        d={points.map((p, pi) => `${pi === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="1"
                    />
                ))}
                <path
                    d={dataPath}
                    fill={color}
                    fillOpacity="0.4"
                    stroke={color}
                    strokeWidth="2"
                />
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
                ))}
            </svg>
        </div>
    );
};

const KboShareCard = React.forwardRef<HTMLDivElement, KboShareCardProps>(({ result, selectedTeam, userName }, ref) => {
    const teamInfo = getTeamInfo(selectedTeam);
    const primaryColor = teamInfo?.primaryColor || '#4f46e5';
    const secondaryColor = teamInfo?.secondaryColor || '#0f172a';
    
    return (
        <div 
            ref={ref}
            className="w-[1080px] h-[1920px] bg-slate-950 flex flex-col relative overflow-hidden font-sans"
            style={{ 
                background: `linear-gradient(165deg, ${secondaryColor} 0%, #000000 100%)` 
            }}
        >
            {/* High-End Decorative Background Elements */}
            <div 
                className="absolute top-[-10%] right-[-10%] w-[1200px] h-[1200px] rounded-full blur-[180px] opacity-20"
                style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
            ></div>
            <div 
                className="absolute bottom-[-5%] left-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] opacity-15"
                style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
            ></div>
            
            {/* Glassmorphism Grain Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>

            <div className="flex-1 flex flex-col px-12 pt-24 pb-16 z-10 relative">
                {/* Header Section */}
                <div className="flex flex-col items-center mb-16 px-4">
                    <div className="flex items-center gap-4 px-8 py-3 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 mb-10 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                        <Sparkles className="w-8 h-8 text-white animate-pulse" />
                        <span className="text-white font-black tracking-[0.4em] text-2xl uppercase">KBO Destiny Analysis</span>
                    </div>
                    
                    <div className="relative mb-12">
                        <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-75 animate-pulse"></div>
                        <img src="/assets/icons/3d_kbo.png" alt="KBO" className="w-56 h-56 relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
                    </div>

                    <h1 className="text-8xl font-black text-white text-center tracking-tighter leading-none italic">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                            {userName}님의<br />운명적 구단
                        </span>
                    </h1>
                </div>

                {/* Main Content Card - Premium Glassmorphism */}
                <div className="bg-white/95 backdrop-blur-3xl rounded-[100px] p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col grow relative overflow-hidden border border-white/20">
                    <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
                    
                    {/* Team Profile Header */}
                    <div className="flex items-center gap-10 mb-16">
                        {teamInfo && (
                            <div className="w-48 h-48 bg-slate-50 rounded-[40px] p-6 flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100">
                                <img 
                                    src={teamInfo.logo} 
                                    alt={teamInfo.name} 
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-contain" 
                                />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-7xl font-black text-slate-950 mb-4 tracking-tighter">{teamInfo?.name || selectedTeam}</h2>
                            <div className="flex items-center gap-4">
                                <span 
                                    className="px-6 py-2 text-white rounded-2xl text-2xl font-black uppercase tracking-widest shadow-lg"
                                    style={{ background: primaryColor }}
                                >
                                    FATED MATCH
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scores Section */}
                    <div className="grid grid-cols-2 gap-10 mb-16">
                        <div className="flex flex-col items-center p-12 bg-slate-50 rounded-[70px] border border-slate-100/50 shadow-sm grow relative group">
                            <span className="text-2xl font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Harmony</span>
                            <div className="flex items-end gap-2">
                                <span 
                                    className="text-[12rem] font-black leading-none tracking-tighter"
                                    style={{ color: primaryColor }}
                                >
                                    {result.score}
                                </span>
                                <span className="text-5xl font-bold text-slate-300 mb-6">%</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center p-12 bg-amber-50/50 rounded-[70px] border border-amber-100/50 shadow-sm grow">
                            <span className="text-2xl font-black text-amber-500/60 uppercase tracking-[0.2em] mb-4">Win Fairy</span>
                            <div className="flex items-end gap-2">
                                <span className="text-[12rem] font-black text-amber-600 leading-none tracking-tighter">{result.winFairyScore}</span>
                                <span className="text-5xl font-bold text-amber-400 mb-6">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart Section */}
                    <div className="flex flex-col grow justify-center items-center border-t border-slate-100/50 pt-10">
                         <div className="flex items-center gap-4 mb-10">
                            <TrendingUp className="w-16 h-16 text-indigo-500" />
                            <h3 className="text-5xl font-black text-slate-900 tracking-tight">Personal DNA Cluster</h3>
                        </div>
                        <div className="w-[750px] transform scale-110">
                            <RadarChartSmall data={result.dimensions || []} color={primaryColor} />
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-4xl text-slate-400 font-bold italic tracking-tight opacity-60 line-clamp-1">
                            "AI Saju Analysis Engine v3.0 Powered"
                        </p>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="mt-16 flex justify-between items-center px-8 border-t border-white/10 pt-10">
                    <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                            <Sparkles className="w-10 h-10 text-slate-950" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-4xl font-black text-white tracking-tight">MBTIJU.COM</span>
                            <span className="text-xl font-bold text-white/40 uppercase tracking-widest">Fortune Tech</span>
                         </div>
                    </div>
                    <div className="text-white/30 text-right">
                        <p className="text-2xl font-bold">2026 Season Official</p>
                        <p className="text-lg opacity-60">Verified by DNA Engine</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default KboShareCard;
