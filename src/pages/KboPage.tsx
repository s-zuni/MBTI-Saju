import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Instagram, ChevronLeft, CreditCard } from 'lucide-react';
import { generateImage } from '../utils/exportUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { kboSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { stripMarkdown } from '../utils/textUtils';
import { getTeamInfo } from '../config/teamConfig';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import KboShareCard from '../components/KboShareCard';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import FunnelBottomCta from '../components/FunnelBottomCta';
import ReportErrorBoundary from '../components/common/ReportErrorBoundary';
import StreamingStatusBanner from '../components/common/StreamingStatusBanner';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const BaseballIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 2.5a10 10 0 0 1 0 19" />
        <path d="M16 2.5a10 10 0 0 0 0 19" />
    </svg>
);

const RadarChart = ({ data }: { data: any[] }) => {
    const valid = Array.isArray(data) ? data.filter(d => d && typeof d.label === 'string' && typeof d.value === 'number' && !Number.isNaN(d.value)) : [];
    if (valid.length < 3) return null;
    const cx = 150;
    const cy = 150;
    const radius = 100;
    const total = valid.length;

    const getPoint = (index: number, val: number, r: number) => {
        const clamped = Math.min(100, Math.max(0, Number(val) || 0));
        const angle = (index * (360 / total) - 90) * (Math.PI / 180);
        return {
            x: cx + r * (clamped / 100) * Math.cos(angle),
            y: cy + r * (clamped / 100) * Math.sin(angle)
        };
    };

    const gridPoints = [25, 50, 75, 100].map(level => {
        return Array.from({ length: total }).map((_, i) => getPoint(i, 100, level * (radius / 100)));
    });

    const outerGrid = gridPoints[gridPoints.length - 1] || [];
    const dataPoints = Array.from({ length: total }).map((_, i) => getPoint(i, valid[i]?.value || 0, radius));
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
                                {valid[i]?.label || ''}
                            </text>
                            {valid[i]?.value !== undefined && (
                                <text
                                    x={labelX}
                                    y={labelY + 14}
                                    textAnchor={textAnchor}
                                    className="text-[10px] font-black fill-[#000666]"
                                >
                                    {valid[i].value}%
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

const KboPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { profile, updateProfile } = useGuestProfile();
    const navigate = useNavigate();

    const reportRef = useRef<HTMLDivElement>(null);
    const shareRef = useRef<HTMLDivElement>(null);
    const ticketCheckedRef = useRef(false);
    const receiptTokenRef = useRef<string | null>(null);
    const lastPayloadRef = useRef<any>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
    const [genError, setGenError] = useState<string | null>(null);

    const userName = profile.name?.trim() || '이용자';

    const { object: result, submit, isLoading, error: aiError } = useObject({
        api: '/api/analysis-special',
        schema: kboSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: ({ object }) => {
            if (!object) {
                console.error('[KboPage] Result validation failed');
                setGenError('분석 결과를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
            } else {
                setGenError(null);
            }
        },
        onError: (err) => {
            console.error('KBO Analysis Error:', err);
            setGenError('분석 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket('KBO');
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            lastPayloadRef.current = ticket.payload;
            if (ticket.payload.requirements) setSelectedTeam(ticket.payload.requirements);
            setHasStarted(true);
            submit(ticket.payload);
        }
    }, [submit]);

    const handleRetry = () => {
        if (!lastPayloadRef.current) return;
        setGenError(null);
        setError(null);
        submit(lastPayloadRef.current);
    };

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
        if (!profile.birthDate) {
            setError('생년월일을 입력해주세요.');
            return;
        }

        const sajuData = safeCalculateSaju(profile.birthDate, profile.birthTime, profile.gender);
        if (!sajuData) {
            setError('유효한 생년월일(1900~2050년)을 입력해주세요.');
            return;
        }

        setIsPaying(true);
        setError(null);
        setGenError(null);
        try {
            const res = await startServicePayment({
                serviceType: 'KBO',
                serviceName: 'KBO 팬 궁합 분석',
                returnPath: '/myluck?type=kbo',
                payload: {
                    type: 'kbo',
                    name: userName,
                    gender: profile.gender,
                    mbti: profile.mbti || '미입력',
                    birthDate: profile.birthDate,
                    birthTime: profile.birthTime,
                    sajuData,
                    requirements: selectedTeam
                },
                customerName: userName,
            });
            if (!res.success && res.error_msg) {
                setError(res.error_msg);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsPaying(false);
        }
    };

    const handleShareInstagram = async () => {
        if (!shareRef.current || !result) return;
        setIsSharing(true);
        try {
            const fileName = `MBTIJU_KBO_Story_${new Date().getTime()}`;
            await generateImage(shareRef.current, fileName, 2, {
                title: 'KBO 팬궁합 | MBTIJU',
                text: 'MBTIJU에서 확인한 나의 KBO 구단 궁합 결과입니다.',
            });
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다.');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className={isEmbedded ? "pb-12 animate-fade-in font-sans" : "min-h-screen bg-[#F9F7F2] pb-32 pt-20 animate-fade-in font-sans"}>
            <div className="max-w-2xl mx-auto px-4">
                {!isEmbedded && (
                    <div className="flex items-center justify-between mb-8 px-4">
                        <button 
                            onClick={() => hasStarted ? setHasStarted(false) : navigate('/fortune')}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#000666]/10 text-[#000666] rounded-full text-sm font-bold">
                            <CreditCard className="w-4 h-4" />
                            {SERVICE_COSTS.KBO.toLocaleString()}원
                        </div>
                    </div>
                )}

                {!hasStarted ? (
                    <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white p-10 animate-fade-up">
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center gap-2 text-[#000666] font-black tracking-widest text-[10px] uppercase mb-4">
                                <BaseballIcon className="w-5 h-5" /> KBO 팬 궁합
                            </div>
                            <h1 className="text-4xl font-black text-slate-950 tracking-tighter">구단 궁합 분석</h1>
                            <p className="text-slate-400 font-bold mt-3">사주·MBTI를 확인하고 응원 구단을 선택해주세요</p>
                        </div>

                        <div className="mb-8">
                            <GuestProfileCard profile={profile} onChange={updateProfile} compact />
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
                            disabled={isPaying}
                            className="w-full py-6 bg-[#000666] text-white font-black text-xl rounded-[32px] shadow-2xl hover:bg-[#000444] transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <span>궁합 분석 시작하기</span>
                            <span className="text-xs text-[#E5E5E5]/70 font-bold tracking-widest">가입 없이 1회 단품 결제 · 즉시 분석</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-[#F9F7F2] rounded-[48px] overflow-hidden">
                        {/* HIDDEN SHARE CARD */}
                        <div className="fixed left-[-9999px] top-0 pointer-events-none" aria-hidden="true">
                            {result && typeof result.score === 'number' && (
                                <KboShareCard 
                                    ref={shareRef}
                                    result={result as any}
                                    selectedTeam={selectedTeam || ''}
                                    userName={userName}
                                />
                            )}
                        </div>

                        <div ref={reportRef} className="animate-fade-in p-4 sm:p-6 space-y-6">
                            <StreamingStatusBanner
                                isStreaming={isLoading}
                                hasData={!!result}
                                error={!result ? (genError || aiError?.message || null) : null}
                                onRetry={handleRetry}
                                streamingTitle={currentLoadingMessage || '결제가 완료되어 구단 궁합을 실시간으로 작성하고 있습니다'}
                                streamingSubtitle="완성되는 항목부터 아래에 바로 표시됩니다."
                                completedText="KBO 구단 궁합 분석이 완료되었습니다."
                            />

                            {result && (
                                <ReportErrorBoundary onRetry={handleRetry}>
                                    <div className="space-y-8 text-left">
                                        <header className="text-center py-4">
                                            <h1
                                                className="text-2xl sm:text-3xl font-bold text-[#000666] tracking-tight"
                                                style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
                                            >
                                                승리 요정 분석 결과
                                            </h1>
                                        </header>

                                        <main className="space-y-8">
                                            <section className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 flex flex-col items-center space-y-6">
                                                <div className="flex items-center justify-between w-full max-w-sm">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-16 h-16 rounded-full bg-[#000666]/5 flex items-center justify-center border border-stone-200">
                                                            <span className="text-[#000666] font-bold text-2xl">{userName.slice(0, 1)}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{userName}</span>
                                                    </div>

                                                    <span className="text-lg font-bold text-stone-400">×</span>

                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-stone-200 p-2.5 overflow-hidden">
                                                            {getTeamInfo(selectedTeam || '')?.logo ? (
                                                                <img 
                                                                    alt={selectedTeam || ''} 
                                                                    className="w-full h-full object-contain" 
                                                                    src={getTeamInfo(selectedTeam || '')?.logo} 
                                                                />
                                                            ) : (
                                                                <BaseballIcon className="w-8 h-8 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">
                                                            {selectedTeam === '없음 (아직 없음)' ? '추천 구단' : selectedTeam}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-center space-y-1">
                                                    <p className="text-sm font-bold text-[#775a19]">구단 궁합 지수</p>
                                                    <div className="flex items-baseline justify-center gap-1">
                                                        <p className="text-6xl sm:text-7xl font-bold text-[#000666] tracking-tight leading-none">
                                                            {typeof result.score === 'number' ? result.score : '-'}
                                                        </p>
                                                        <span className="text-xl font-bold text-[#000666]/50">%</span>
                                                    </div>
                                                    {result.dailyMessage && (
                                                        <p className="text-base font-semibold text-slate-800 pt-2 break-keep">
                                                            {stripMarkdown(result.dailyMessage)}
                                                        </p>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h3 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                    승리 요정 리포트
                                                </h3>
                                                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-4">
                                                    {typeof result.winFairyScore === 'number' && (
                                                        <p className="text-lg sm:text-xl font-bold text-[#000666]">
                                                            오늘의 승요 지수: <span className="text-[#775a19]">{result.winFairyScore}점</span>
                                                        </p>
                                                    )}
                                                    {result.supportedTeamAnalysis && (
                                                        <div className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(result.supportedTeamAnalysis)}
                                                        </div>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h3 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                    직관 맞춤 가이드
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedTeam === '없음 (아직 없음)' ? (
                                                        <>
                                                            {result.bestTeam && (
                                                                <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-1">
                                                                    <p className="text-sm font-bold text-stone-500">가장 잘 맞는 구단</p>
                                                                    <p className="text-xl font-bold text-[#000666]">{result.bestTeam}</p>
                                                                </div>
                                                            )}
                                                            {result.worstTeam && (
                                                                <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-1">
                                                                    <p className="text-sm font-bold text-stone-500">기운이 부딪히는 구단</p>
                                                                    <p className="text-xl font-bold text-slate-700">{result.worstTeam}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {result.recommendedSeat && (
                                                                <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-2">
                                                                    <h4 className="text-lg font-bold text-[#775a19]">추천 직관 좌석</h4>
                                                                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                                                                        {stripMarkdown(result.recommendedSeat)}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {result.luckyFood && (
                                                                <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-2">
                                                                    <h4 className="text-lg font-bold text-[#775a19]">오늘의 추천 직관 음식</h4>
                                                                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                                                                        {stripMarkdown(result.luckyFood)}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </section>

                                            {Array.isArray(result.dimensions) && result.dimensions.length >= 3 && (
                                                <section className="space-y-4">
                                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-950 pb-2 border-b border-stone-200">
                                                        응원 기운 역량 분석
                                                    </h3>
                                                    <div className="bg-white rounded-2xl p-6 border border-stone-200">
                                                        <RadarChart data={result.dimensions} />
                                                    </div>
                                                </section>
                                            )}

                                            {!isLoading && (
                                                <footer className="pt-4 flex flex-col gap-3">
                                                    <button 
                                                        onClick={handleShareInstagram}
                                                        disabled={isSharing}
                                                        className="w-full bg-[#000666] text-white py-4 rounded-2xl font-bold text-base active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                                    >
                                                        {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                                                        인스타그램 스토리 이미지 저장
                                                    </button>
                                                    <button 
                                                        onClick={() => { setHasStarted(false); setSelectedTeam(null); setGenError(null); }}
                                                        className="w-full text-stone-600 font-bold py-3 text-sm hover:text-[#000666] transition-colors underline underline-offset-4"
                                                    >
                                                        다른 구단 궁합 분석하기
                                                    </button>
                                                    <FunnelBottomCta from="kbo_result" />
                                                </footer>
                                            )}
                                        </main>
                                    </div>
                                </ReportErrorBoundary>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KboPage;
