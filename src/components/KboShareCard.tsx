import React from 'react';
import { getTeamInfo } from '../config/teamConfig';

interface RadarChartProps {
    data: { label: string; value: number }[];
    color: string;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, color }) => {
    const cx = 150;
    const cy = 150;
    const radius = 100;
    const total = data.length || 5;

    const getPoint = (index: number, val: number, r: number) => {
        const angle = (index * (360 / total) - 90) * (Math.PI / 180);
        return {
            x: cx + r * (val / 100) * Math.cos(angle),
            y: cy + r * (val / 100) * Math.sin(angle)
        };
    };

    const gridPoints = [25, 50, 75, 100].map(level => {
        return Array.from({ length: total }).map((_, i) => getPoint(i, 100, level * (radius / 100)));
    });

    const outerGrid = gridPoints[gridPoints.length - 1] || [];
    const dataPoints = Array.from({ length: total }).map((_, i) => getPoint(i, data[i]?.value || 0, radius));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <div className="flex flex-col items-center justify-center">
            <svg viewBox="0 0 300 300" className="w-full max-w-[360px] h-auto overflow-visible">
                {/* Background Grid */}
                {gridPoints.map((points, i) => (
                    <path
                        key={i}
                        d={points.map((p, pi) => `${pi === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                        fill="none"
                        stroke="#e5e5e5"
                        strokeWidth="1.5"
                    />
                ))}
                
                {/* Axes */}
                {outerGrid.map((p, i) => (
                    <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e5e5" strokeWidth="1.5" />
                ))}

                {/* Data Area */}
                <path
                    d={dataPath}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="5" fill={color} stroke="white" strokeWidth="2" />
                ))}

                {/* Labels */}
                {outerGrid.map((p, i) => {
                    const angle = (i * (360 / total) - 90) * (Math.PI / 180);
                    const labelX = cx + (radius + 45) * Math.cos(angle);
                    const labelY = cy + (radius + 25) * Math.sin(angle);
                    
                    let textAnchor: "start" | "middle" | "end" = "middle";
                    if (Math.cos(angle) > 0.1) textAnchor = "start";
                    else if (Math.cos(angle) < -0.1) textAnchor = "end";

                    return (
                        <g key={i}>
                            <text
                                x={labelX}
                                y={labelY}
                                textAnchor={textAnchor}
                                className="text-[13px] font-black fill-slate-500"
                            >
                                {data[i]?.label || ''}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

interface KboShareCardProps {
    result: any;
    selectedTeam: string;
    userName: string;
}

const KboShareCard = React.forwardRef<HTMLDivElement, KboShareCardProps>(({ result, selectedTeam, userName }, ref) => {
    const teamInfo = getTeamInfo(selectedTeam || '');
    const accentColor = teamInfo?.primaryColor || '#775a19';
    const primaryColor = '#000666';

    return (
        <div 
            ref={ref}
            id="kbo-share-card"
            className="w-[1080px] h-[1080px] flex flex-col relative overflow-hidden font-['Manrope']"
            style={{ backgroundColor: '#F9F7F2' }} // Use inline style to prevent capture issues
        >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: `linear-gradient(${primaryColor} 1.5px, transparent 1.5px), linear-gradient(90deg, ${primaryColor} 1.5px, transparent 1.5px)`, backgroundSize: '80px 80px' }} 
            />
            
            {/* Corner Accent */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.03] pointer-events-none" 
                 style={{ 
                     background: `radial-gradient(circle at 100% 0%, ${accentColor} 0%, transparent 70%)` 
                 }} 
            />

            {/* Top Brand Header */}
            <div className="px-20 pt-20 flex justify-between items-start z-20">
                <div className="flex flex-col gap-1">
                    <span className="text-[#000666] text-4xl font-black tracking-[0.2em]">MBTIJU</span>
                    <span className="text-slate-400 text-[14px] font-bold tracking-[0.4em]">정교한 사주 분석 리포트</span>
                </div>
                <div className="text-slate-300 text-lg tracking-widest font-black text-right uppercase">
                    KBO FAN<br />REPORT
                </div>
            </div>

            <div className="flex-1 flex flex-col px-20 pt-16 z-10 relative">
                
                {/* Title Section */}
                <div className="mb-12">
                    <p className="font-black text-sm tracking-[0.5em] mb-4 uppercase" style={{ color: accentColor }}>Analytical Record</p>
                    <h1 className="text-[90px] font-['Noto_Serif_KR'] text-slate-950 tracking-tighter leading-[1.1] font-black">
                        {userName}님의<br />
                        <span style={{ color: accentColor }}>
                             {selectedTeam === '없음 (아직 없음)' ? '추천 구단 분석' : `${selectedTeam} 궁합`}
                        </span>
                    </h1>
                </div>

                {/* Score Section */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div className="bg-white rounded-[48px] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center">
                        <p className="text-sm font-black tracking-[0.4em] mb-4 opacity-40 uppercase" style={{ color: primaryColor }}>Compatibility</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[140px] font-['Noto_Serif_KR'] tracking-[-0.05em] leading-none font-black" style={{ color: primaryColor }}>
                                {result.score}
                            </p>
                            <span className="text-4xl font-black opacity-30" style={{ color: primaryColor }}>%</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-12">
                        <div className="bg-white rounded-[40px] p-10 shadow-xl shadow-slate-200/40 border border-slate-100">
                            <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em] mb-4">Win Fairy</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-[80px] font-['Noto_Serif_KR'] text-slate-900 tracking-[-0.05em] leading-none font-black">
                                    {result.winFairyScore}
                                </p>
                                <span className="text-2xl font-black text-slate-300">%</span>
                            </div>
                        </div>
                        <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-10 border border-white/60">
                             <div className="flex items-center gap-6">
                                {teamInfo?.logo ? (
                                    <img src={teamInfo.logo} alt={selectedTeam} className="w-20 h-20 object-contain drop-shadow-md" />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-inner">
                                        <span className="text-4xl text-[#000666] font-black">{userName.slice(0, 1)}</span>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected Team</span>
                                    <span className="text-2xl font-bold text-slate-900">{selectedTeam}</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Radar Chart & Guide */}
                <div className="flex-1 flex gap-12 mb-12">
                    {/* Radar Chart */}
                    <div className="flex-[1.2] bg-white rounded-[48px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-8 left-10">
                            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">Dimension Analysis</p>
                        </div>
                        <RadarChart data={result.dimensions || []} color={accentColor} />
                    </div>

                    {/* Luck Guide */}
                    <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-[48px] p-12 border border-white flex flex-col justify-center space-y-10">
                        {selectedTeam === '없음 (아직 없음)' ? (
                            <>
                                <div className="space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: primaryColor }}>Best Match</p>
                                    <p className="text-4xl font-['Noto_Serif_KR'] font-black" style={{ color: primaryColor }}>{result.bestTeam}</p>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Avoid</p>
                                    <p className="text-4xl font-['Noto_Serif_KR'] text-slate-600 font-black">{result.worstTeam}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
                                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>Lucky Seat</p>
                                    </div>
                                    <p className="text-[32px] font-['Noto_Serif_KR'] text-slate-900 font-black leading-[1.2] break-keep">{result.recommendedSeat}</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
                                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>Lucky Food</p>
                                    </div>
                                    <p className="text-[32px] font-['Noto_Serif_KR'] text-slate-900 font-black leading-[1.2] break-keep">{result.luckyFood}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pb-20 flex justify-between items-end border-t border-slate-200 pt-12">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-950 font-black tracking-[0.4em] uppercase">Official Analysis Report</p>
                        <p className="text-[12px] text-slate-400 font-bold tracking-[0.2em]">
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-slate-300 tracking-[0.3em] uppercase">Verified by</span>
                        <p className="text-lg text-slate-950 font-black tracking-[0.4em]">
                            MBTIJU.COM
                        </p>
                    </div>
                </div>
            </div>

            {/* Decorative Baseball Pattern */}
            <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] opacity-[0.02] pointer-events-none rotate-12">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full text-slate-900">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 2.5a10 10 0 0 1 0 19" />
                    <path d="M16 2.5a10 10 0 0 0 0 19" />
                </svg>
            </div>
        </div>
    );
});

export default KboShareCard;
