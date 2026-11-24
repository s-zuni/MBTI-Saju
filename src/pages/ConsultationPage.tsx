import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import KakaoConsultCard from '../components/KakaoConsultCard';

const ConsultationPage: React.FC<{ session?: any }> = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-24 px-4">
            <div className="max-w-xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        홈으로
                    </button>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-black">
                        <Sparkles className="w-3.5 h-3.5" />
                        비회원 가능 · 카카오톡 1:1 전담 상담
                    </span>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-2 text-center">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">1:1 전문가 사주 · MBTI 상담</h1>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                        별도 회원가입 없이 공식 카카오톡 채널로 바로 고민을 접수하고, 전문가 검수 답변을 받아보실 수 있습니다.
                    </p>
                </div>

                <KakaoConsultCard from="consultation_unified" />

                <div className="flex justify-center gap-4 text-xs font-bold text-slate-500 pt-2">
                    <button onClick={() => navigate('/myluck?type=today')} className="hover:text-violet-600 underline">
                        490원·990원 즉시 운세 보기
                    </button>
                    <button onClick={() => navigate('/premium')} className="hover:text-violet-600 underline">
                        3년 심층 리포트 (29,000원)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsultationPage;
