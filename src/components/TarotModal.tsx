import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, X, Shuffle, ArrowRight } from 'lucide-react';
import { TarotCard, TAROT_DECK } from '../data/tarotDeck';

interface TarotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TarotModal: React.FC<TarotModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<'question' | 'shuffle' | 'select' | 'result'>('question');
    const [question, setQuestion] = useState("");
    const [deck, setDeck] = useState<TarotCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
    const [reading, setReading] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep('question');
            setQuestion("");
            setSelectedCards([]);
            setReading(null);
        }
    }, [isOpen]);

    const handleStart = () => {
        if (!question.trim()) {
            alert("질문을 입력해주세요!");
            return;
        }
        // Shuffle Deck
        const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
        setDeck(shuffled);
        setStep('shuffle');

        // Auto proceed to selection after shuffle animation
        setTimeout(() => {
            setStep('select');
        }, 2000);
    };

    const handleCardSelect = (card: TarotCard) => {
        if (selectedCards.length >= 3) return;
        if (selectedCards.find(c => c.id === card.id)) return;

        const newSelection = [...selectedCards, card];
        setSelectedCards(newSelection);

        if (newSelection.length === 3) {
            setTimeout(() => fetchReading(newSelection), 500);
        }
    };

    const fetchReading = async (cards: TarotCard[]) => {
        setStep('result');
        setLoading(true);
        try {
            const response = await fetch('/api/tarot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    selectedCards: cards
                })
            });

            if (!response.ok) throw new Error("분석 실패");
            const data = await response.json();
            setReading(data);

        } catch (error) {
            console.error(error);
            alert("타로 해석 중 오류가 발생했습니다.");
            setStep('select');
            setSelectedCards([]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-3xl border border-indigo-500/30 overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-indigo-500/20 bg-indigo-950/30">
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" /> AI 타로 상담소
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative">

                    {/* Step 1: Question */}
                    {step === 'question' && (
                        <div className="w-full max-w-lg text-center animate-fade-up">
                            <h2 className="text-3xl font-bold text-white mb-6">무엇이 궁금하신가요?</h2>
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="예: 짝사랑이 이루어질까요? 이직하는 게 좋을까요?"
                                className="w-full bg-white/10 border border-indigo-300/30 rounded-xl p-4 text-white placeholder-indigo-300/50 text-lg mb-8 focus:outline-none focus:border-indigo-400 transition-colors"
                                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                            />
                            <button
                                onClick={handleStart}
                                className="btn-primary w-full py-4 text-xl flex items-center justify-center gap-2"
                            >
                                카트 섞기 <Shuffle className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Shuffle Animation */}
                    {step === 'shuffle' && (
                        <div className="text-center animate-pulse">
                            <div className="w-48 h-72 bg-indigo-600 rounded-xl mx-auto mb-8 shadow-[0_0_50px_rgba(79,70,229,0.5)] rotate-12 transition-transform duration-500">
                                {/* Card Back Image Placeholder */}
                                <div className="w-full h-full bg-[url('/src/assets/tarot_back.png')] bg-cover bg-center rounded-xl border-2 border-indigo-300/30"></div>
                            </div>
                            <h2 className="text-2xl font-bold text-indigo-200">운명을 섞는 중...</h2>
                        </div>
                    )}

                    {/* Step 3: Select Cards */}
                    {step === 'select' && (
                        <div className="w-full h-full flex flex-col items-center">
                            <h2 className="text-xl font-bold text-indigo-200 mb-8">
                                신중하게 3장의 카드를 뽑아주세요 ({selectedCards.length}/3)
                            </h2>

                            {/* Chosen Cards Preview */}
                            <div className="flex gap-4 mb-12 min-h-[120px]">
                                {selectedCards.map((card, idx) => (
                                    <div key={idx} className="w-20 h-32 bg-indigo-800 rounded-lg border border-indigo-400 flex items-center justify-center animate-fade-in">
                                        <span className="text-indigo-200 font-bold text-xs">{idx + 1}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Deck Spread */}
                            <div className="flex flex-wrap justify-center gap-1 max-w-5xl overflow-hidden perspective-1000">
                                {deck.slice(0, 22).map((card) => {
                                    const isSelected = selectedCards.find(c => c.id === card.id);
                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() => handleCardSelect(card)}
                                            disabled={!!isSelected}
                                            className={`w-16 h-24 bg-gradient-to-b from-indigo-700 to-indigo-900 rounded-lg border border-indigo-500/50 transition-all duration-300 hover:-translate-y-4 hover:z-10 cursor-pointer ${isSelected ? 'opacity-0 translate-y-10' : 'hover:shadow-[0_0_15px_rgba(167,139,250,0.5)]'}`}
                                        >
                                            <div className="w-full h-full opacity-50 bg-[url('/src/assets/tarot_back.png')] bg-cover bg-center"></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === 'result' && (
                        <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                                    <p className="text-indigo-200 text-lg">별들의 메시지를 해석하고 있습니다...</p>
                                </div>
                            ) : reading && (
                                <div className="max-w-3xl mx-auto pb-12">
                                    <h2 className="text-2xl font-bold text-white text-center mb-8">"{question}"에 대한 답변</h2>

                                    {/* Cards Reveal */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                        {reading.cardReadings.map((card: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors">
                                                <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-2">
                                                    {idx === 0 ? "과거/상황" : idx === 1 ? "현재/행동" : "미래/결과"}
                                                </div>
                                                <div className="w-full aspect-[2/3] bg-black/30 rounded-lg mb-4 flex items-center justify-center text-4xl">
                                                    🃏
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-2">{card.cardName}</h3>
                                                <p className="text-sm text-indigo-200 leading-relaxed">{card.interpretation}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Analysis */}
                                    <div className="space-y-6">
                                        <div className="bg-indigo-900/40 p-8 rounded-2xl border border-indigo-500/30">
                                            <h3 className="text-xl font-bold text-indigo-100 mb-4 flex items-center gap-2">
                                                <Sparkles className="w-5 h-5 text-yellow-300" /> 종합 해석
                                            </h3>
                                            <p className="text-indigo-100 leading-7 whitespace-pre-wrap">{reading.overallReading}</p>
                                        </div>

                                        <div className="bg-purple-900/40 p-8 rounded-2xl border border-purple-500/30">
                                            <h3 className="text-xl font-bold text-purple-100 mb-4 flex items-center gap-2">
                                                <ArrowRight className="w-5 h-5 text-yellow-300" /> 조언
                                            </h3>
                                            <p className="text-purple-100 leading-7 font-medium">{reading.advice}</p>
                                        </div>
                                    </div>

                                    <div className="mt-12 text-center">
                                        <button onClick={() => { setStep('question'); setQuestion(""); }} className="btn-secondary px-8 py-3 rounded-full">
                                            다른 질문하기
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

export default TarotModal;
