import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, X, Shuffle, ArrowRight, Moon, Compass, Sun } from 'lucide-react';
import { TarotCard, TAROT_DECK } from '../../data/tarotDeck';
import SpreadSelector, { SpreadType } from './SpreadSelector';
import { Tier } from '../../hooks/useSubscription';
import { supabase } from '../../supabaseClient';
import { ServiceType } from '../ServiceNavigation';
import { SERVICE_COSTS } from '../../config/creditConfig';
import { stripMarkdown } from '../../utils/textUtils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { tarotSchema } from '../../config/schemas';

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

const TarotModal: React.FC<TarotModalProps> = ({ isOpen, onClose, tier, onUpgradeRequired, onUseCredit, onNavigate, credits, session }) => {
    const [step, setStep] = useState<'spread' | 'question' | 'shuffle' | 'select' | 'result'>('spread');
    const [selectedSpread, setSelectedSpread] = useState<SpreadType>('daily');
    const [question, setQuestion] = useState("");
    const [deck, setDeck] = useState<TarotCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Streaming Hook
    const { object: reading, submit, isLoading } = useObject({
        api: '/api/tarot',
        schema: tarotSchema,
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` },
    });

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
            setError(null);
            setSelectedSpread('daily');
            setDeck(fisherYatesShuffle(TAROT_DECK));
        }
    }, [isOpen]);

    const handleSpreadSelect = (spread: SpreadType) => {
        setSelectedSpread(spread);
        setSelectedCards([]);
        setError(null);
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
            setTimeout(() => handleAnalyze(newSelection), 600);
        }
    };

    const handleAnalyze = async (cards: TarotCard[]) => {
        if (!question.trim()) {
            setError('질문을 입력해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.TAROT;
        if (credits !== undefined && credits < cost) {
            if (window.confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
                onNavigate ? onNavigate('creditPurchase' as any) : onUpgradeRequired();
                onClose();
            }
            return;
        }

        setStep('result');
        setError(null);

        try {
            if (onUseCredit) {
                const success = await onUseCredit();
                if (!success) {
                    alert("크레딧이 부족합니다.");
                    setStep('select');
                    setSelectedCards([]);
                    return;
                }
            }

            const user = session?.user?.user_metadata || {};
            
            submit({
                question,
                selectedCards: cards,
                spreadType: selectedSpread,
                userContext: {
                    name: user.full_name,
                    mbti: user.mbti,
                    birthDate: user.birth_date
                }
            });

            // Save reading to Supabase (optional)
            if (session) {
                await supabase.from('tarot_readings').insert({
                    user_id: session.user.id,
                    spread_type: selectedSpread,
                    question: question,
                    selected_cards: cards,
                    reading_result: {}
                });
            }

        } catch (error) {
            console.error(error);
            alert("타로 해석 중 오류가 발생했습니다. 다시 시도해 주세요.");
            setStep('select');
            setSelectedCards([]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4 md:p-6">
            <div className="relative w-full max-w-5xl h-[92vh] md:h-[88vh] bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-white/40">
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-50 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-white/80 backdrop-blur-md relative z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Moon className="w-5 h-5 text-white fill-white" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">타로 오라클</h3>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                    <div className="p-8 flex flex-col items-center justify-center min-h-full">
                        {step === 'spread' && (
                            <SpreadSelector onSelect={handleSpreadSelect} tier={tier} onUpgradeRequired={onUpgradeRequired} />
                        )}

                        {step === 'question' && (
                            <div className="w-full max-w-xl text-center animate-fade-up">
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 mb-4">현재 어떤 고민이 있나요?</h2>
                                <p className="text-slate-400 mb-10 font-medium break-keep">질문이 구체적일수록 별들이 더욱 명확한 메시지를 들려줍니다.<br/><span className="text-indigo-500 italic">"한 번에 한 가지 질문에만 집중해보세요."</span></p>
                                <div className="relative mb-10 group">
                                    <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="예: 이번 이직이 저에게 좋은 기회일까요?" className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] px-8 py-6 text-slate-900 placeholder-slate-300 text-lg outline-none focus:border-indigo-100 focus:bg-white focus:shadow-xl transition-all" onKeyDown={(e) => e.key === 'Enter' && handleStart()} />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity"><Shuffle className="w-6 h-6 text-indigo-400" /></div>
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
                                    <div className="absolute inset-0 bg-indigo-600 rounded-2xl rotate-6 translate-x-4 shadow-xl"></div>
                                    <div className="absolute inset-0 bg-purple-600 rounded-2xl -rotate-3 -translate-x-2 shadow-xl"></div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl z-10">
                                        <div className="absolute inset-2 border-2 border-white/20 rounded-xl"></div>
                                        <Moon className="w-16 h-16 text-white/50 animate-pulse fill-white/10" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 animate-pulse">운명의 카드를 배치하는 중...</h3>
                            </div>
                        )}

                        {step === 'select' && (
                            <div className="w-full flex flex-col items-center animate-fade-in">
                                <div className="text-center mb-12">
                                    <h2 className="text-2xl font-black text-slate-900"><span className="text-indigo-600">{getRequiredCardCount()}장</span>의 카드를 선택하세요</h2>
                                    <p className="text-slate-400 mt-2 font-medium">당신의 에너지가 강하게 느껴지는 카드를 뽑아주세요</p>
                                </div>
                                <div className="flex gap-4 mb-14 min-h-[160px] items-center">
                                    {Array.from({ length: getRequiredCardCount() }).map((_, idx) => {
                                        const card = selectedCards[idx];
                                        return (
                                            <div key={idx} className={`w-28 h-40 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden ${card ? 'bg-white border-amber-200 shadow-xl scale-105' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                                                {card ? <div className="text-center relative z-10"><div className="text-3xl mb-2">🃏</div><div className="text-[10px] text-slate-900 font-extrabold px-2 text-center leading-tight tracking-tighter">{card.name}</div></div> : <span className="text-slate-200 font-black text-2xl">{idx + 1}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="w-full max-w-5xl px-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-3">
                                    {deck.map((card) => {
                                        const isSelected = selectedCards.find(c => c.id === card.id);
                                        return (
                                            <button key={card.id} onClick={() => handleCardSelect(card)} disabled={!!isSelected} className={`aspect-[2/3] rounded-xl border shadow-md transition-all duration-500 relative overflow-hidden group ${isSelected ? 'opacity-0 pointer-events-none' : 'hover:-translate-y-3 hover:scale-110 active:scale-95 bg-slate-900 border-indigo-900/50'}`}>
                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent"></div>
                                                <div className="w-full h-full flex items-center justify-center"><Moon className="w-4 h-4 text-amber-500/20" /></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 'result' && (
                            <div className="w-full h-full animate-fade-in">
                                {isLoading && !reading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
                                        <h3 className="text-2xl font-black text-slate-900 mb-3">메시지를 해석하는 중입니다</h3>
                                    </div>
                                ) : reading && (
                                    <div className="max-w-4xl mx-auto py-4">
                                        <div className="text-center mb-16">
                                            <h2 className="text-3xl font-black text-slate-900 mb-6 px-4">"{question}"</h2>
                                            <div className="flex items-center justify-center gap-2 text-slate-300"><Compass className="w-4 h-4" /></div>
                                        </div>
                                        <div className={`grid gap-8 mb-20 ${selectedSpread === 'daily' ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
                                            {reading.cardReadings?.map((card: any, idx: number) => (
                                                <div key={idx} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-xl transition-all h-full">
                                                    <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-6">Position {idx + 1}</div>
                                                    <div className="w-full aspect-[2/3] bg-white rounded-2xl mb-8 flex items-center justify-center relative overflow-hidden shadow-xl border border-amber-100"><div className="text-7xl">🃏</div></div>
                                                    <h4 className="text-xl font-black text-slate-900 mb-4">{card.cardName}</h4>
                                                    <p className="text-sm text-slate-500 leading-relaxed font-medium break-keep">{stripMarkdown(card.interpretation)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-10 mb-20">
                                            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                                                <h4 className="text-2xl font-black mb-8 flex items-center gap-4"><Sparkles className="w-5 h-5 text-indigo-300" /> 별들의 종합 조언</h4>
                                                <p className="text-lg leading-9 text-indigo-50/90 whitespace-pre-wrap font-medium">{stripMarkdown(reading.overallReading)}</p>
                                            </div>
                                            <div className="bg-white p-10 rounded-[3rem] border-4 border-indigo-50 shadow-inner">
                                                <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-4"><Sun className="w-5 h-5 text-indigo-500" /> 실천 가이드</h4>
                                                <p className="text-xl leading-9 text-slate-700 font-bold italic break-keep">"{stripMarkdown(reading.advice)}"</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 justify-center pb-10">
                                            <button onClick={() => { setStep('question'); setQuestion(""); }} className="px-10 py-5 rounded-[1.8rem] bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all border border-slate-100">다시 물어보기</button>
                                            <button onClick={() => setStep('spread')} className="px-10 py-5 rounded-[1.8rem] bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xl transition-all">다른 주제 선택</button>
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

export default TarotModal;
