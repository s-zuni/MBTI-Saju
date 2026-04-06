import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2, Sparkles, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CompatibilityModal from '../components/CompatibilityModal';
import { ServiceType } from '../components/ServiceNavigation';

interface RelationshipPageProps {
    session: any;
}

const MBTI_LIST = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const BIRTH_TIME_SLOTS = [
    { value: '', label: '시간 모름' },
    { value: '23:00-01:00', label: '자시 (23:00~01:00)' },
    { value: '01:00-03:00', label: '축시 (01:00~03:00)' },
    { value: '03:00-05:00', label: '인시 (03:00~05:00)' },
    { value: '05:00-07:00', label: '묘시 (05:00~07:00)' },
    { value: '07:00-09:00', label: '진시 (07:00~09:00)' },
    { value: '09:00-11:00', label: '사시 (09:00~11:00)' },
    { value: '11:00-13:00', label: '오시 (11:00~13:00)' },
    { value: '13:00-15:00', label: '미시 (13:00~15:00)' },
    { value: '15:00-17:00', label: '신시 (15:00~17:00)' },
    { value: '17:00-19:00', label: '유시 (17:00~19:00)' },
    { value: '19:00-21:00', label: '술시 (19:00~21:00)' },
    { value: '21:00-23:00', label: '해시 (21:00~23:00)' },
];

const RelationshipPage: React.FC<RelationshipPageProps> = ({ session: initialSession }) => {
    const navigate = useNavigate();

    // 상대방 정보 입력 상태
    const [targetName, setTargetName] = useState('');
    const [targetMbti, setTargetMbti] = useState('');
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [formError, setFormError] = useState('');

    // 궁합 Modal 상태
    const [showCompModal, setShowCompModal] = useState(false);
    const [credits, setCredits] = useState<number | undefined>(undefined);

    useEffect(() => {
        const fetchCredits = async () => {
            try {
                let currentSession = initialSession;
                if (!currentSession) {
                    const { data: { session } } = await supabase.auth.getSession();
                    currentSession = session;
                }
                if (currentSession?.user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('credits')
                        .eq('id', currentSession.user.id)
                        .single();
                    if (data) setCredits(data.credits);
                }
            } catch (err) {
                console.error('RelationshipPage fetchCredits error', err);
            }
        };
        fetchCredits();
    }, [initialSession]);

    const handleNavigate = (service: ServiceType) => {
        setShowCompModal(false);
        navigate('/', { state: { openService: service } });
    };

    const handleStartAnalysis = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!targetName.trim()) {
            setFormError('상대방 이름을 입력해주세요.');
            return;
        }
        if (!targetMbti || targetMbti.length !== 4) {
            setFormError('상대방 MBTI를 선택해주세요.');
            return;
        }
        if (!targetBirthDate) {
            setFormError('상대방 생년월일을 입력해주세요.');
            return;
        }

        // 모달 열기 → CompatibilityModal이 자체적으로 분석 처리
        setShowCompModal(true);
    };

    // CompatibilityModal에 pre-filled data 전달을 위한 세션 확장
    const enrichedSession = initialSession
        ? {
            ...initialSession,
            _prefill: {
                targetName,
                targetMbti,
                targetBirthDate,
                targetBirthTime,
            }
        }
        : initialSession;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-rose-50/30 pb-24 pt-14 md:pt-20 animate-fade-in">
            <div className="max-w-lg mx-auto px-6">
                {/* 헤더 */}
                <div className="text-center mb-10 pt-4">
                    <div className="inline-flex items-center gap-2 text-rose-500 font-black tracking-widest text-[10px] uppercase mb-3">
                        <Heart className="w-4 h-4 fill-rose-500" /> Destiny Harmony
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">심층 궁합 분석</h1>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        MBTI × 사주 명리학을 융합하여<br />
                        두 사람의 인연을 냉철하게 진단합니다.
                    </p>
                </div>

                {/* 입력 폼 */}
                <form onSubmit={handleStartAnalysis} className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-100/60 p-8 space-y-6">
                    {/* 배지 */}
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">상대방 정보 입력</span>
                    </div>

                    {/* 이름 */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                            상대방 이름 <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={targetName}
                            onChange={(e) => setTargetName(e.target.value)}
                            placeholder="이름을 입력하세요"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all"
                            maxLength={10}
                        />
                    </div>

                    {/* MBTI */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                            상대방 MBTI <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {MBTI_LIST.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setTargetMbti(m)}
                                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                                        targetMbti === m
                                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105'
                                            : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        {targetMbti && (
                            <p className="text-xs text-center text-rose-500 font-bold mt-1">선택됨: {targetMbti}</p>
                        )}
                    </div>

                    {/* 생년월일 */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                            상대방 생년월일 <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={targetBirthDate}
                            onChange={(e) => setTargetBirthDate(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all"
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* 태어난 시간 */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                            태어난 시간 <span className="text-slate-300">(선택)</span>
                        </label>
                        <select
                            value={targetBirthTime}
                            onChange={(e) => setTargetBirthTime(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all"
                        >
                            {BIRTH_TIME_SLOTS.map((slot) => (
                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 font-medium">태어난 시간을 알면 더 정확한 분석이 가능합니다.</p>
                    </div>

                    {/* 에러 메시지 */}
                    {formError && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                            <p className="text-red-600 text-sm font-bold">{formError}</p>
                        </div>
                    )}

                    {/* 제출 버튼 */}
                    <button
                        type="submit"
                        className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Heart className="w-5 h-5 fill-white" />
                        궁합 분석 시작하기
                    </button>

                    {/* 크레딧 안내 */}
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-bold">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        분석에 크레딧이 사용됩니다
                        {credits !== undefined && <span className="text-indigo-500">· 보유: {credits}크레딧</span>}
                    </div>
                </form>

                {/* 안내 텍스트 */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        본 분석은 MBTI 심리 유형론과 사주 명리학을<br />
                        교차 분석하여 제공하는 콘텐츠입니다.
                    </p>
                </div>
            </div>

            {/* 궁합 모달 - pre-filled 상태로 열림 */}
            <CompatibilityModal
                isOpen={showCompModal}
                onClose={() => setShowCompModal(false)}
                onNavigate={handleNavigate}
                session={enrichedSession}
                credits={credits}
                prefillData={{
                    targetName,
                    targetMbti,
                    targetBirthDate,
                    targetBirthTime,
                }}
            />
        </div>
    );
};

export default RelationshipPage;
