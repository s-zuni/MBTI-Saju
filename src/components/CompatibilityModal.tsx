import React, { useState, useEffect } from 'react';
import { Heart, Loader2, User, Users, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDetailedAnalysis } from '../utils/chatService';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { SERVICE_COSTS } from '../config/creditConfig';
import { generatePDF } from '../utils/pdfGenerator';
import { useRef } from 'react';

interface CompatibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (service: ServiceType) => void;
    initialData?: {
        name: string;
        mbti: string;
        birthDate: string;
        birthTime?: string;
        relation?: string;
    } | null;
    onUseCredit?: () => Promise<boolean>;
    credits?: number;
    session: any; // Add session prop
}

const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ isOpen, onClose, onNavigate, initialData, onUseCredit, credits, session: initialSession }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ score: number; desc: string; keywords: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [partnerName, setPartnerName] = useState('');
    const [partnerMbti, setPartnerMbti] = useState('');
    const [partnerBirthDate, setPartnerBirthDate] = useState('');
    const [partnerBirthTime, setPartnerBirthTime] = useState('');
    const [relationshipType, setRelationshipType] = useState('lover');

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
            setError('상대방의 정보를 입력해주세요.');
            return;
        }

        const year = partnerBirthDate?.split('-')[0] || '';
        if (year.length > 4) {
            setError('연도는 4자리(예: 1990)까지만 입력 가능합니다.');
            return;
        }

        setLoading(true);
        setError(null);

        // 1. Credit check first
        const cost = SERVICE_COSTS.COMPATIBILITY_TRIP;
        if (credits !== undefined && credits < cost) {
            setLoading(false);
            if (window.confirm(`크레딧이 부족합니다. (${cost}크레딧이 필요합니다. 충전 페이지로 이동하시겠습니까?)`)) {
                onNavigate('creditPurchase' as any);
                onClose();
            }
            return;
        }

        // We will call onUseCredit after success

        try {
            let currentSession = initialSession;
            if (!currentSession) {
                const { data: { session: fetchedSession } } = await supabase.auth.getSession();
                currentSession = fetchedSession;
            }
            if (!currentSession) throw new Error('로그인이 필요합니다.');

            const user = currentSession.user.user_metadata;
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
                birthTime: partnerBirthTime || null,
                relationshipType
            };

            const data = await getDetailedAnalysis('compatibility', myProfile, partnerProfile, currentSession);
            setResult(data);
            
            // Deduct credit only after success
            if (onUseCredit) {
                const creditSuccess = await onUseCredit();
                if (!creditSuccess) {
                    console.error('Credit deduction failed after successful analysis');
                }
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !result) return;
        try {
            const fileName = `MBTIJU_Compatibility_Report_${new Date().getTime()}`;
            await generatePDF(reportRef.current, fileName);
        } catch (err) {
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setPartnerName(initialData.name);
                setPartnerMbti(initialData.mbti);
                setPartnerBirthDate(initialData.birthDate);
                setPartnerBirthTime(initialData.birthTime || '');
                setRelationshipType(initialData.relation || 'lover');
                setResult(null);
                setError(null);
            } else {
                resetFields();
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in p-4 sm:p-6">
            <div className="relative p-0 border-none w-full max-w-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] bg-white max-h-[94vh] overflow-hidden flex flex-col border border-white/10">
                <ServiceNavigation currentService="compatibility" onNavigate={onNavigate} onClose={onClose} />

                {/* Professional Header */}
                <div className="bg-white px-8 sm:px-12 pt-10 pb-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-rose-500 font-black tracking-[0.2em] text-[10px] mb-1.5">
                                <Heart className="w-4 h-4" /> 관계적 울림
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none">
                                심층 궁합 분석
                            </h3>
                        </div>
                    </div>
                    <div className="h-[2px] w-full bg-slate-950 mt-8"></div>
                </div>

                <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar grow bg-white">
                    <div ref={reportRef} className="bg-white">
                    {!result ? (
                        <div className="space-y-10 animate-fade-up py-4">
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Users className="w-5 h-5 text-rose-500" /> 관계 정보
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {['lover', 'friend', 'colleague', 'family', 'other'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setRelationshipType(type)}
                                            className={`py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${relationshipType === type ? 'bg-slate-950 text-white border-slate-950 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                        >
                                            {type === 'lover' ? '연인' : type === 'friend' ? '친구' : type === 'colleague' ? '동료' : type === 'family' ? '가족' : '기타'}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <User className="w-5 h-5 text-rose-500" /> 상대방 프로필
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 mb-2 ml-1">이름</p>
                                        <input
                                            type="text"
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all"
                                            placeholder="상대방의 이름을 입력하세요"
                                            value={partnerName}
                                            onChange={e => setPartnerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 mb-2 ml-1">MBTI 유형</p>
                                            <select
                                                className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                                value={partnerMbti}
                                                onChange={e => setPartnerMbti(e.target.value)}
                                            >
                                                <option value="">선택</option>
                                                {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 mb-2 ml-1">생년월일</p>
                                            <input
                                                type="date"
                                                className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all"
                                                value={partnerBirthDate}
                                                max="9999-12-31"
                                                onChange={e => setPartnerBirthDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 mb-2 ml-1">태어난 시간 (선택)</p>
                                        <input
                                            type="time"
                                            className="w-full p-4 rounded-2xl bg-slate-50 border-none text-slate-950 font-bold focus:ring-2 focus:ring-slate-200 transition-all"
                                            value={partnerBirthTime}
                                            onChange={e => setPartnerBirthTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="group relative w-full py-5 bg-slate-950 text-white rounded-full text-lg font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-4 overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Heart className="w-6 h-6 fill-rose-500 text-rose-500 group-hover:scale-125 transition-transform" />}
                                    {loading ? '인연의 끈 분석 중...' : '궁합 리포트 생성하기'}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-fade-up">
                            {/* Score & Keywords */}
                            <div className="flex flex-col items-center py-10 bg-slate-50 rounded-[40px] border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500"></div>
                                <div className="text-[10px] font-black text-slate-400 tracking-[0.4em] mb-6">시너지 지수</div>
                                <div className="relative">
                                    <div className="text-8xl sm:text-9xl font-black text-slate-950 tracking-tighter leading-none">{result.score}</div>
                                    <div className="absolute -top-4 -right-12 text-2xl font-black text-rose-500 animate-pulse">%</div>
                                </div>

                                {result.keywords && (
                                    <div className="flex justify-center gap-3 flex-wrap mt-10 px-6">
                                        {result.keywords.split(',').map((k, i) => (
                                            <span key={i} className="px-4 py-2 bg-white text-slate-600 rounded-xl text-xs font-black border border-slate-100 uppercase tracking-widest shadow-sm">
                                                #{k.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Detailed Analysis */}
                            <section className="report-section">
                                <h4 className="report-section-title">
                                    <Sparkles className="w-5 h-5 text-rose-500" /> 운명적 상성과 조언
                                </h4>
                                <div className="report-card p-10">
                                    <p className="text-slate-700 leading-relaxed text-md whitespace-pre-wrap italic">
                                        "{result.desc}"
                                    </p>
                                </div>
                            </section>

                            <div className="flex flex-col items-center pt-10 border-t border-slate-100 gap-4">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="px-10 py-5 bg-slate-950 text-white rounded-full text-md font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                                >
                                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" /> PDF 결과서 다운로드
                                </button>
                                <button
                                    onClick={() => resetFields()}
                                    className="text-slate-400 text-xs font-bold hover:text-slate-950 transition-colors underline underline-offset-4"
                                >
                                    다른 사람과 궁합 보기
                                </button>
                                <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Soul Insight Engine</p>
                            </div>
                        </div>
                    )}
                    </div>

                    {error && (
                        <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-[24px] text-center text-sm font-bold border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompatibilityModal;
