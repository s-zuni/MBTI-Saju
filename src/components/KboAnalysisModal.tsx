import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, TrendingUp, Sparkles, X, Trophy, Share2, Instagram, Download, CalendarDays, ChevronRight, Zap } from 'lucide-react';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { generatePDF } from '../utils/pdfGenerator';
import { generateImage } from '../utils/exportUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { kboSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { getTeamInfo } from '../config/teamConfig';
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
                    stroke="#2563eb"
                    strokeWidth="3"
                    className="animate-pulse-slow"
                />
                <defs>
                    <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>

                {/* Data points */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
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
                                    className="text-[10px] font-bold fill-blue-600"
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

    const teamInfo = selectedTeam ? getTeamInfo(selectedTeam) : null;
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
                    <h4 className="text-xl font-black text-slate-900 mb-6 text-center tracking-tight">당신의 현재 응원 구단을 알려주세요</h4>
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {KBO_TEAMS.map((team) => {
                            const info = getTeamInfo(team);
                            return (
                                <button
                                    key={team}
                                    onClick={() => { setError(null); setSelectedTeam(team); }}
                                    className={`px-4 py-4 rounded-2xl text-sm font-bold border-2 transition-all flex flex-col items-center gap-2 ${
                                        selectedTeam === team
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {info?.logo && (
                                        <div className={`w-10 h-10 rounded-lg p-1 ${selectedTeam === team ? 'bg-white' : 'bg-slate-50'}`}>
                                            <img src={info.logo} alt={team} crossOrigin="anonymous" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    {team}
                                </button>
                            );
                        })}
                    </div>
                    {error && (
                        <p className="text-red-500 text-center font-bold text-sm mb-4">{error}</p>
                    )}
                    <button
                        onClick={startAnalysis}
                        className="w-full py-5 bg-slate-950 text-white rounded-full font-black flex justify-center items-center gap-2 hover:bg-slate-800 transition-all shadow-2xl hover:scale-[1.01] active:scale-95"
                    >
                        <Trophy className="w-5 h-5" /> 5 크레딧으로 분석 시작
                    </button>
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
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">분석에 실패했습니다</h3>
                    <p className="text-slate-500 mb-8 whitespace-pre-wrap">
                        {aiError.message || '일시적인 오류가 발생했습니다.'}
                        {"\n"}크레딧은 차감되지 않았습니다.
                    </p>
                    <button
                        onClick={() => { setHasStarted(false); setError(null); }}
                        className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold shadow-lg active:scale-95 transition-all"
                    >
                        뒤로 가기
                    </button>
                </div>
            ) : isLoading && !result ? (
                <div className="flex flex-col justify-center items-center h-80">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6 stroke-[1px]" />
                    <p className="text-blue-600 font-black text-[10px] tracking-[0.3em] uppercase">나와의 데스티니 구단 찾는 중...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100">
                    <p className="text-red-500 font-black mb-4">{error}</p>
                    <button onClick={() => setHasStarted(false)} className="px-8 py-3 bg-slate-950 text-white rounded-full text-xs font-black">다시 선택하기</button>
                </div>
            ) : result ? (
                <div className="space-y-10 animate-fade-up py-4">
                    
                    {/* Daily Date Badge + Message Banner */}
                    {result.date && (
                        <div className="rounded-[28px] overflow-hidden border border-slate-100 shadow-md">
                            {/* Date Header */}
                            <div className="bg-slate-950 px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-blue-400" />
                                    <span className="text-white font-black text-xs tracking-widest uppercase">오늘의 KBO 운세</span>
                                </div>
                                <span className="text-white/80 text-xs font-bold">
                                    {result.date ? new Date(result.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : ''}
                                </span>
                            </div>
                            {/* Daily Message */}
                            {result.dailyMessage && (
                                <div className="bg-slate-50 px-5 py-4 flex items-start gap-3">
                                    <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-slate-800 font-bold text-sm leading-relaxed">{result.dailyMessage}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Score section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <section 
                            className="rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[200px]"
                            style={{ background: teamInfo ? `linear-gradient(135deg, ${teamInfo.primaryColor} 0%, ${teamInfo.secondaryColor} 100%)` : 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    {teamInfo?.logo && (
                                        <div className="w-10 h-10 bg-white rounded-lg p-1.5 shadow-lg">
                                            <img src={teamInfo.logo} alt={selectedTeam || ''} crossOrigin="anonymous" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <h4 className="font-black text-white/90 tracking-tight text-lg">
                                        {selectedTeam === '없음 (아직 없음)' ? '최적 매칭 구단' : `[${selectedTeam}]`} 궁합
                                    </h4>
                                </div>
                                <div className="flex items-end gap-1">
                                    <span className="text-7xl font-black tracking-tighter">{result.score || 0}</span>
                                    <span className="text-2xl font-bold text-white/70 mb-2">점</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[200px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 opacity-20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10">
                                <h4 className="font-black text-blue-400 mb-4 tracking-tight text-lg flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-blue-400"/> 승리 요정 지수
                                </h4>
                                <div className="flex items-end gap-1">
                                    <span className="text-7xl font-black tracking-tighter text-white">{result.winFairyScore || 0}</span>
                                    <span className="text-2xl font-bold text-slate-400 mb-2">점</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Detailed Analysis */}
                    <section className="bg-slate-50 p-7 sm:p-10 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                            <Sparkles className="w-32 h-32 text-slate-900" />
                        </div>
                        <h5 className="font-black text-slate-900 mb-8 text-xl tracking-tight border-b-2 border-slate-200 pb-5 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" /> 팩트 폭격 심층 분석
                        </h5>
                        <div className="text-slate-700 text-[16px] leading-[1.9] font-medium whitespace-pre-wrap">
                            {result.supportedTeamAnalysis}
                        </div>
                    </section>

                    {/* Infographic 5 Dimensions */}
                    <section className="pt-4">
                        <div className="flex items-center justify-between mb-8">
                            <h5 className="font-black text-slate-900 text-lg flex items-center gap-2">
                                <TrendingUp className="w-6 h-6 text-blue-500" /> 성향 파라미터 그래프
                            </h5>

                        </div>
                        <RadarChart data={result.dimensions || []} />
                    </section>

                    {/* Best & Worst Match */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-8 bg-blue-50 rounded-[32px] border border-blue-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform text-blue-600">
                                <Trophy className="w-16 h-16" />
                            </div>

                            <h5 className="font-black text-blue-900 text-xl mb-3">최강 궁합 구단</h5>
                            <p className="text-blue-600 font-black text-2xl flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-blue-500" /> {result.bestTeam}
                            </p>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform text-slate-400">
                                <X className="w-16 h-16" />
                            </div>

                            <h5 className="font-black text-slate-900 text-xl mb-3">최악 궁합 구단</h5>
                            <p className="text-slate-500 font-black text-2xl flex items-center gap-2">
                                <X className="w-6 h-6 text-slate-300" /> {result.worstTeam}
                            </p>
                        </div>
                    </div>

                    {/* Tomorrow Preview Card */}
                    {(result.tomorrowScore !== undefined || result.tomorrowWinFairyScore !== undefined) && (
                        <div className="rounded-[28px] border border-slate-100 bg-slate-50 overflow-hidden shadow-sm">
                            <div className="px-6 pt-5 pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4 text-blue-500" />
                                        <span className="text-slate-950 font-black text-xs tracking-widest uppercase">내일 미리보기</span>
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold">
                                        {new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/70 rounded-2xl p-4 text-center border border-slate-100">
                                        <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1">내일 궁합</p>
                                        <p className="text-3xl font-black text-slate-900">{result.tomorrowScore ?? '-'}<span className="text-sm text-slate-400 ml-0.5">점</span></p>
                                        <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full transition-all" style={{width: `${result.tomorrowScore ?? 0}%`}} />
                                        </div>
                                    </div>
                                    <div className="bg-white/70 rounded-2xl p-4 text-center border border-slate-100">
                                        <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1">내일 승요</p>
                                        <p className="text-3xl font-black text-slate-900">{result.tomorrowWinFairyScore ?? '-'}<span className="text-sm text-slate-400 ml-0.5">점</span></p>
                                        <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full transition-all" style={{width: `${result.tomorrowWinFairyScore ?? 0}%`}} />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-[10px] font-bold text-center mt-3">* 내일 점수는 오늘 자정 이후 갱신됩니다</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center pt-12 border-t border-slate-100 gap-6 mt-12 bg-slate-50/50 rounded-[40px] p-8">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                            <button
                                onClick={handleShareInstagram}
                                disabled={isSharing}
                                className="flex-1 w-full px-8 py-5 bg-gradient-to-br from-purple-600 to-rose-500 text-white rounded-2xl text-md font-black shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                                인스타 스토리 공유
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 w-full px-8 py-5 bg-slate-900 text-white rounded-2xl text-md font-black shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Download className="w-5 h-5" /> 리포트 다운로드
                            </button>
                        </div>
                        
                        <button
                            onClick={() => { setHasStarted(false); onReset(); }}
                            className="flex items-center gap-2 text-slate-400 text-sm font-bold hover:text-slate-950 transition-colors py-2 px-4 rounded-full border border-transparent hover:border-slate-200"
                        >
                            <Share2 className="w-4 h-4" /> 다른 구단 결과 확인하기
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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-[1000] animate-fade-in p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
                <ServiceNavigation currentService="kbo" onNavigate={onNavigate} onClose={onClose} />

                {/* Aesthetic Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 font-black tracking-[0.2em] text-[10px] uppercase mb-1.5 border border-blue-200 bg-white px-2 py-1 rounded-full w-fit">
                                <BaseballIcon className="w-3 h-3" /> 데일리 KBO 운세
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none mt-4">
                                KBO 팬 궁합
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-6"></div>
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
