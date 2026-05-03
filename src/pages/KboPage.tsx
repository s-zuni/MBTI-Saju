import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, X, Instagram, ChevronLeft, Coins } from 'lucide-react';
import { generateImage } from '../utils/exportUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { kboSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { getTeamInfo } from '../config/teamConfig';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import KboShareCard from '../components/KboShareCard';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';

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
                {gridPoints.map((points, i) => (
                    <path
                        key={i}
                        d={points.map((p, pi) => `${pi === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                        fill="none"
                        stroke="#e5e5e5"
                        strokeWidth="1"
                    />
                ))}
                {outerGrid.map((p, i) => (
                    <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e5e5" strokeWidth="1" />
                ))}
                <path
                    d={dataPath}
                    fill="none"
                    stroke="#000666"
                    strokeWidth="2"
                />
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#000666" />
                ))}
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
                                className="text-[11px] font-bold fill-slate-500"
                            >
                                {data[i]?.label || ''}
                            </text>
                            {data[i]?.value !== undefined && (
                                <text
                                    x={labelX}
                                    y={labelY + 14}
                                    textAnchor={textAnchor}
                                    className="text-[10px] font-black fill-[#000666]"
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

const KboPage: React.FC = () => {
    const { session, loading: isAuthLoading } = useAuth();
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal } = useModalStore();
    const navigate = useNavigate();

    const reportRef = useRef<HTMLDivElement>(null);
    const shareRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

    const userName = session?.user?.user_metadata?.full_name || '사용자';

    const { object: result, submit, isLoading, error: aiError } = useObject({
        api: '/api/analysis-special',
        schema: kboSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        },
        onFinish: ({ object }) => {
            if (object) {
                consumeCredits('KBO');
            }
        },
        onError: (err) => {
            console.error('KBO Analysis Error:', err);
            setError('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    });

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
            openModal('creditPurchase', undefined, { requiredCredits: cost });
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
                requirements: selectedTeam
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
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다.');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    if (isAuthLoading) return null;
    if (!session) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-[#F9F7F2] pb-32 pt-20 animate-fade-in font-sans">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8 px-4">
                    <button 
                        onClick={() => hasStarted ? setHasStarted(false) : navigate('/fortune')}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#000666]/10 text-[#000666] rounded-full text-sm font-bold">
                        <Coins className="w-4 h-4" />
                        {credits}
                    </div>
                </div>

                {!hasStarted ? (
                    <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white p-10 animate-fade-up">
                        <div className="text-center mb-12">
                            <div className="flex items-center justify-center gap-2 text-[#000666] font-black tracking-widest text-[10px] uppercase mb-4">
                                <BaseballIcon className="w-5 h-5" /> KBO FAN COMPATIBILITY
                            </div>
                            <h1 className="text-4xl font-black text-slate-950 tracking-tighter">구단 궁합 분석</h1>
                            <p className="text-slate-400 font-bold mt-4">응원하는 구단을 선택해주세요</p>
                        </div>

                        <div className="grid grid-cols-2 gap-px bg-slate-100 border-2 border-slate-100 rounded-3xl overflow-hidden mb-12">
                            {KBO_TEAMS.map((team) => {
                                const info = getTeamInfo(team);
                                return (
                                    <button
                                        key={team}
                                        onClick={() => { setError(null); setSelectedTeam(team); }}
                                        className={`px-4 py-8 bg-white transition-all flex flex-col items-center gap-4 ${
                                            selectedTeam === team
                                            ? 'bg-slate-50 ring-2 ring-inset ring-[#000666] z-10'
                                            : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        {info?.logo && (
                                            <div className="w-12 h-12 opacity-90 transition-all">
                                                <img src={info.logo} alt={team} crossOrigin="anonymous" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        <span className={`text-xs font-black tracking-widest uppercase ${selectedTeam === team ? 'text-[#000666]' : 'text-slate-400'}`}>
                                            {team}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <p className="text-red-500 text-center font-bold text-sm mb-8">{error}</p>
                        )}

                        <button
                            onClick={startAnalysis}
                            className="w-full py-6 bg-[#000666] text-white font-black text-xl rounded-[32px] shadow-2xl hover:bg-[#000444] transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-2"
                        >
                            <span>궁합 분석 시작하기</span>
                            <span className="text-xs text-[#E5E5E5]/60 font-bold tracking-widest">{SERVICE_COSTS.KBO} CREDITS</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-[#F9F7F2] rounded-[48px] overflow-hidden">
                        {/* HIDDEN SHARE CARD */}
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

                        <div ref={reportRef} className="animate-fade-in">
                            {aiError && !result ? (
                                <div className="py-20 text-center bg-white rounded-[48px] px-8">
                                    <X className="w-16 h-16 text-red-500 mx-auto mb-6" />
                                    <h3 className="text-2xl font-black text-slate-900 mb-4">분석이 중단되었습니다</h3>
                                    <p className="text-slate-500 mb-12 font-medium">네트워크 상태를 확인하고 다시 시도해주세요.</p>
                                    <button
                                        onClick={() => setHasStarted(false)}
                                        className="px-12 py-5 bg-[#000666] text-white font-black rounded-2xl active:scale-95 transition-all"
                                    >
                                        다시 시도하기
                                    </button>
                                </div>
                            ) : (isLoading || !result || typeof result.score !== 'number') ? (
                                <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[48px]">
                                    <div className="relative mb-24">
                                        <div className="w-24 h-24 border-4 border-slate-100 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 border-4 border-t-[#000666] border-slate-100 rounded-full animate-spin" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-6">
                                        <p className="text-xs font-black text-[#000666] uppercase tracking-[0.4em] animate-pulse">
                                            {result ? '데이터 정밀 분석 중...' : '데이터 연결 중...'}
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight italic break-keep px-10">
                                            "{currentLoadingMessage || '당신과 구단의 운명을 읽는 중입니다'}"
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <header className="text-center py-6">
                                        <h1 className="text-3xl font-black text-[#000666] tracking-tight">승리 요정 분석 결과</h1>
                                        <div className="mt-4 w-12 h-1 bg-[#775a19]/30 mx-auto rounded-full"></div>
                                    </header>

                                    <main className="space-y-8">
                                        <section className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl flex flex-col items-center">
                                            <div className="flex items-center justify-between w-full mb-12">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-24 h-24 rounded-full bg-[#000666]/5 flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
                                                        <span className="text-[#000666] font-black text-3xl">{userName.slice(0, 1)}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-slate-600">{userName}</span>
                                                </div>

                                                <div className="relative flex flex-col items-center">
                                                    <div className="w-14 h-14 rounded-full bg-[#775a19]/10 flex items-center justify-center animate-pulse">
                                                        <svg viewBox="0 0 24 24" fill="#775a19" className="w-8 h-8">
                                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-lg p-4 overflow-hidden">
                                                        {getTeamInfo(selectedTeam || '')?.logo ? (
                                                            <img 
                                                                alt={selectedTeam || ''} 
                                                                className="w-full h-full object-contain" 
                                                                src={getTeamInfo(selectedTeam || '')?.logo} 
                                                            />
                                                        ) : (
                                                            <BaseballIcon className="w-12 h-12 text-slate-200" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black text-slate-600">{selectedTeam === '없음 (아직 없음)' ? '추천 구단' : selectedTeam}</span>
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-[#775a19] text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-60">Compatibility Score</p>
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <p className="text-9xl font-black text-[#000666] tracking-tighter leading-none">
                                                        {result.score}
                                                    </p>
                                                    <span className="text-2xl font-black text-[#000666]/30">%</span>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-[2px] flex-1 bg-[#775a19]/10"></div>
                                                <span className="text-xs font-black text-[#775a19] uppercase tracking-widest">Victory Fairy Report</span>
                                                <div className="h-[2px] flex-1 bg-[#775a19]/10"></div>
                                            </div>
                                            
                                            <div className="bg-white p-10 rounded-[40px] border border-slate-50 shadow-sm text-center">
                                                <p className="text-2xl font-black text-[#000666] mb-6">
                                                    오늘의 승요 지수: <span className="text-[#775a19]">{result.winFairyScore}점</span>
                                                </p>
                                                <div className="text-lg text-slate-600 leading-relaxed font-medium break-keep">
                                                    {result.supportedTeamAnalysis}
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-[2px] flex-1 bg-[#775a19]/10"></div>
                                                <span className="text-xs font-black text-[#775a19] uppercase tracking-widest">Luck Guide</span>
                                                <div className="h-[2px] flex-1 bg-[#775a19]/10"></div>
                                            </div>

                                            <div className="grid gap-6">
                                                {selectedTeam === '없음 (아직 없음)' ? (
                                                    <>
                                                        <div className="bg-white p-8 rounded-[32px] border border-slate-50 flex items-center justify-between shadow-sm">
                                                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">BEST MATCH</span>
                                                            <span className="text-2xl font-black text-[#000666]">{result.bestTeam}</span>
                                                        </div>
                                                        <div className="bg-white p-8 rounded-[32px] border border-slate-50 flex items-center justify-between shadow-sm opacity-60">
                                                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">NEED CAUTION</span>
                                                            <span className="text-2xl font-black text-slate-600">{result.worstTeam}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="bg-white p-8 rounded-[40px] border border-slate-50 space-y-4 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-[#775a19]"></div>
                                                                <span className="text-xs font-black text-[#775a19] uppercase tracking-widest">Recommended Seat</span>
                                                            </div>
                                                            <p className="text-xl text-slate-800 font-black leading-tight break-keep">
                                                                {result.recommendedSeat}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white p-8 rounded-[40px] border border-slate-50 space-y-4 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-[#775a19]"></div>
                                                                <span className="text-xs font-black text-[#775a19] uppercase tracking-widest">Lucky Ballpark Food</span>
                                                            </div>
                                                            <p className="text-xl text-slate-800 font-black leading-tight break-keep">
                                                                {result.luckyFood}
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </section>

                                        <section className="pt-8">
                                            <div className="flex items-center gap-4 mb-10">
                                                <div className="h-[2px] flex-1 bg-slate-200"></div>
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Dimension Analysis</span>
                                                <div className="h-[2px] flex-1 bg-slate-200"></div>
                                            </div>
                                            <div className="bg-white rounded-[48px] p-8 border border-slate-50 shadow-sm">
                                                <RadarChart data={result.dimensions || []} />
                                            </div>
                                        </section>

                                        <footer className="pt-10 flex flex-col gap-4">
                                            <button 
                                                onClick={handleShareInstagram}
                                                disabled={isSharing}
                                                className="w-full bg-[#000666] text-white py-6 rounded-[32px] font-black text-xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                                            >
                                                {isSharing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Instagram className="w-6 h-6" />}
                                                인스타그램 스토리 공유하기
                                            </button>
                                            <button 
                                                onClick={() => { setHasStarted(false); setSelectedTeam(null); }}
                                                className="w-full text-slate-400 font-black py-4 text-xs tracking-widest hover:text-[#000666] transition-colors uppercase underline underline-offset-8"
                                            >
                                                Analyze Different Team
                                            </button>
                                        </footer>
                                    </main>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KboPage;
