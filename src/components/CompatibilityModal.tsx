import React, { useState, useEffect } from 'react';
import { Heart, X, Loader2, Calendar, Clock, User, Brain, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface CompatibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ score: number; desc: string; keywords: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Partner Inputs
    const [partnerName, setPartnerName] = useState('');
    const [partnerMbti, setPartnerMbti] = useState('');
    const [partnerBirthDate, setPartnerBirthDate] = useState('');
    const [partnerBirthTime, setPartnerBirthTime] = useState('');
    const [relationshipType, setRelationshipType] = useState('lover'); // lover, friend, family, colleague, other

    const resetFields = () => {
        setPartnerName('');
        setPartnerMbti('');
        setPartnerBirthDate('');
        setPartnerBirthTime('');
        setRelationshipType('lover');
        setResult(null);
        setError(null);
    };

    const handleAnalyze = async () => {
        if (!partnerName || !partnerMbti || !partnerBirthDate) {
            setError('상대방의 정보를 모두 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const user = session.user.user_metadata;
            const myProfile = {
                name: user.full_name,
                mbti: user.mbti,
                birthDate: user.birth_date,
                birthTime: user.birth_time
            };

            const partnerProfile = {
                name: partnerName,
                mbti: partnerMbti,
                birthDate: partnerBirthDate,
                birthTime: partnerBirthTime || null
            };

            const response = await fetch('/api/compatibility', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ myProfile, partnerProfile, relationshipType })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || '분석에 실패했습니다.');
            }

            const data = await response.json();
            setResult(data);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) resetFields();
    }, [isOpen]);

    // Handle Keyboard Events
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter') handleAnalyze();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, partnerName, partnerMbti, partnerBirthDate, partnerBirthTime, relationshipType]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                        <h2 className="text-xl font-bold text-slate-800">너와 나의 궁합 분석</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {!result ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-indigo-500" /> 관계 선택
                                </label>
                                <select
                                    className="input-field appearance-none"
                                    value={relationshipType}
                                    onChange={e => setRelationshipType(e.target.value)}
                                >
                                    <option value="lover">연인</option>
                                    <option value="friend">친구</option>
                                    <option value="colleague">동료</option>
                                    <option value="family">가족</option>
                                    <option value="other">기타</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" /> 상대방 이름
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="예: 김철수"
                                    value={partnerName}
                                    onChange={e => setPartnerName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-indigo-500" /> 상대방 MBTI
                                </label>
                                <select
                                    className="input-field appearance-none"
                                    value={partnerMbti}
                                    onChange={e => setPartnerMbti(e.target.value)}
                                >
                                    <option value="">선택해주세요</option>
                                    {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" /> 상대방 생년월일
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={partnerBirthDate}
                                    onChange={e => setPartnerBirthDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> 상대방 태어난 시간
                                </label>
                                <input
                                    type="time"
                                    className="input-field"
                                    value={partnerBirthTime}
                                    onChange={e => setPartnerBirthTime(e.target.value)}
                                />
                                <p className="text-xs text-slate-400 mt-1 pl-1">시간을 모르면 비워두세요 (정확도 하락)</p>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="w-full btn-primary py-4 text-lg font-bold flex justify-center items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 border-none mt-4"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : '궁합 보기'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 animate-fade-up">
                            <div className="w-32 h-32 mx-auto bg-rose-100 rounded-full flex items-center justify-center relative">
                                <span className="text-4xl font-black text-rose-600">{result.score}점</span>
                                <Heart className="absolute -top-2 -right-2 w-10 h-10 text-rose-500 fill-rose-500 animate-bounce" />
                            </div>

                            {result.keywords && (
                                <div className="flex justify-center gap-2 flex-wrap">
                                    {result.keywords.split(',').map((k, i) => (
                                        <span key={i} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-bold border border-rose-100">
                                            #{k.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left">
                                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-rose-500" /> 상세 분석
                                </h3>
                                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">{result.desc}</p>
                            </div>

                            <button onClick={() => setResult(null)} className="btn-secondary w-full py-3">다른 사람과 다시 분석하기</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompatibilityModal;
