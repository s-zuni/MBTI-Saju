import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, TrendingUp, Sparkles, X, Trophy, Activity, CircleDot } from 'lucide-react';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { generatePDF } from '../utils/pdfGenerator';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { kboSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';

const BaseballIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 2.5a10 10 0 0 1 0 19" />
        <path d="M16 2.5a10 10 0 0 0 0 19" />
    </svg>
);

const RadarChart = ({ data }: { data: any[] }) => {
    const cx = 150;
    const cy = 150;
    const radius = 100;
    const total = 5;

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
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <svg viewBox="0 0 300 300" className="w-full max-w-[300px] h-auto overflow-visible">
                {/* Background Grid */}
                {gridPoints.map((points, i) => (
                    <path
                        key={i}
                        d={points.map((p, pi) => `${pi === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={i === 3 ? "0" : "4 4"}
                    />
                ))}
                
                {/* Axes */}
                {outerGrid.map((p, i) => (
                    <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />
                ))}

                {/* Data Area */}
                <path
                    d={dataPath}
                    fill="url(#radarGradient)"
                    fillOpacity="0.4"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    className="animate-pulse-slow"
                />
                <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>

                {/* Data points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#4f46e5" stroke="white" strokeWidth="2" />
                ))}

                {/* Labels */}
                {outerGrid.map((p, i) => {
                    const angle = (i * (360 / total) - 90) * (Math.PI / 180);
                    const labelX = cx + (radius + 40) * Math.cos(angle);
                    const labelY = cy + (radius + 20) * Math.sin(angle);
                    
                    let textAnchor: "start" | "middle" | "end" = "middle";
                    if (Math.cos(angle) > 0.1) textAnchor = "start";
                    else if (Math.cos(angle) < -0.1) textAnchor = "end";

                    return (
                        <g key={i}>
                            <text
                                x={labelX}
                                y={labelY}
                                textAnchor={textAnchor}
                                className="text-[12px] font-black fill-slate-900"
                            >
                                {data[i]?.label || ''}
                            </text>
                            {data[i]?.value !== undefined && (
                                <text
                                    x={labelX}
                                    y={labelY + 14}
                                    textAnchor={textAnchor}
                                    className="text-[10px] font-bold fill-indigo-600"
                                >
                                    {data[i].value}%
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

interface KboModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any;
}

const KBO_TEAMS = [
    '기아 타이거즈',
    '삼성 라이온즈',
    'LG 트윈스',
    '두산 베어스',
    'KT 위즈',
    'SSG 랜더스',
    '롯데 자이언츠',
    '한화 이글스',
    'NC 다이노스',
    '키움 히어로즈',
    '없음 (아직 없음)'
];

const KboContent: React.FC<{
    onUseCredit?: (() => Promise<boolean>) | undefined;
    credits?: number | undefined;
    session: any;
    onReset: () => void;
    onNavigate: (service: ServiceType) => void;
    onClose: () => void;
}> = ({ onUseCredit, credits, session, onReset, onNavigate, onClose }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    // Streaming Hook
    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: kboSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    const startAnalysis = async () => {
        if (!selectedTeam) {
            setError('응원 구단을 선택해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.KBO;
        if (credits !== undefined && credits < cost) {
            onNavigate('creditPurchase' as any);
            onClose();
            return;
        }

        try {
            const { data: { session: fetchedSession } } = await supabase.auth.getSession();
            const activeSession = fetchedSession || session;
            
            const metadata = activeSession?.user?.user_metadata;
            if (!metadata) throw new Error('로그인이 필요합니다.');
            if (!metadata.birth_date || !metadata.mbti) {
                throw new Error('프로필 정보(생년월일, MBTI)가 설정되지 않았습니다.');
            }

            setHasStarted(true);
            setError(null);
            
            const sajuData = calculateSaju(metadata.birth_date, metadata.birth_time);
            submit({
                type: 'kbo',
                name: metadata.full_name || '사용자',
                mbti: metadata.mbti,
                birthDate: metadata.birth_date,
                birthTime: metadata.birth_time,
                sajuData,
                requirements: selectedTeam // 구단 정보 전달
            });

            if (onUseCredit) {
                await onUseCredit();
            }
        } catch (e: any) {
            setError(e.message);
            setHasStarted(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            const fileName = `MBTIJU_KboReport_${new Date().getTime()}`;
            await generatePDF(reportRef.current, fileName);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    if (!hasStarted) {
        return (
            <div className="px-8 sm:px-12 pb-12 pt-8 overflow-y-auto custom-scrollbar grow bg-white">
                <div className="max-w-md mx-auto">
                    <h4 className="text-xl font-black text-slate-900 mb-6 text-center tracking-tight">당신의 현재 응원 구단을 알려주세요</h4>
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {KBO_TEAMS.map((team) => (
                            <button
                                key={team}
                                onClick={() => { setError(null); setSelectedTeam(team); }}
                                className={`px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                                    selectedTeam === team
                                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                                    : 'bg-white border-slate-100 text-slate-600 flex-1 hover:border-blue-200'
                                }`}
                            >
                                {team}
                            </button>
                        ))}
                    </div>
                    {error && (
                        <p className="text-red-500 text-center font-bold text-sm mb-4">{error}</p>
                    )}
                    <button
                        onClick={startAnalysis}
                        className="w-full py-4 bg-slate-950 text-white rounded-full font-black flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200"
                    >
                        <Trophy className="w-5 h-5" /> 5 크레딧으로 분석 시작
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-5 sm:px-10 pb-12 pt-6 overflow-y-auto custom-scrollbar grow bg-white">
            <div ref={reportRef} className="bg-white">
            {isLoading && !result ? (
                <div className="flex flex-col justify-center items-center h-80">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6 stroke-[1px]" />
                        <p className="text-blue-600 font-bold text-[10px] tracking-[0.3em] uppercase">나와의 데스티니 구단 찾는 중...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100">
                    <p className="text-red-500 font-black mb-4">{error}</p>
                    <button onClick={() => setHasStarted(false)} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-black">다시 선택하기</button>
                </div>
            ) : result ? (
                <div className="space-y-10 animate-fade-up py-4">
                    
                    {/* Score section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <section className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <h4 className="font-bold text-blue-200 mb-2 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <Sparkles className="w-3 h-3"/> Compatibility Score
                            </h4>
                            <div className="flex items-end gap-1 mb-2">
                                <span className="text-5xl font-black">{result.score || 0}</span>
                                <span className="text-lg font-medium text-blue-200 mb-1.5">점</span>
                            </div>
                            <p className="font-medium text-blue-100 text-[11px] leading-tight opacity-80">
                                {selectedTeam === '없음 (아직 없음)' ? '최적 매칭 구단 궁합' : `[${selectedTeam}] 구단 궁합`}
                            </p>
                        </section>

                        <section className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <h4 className="font-bold text-amber-100 mb-2 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <Trophy className="w-3 h-3"/> Winning Fairy Index
                            </h4>
                            <div className="flex items-end gap-1 mb-2">
                                <span className="text-5xl font-black">{result.winFairyScore || 0}</span>
                                <span className="text-lg font-medium text-amber-100 mb-1.5">점</span>
                            </div>
                            <p className="font-medium text-amber-50 text-[11px] leading-tight opacity-80">
                                내 기운과 구장 에너지의 시너지 점수
                            </p>
                        </section>
                    </div>

                    {/* Detailed Analysis */}
                    <section className="bg-slate-50 p-7 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm relative">
                        <h5 className="font-black text-slate-900 mb-6 text-lg tracking-tight border-b border-slate-200 pb-4">
                            팩트 폭격 심층 분석
                        </h5>
                        <div className="text-slate-700 text-[15px] leading-[1.8] font-medium whitespace-pre-wrap">
                            {result.supportedTeamAnalysis}
                        </div>
                    </section>

                    {/* Infographic 5 Dimensions */}
                    <section className="pt-4">
                        <h5 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" /> 성향 파라미터 그래프
                        </h5>
                        <RadarChart data={result.dimensions || []} />
                    </section>

                    {/* Best & Worst Match */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 rounded-[28px] border border-emerald-100">
                            <div className="text-emerald-700 font-bold text-[10px] uppercase tracking-widest mb-1">Soulmate</div>
                            <h5 className="font-black text-emerald-900 text-lg mb-2">최강 궁합 구단</h5>
                            <p className="text-emerald-800 font-bold flex items-center gap-2">
                                <Trophy className="w-4 h-4" /> {result.bestTeam}
                            </p>
                        </div>
                        <div className="p-6 bg-rose-50 rounded-[28px] border border-rose-100">
                            <div className="text-rose-700 font-bold text-[10px] uppercase tracking-widest mb-1">Mismatch</div>
                            <h5 className="font-black text-rose-900 text-lg mb-2">최악 궁합 구단</h5>
                            <p className="text-rose-800 font-bold flex items-center gap-2">
                                <X className="w-4 h-4" /> {result.worstTeam}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center pt-8 border-t border-slate-100 gap-4 mt-8">
                        <button
                            onClick={handleDownloadPDF}
                            className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                        >
                            <TrendingUp className="w-5 h-5" /> 결과 리포트 다운로드
                        </button>
                        <button
                            onClick={() => { setHasStarted(false); onReset(); }}
                            className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4"
                        >
                            다른 구단 다시 선택하기
                        </button>
                    </div>
                </div>
            ) : null}
            </div>
        </div>
    );
};

const KboAnalysisModal: React.FC<KboModalProps> = ({ isOpen, onClose, onNavigate, onUseCredit, credits, session }) => {
    const [resetKey, setResetKey] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setResetKey(prev => prev + 1);
        }
    }, [isOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-[1000] animate-fade-in p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
                <ServiceNavigation currentService="kbo" onNavigate={onNavigate} onClose={onClose} />

                {/* Aesthetic Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5 border border-blue-200 bg-white px-2 py-1 rounded-full w-fit">
                                <BaseballIcon className="w-3 h-3" /> BEST MATCH PREDICTION
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none mt-4">
                                KBO 팬 궁합
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <KboContent 
                    key={resetKey}
                    onReset={() => setResetKey(prev => prev + 1)}
                    onUseCredit={onUseCredit}
                    credits={credits}
                    session={session}
                    onNavigate={onNavigate}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};

export default KboAnalysisModal;
