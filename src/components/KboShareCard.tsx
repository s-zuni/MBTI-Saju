import React from 'react';


interface KboShareCardProps {
    result: any;
    selectedTeam: string;
    userName: string;
}

const RadarChartSmall = ({ data }: { data: any[] }) => {
    const cx = 100;
    const cy = 100;
    const radius = 60;
    const total = 5;

    const getPoint = (index: number, val: number, r: number) => {
        const MathPI = Math.PI;
        const angle = (index * (360 / total) - 90) * (MathPI / 180);
        return {
            x: cx + r * (val / 100) * Math.cos(angle),
            y: cy + r * (val / 100) * Math.sin(angle)
        };
    };

    const gridPoints = [33, 66, 100].map(level => {
        return Array.from({ length: total }).map((_, i) => getPoint(i, 100, level * (radius / 100)));
    });

    const renderData = data && data.length === 5 ? data : [
        { label: '열정', value: 80 },
        { label: '분석', value: 70 },
        { label: '직관', value: 90 },
        { label: '안정', value: 60 },
        { label: '협동', value: 85 }
    ];

    const dataPoints = Array.from({ length: total }).map((_, i) => getPoint(i, renderData[i]?.value || 0, radius));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    
    const labelPoints = Array.from({ length: total }).map((_, i) => getPoint(i, 100, radius + 20));

    return (
        <div className="relative flex items-center justify-center w-full h-full">
            <svg viewBox="0 0 200 200" className="w-[120%] h-[120%] overflow-visible">
                {/* Background grids */}
                {gridPoints.map((points, i) => (
                    <path
                        key={i}
                        d={points.map((p, pi) => `${pi === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                        fill="none"
                        stroke="#e5e5e5"
                        strokeWidth="1"
                    />
                ))}
                
                {/* Axes */}
                {Array.from({ length: total }).map((_, i) => {
                    const outer = getPoint(i, 100, radius);
                    return <line key={`axis-${i}`} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#e5e5e5" strokeWidth="1" />
                })}

                {/* Data blob */}
                <path
                    d={dataPath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                />
                
                {/* Points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563eb" />
                ))}

                {/* Labels */}
                {labelPoints.map((p, i) => {
                    const labelText = renderData[i]?.label || '';
                    return (
                        <text 
                            key={`label-${i}`} 
                            x={p.x} 
                            y={p.y + 4} 
                            fill="#94a3b8" 
                            fontSize="10" 
                            fontWeight="700" 
                            textAnchor="middle"
                        >
                            {labelText}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

const KboShareCard = React.forwardRef<HTMLDivElement, KboShareCardProps>(({ result, selectedTeam, userName }, ref) => {
    
    return (
        <div 
            ref={ref}
            className="w-[1080px] h-[1080px] bg-white flex flex-col relative overflow-hidden p-24 font-sans"
        >
            {/* Minimalist Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '100px 100px' }} 
            />

            {/* Top Brand Header */}
            <div className="flex justify-between items-center mb-32 z-20">
                <div className="flex flex-col gap-1">
                    <span className="text-slate-900 text-2xl font-black tracking-[0.3em] uppercase">MBTIJU</span>
                    <span className="text-slate-400 text-[10px] font-bold tracking-[0.5em] uppercase">Architectural Precision</span>
                </div>
                <div className="text-slate-400 text-xs tracking-widest font-bold uppercase border-l border-slate-200 pl-6">
                    Sporting<br />Ledger
                </div>
            </div>

            <div className="flex-1 flex flex-col z-10 relative">
                
                {/* User Info */}
                <div className="mb-24">
                    <p className="text-blue-600 font-bold text-xs tracking-[0.5em] uppercase mb-6">Analytical Record</p>
                    <h1 className="text-8xl font-serif text-slate-900 tracking-tighter leading-[1.1]">
                        {userName}님의<br />
                        <span className="text-blue-600">
                             {selectedTeam === '없음 (아직 없음)' ? '추천 구단 분석' : `${selectedTeam} 궁합`}
                        </span>
                    </h1>
                </div>

                {/* Score Section */}
                <div className="grid grid-cols-2 gap-24 mb-32 border-t border-b border-slate-100 py-16">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.4em] mb-8">Harmony Index</p>
                        <p className="text-[160px] font-serif text-slate-900 tracking-[-0.05em] leading-none">
                            {result.score}
                        </p>
                    </div>
                    <div className="flex flex-col justify-between">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.4em] mb-8">Win Probability</p>
                            <p className="text-[120px] font-serif text-slate-900 tracking-[-0.05em] leading-none">
                                {result.winFairyScore}<span className="text-2xl text-slate-300 ml-4">%</span>
                            </p>
                        </div>
                        <div className="flex gap-12 mt-8">
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Best</p>
                                <p className="text-xl font-serif text-slate-900">{result.bestTeam}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Worst</p>
                                <p className="text-xl font-serif text-slate-900">{result.worstTeam}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radar Chart Area */}
                <div className="flex-1 flex items-center justify-between">
                    <div className="w-[450px] h-[450px]">
                        <RadarChartSmall data={result.dimensions || []} />
                    </div>
                    <div className="max-w-[400px] text-right space-y-12">
                         <div className="space-y-4">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">Disposition Analysis</p>
                            <p className="text-xl font-serif text-slate-800 leading-relaxed italic opacity-80">
                                "{result.supportedTeamAnalysis?.slice(0, 80)}..."
                            </p>
                         </div>
                         <div className="pt-8 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold tracking-[0.5em] uppercase">Verified Record</p>
                         </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-32 flex justify-between items-end opacity-40">
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-slate-950 font-black tracking-[0.5em] uppercase">AUTHENTIC DATA</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-950 font-black tracking-[0.5em] uppercase">
                        MBTIJU.COM
                    </p>
                </div>
            </div>
        </div>
    );
});

export default KboShareCard;
