import React, { useState } from 'react';
import { Heart, X, Loader2 } from 'lucide-react';

interface CompatibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ score: number; desc: string } | null>(null);

    if (!isOpen) return null;

    const handleAnalyze = () => {
        setLoading(true);
        // Mock analysis
        setTimeout(() => {
            setResult({
                score: 88,
                desc: '서로의 부족한 점을 보완해주는 환상의 짝꿍입니다! 특히 가치관이 잘 맞아 깊은 대화가 가능해요.'
            });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50">
                    <div className="flex items-center gap-2">
                        <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                        <h2 className="text-xl font-bold text-slate-800">너와 나의 궁합 분석</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">상대방 이름</label>
                                <input type="text" className="w-full input-primary" placeholder="예: 김철수" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">상대방 MBTI</label>
                                <select className="w-full input-primary">
                                    <option>선택해주세요</option>
                                    <option>ENTP</option>
                                    <option>INFJ</option>
                                    {/* Add more options */}
                                </select>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="w-full btn-primary py-4 text-lg font-bold flex justify-center items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 border-none"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : '궁합 보기'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 animate-fade-up">
                            <div className="w-32 h-32 mx-auto bg-rose-100 rounded-full flex items-center justify-center">
                                <span className="text-5xl font-black text-rose-600">{result.score}점</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">천생연분이에요!</h3>
                                <p className="text-slate-600 leading-relaxed">{result.desc}</p>
                            </div>
                            <button onClick={() => setResult(null)} className="btn-secondary w-full">다시 분석하기</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompatibilityModal;
