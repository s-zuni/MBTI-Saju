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
    
    return (
        <div 
            ref={ref}
            className="w-[1080px] h-[1920px] bg-slate-950 flex flex-col relative overflow-hidden font-sans"
            style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)` 
            }}
        >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white opacity-5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500 opacity-10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
            
            <div className="flex-1 flex flex-col px-12 pt-16 pb-12 z-10">
                {/* Header */}
                <div className="flex flex-col items-center mb-12">
                    <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                        <span className="text-white font-black tracking-[0.3em] text-2xl">KBO FAN ANALYSIS</span>
                    </div>
                    <img src="/assets/icons/3d_kbo.png" alt="KBO" className="w-48 h-48 mb-8 drop-shadow-2xl" />
                    <h1 className="text-7xl font-black text-white tracking-tighter mb-2 italic">
                        {userName}님의 운명적 구단
                    </h1>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-[80px] p-16 shadow-2xl flex flex-col grow mb-12">
                    <div className="flex items-center gap-8 mb-12 border-b-4 border-slate-100 pb-10">
                        {teamInfo && (
                            <div className="w-40 h-40 bg-slate-50 rounded-3xl p-4 flex items-center justify-center shadow-inner">
                                <img src={teamInfo.logo} alt={teamInfo.name} className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-6xl font-black text-slate-950 mb-2">{teamInfo?.name || selectedTeam}</h2>
                            <div className="flex items-center gap-4">
                                <span className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-2xl font-black">MATCHED</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="flex flex-col items-center p-12 bg-indigo-50 rounded-[60px]">
                            <span className="text-3xl font-black text-indigo-400 uppercase tracking-widest mb-4">Harmony</span>
                            <div className="flex items-end gap-2">
                                <span className="text-9xl font-black text-indigo-600 leading-none">{result.score}</span>
                                <span className="text-4xl font-bold text-indigo-400 mb-4">점</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center p-12 bg-amber-50 rounded-[60px]">
                            <span className="text-3xl font-black text-amber-500 uppercase tracking-widest mb-4">Win Fairy</span>
                            <div className="flex items-end gap-2">
                                <span className="text-9xl font-black text-amber-600 leading-none">{result.winFairyScore}</span>
                                <span className="text-4xl font-bold text-amber-500 mb-4">점</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col grow items-center justify-center border-y-4 border-slate-50 py-12">
                         <div className="flex items-center gap-4 mb-8">
                            <TrendingUp className="w-12 h-12 text-indigo-500" />
                            <h3 className="text-4xl font-black text-slate-800">나의 성향 파라미터</h3>
                        </div>
                        <div className="w-[600px] transform scale-125">
                            <RadarChartSmall data={result.dimensions || []} color={primaryColor} />
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-3xl text-slate-400 font-medium italic">"데이터와 사주가 증명하는 완벽한 팬심"</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-8">
                    <div className="flex items-center gap-4 text-white/60">
                         <Sparkles className="w-10 h-10" />
                         <span className="text-3xl font-bold">mbtiju.com</span>
                    </div>
                    <div className="text-white/40 text-2xl">
                        AI DNA & Fortune Analysis
                    </div>
                </div>
            </div>
        </div>
    );
});

export default KboShareCard;
