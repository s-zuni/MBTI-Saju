import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, TrendingUp, Sparkles, X, Instagram, Download, Zap } from 'lucide-react';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { generatePDF } from '../utils/pdfGenerator';
import { generateImage } from '../utils/exportUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { kboSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { getTeamInfo } from '../config/teamConfig';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import KboShareCard from './KboShareCard';

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
        <div className="flex flex-col items-center justify-center p-4">
            <svg viewBox="0 0 300 300" className="w-full max-w-[300px] h-auto overflow-visible">
                {/* Background Grid */}
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
                {outerGrid.map((p, i) => (
                    <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e5e5" strokeWidth="1" />
                ))}

                {/* Data Area */}
                <path
                    d={dataPath}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2"
                />

                {/* Data points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#000000" />
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
                                className="text-[11px] font-medium fill-slate-500"
                            >
                                {data[i]?.label || ''}
                            </text>
                            {data[i]?.value !== undefined && (
                                <text
                                    x={labelX}
                                    y={labelY + 14}
                                    textAnchor={textAnchor}
                                    className="text-[10px] font-bold fill-black"
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
    'KIA 타이거즈',
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
    const shareRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

    const userName = session?.user?.user_metadata?.full_name || '사용자';

    // Streaming Hook
    const { object: result, submit, isLoading, error: aiError } = useObject({
        api: '/api/analysis-special',
        schema: kboSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        },
        onFinish: ({ object }) => {
            // Only deduct credits if analysis successfully finished
            if (object) {
                if (onUseCredit) {
                    onUseCredit();
                }
            }
        },
        onError: (err) => {
            console.error('KBO Analysis Error:', err);
            setError('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (크레딧은 차감되지 않았습니다)');
        }
    });

    // 로딩 메시지 순환 효과
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading && !result) {
            setCurrentLoadingMessage(getRandomLoadingMessage('kbo'));
            interval = setInterval(() => {
                setCurrentLoadingMessage(getRandomLoadingMessage('kbo'));
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isLoading, result]);

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

    const handleShareInstagram = async () => {
        if (!shareRef.current || !result) return;
        setIsSharing(true);
        try {
            const fileName = `MBTIJU_KBO_Story_${new Date().getTime()}`;
            await generateImage(shareRef.current, fileName);
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다. 인스타그램에 접속하여 공유해보세요!');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    if (!hasStarted) {
        return (
            <div className="px-8 sm:px-12 pb-12 pt-8 overflow-y-auto custom-scrollbar grow bg-white">
                <div className="max-w-md mx-auto">
                    <h4 className="text-xl font-bold text-slate-900 mb-8 text-center tracking-tight">응원 구단을 선택해주세요</h4>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {KBO_TEAMS.map((team) => {
                            const info = getTeamInfo(team);
                            return (
                                <button
                                    key={team}
                                    onClick={() => { setError(null); setSelectedTeam(team); }}
                                    className={`px-4 py-4 border transition-all flex flex-col items-center gap-3 ${
                                        selectedTeam === team
                                        ? 'border-blue-600 bg-blue-50/30'
                                        : 'border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    {info?.logo && (
                                        <div className="w-8 h-8 opacity-80">
                                            <img src={info.logo} alt={team} crossOrigin="anonymous" className="w-full h-full object-contain filter grayscale-[0.5]" />
                                        </div>
                                    )}
                                    <span className={`text-[13px] font-bold ${selectedTeam === team ? 'text-blue-600' : 'text-slate-500'}`}>
                                        {team}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {error && (
                        <p className="text-red-500 text-center font-bold text-sm mb-4">{error}</p>
                    )}
                    <button
                        onClick={startAnalysis}
                        className="w-full py-5 bg-slate-950 text-white rounded-none font-bold text-sm flex justify-center items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                    >
                         분석 시작
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4 font-medium tracking-widest uppercase">5 Credits will be used</p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-5 sm:px-10 pb-12 pt-6 overflow-y-auto custom-scrollbar grow bg-white">
            {/* HIDDEN SHARE CARD FOR CAPTURE */}
            <div className="fixed left-[-9999px] top-[-9999px]">
                 {result && (
                    <KboShareCard 
                        ref={shareRef}
                        result={result}
                        selectedTeam={selectedTeam || ''}
                        userName={userName}
                    />
                 )}
            </div>

            <div ref={reportRef} className="bg-white">
            {aiError && !result ? (
                <div className="py-20 text-center">
                    <X className="w-12 h-12 text-red-500 mx-auto mb-4 stroke-[1px]" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">분석에 실패했습니다</h3>
                    <p className="text-slate-500 mb-8 whitespace-pre-wrap text-sm">
                        {aiError.message || '일시적인 오류가 발생했습니다.'}
                        {"\n"}크레딧은 차감되지 않았습니다.
                    </p>
                    <button
                        onClick={() => { setHasStarted(false); setError(null); }}
                        className="px-8 py-3 border border-slate-900 text-slate-900 rounded-full font-bold text-sm active:scale-95 transition-all"
                    >
                        뒤로 가기
                    </button>
                </div>
            ) : isLoading && !result ? (
                <div className="flex flex-col justify-center items-center h-80 px-6 text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-8 stroke-[1px]" />
                    <div className="space-y-2">
                        <p className="text-slate-900 font-bold text-lg tracking-tight">
                            {currentLoadingMessage}
                        </p>
                        <p className="text-slate-400 font-medium text-[10px] tracking-widest uppercase">
                            분석에는 최대 30초 정도 소요될 수 있습니다
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-20 border border-red-100 rounded-2xl">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={() => setHasStarted(false)} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-bold">다시 선택하기</button>
                </div>
            ) : result ? (
                <div className="animate-fade-up py-4 space-y-12">
                    
                    {/* Header Info */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-8">
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.1em] mb-3">
                                <Zap className="w-3 h-3" /> {result.date ? new Date(result.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : ''}
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter">
                                {selectedTeam === '없음 (아직 없음)' ? '당신에게 어울리는 구단은?' : `${selectedTeam}과의 궁합`}
                            </h4>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">궁합 점수</p>
                            <p className="text-5xl font-black text-blue-600 tracking-tighter">{result.score || 0}<span className="text-xl ml-1 text-slate-300">점</span></p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100">
                        <div className="bg-white p-6">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">승리 요정 지수</h5>
                            <p className="text-3xl font-black text-slate-900">{result.winFairyScore || 0}%</p>
                        </div>
                        <div className="bg-white p-6">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">오늘의 운세</h5>
                            <p className="text-sm font-bold text-slate-900 leading-snug">{result.dailyMessage}</p>
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <section className="space-y-6">
                        <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-blue-600" /> Deep Analysis
                        </h5>
                        <div className="text-slate-800 text-[15px] leading-[1.8] font-medium whitespace-pre-wrap">
                            {result.supportedTeamAnalysis}
                        </div>
                    </section>

                    {/* Radar Chart */}
                    <section className="py-8">
                        <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-blue-600" /> Tendency Map
                        </h5>
                        <RadarChart data={result.dimensions || []} />
                    </section>

                    {/* Best & Worst Match */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-slate-100">
                        <div className="py-8 sm:pr-8 border-b sm:border-b-0 sm:border-r border-slate-100">
                            <h5 className="font-bold text-blue-600 text-[10px] uppercase tracking-widest mb-3">Best Match</h5>
                            <p className="text-xl font-black text-slate-900">{result.bestTeam}</p>
                        </div>
                        <div className="py-8 sm:pl-8">
                            <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-3">Worst Match</h5>
                            <p className="text-xl font-black text-slate-900">{result.worstTeam}</p>
                        </div>
                    </div>

                    {/* Tomorrow Preview */}
                    {(result.tomorrowScore !== undefined || result.tomorrowWinFairyScore !== undefined) && (
                        <div className="border border-slate-100 p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Tomorrow Preview</h5>
                                <span className="text-slate-400 text-[10px] font-medium">
                                    {new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex gap-12">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">궁합</p>
                                    <p className="text-2xl font-black text-slate-900">{result.tomorrowScore ?? '-'}<span className="text-sm font-bold text-slate-300 ml-1">점</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">승요</p>
                                    <p className="text-2xl font-black text-slate-900">{result.tomorrowWinFairyScore ?? '-'}<span className="text-sm font-bold text-slate-300 ml-1">점</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center pt-12 gap-6 mt-12 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <button
                                onClick={handleShareInstagram}
                                disabled={isSharing}
                                className="flex-1 w-full px-8 py-4 bg-white border border-slate-900 text-slate-900 rounded-xl text-sm font-bold transition-all hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
                                인스타 스토리 공유
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 w-full px-8 py-4 bg-slate-900 text-white rounded-xl text-sm font-bold transition-all hover:bg-slate-800 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" /> 리포트 다운로드
                            </button>
                        </div>
                        
                        <button
                            onClick={() => { setHasStarted(false); onReset(); }}
                            className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors py-2"
                        >
                            다른 구단 결과 확인하기
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
            setResetKey((prev: number) => prev + 1);
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
        <div className="fixed inset-0 bg-white sm:bg-slate-950/40 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-[1000] p-0 sm:p-6">
            <div className="relative p-0 w-full max-w-2xl bg-white sm:rounded-3xl h-full sm:h-auto sm:max-h-[94vh] overflow-hidden flex flex-col sm:border sm:border-slate-200">
                <ServiceNavigation currentService="kbo" onNavigate={onNavigate} onClose={onClose} />

                {/* Aesthetic Header */}
                <div className="px-8 sm:px-12 pt-10 pb-6 shrink-0 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-blue-600 font-bold tracking-[0.2em] text-[10px] uppercase mb-4">
                        <BaseballIcon className="w-3 h-3" /> Daily KBO Fortune
                    </div>
                    <h3 className="text-3xl font-black text-slate-950 tracking-tighter leading-none">
                        KBO 팬 궁합
                    </h3>
                </div>

                <KboContent 
                    key={resetKey}
                    onReset={() => setResetKey((prev: number) => prev + 1)}
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
