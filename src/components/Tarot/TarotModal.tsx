import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, X, Shuffle, ArrowRight } from 'lucide-react';
import { TarotCard, TAROT_DECK } from '../../data/tarotDeck';
import SpreadSelector, { SpreadType } from './SpreadSelector';
import { Tier } from '../../hooks/useSubscription';
import { supabase } from '../../supabaseClient';

interface TarotModalProps {
    isOpen: boolean;
    onClose: () => void;
    tier: Tier;
    onUpgradeRequired: () => void;
    onUseCredit?: () => Promise<boolean>;
    session: any; // Add session prop
}

const TarotModal: React.FC<TarotModalProps> = ({ isOpen, onClose, tier, onUpgradeRequired, onUseCredit, session: initialSession }) => {
    // New Steps: spread -> question -> shuffle -> select -> result
    const [step, setStep] = useState<'spread' | 'question' | 'shuffle' | 'select' | 'result'>('spread');
    const [selectedSpread, setSelectedSpread] = useState<SpreadType>('daily');
    const [question, setQuestion] = useState("");
    const [deck, setDeck] = useState<TarotCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
    const [reading, setReading] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [userContext, setUserContext] = useState<{ mbti?: string, birthDate?: string, name?: string }>({});

    useEffect(() => {
        const fetchUserContext = async () => {
            let currentSession = initialSession;
            if (!currentSession) {
                const { data: { session: fetchedSession } } = await supabase.auth.getSession();
                currentSession = fetchedSession;
            }
            if (currentSession?.user?.user_metadata) {
                const { mbti, birth_date, full_name } = currentSession.user.user_metadata;
                setUserContext({ mbti, birthDate: birth_date, name: full_name });
            }
        };
        fetchUserContext();
    }, [initialSession]);

    const fisherYatesShuffle = (array: TarotCard[]): TarotCard[] => {
        const shuffled: TarotCard[] = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i] as TarotCard;
            shuffled[i] = shuffled[j] as TarotCard;
            shuffled[j] = temp;
        }
        return shuffled;
    };

    useEffect(() => {
        if (isOpen) {
            setStep('spread');
            setQuestion("");
            setSelectedCards([]);
            setReading(null);
            setSelectedSpread('daily');
            // 모달이 열릴 때마다 덱을 랜덤으로 셔플
            setDeck(fisherYatesShuffle(TAROT_DECK));
        }
    }, [isOpen]);

    const handleSpreadSelect = (spread: SpreadType) => {
        setSelectedSpread(spread);
        setSelectedCards([]); // Reset cards when changing spread
        setReading(null);     // Reset reading when changing spread
        setStep('question');
    };

    const handleStart = () => {
        if (!question.trim()) {
            alert("질문을 입력해주세요!");
            return;
        }
        // Shuffle Deck (Fisher-Yates)
        setDeck(fisherYatesShuffle(TAROT_DECK));
        setStep('shuffle');

        // Auto proceed to selection after shuffle animation
        setTimeout(() => {
            setStep('select');
        }, 2000);
    };

    // Determine how many cards to pick based on spread
    const getRequiredCardCount = () => {
        switch (selectedSpread) {
            case 'daily': return 1;
            case 'love': return 3;
            case 'career': return 3;
            default: return 3;
        }
    };

    const handleCardSelect = (card: TarotCard) => {
        const requiredCount = getRequiredCardCount();
        if (selectedCards.length >= requiredCount) return;
        if (selectedCards.find(c => c.id === card.id)) return;

        const newSelection = [...selectedCards, card];
        setSelectedCards(newSelection);

        if (newSelection.length === requiredCount) {
            setTimeout(() => fetchReading(newSelection), 500);
        }
    };

    const fetchReading = async (cards: TarotCard[]) => {
        setStep('result');
        setLoading(true);

        if (onUseCredit) {
            const success = await onUseCredit();
            if (!success) {
                alert("크레딧이 부족합니다.");
                setStep('select');
                setSelectedCards([]);
                setLoading(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/tarot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    selectedCards: cards,
                    spreadType: selectedSpread,
                    userContext
                })
            });

            if (!response.ok) throw new Error("분석 실패");
            const data = await response.json();
            setReading(data);

            // Save to Supabase (History)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('tarot_readings').insert({
                    user_id: session.user.id,
                    spread_type: selectedSpread,
                    question: question,
                    selected_cards: cards,
                    reading_result: data
                }).then(({ error }) => {
                    if (error) console.error("Failed to save reading:", error);
                });
            }

        } catch (error) {
            console.error(error);
            alert("타로 해석 중 오류가 발생했습니다.");
            setStep('select');
            setSelectedCards([]); // Reset selection on error
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 blur-[100px] rounded-full"></div>
            </div>

            <div className="relative w-full max-w-5xl h-[95vh] bg-slate-900/80 rounded-3xl border border-indigo-500/30 overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-indigo-500/20 bg-indigo-950/30 relative z-10">
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" /> 타로 상담소
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative z-10">

                    {/* Step 0: Spread Selection */}
                    {step === 'spread' && (
                        <SpreadSelector
                            onSelect={handleSpreadSelect}
                            tier={tier}
                            onUpgradeRequired={onUpgradeRequired}
                        />
                    )}

                    {/* Step 1: Question */}
                    {step === 'question' && (
                        <div className="w-full max-w-lg text-center animate-fade-up">
                            <h2 className="text-3xl font-bold text-white mb-6">무엇이 궁금하신가요?</h2>
                            <p className="text-indigo-200 mb-8 font-medium">
                                {selectedSpread === 'daily' && "오늘 하루, 나에게 필요한 조언은?"}
                                {selectedSpread === 'love' && "그 사람의 속마음이 궁금한가요?"}
                                {selectedSpread === 'career' && "이직, 취업, 사업... 나의 성공 운은?"}
                            </p>

                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="구체적으로 질문할수록 정확도가 높아집니다."
                                className="w-full bg-white/5 border border-indigo-300/30 rounded-xl p-5 text-white placeholder-indigo-300/30 text-lg mb-8 focus:outline-none focus:border-indigo-400/80 focus:ring-1 focus:ring-indigo-400/80 transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('spread')}
                                    className="px-6 py-4 rounded-xl text-indigo-300 hover:bg-white/5 transition-colors"
                                >
                                    이전
                                </button>
                                <button
                                    onClick={handleStart}
                                    className="btn-primary flex-1 py-4 text-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                                >
                                    카드 섞기 <Shuffle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Shuffle Animation */}
                    {step === 'shuffle' && (
                        <div className="text-center animate-pulse">
                            <div className="w-48 h-72 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl mx-auto mb-8 shadow-[0_0_50px_rgba(79,70,229,0.5)] rotate-12 transition-transform duration-500 relative group">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
                                <div className="absolute inset-2 border border-white/20 rounded-lg"></div>
                                <div className="w-full h-full flex items-center justify-center">
                                    <Sparkles className="w-12 h-12 text-white/50 animate-spin-slow" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-indigo-200">운명을 섞는 중...</h2>
                            <p className="text-indigo-400/60 mt-2">잠시만 기다려주세요</p>
                        </div>
                    )}

                    {/* Step 3: Select Cards */}
                    {step === 'select' && (
                        <div className="w-full h-full flex flex-col items-center">
                            <h2 className="text-xl font-bold text-indigo-200 mb-8">
                                신중하게 <span className="text-white">{getRequiredCardCount()}장</span>의 카드를 뽑아주세요
                                ({selectedCards.length}/{getRequiredCardCount()})
                            </h2>

                            {/* Chosen Cards Preview */}
                            <div className="flex gap-4 mb-12 min-h-[140px] items-center">
                                {Array.from({ length: getRequiredCardCount() }).map((_, idx) => {
                                    const card = selectedCards[idx];
                                    return (
                                        <div
                                            key={idx}
                                            className={`w-24 h-36 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                                                ${card
                                                    ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                                                    : 'bg-white/5 border-dashed border-white/20'
                                                }`}
                                        >
                                            {card ? (
                                                <div className="text-center">
                                                    <div className="text-2xl mb-1">🃏</div>
                                                    <div className="text-[10px] text-white font-bold px-1 truncate max-w-[80px]">{card.name}</div>
                                                </div>
                                            ) : (
                                                <span className="text-white/20 font-bold text-xl">{idx + 1}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Deck Spread - Grid pattern */}
                            <div className="w-full max-w-5xl overflow-y-auto pb-12 custom-scrollbar px-4">
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2 sm:gap-4 pt-8 pb-4">
                                    {deck.map((card, idx) => {
                                        const isSelected = selectedCards.find(c => c.id === card.id);
                                        return (
                                            <button
                                                key={card.id}
                                                onClick={() => handleCardSelect(card)}
                                                disabled={!!isSelected}
                                                className={`
                                                    aspect-[2/3] rounded-lg border border-white/10 shadow-lg transition-all duration-300
                                                    bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative group
                                                    ${isSelected
                                                        ? 'opacity-0 pointer-events-none scale-50'
                                                        : 'hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:z-50 hover:scale-110 cursor-pointer'
                                                    }
                                                `}
                                            >
                                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay rounded-lg"></div>
                                                <div className="absolute inset-1 border border-white/5 rounded-md"></div>
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Sparkles className="w-4 h-4 text-indigo-300/30" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === 'result' && (
                        <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
                                        <Loader2 className="w-16 h-16 text-indigo-300 animate-spin relative z-10" />
                                    </div>
                                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200 mt-8 mb-2">
                                        별들의 메시지를 해석하고 있습니다...
                                    </p>
                                    <p className="text-indigo-400/60 text-sm">잠시만 기다려주세요</p>
                                </div>
                            ) : reading && (
                                <div className="max-w-4xl mx-auto pb-12">
                                    <div className="text-center mb-12">
                                        <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-sm font-bold mb-4">
                                            {SPREADS.find(s => s.id === selectedSpread)?.title}
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-2">"{question}"</h2>
                                        <div className="h-1 w-20 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto mt-6"></div>
                                    </div>

                                    {/* Cards Reveal */}
                                    <div className={`grid gap-6 mb-12 ${selectedSpread === 'daily' ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
                                        {reading.cardReadings.map((card: any, idx: number) => (
                                            <div key={idx} className="group relative perspective-1000">
                                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                    <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-3">
                                                        {/* Fallback to index if spread specific labels aren't returned yet, though they should be in cardReadings usually or inferred */}
                                                        CARD {idx + 1}
                                                    </div>

                                                    <div className="w-full aspect-[2/3] bg-black/40 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-shadow">
                                                        {/* Placeholder for Card Image - would use card.id to load asset */}
                                                        <div className="text-6xl animate-float">🃏</div>
                                                        <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white font-bold text-sm">
                                                            {card.isReversed ? "역방향" : "정방향"}
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-white mb-2">{card.cardName}</h3>
                                                    <p className="text-sm text-indigo-200/80 leading-relaxed">{card.interpretation}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Analysis */}
                                    <div className="space-y-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                                        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 p-8 rounded-3xl border border-indigo-500/30 shadow-xl">
                                            <h3 className="text-xl font-bold text-indigo-100 mb-6 flex items-center gap-3">
                                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                                    <Sparkles className="w-5 h-5 text-indigo-300" />
                                                </div>
                                                종합 해석
                                            </h3>
                                            <p className="text-indigo-100/90 leading-8 whitespace-pre-wrap">{reading.overallReading}</p>
                                        </div>

                                        <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 p-8 rounded-3xl border border-purple-500/30 shadow-xl">
                                            <h3 className="text-xl font-bold text-purple-100 mb-6 flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                                    <ArrowRight className="w-5 h-5 text-purple-300" />
                                                </div>
                                                조언
                                            </h3>
                                            <p className="text-purple-100/90 leading-8 font-medium">{reading.advice}</p>
                                        </div>
                                    </div>

                                    <div className="mt-12 text-center flex gap-4 justify-center">
                                        <button onClick={() => { setStep('question'); setQuestion(""); }} className="btn-secondary px-8 py-3 rounded-full border-white/10 hover:bg-white/10">
                                            같은 스프레드로 다시
                                        </button>
                                        <button onClick={() => { setStep('spread'); }} className="btn-primary px-8 py-3 rounded-full shadow-lg shadow-indigo-500/20">
                                            다른 스프레드 선택
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for Spread Title Display in Result
const SPREADS = [
    { id: 'daily', title: '오늘의 운세' },
    { id: 'love', title: '연애 고민' },
    { id: 'career', title: '취업/이직' }
];

export default TarotModal;
