import React from 'react';
import { getTeamInfo } from '../config/teamConfig';
import { Sparkles, TrendingUp, Trophy, Star } from 'lucide-react';

interface KboShareCardProps {
    result: any;
    selectedTeam: string;
    userName: string;
}

const RadarChartSmall = ({ data, color }: { data: any[], color: string }) => {
    const cx = 100;
    const cy = 100;
    const radius = 65;
    const total = 5;

    const getPoint = (index: number, val: number, r: number) => {
        const MathPI = Math.PI;
        // Start from top (-90 degrees)
        const angle = (index * (360 / total) - 90) * (MathPI / 180);
        return {
            x: cx + r * (val / 100) * Math.cos(angle),
            y: cy + r * (val / 100) * Math.sin(angle)
        };
    };

    const gridPoints = [20, 40, 60, 80, 100].map(level => {
        return Array.from({ length: total }).map((_, i) => getPoint(i, 100, level * (radius / 100)));
    });

    // Provide default fallback data if empty
    const renderData = data && data.length === 5 ? data : [
        { name: '열정', value: 80 },
        { name: '분석', value: 70 },
        { name: '직관', value: 90 },
        { name: '안정', value: 60 },
        { name: '협동', value: 85 }
    ];

    const dataPoints = Array.from({ length: total }).map((_, i) => getPoint(i, renderData[i]?.value || 0, radius));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    
    // Labels for each corner
    const labels = ["Passion", "Logic", "Vibe", "Steady", "Team"];
    const labelPoints = Array.from({ length: total }).map((_, i) => getPoint(i, 100, radius + 25));

    return (
        <div className="relative flex items-center justify-center w-full h-full">
            <svg viewBox="0 0 200 200" className="w-[120%] h-[120%] overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.1" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                {/* Background grids */}
                {gridPoints.map((points, i) => (
                    <path
                        key={i}
                        d={points.map((p, pi) => `${pi === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                        fill={i === 4 ? 'rgba(255,255,255,0.02)' : 'none'}
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                    />
                ))}
                
                {/* Axes */}
                {Array.from({ length: total }).map((_, i) => {
                    const outer = getPoint(i, 100, radius);
                    return <line key={`axis-${i}`} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2 2" />
                })}

                {/* Data blob */}
                <path
                    d={dataPath}
                    fill="url(#chartGradient)"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                />
                
                {/* Points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="2" />
                ))}

                {/* Labels */}
                {labelPoints.map((p, i) => (
                    <text 
                        key={`label-${i}`} 
                        x={p.x} 
                        y={p.y + 4} 
                        fill="rgba(255,255,255,0.9)" 
                        fontSize="9" 
                        fontWeight="900" 
                        letterSpacing="1"
                        textAnchor="middle"
                        className="uppercase opacity-80"
                    >
                        {labels[i]}
                    </text>
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
            className="w-[1080px] h-[1920px] bg-black flex flex-col relative overflow-hidden font-sans"
            style={{ 
                background: `linear-gradient(145deg, #050505 0%, ${secondaryColor}66 50%, #000000 100%)` 
            }}
        >
            {/* Soft Orbs for background depth */}
            <div 
                className="absolute top-[-15%] right-[-20%] w-[1000px] h-[1000px] rounded-full blur-[100px] opacity-40 mix-blend-screen"
                style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
            />
            <div 
                className="absolute bottom-[-10%] left-[-20%] w-[1200px] h-[1200px] rounded-full blur-[120px] opacity-20 mix-blend-screen"
                style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
            />
            
            {/* Grid Pattern Overlay to make it look premium/techy */}
            <div className="absolute inset-0 opacity-[0.05]" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />

            {/* Top Navigation / Brand Header */}
            <div className="absolute top-20 left-0 right-0 px-20 flex justify-between items-center z-20">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                        <span className="text-white font-black text-3xl tracking-tighter">M</span>
                    </div>
                    <span className="text-white text-2xl font-black tracking-[0.2em] uppercase">MBTIJU.COM</span>
                </div>
                <div className="px-6 py-3 rounded-full border border-white/20 bg-white/5 backdrop-blur-2xl">
                    <span className="text-white text-xl tracking-[0.15em] font-medium uppercase block">Season 2026 Analysis</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-20 pt-56 pb-20 z-10 relative">
                
                {/* Title Area */}
                <div className="flex flex-col mb-16">
                    <div className="inline-flex items-center gap-4 mb-6">
                        <Sparkles className="w-10 h-10 text-amber-300" fill="currentColor" />
                        <span className="text-3xl text-amber-300 font-bold tracking-[0.3em]">PERFECT MATCH</span>
                    </div>
                    <h1 className="text-[7.5rem] font-black text-white tracking-tight leading-[1.05] drop-shadow-2xl">
                        {userName}님의 운명은<br/>
                        <span style={{ color: primaryColor }} className="brightness-150 inline-block mt-4">
                             {teamInfo?.name || selectedTeam}
                        </span>
                    </h1>
                </div>

                {/* Main Content Glass Card */}
                <div className="bg-[#111111]/70 backdrop-blur-2xl rounded-[70px] p-14 flex flex-col grow relative border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-20 overflow-hidden">
                    
                    {/* Top Section - Logo & Badge */}
                    <div className="flex justify-between items-center mb-16">
                        {teamInfo && (
                            <div className="w-64 h-64 bg-white rounded-full p-10 flex items-center justify-center border-4 border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)] z-10 relative shrink-0">
                                {/* Subtle internal glow */}
                                <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ background: primaryColor }} />
                                <img 
                                    src={teamInfo.logo} 
                                    alt={teamInfo.name} 
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-contain relative z-10 scale-110 drop-shadow-xl" 
                                />
                            </div>
                        )}
                        <div className="flex flex-col items-end gap-3 justify-center ml-10">
                            <div className="px-10 py-4 rounded-full text-3xl font-black uppercase tracking-widest text-[#1a1a1a] shadow-lg" style={{ background: 'linear-gradient(135deg, #FFD700, #FDB931)' }}>
                                S CLASS RANK
                            </div>
                            <span className="text-white/60 text-2xl tracking-[0.2em] font-medium mt-2 text-right">OPTIMAL SYNERGY MATCH FOUND</span>
                        </div>
                    </div>

                    {/* Score Cards */}
                    <div className="grid grid-cols-2 gap-10 mb-14">
                        {/* Harmony Score */}
                        <div className="bg-[#1a1a1a]/80 rounded-[48px] p-12 border border-white/5 relative overflow-hidden group shadow-inner">
                            <div className="absolute top-0 left-0 w-full h-2" style={{ background: primaryColor }} />
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-3xl font-black text-white/50 uppercase tracking-[0.1em]">Harmony</span>
                                <Trophy className="w-10 h-10 text-white/20" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-9xl font-black text-white tracking-tighter" style={{ textShadow: `0 0 50px ${primaryColor}99` }}>
                                    {result.score}
                                </span>
                                <span className="text-5xl text-white/60 font-bold">%</span>
                            </div>
                            <p className="mt-6 text-white/40 text-2xl font-medium tracking-wide">팀과의 완벽한 화합 지수</p>
                        </div>
                        
                        {/* Win Fairy Score */}
                        <div className="bg-[#1a1a1a]/80 rounded-[48px] p-12 border border-white/5 relative overflow-hidden shadow-inner">
                            <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-3xl font-black text-white/50 uppercase tracking-[0.1em]">Win Fairy</span>
                                <Star className="w-10 h-10 text-amber-400/30" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-9xl font-black text-white tracking-tighter drop-shadow-[0_0_50px_rgba(251,191,36,0.3)]">
                                    {result.winFairyScore}
                                </span>
                                <span className="text-5xl text-white/60 font-bold">%</span>
                            </div>
                            <p className="mt-6 text-white/40 text-2xl font-medium tracking-wide">승리의 요정이 될 확률</p>
                        </div>
                    </div>

                    {/* Radar Chart Area */}
                    <div className="flex-1 bg-white/5 rounded-[48px] border border-white/5 p-12 flex flex-col items-center justify-center relative">
                        <div className="absolute top-12 left-12 flex items-center gap-4">
                            <TrendingUp className="w-8 h-8 text-white/50" />
                            <span className="text-white/40 text-2xl font-black tracking-[0.2em] uppercase">DNA Signature</span>
                        </div>
                        <div className="w-[500px] h-[500px] mt-10">
                            <RadarChartSmall data={result.dimensions || []} color={primaryColor} />
                        </div>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="mt-20 flex justify-between items-center z-10 px-6">
                    <p className="text-3xl text-white/60 font-bold tracking-widest flex items-center gap-4">
                        <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                        AI 분석 완료
                    </p>
                    <p className="text-2xl text-white/40 font-bold tracking-[0.2em]">
                        MBTIJU.COM
                    </p>
                </div>
            </div>
        </div>
    );
});

export default KboShareCard;

