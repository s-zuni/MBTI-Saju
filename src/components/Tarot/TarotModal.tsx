import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, X, Shuffle, ArrowRight, Moon, Compass, Sun } from 'lucide-react';
import { TarotCard, TAROT_DECK } from '../../data/tarotDeck';
import SpreadSelector, { SpreadType } from './SpreadSelector';
import { Tier } from '../../hooks/useSubscription';
import { supabase } from '../../supabaseClient';
import { ServiceType } from '../ServiceNavigation';
import { SERVICE_COSTS } from '../../config/creditConfig';

interface TarotModalProps {
    isOpen: boolean;
    onClose: () => void;
    tier: Tier;
    onUpgradeRequired: () => void;
    onUseCredit?: () => Promise<boolean>;
    onNavigate?: (service: ServiceType) => void;
    credits?: number;
    session: any;
}

const TarotModal: React.FC<TarotModalProps> = ({ isOpen, onClose, tier, onUpgradeRequired, onUseCredit, onNavigate, credits, session: initialSession }) => {
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
            setDeck(fisherYatesShuffle(TAROT_DECK));
        }
    }, [isOpen]);

    const handleSpreadSelect = (spread: SpreadType) => {
        setSelectedSpread(spread);
        setSelectedCards([]);
        setReading(null);
        setStep('question');
    };

    const handleStart = () => {
        if (!question.trim()) {
            alert("무엇이 궁금하신지 질문을 입력해주세요!");
            return;
        }
        setDeck(fisherYatesShuffle(TAROT_DECK));
        setStep('shuffle');

        setTimeout(() => {
            setStep('select');
        }, 2200);
    };

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
            setTimeout(() => fetchReading(newSelection), 600);
        }
    };

    const fetchReading = async (cards: TarotCard[]) => {
        const cost = SERVICE_COSTS.TAROT;
        if (credits !== undefined && credits < cost) {
            if (window.confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
                onNavigate ? onNavigate('creditPurchase' as any) : onUpgradeRequired();
                onClose();
            }
            return;
        }

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

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('tarot_readings').insert({
                    user_id: session.user.id,
                    spread_type: selectedSpread,
                    question: question,
                    selected_cards: cards,
                    reading_result: data
                });
            }

        } catch (error) {
            console.error(error);
            alert("타로 해석 중 오류가 발생했습니다. 다시 시도해 주세요.");
            setStep('select');
            setSelectedCards([]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4 md:p-6">
            <div className="relative w-full max-w-5xl h-[92vh] md:h-[88vh] bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-white/40">
                {/* Mystical Background Decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-50 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-white/80 backdrop-blur-md relative z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Moon className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">타로 오라클</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secret Guidance</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                    <div className="p-8 flex flex-col items-center justify-center min-h-full">

                        {step === 'spread' && (
                            <SpreadSelector
                                onSelect={handleSpreadSelect}
                                tier={tier}
                                onUpgradeRequired={onUpgradeRequired}
                            />
                        )}

                        {step === 'question' && (
                            <div className="w-full max-w-xl text-center animate-fade-up">
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 mb-4">현재 어떤 고민이 있나요?</h2>
                                <p className="text-slate-400 mb-10 font-medium break-keep">
                                    질문이 구체적일수록 별들이 더욱 명확한 메시지를 들려줍니다.<br/>
                                    <span className="text-indigo-500 italic">"한 번에 한 가지 질문에만 집중해보세요."</span>
                                </p>

                                <div className="relative mb-10 group">
                                    <input
                                        type="text"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder="예: 이번 이직이 저에게 좋은 기회일까요?"
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] px-8 py-6 text-slate-900 placeholder-slate-300 text-lg outline-none focus:border-indigo-100 focus:bg-white focus:shadow-[0_10px_30px_rgba(99,102,241,0.06)] transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                                        <Shuffle className="w-6 h-6 text-indigo-400" />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setStep('spread')}
                                        className="px-8 py-5 rounded-[1.5rem] text-slate-400 font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        뒤로가기
                                    </button>
                                    <button
                                        onClick={handleStart}
                                        className="flex-1 bg-slate-900 py-5 rounded-[1.5rem] text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        운명의 카드 섞기 <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'shuffle' && (
                            <div className="text-center animate-fade-in py-10">
                                <div className="relative w-48 h-72 mx-auto mb-12">
                                    <div className="absolute inset-0 bg-indigo-600 rounded-2xl rotate-6 translate-x-4 shadow-xl"></div>
                                    <div className="absolute inset-0 bg-purple-600 rounded-2xl -rotate-3 -translate-x-2 shadow-xl"></div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl z-10">
                                        <div className="absolute inset-2 border-2 border-white/20 rounded-xl"></div>
                                        <Moon className="w-16 h-16 text-white/50 animate-pulse fill-white/10" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 animate-pulse">운명의 카드를 배치하는 중...</h3>
                                <p className="text-slate-400 mt-4 font-bold tracking-widest uppercase text-xs">Mixing the future...</p>
                            </div>
                        )}

                        {step === 'select' && (
                            <div className="w-full flex flex-col items-center animate-fade-in">
                                <div className="text-center mb-12">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        <span className="text-indigo-600">{getRequiredCardCount()}장</span>의 카드를 선택하세요
                                    </h2>
                                    <p className="text-slate-400 mt-2 font-medium">당신의 에너지가 강하게 느껴지는 카드를 뽑아주세요</p>
                                </div>

                                <div className="flex gap-4 mb-14 min-h-[160px] items-center">
                                    {Array.from({ length: getRequiredCardCount() }).map((_, idx) => {
                                        const card = selectedCards[idx];
                                        return (
                                            <div
                                                key={idx}
                                                className={`w-28 h-40 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden
                                                    ${card
                                                        ? 'bg-white border-amber-200 shadow-[0_15px_40px_rgba(245,158,11,0.1)] scale-105'
                                                        : 'bg-slate-50 border-dashed border-slate-200'
                                                    }`}
                                            >
                                                {card ? (
                                                    <div className="text-center relative z-10">
                                                        <div className="text-3xl mb-2 drop-shadow-sm">🃏</div>
                                                        <div className="text-[10px] text-slate-900 font-extrabold px-2 text-center leading-tight tracking-tighter">{card.name}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200 font-black text-2xl">{idx + 1}</span>
                                                )}
                                                {card && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-white pointer-events-none"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="w-full max-w-5xl px-4">
                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-3">
                                        {deck.map((card, idx) => {
                                            const isSelected = selectedCards.find(c => c.id === card.id);
                                            return (
                                                <button
                                                    key={card.id}
                                                    onClick={() => handleCardSelect(card)}
                                                    disabled={!!isSelected}
                                                    className={`
                                                        aspect-[2/3] rounded-xl border shadow-md transition-all duration-500
                                                        relative overflow-hidden group
                                                        ${isSelected
                                                            ? 'opacity-0 pointer-events-none scale-50'
                                                            : 'hover:-translate-y-3 hover:shadow-2xl hover:z-50 hover:border-amber-300/50 cursor-pointer lg:hover:scale-110 active:scale-95'
                                                        }
                                                        bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/50
                                                    `}
                                                >
                                                    {/* Mystical Pattern */}
                                                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent"></div>
                                                    </div>
                                                    
                                                    {/* Gold Border Frame */}
                                                    <div className="absolute inset-1.5 border border-amber-500/30 rounded-lg"></div>
                                                    <div className="absolute inset-2 border border-amber-500/10 rounded-md"></div>
                                                    
                                                    <div className="w-full h-full flex items-center justify-center relative">
                                                        <div className="w-7 h-7 rounded-full border border-amber-500/20 flex items-center justify-center group-hover:border-amber-400/40 transition-colors">
                                                            <Moon className="w-3.5 h-3.5 text-amber-500/30 group-hover:text-amber-400/50 fill-amber-500/10 transition-colors" />
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'result' && (
                            <div className="w-full h-full animate-fade-in relative">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="relative mb-12">
                                            <div className="absolute inset-0 bg-indigo-600 blur-[40px] opacity-20 animate-pulse"></div>
                                            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 mb-3">메시지를 해석하는 중입니다</h3>
                                        <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Divine Interpretation...</p>
                                    </div>
                                ) : reading && (
                                    <div className="max-w-4xl mx-auto py-4">
                                        <div className="text-center mb-16">
                                            <span className="text-[10px] font-black tracking-[0.2em] text-indigo-500 uppercase py-2 px-6 rounded-full bg-indigo-50 border border-indigo-100 mb-6 inline-block">
                                                {SPREADS.find(s => s.id === selectedSpread)?.title}
                                            </span>
                                            <h2 className="text-3xl font-black text-slate-900 mb-6 break-keep leading-tight px-4">"{question}"</h2>
                                            <div className="flex items-center justify-center gap-2 text-slate-300">
                                                <div className="w-3 h-px bg-slate-200"></div>
                                                <Compass className="w-4 h-4" />
                                                <div className="w-3 h-px bg-slate-200"></div>
                                            </div>
                                        </div>

                                        <div className={`grid gap-8 mb-20 ${selectedSpread === 'daily' ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
                                            {reading.cardReadings.map((card: any, idx: number) => (
                                                <div key={idx} className="group flex flex-col animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                    <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-white shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
                                                        <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-6 border-b border-indigo-100 pb-2 inline-block">
                                                            Position {idx + 1}
                                                        </div>

                                                        <div className="w-full aspect-[2/3] bg-gradient-to-br from-slate-50 to-white rounded-2xl mb-8 flex flex-col items-center justify-center relative overflow-hidden shadow-xl border border-amber-100 group-hover:scale-105 transition-transform duration-700">
                                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-100/20 via-transparent to-transparent"></div>
                                                            <div className="text-7xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-700 drop-shadow-md">🃏</div>
                                                            <div className="absolute bottom-4 px-4 py-1 rounded-full bg-amber-900/5 backdrop-blur-md text-amber-900 font-black text-[10px] border border-amber-900/10">
                                                                {card.isReversed ? "역방향" : "정방향"}
                                                            </div>
                                                        </div>

                                                        <h4 className="text-xl font-black text-slate-900 mb-4">{card.cardName}</h4>
                                                        <p className="text-sm text-slate-500 leading-relaxed font-medium break-keep flex-1">{card.interpretation}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-10 mb-20">
                                            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden animate-fade-up">
                                                {/* Decoration */}
                                                <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500 blur-[100px] opacity-20"></div>
                                                
                                                <div className="relative z-10">
                                                    <h4 className="text-2xl font-black mb-8 flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                                                            <Sparkles className="w-5 h-5 text-indigo-300" />
                                                        </div>
                                                        별들의 종합 조언
                                                    </h4>
                                                    <p className="text-lg leading-9 text-indigo-50/90 whitespace-pre-wrap font-medium">{reading.overallReading}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-10 rounded-[3rem] border-4 border-indigo-50 shadow-inner animate-fade-up">
                                                <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                                        <Sun className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                    실천 가이드
                                                </h4>
                                                <p className="text-xl leading-9 text-slate-700 font-bold italic tracking-tight break-keep">"{reading.advice}"</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 justify-center pb-10">
                                            <button 
                                                onClick={() => { setStep('question'); setQuestion(""); }}
                                                className="px-10 py-5 rounded-[1.8rem] bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all border border-slate-100"
                                            >
                                                다시 물어보기
                                            </button>
                                            <button 
                                                onClick={() => setStep('spread')}
                                                className="px-10 py-5 rounded-[1.8rem] bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
                                            >
                                                다른 주제 선택
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SPREADS = [
    { id: 'daily', title: '오늘의 운세' },
    { id: 'love', title: '연애 고민' },
    { id: 'career', title: '취업/이직' }
];

export default TarotModal;
