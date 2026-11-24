import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, Shuffle, ArrowRight, Moon, Instagram } from 'lucide-react';
import { generateImage } from '../utils/exportUtils';
import TarotShareCard from '../components/TarotShareCard';
import { TarotCard, TAROT_DECK } from '../data/tarotDeck';
import SpreadSelector, { SpreadType } from '../components/tarot/SpreadSelector';
import { SERVICE_COSTS } from '../config/creditConfig';
import { stripMarkdown } from '../utils/textUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { tarotSchema } from '../config/schemas';
import { TIERS } from '../hooks/useSubscription';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import FunnelBottomCta from '../components/FunnelBottomCta';
import ReportErrorBoundary from '../components/common/ReportErrorBoundary';
import StreamingStatusBanner from '../components/common/StreamingStatusBanner';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const TarotCardBack = ({ className = "" }: { className?: string }) => (
    <div className={`w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative flex items-center justify-center p-3 border border-purple-500/20 rounded-xl overflow-hidden ${className}`}>
        <div className="absolute inset-1.5 border border-purple-500/10 rounded-lg pointer-events-none"></div>
        <div className="absolute inset-3 border border-purple-500/5 rounded-md pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center gap-1.5 text-purple-300/40">
            <Moon className="w-6 h-6 animate-pulse fill-purple-300/10" />
            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
            <Sparkles className="w-4 h-4 text-amber-300/30" />
        </div>
        <div className="absolute top-2 left-2 w-1 h-1 bg-amber-400/20 rounded-full"></div>
        <div className="absolute top-2 right-2 w-1 h-1 bg-amber-400/20 rounded-full"></div>
        <div className="absolute bottom-2 left-2 w-1 h-1 bg-amber-400/20 rounded-full"></div>
        <div className="absolute bottom-2 right-2 w-1 h-1 bg-amber-400/20 rounded-full"></div>
    </div>
);

// 카드 앞면: 일러스트 + 한글 이름 캡션 (이미지 로드 실패 시 이름만 표시)
const TarotCardFace = ({ card, className = "" }: { card: TarotCard; className?: string }) => {
    const [failed, setFailed] = useState(false);
    return (
        <div className={`w-full h-full bg-gradient-to-br from-slate-50 to-white relative flex flex-col items-center justify-center rounded-xl border border-purple-100/60 shadow-md overflow-hidden ${className}`}>
            {failed ? (
                <div className="flex flex-col items-center justify-center p-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mb-1.5">
                        <Moon className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-[11px] text-slate-800 font-extrabold px-1 text-center leading-tight tracking-tight select-none">
                        {card.name_ko}
                    </div>
                </div>
            ) : (
                <>
                    <img
                        src={card.image}
                        alt={`${card.name_ko} (${card.name})`}
                        loading="lazy"
                        draggable={false}
                        onError={() => setFailed(true)}
                        className="w-full h-full object-cover select-none"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1.5 text-center text-[11px] font-extrabold text-white tracking-tight select-none">
                        {card.name_ko}
                    </div>
                </>
            )}
        </div>
    );
};

// AI가 돌려준 카드 이름으로 실제 카드를 찾고, 못 찾으면 뽑은 순서(index)로 대체
const resolveTarotCard = (cardName: string | undefined, idx: number, picked: TarotCard[]): TarotCard | undefined => {
    const name = (cardName || '').trim().toLowerCase();
    return picked.find(c => c.name_ko === cardName?.trim() || c.name.toLowerCase() === name) ?? picked[idx];
};

const TarotPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { profile, updateProfile } = useGuestProfile();

    const [step, setStep] = useState<'spread' | 'question' | 'shuffle' | 'select' | 'result'>('spread');
    const [selectedSpread, setSelectedSpread] = useState<SpreadType>('daily');
    const [question, setQuestion] = useState("");
    const [deck, setDeck] = useState<TarotCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
    const shareRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [tarotError, setTarotError] = useState<string | null>(null);
    const ticketCheckedRef = useRef(false);
    const receiptTokenRef = useRef<string | null>(null);
    const lastPayloadRef = useRef<any>(null);

    // Streaming Hook
    const { object: reading, submit, isLoading, error: analysisError } = useObject({
        api: '/api/tarot',
        schema: tarotSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: async ({ object, error: validationError }) => {
            if (!object) {
                console.error('[TarotPage] Result validation failed:', validationError);
                setTarotError('타로 해석 결과를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
            } else {
                setTarotError(null);
            }
        },
        onError: (error) => {
            console.error('[TarotPage] Analysis failed:', error);
            setTarotError('타로 해석을 불러오는 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket('TAROT');
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            lastPayloadRef.current = ticket.payload;
            if (ticket.payload.spreadType) setSelectedSpread(ticket.payload.spreadType);
            if (ticket.payload.question) setQuestion(ticket.payload.question);
            if (Array.isArray(ticket.payload.selectedCards)) setSelectedCards(ticket.payload.selectedCards);
            setStep('result');
            submit(ticket.payload);
        }
    }, [submit]);

    const handleRetryReading = () => {
        if (!lastPayloadRef.current) return;
        setTarotError(null);
        submit(lastPayloadRef.current);
    };

    const handleSpreadSelect = (spread: SpreadType) => {
        setSelectedSpread(spread);
        if (spread === 'daily') {
            setStep('shuffle');
            handleShuffle();
        } else {
            setStep('question');
        }
    };

    const handleQuestionSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!question.trim()) {
            alert("질문을 입력해 주세요.");
            return;
        }
        setStep('shuffle');
        handleShuffle();
    };

    const handleStart = () => handleQuestionSubmit();

    const handleShuffle = () => {
        const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
        setDeck(shuffled);
        setSelectedCards([]);
        setTimeout(() => {
            setStep('select');
        }, 1200);
    };

    const getRequiredCardCount = () => {
        return selectedSpread === 'daily' ? 1 : 3;
    };

    const handleCardSelect = (card: TarotCard) => {
        const requiredCount = getRequiredCardCount();
        if (selectedCards.length >= requiredCount) return;
        if (selectedCards.find(c => c.id === card.id)) return;

        const newSelected = [...selectedCards, card];
        setSelectedCards(newSelected);
    };

    const handleAnalyze = async (cards: TarotCard[]) => {
        setIsPaying(true);
        try {
            const res = await startServicePayment({
                serviceType: 'TAROT',
                serviceName: '신비타로 해석',
                returnPath: '/myluck?type=tarot',
                payload: {
                    question,
                    selectedCards: cards,
                    spreadType: selectedSpread,
                    userContext: {
                        name: profile.name,
                        mbti: profile.mbti,
                        birthDate: profile.birthDate
                    }
                },
                customerName: profile.name,
            });
            if (!res.success && res.error_msg) {
                alert(res.error_msg);
            }
        } catch (err) {
            console.error(err);
            alert("결제 준비 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsPaying(false);
        }
    };

    const handleShareInstagram = async () => {
        if (!shareRef.current || !reading) return;
        setIsSharing(true);
        try {
            const fileName = `MBTIJU_Tarot_Story_${new Date().getTime()}`;
            await generateImage(shareRef.current, fileName);
            alert('인스타그램 스토리용 이미지가 다운로드되었습니다.');
        } catch (err) {
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className={isEmbedded ? "pb-12" : "min-h-screen bg-white pb-32"}>
            {/* Header */}

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="relative w-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col min-h-[70vh]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-50 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-50 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    </div>

                    <div className="flex-1 relative z-10">
                        <div className="flex flex-col items-center justify-center min-h-full py-8">
                            {step === 'spread' && (
                                <div className="w-full animate-fade-up space-y-6">
                                    <div className="max-w-2xl mx-auto px-4">
                                        <GuestProfileCard profile={profile} onChange={updateProfile} compact title="내 정보 (타로 개인화용 · 선택)" />
                                    </div>
                                    <SpreadSelector 
                                        onSelect={handleSpreadSelect} 
                                        tier={TIERS.FREE} 
                                        onUpgradeRequired={() => {}} 
                                    />
                                </div>
                            )}

                            {step === 'question' && (
                                <div className="w-full max-w-xl text-center animate-fade-up px-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                                        <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 mb-4">현재 어떤 고민이 있나요?</h2>
                                    <p className="text-slate-400 mb-10 font-medium break-keep">
                                        질문이 구체적일수록 별들이 더욱 명확한 메시지를 들려줍니다.<br/>
                                        <span className="text-purple-500 italic">"한 번에 한 가지 질문에만 집중해보세요."</span>
                                    </p>
                                    <div className="relative mb-10 group">
                                        <input 
                                            type="text" 
                                            value={question} 
                                            onChange={(e) => setQuestion(e.target.value)} 
                                            placeholder="예: 이번 이직이 저에게 좋은 기회일까요?" 
                                            style={{ fontSize: '16px' }}
                                            autoComplete="off"
                                            autoCorrect="off"
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] px-8 py-6 text-slate-900 placeholder-slate-300 text-base md:text-lg outline-none focus:border-purple-100 focus:bg-white focus:shadow-xl transition-all" 
                                            onKeyDown={(e) => e.key === 'Enter' && handleStart()} 
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                                            <Shuffle className="w-6 h-6 text-purple-400" />
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => setStep('spread')} className="px-8 py-5 rounded-[1.5rem] text-slate-400 font-bold hover:bg-slate-50 transition-colors">뒤로가기</button>
                                        <button onClick={handleStart} className="flex-1 bg-slate-900 py-5 rounded-[1.5rem] text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all">운명의 카드 섞기 <ArrowRight className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            )}

                            {step === 'shuffle' && (
                                <div className="text-center animate-fade-in py-10">
                                    <div className="relative w-48 h-72 mx-auto mb-12">
                                        <div className="absolute inset-0 bg-purple-600 rounded-2xl rotate-6 translate-x-4 shadow-xl"></div>
                                        <div className="absolute inset-0 bg-slate-950 rounded-2xl -rotate-3 -translate-x-2 shadow-xl border border-purple-900/50"></div>
                                        <div className="absolute inset-0 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl z-10 border border-purple-500/20">
                                            <div className="absolute inset-2 border-2 border-purple-500/10 rounded-xl"></div>
                                            <Moon className="w-16 h-16 text-purple-500/50 animate-pulse fill-purple-500/10" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 animate-pulse">운명의 카드를 배치하는 중...</h3>
                                </div>
                            )}

                            {step === 'select' && (
                                <div className="w-full flex flex-col items-center animate-fade-in px-4">
                                    <div className="text-center mb-12">
                                        <h2 className="text-2xl font-black text-slate-900"><span className="text-purple-600">{getRequiredCardCount()}장</span>의 카드를 선택하세요</h2>
                                        <p className="text-slate-400 mt-2 font-medium">당신의 에너지가 강하게 느껴지는 카드를 뽑아주세요</p>
                                    </div>
                                    <div className="flex gap-4 mb-10 min-h-[160px] items-center">
                                        {Array.from({ length: getRequiredCardCount() }).map((_, idx) => {
                                            const card = selectedCards[idx];
                                            return (
                                                <div key={idx} className={`w-28 h-40 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden ${card ? 'bg-white border-purple-200 shadow-xl scale-105' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                                                    {card ? <TarotCardFace card={card} /> : <span className="text-slate-200 font-black text-2xl">{idx + 1}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedCards.length === getRequiredCardCount() && (
                                        <div className="mb-10 w-full max-w-md animate-fade-up">
                                            <button
                                                onClick={() => handleAnalyze(selectedCards)}
                                                disabled={isPaying}
                                                className="w-full py-5 bg-slate-950 hover:bg-purple-600 text-white rounded-2xl font-black text-base shadow-xl transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                {isPaying ? '결제창 여는 중...' : `카드 해석 확인하기 (${SERVICE_COSTS.TAROT.toLocaleString()}원 결제)`}
                                            </button>
                                        </div>
                                    )}
                                    <div className="w-full max-w-5xl px-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-3">
                                        {deck.map((card) => {
                                            const isSelected = selectedCards.find(c => c.id === card.id);
                                            return (
                                                <button key={card.id} onClick={() => handleCardSelect(card)} disabled={!!isSelected} className={`aspect-[2/3] rounded-xl border shadow-md transition-all duration-500 relative overflow-hidden group ${isSelected ? 'opacity-0 pointer-events-none' : 'hover:-translate-y-3 hover:scale-110 active:scale-95 bg-slate-900 border-purple-900/50'}`}>
                                                    <TarotCardBack />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {step === 'result' && (
                                <div className="w-full h-full animate-fade-in px-4 max-w-2xl mx-auto space-y-6">
                                    <StreamingStatusBanner
                                        isStreaming={isLoading}
                                        hasData={!!reading}
                                        error={!reading ? (tarotError || analysisError?.message || null) : null}
                                        onRetry={lastPayloadRef.current ? handleRetryReading : () => setStep('spread')}
                                        streamingTitle="결제가 완료되어 뽑으신 타로 카드를 해석하고 있습니다"
                                        streamingSubtitle="카드별 해석이 나오는 대로 아래에 바로 표시됩니다."
                                        completedText="타로 카드 해석이 완료되었습니다."
                                    />

                                    {reading && (
                                        <ReportErrorBoundary onRetry={handleRetryReading}>
                                            <div className="space-y-10 py-2 text-left">
                                                {question && (
                                                    <div className="text-center pb-6 border-b border-stone-200 space-y-1.5">
                                                        <p className="text-sm font-semibold text-purple-800">질문</p>
                                                        <h2
                                                            className="text-2xl sm:text-3xl font-bold text-slate-950 leading-snug break-keep"
                                                            style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
                                                        >
                                                            {question}
                                                        </h2>
                                                    </div>
                                                )}

                                                {/* 1단 수직 카드 해석 (넓은 가독성) */}
                                                {Array.isArray(reading.cardReadings) && reading.cardReadings.length > 0 && (
                                                    <div className="space-y-6">
                                                        {reading.cardReadings.map((card: any, idx: number) => {
                                                            if (!card) return null;
                                                            const face = resolveTarotCard(card.cardName, idx, selectedCards);
                                                            return (
                                                                <div key={idx} className="bg-stone-50/70 rounded-2xl p-6 sm:p-7 border border-stone-200 flex flex-col sm:flex-row gap-6 items-start">
                                                                    <div className="w-36 sm:w-40 aspect-[2/3] bg-white rounded-xl flex items-center justify-center relative overflow-hidden shadow-md border border-stone-200 shrink-0 mx-auto sm:mx-0">
                                                                        {face ? <TarotCardFace card={face} className="border-none" /> : <TarotCardBack className="border-none" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-2.5">
                                                                        <p className="text-sm font-bold text-purple-800">
                                                                            카드 {idx + 1}
                                                                        </p>
                                                                        <h4 className="text-xl font-bold text-slate-950 leading-snug">
                                                                            {stripMarkdown(card.cardName || '')}
                                                                        </h4>
                                                                        {card.interpretation && (
                                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                                                {stripMarkdown(card.interpretation)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {reading.overallReading && (
                                                    <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl text-white border border-slate-800 space-y-3">
                                                        <h4 className="text-xl sm:text-2xl font-bold text-amber-200">
                                                            카드 흐름 종합 리딩
                                                        </h4>
                                                        <p className="text-[15px] sm:text-base leading-[1.9] text-slate-100 whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(reading.overallReading)}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {/* Hidden Instagram sharing card */}
                                                <div className="fixed left-[-9999px] top-[-9999px]">
                                                    {reading && (
                                                        <TarotShareCard
                                                            ref={shareRef}
                                                            reading={reading as any}
                                                            question={question}
                                                            cardImages={((reading as any).cardReadings || []).map((r: any, i: number) => resolveTarotCard(r?.cardName, i, selectedCards)?.image)}
                                                            userName={profile.name || '사용자'}
                                                        />
                                                    )}
                                                </div>

                                                {reading.advice && (
                                                    <div className="bg-[#FAF7F0] p-6 sm:p-8 rounded-2xl border border-[#E6DFD1] space-y-3">
                                                        <h4 className="text-xl sm:text-2xl font-bold text-slate-950">
                                                            현실 조언 및 실천 가이드
                                                        </h4>
                                                        <p className="text-[15px] sm:text-base leading-[1.9] text-slate-800 whitespace-pre-wrap break-keep">
                                                            {stripMarkdown(reading.advice)}
                                                        </p>
                                                    </div>
                                                )}

                                                {!isLoading && (
                                                    <>
                                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                            <button 
                                                                onClick={handleShareInstagram}
                                                                disabled={isSharing}
                                                                className="flex-1 py-4 px-6 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
                                                            >
                                                                {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                                                                결과 이미지 저장
                                                            </button>
                                                            <button onClick={() => setStep('spread')} className="flex-1 py-4 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors">
                                                                다른 주제 선택
                                                            </button>
                                                            <button onClick={() => { setStep('question'); setQuestion(""); }} className="py-4 px-6 rounded-xl bg-stone-100 text-slate-700 font-bold text-sm hover:bg-stone-200 transition-colors">
                                                                다시 물어보기
                                                            </button>
                                                        </div>
                                                        <FunnelBottomCta from="tarot_result" />
                                                    </>
                                                )}
                                            </div>
                                        </ReportErrorBoundary>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TarotPage;
