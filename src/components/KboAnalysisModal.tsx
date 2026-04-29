import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, X, Instagram } from 'lucide-react';
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
                    <h4 className="text-sm font-bold text-slate-400 mb-12 text-center tracking-[0.3em] uppercase">응원 구단을 선택해주세요</h4>
                    <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100">
                        {KBO_TEAMS.map((team) => {
                            const info = getTeamInfo(team);
                            return (
                                <button
                                    key={team}
                                    onClick={() => { setError(null); setSelectedTeam(team); }}
                                    className={`px-4 py-8 bg-white transition-all flex flex-col items-center gap-4 ${
                                        selectedTeam === team
                                        ? 'ring-1 ring-inset ring-slate-900 z-10'
                                        : 'hover:bg-slate-50'
                                    }`}
                                >
                                    {info?.logo && (
                                        <div className="w-10 h-10 opacity-90 transition-all">
                                            <img src={info.logo} alt={team} crossOrigin="anonymous" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <span className={`text-[11px] font-bold tracking-widest uppercase ${selectedTeam === team ? 'text-slate-950' : 'text-slate-400'}`}>
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
                        className="w-full py-6 bg-slate-950 text-white font-bold text-xs tracking-[0.2em] uppercase flex justify-center items-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] mt-12"
                    >
                         궁합 분석 시작
                    </button>
                    <p className="text-center text-[9px] text-slate-400 mt-6 font-bold tracking-[0.3em] uppercase opacity-50">사용: 5 크레딧</p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-0 pb-12 pt-0 overflow-y-auto custom-scrollbar grow bg-[#F9F7F2]">
            {/* HIDDEN SHARE CARD FOR CAPTURE */}
            <div className="fixed left-[-9999px] top-[-9999px]">
                 {result && typeof result.score === 'number' && (
                    <KboShareCard 
                        ref={shareRef}
                        result={result as any}
                        selectedTeam={selectedTeam || ''}
                        userName={userName}
                    />
                 )}
            </div>

            <div ref={reportRef} className="bg-[#F9F7F2] font-['Manrope']">
            {aiError && !result ? (
                <div className="py-20 text-center px-8">
                    <X className="w-12 h-12 text-red-500 mx-auto mb-4 stroke-[1px]" />
                    <h3 className="text-xl font-['Noto_Serif_KR'] text-slate-900 mb-4 tracking-tight">분석이 중단되었습니다</h3>
                    <p className="text-slate-500 mb-12 whitespace-pre-wrap text-sm leading-relaxed">
                        {aiError.message || '처리 중 예기치 않은 오류가 발생했습니다.'}
                        {"\n"}크레딧은 차감되지 않았습니다.
                    </p>
                    <button
                        onClick={() => { setHasStarted(false); setError(null); }}
                        className="px-12 py-4 border border-slate-900 text-slate-900 font-bold text-[10px] tracking-widest uppercase active:scale-95 transition-all"
                    >
                        구단 선택으로 돌아가기
                    </button>
                </div>
            ) : (isLoading || !result || typeof result.score !== 'number') ? (
                <div className="py-32 flex flex-col items-center justify-center px-8">
                    <div className="relative mb-24">
                        <div className="w-16 h-16 border border-[#E5E5E5] rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 border border-[#E5E5E5] animate-[spin_3s_linear_infinite]" />
                        </div>
                    </div>
                    <div className="text-center space-y-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                            {result ? '데이터 정밀 분석 중...' : '데이터 연결 중...'}
                        </p>
                        <p className="text-lg font-['Noto_Serif_KR'] text-slate-900 tracking-tight italic">
                            "{currentLoadingMessage}"
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-20 border border-red-100 rounded-2xl mx-8">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={() => setHasStarted(false)} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-bold">다시 선택하기</button>
                </div>
            ) : result ? (
                <div className="animate-fade-up">
                    {/* Header */}
                    <header className="pt-10 pb-6 px-6 text-center">
                        <h1 className="font-['Noto_Serif_KR'] text-2xl text-[#000666] tracking-tight font-semibold">구단 궁합 및 승요 분석 결과</h1>
                        <div className="mt-2 w-8 h-0.5 bg-[#775a19] mx-auto opacity-40"></div>
                    </header>

                    {/* Main Content */}
                    <main className="px-6 pb-8 space-y-6">
                        {/* Compatibility Score Section */}
                        <section className="relative py-8 bg-white/50 rounded-2xl border border-[#E5E5E5] flex flex-col items-center">
                            <div className="flex items-center justify-between w-full px-8 mb-8">
                                {/* Current User or Placeholder for Logo A */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100 p-3 overflow-hidden">
                                        <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-[#000666] font-bold text-xl">
                                            {userName.slice(0, 1)}
                                        </div>
                                    </div>
                                    <span className="text-[13px] font-semibold text-slate-600 tracking-tight">{userName}</span>
                                </div>

                                {/* Heart Icon */}
                                <div className="relative flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-[#775a19]/10 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="#775a19" className="w-5 h-5">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Team Logo */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100 p-3 overflow-hidden">
                                        {getTeamInfo(selectedTeam || '')?.logo ? (
                                            <img 
                                                alt={selectedTeam || ''} 
                                                className="w-full h-full object-contain" 
                                                src={getTeamInfo(selectedTeam || '')?.logo} 
                                            />
                                        ) : (
                                            <BaseballIcon className="w-10 h-10 text-slate-300" />
                                        )}
                                    </div>
                                    <span className="text-[13px] font-semibold text-slate-600 tracking-tight">{selectedTeam === '없음 (아직 없음)' ? '추천 구단' : selectedTeam}</span>
                                </div>
                            </div>

                            {/* Big Score */}
                            <div>
                                <p className="text-[#775a19] text-[10px] font-bold uppercase tracking-[0.3em] mb-6 opacity-70">궁합 지수</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-8xl font-['Noto_Serif_KR'] text-[#000666] tracking-tighter leading-none font-bold">
                                        {result.score}
                                    </p>
                                    <span className="text-xl font-bold text-[#000666]/40">%</span>
                                </div>
                            </div>
                        </section>

                        {/* Analysis Detail */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                                <span className="text-[12px] font-semibold text-[#775a19] tracking-wider">승리 요정 리포트</span>
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                            </div>
                            
                            <div className="bg-white/60 p-7 rounded-2xl border border-slate-100 text-center shadow-sm">
                                <p className="font-['Noto_Serif_KR'] text-lg text-[#000666] mb-4 font-semibold">
                                    오늘의 승리 요정 점수: <span className="text-[#775a19]">{result.winFairyScore}점</span>
                                </p>
                                <div className="font-['Manrope'] text-[15px] text-slate-600 leading-relaxed break-keep">
                                    {result.supportedTeamAnalysis}
                                </div>
                            </div>
                        </section>

                        {/* Recommended Seat & Food or Best/Worst */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                                <span className="text-[12px] font-semibold text-[#775a19] tracking-wider">
                                    {selectedTeam === '없음 (아직 없음)' ? '추천 궁합 분석' : '오늘의 행운 가이드'}
                                </span>
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {selectedTeam === '없음 (아직 없음)' ? (
                                    <>
                                        <div className="bg-white/60 p-6 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                            <span className="text-sm font-semibold text-slate-500">최고의 찰떡 궁합</span>
                                            <span className="font-['Noto_Serif_KR'] text-lg text-[#000666] font-bold">{result.bestTeam}</span>
                                        </div>
                                        <div className="bg-white/60 p-6 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                            <span className="text-sm font-semibold text-slate-500">주의가 필요한 궁합</span>
                                            <span className="font-['Noto_Serif_KR'] text-lg text-slate-600 font-bold">{result.worstTeam}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-white/60 p-6 rounded-2xl border border-slate-100 space-y-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#775a19]"></div>
                                                <span className="text-[12px] font-bold text-[#775a19] uppercase tracking-wider">오늘의 직관 자리 추천</span>
                                            </div>
                                            <p className="text-[15px] text-slate-700 leading-relaxed font-medium pl-3.5 break-keep">
                                                {result.recommendedSeat}
                                            </p>
                                        </div>
                                        <div className="bg-white/60 p-6 rounded-2xl border border-slate-100 space-y-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#775a19]"></div>
                                                <span className="text-[12px] font-bold text-[#775a19] uppercase tracking-wider">오늘, 행운의 직관음식</span>
                                            </div>
                                            <p className="text-[15px] text-slate-700 leading-relaxed font-medium pl-3.5 break-keep">
                                                {result.luckyFood}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Radar Chart Section */}
                        <section className="pt-8">
                             <div className="flex items-center gap-3 mb-8">
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                                <span className="text-[12px] font-semibold text-slate-400 tracking-widest uppercase">구단 성향 분석</span>
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                            </div>
                            <div className="bg-white/40 rounded-3xl p-4 border border-slate-100">
                                <RadarChart data={result.dimensions || []} />
                            </div>
                        </section>
                    </main>

                    {/* Footer Actions */}
                    <footer className="px-6 pb-12 flex flex-col gap-3">
                        <button 
                            onClick={handleShareInstagram}
                            disabled={isSharing}
                            className="w-full bg-[#000666] text-white py-5 rounded-2xl font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                            인스타그램 공유하기
                        </button>
                        <button 
                            onClick={() => { setHasStarted(false); onReset(); }}
                            className="w-full text-slate-400 font-semibold py-4 text-[14px] hover:text-[#000666] transition-colors"
                        >
                            다른 구단 분석하기
                        </button>
                    </footer>

                    {/* Decorative Stars */}
                    <div className="fixed top-20 right-4 p-4 opacity-10 pointer-events-none z-0">
                        <svg viewBox="0 0 24 24" className="w-32 h-32 text-[#000666] fill-current">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
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
            <div className="relative p-0 w-full max-w-2xl bg-[#F9F7F2] sm:rounded-[40px] h-full sm:h-auto sm:max-h-[94vh] overflow-hidden flex flex-col sm:border sm:border-slate-200 shadow-2xl">
                <ServiceNavigation currentService="kbo" onNavigate={onNavigate} onClose={onClose} />

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
