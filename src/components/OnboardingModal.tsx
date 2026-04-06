import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckPlans: () => void;
    userName?: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onCheckPlans, userName }) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setAnimate(true), 100);
        }
    }, [isOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500" onClick={onClose} />

            <div className={`
                relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl 
                transform transition-all duration-700
                ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
            `}>
                {/* Decorative Background */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-indigo-600 to-purple-700"></div>
                <div className="absolute top-0 right-0 p-3 z-10">
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative pt-10 px-8 pb-8 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 relative z-10">
                        <Sparkles className="w-10 h-10 text-indigo-600 fill-indigo-100" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        환영합니다{userName ? `, ${userName}님` : ''}!
                    </h2>
                    <p className="text-slate-500 mb-4 leading-relaxed">
                        사주와 MBTI 전문가가 당신의 운명을 분석할 준비를 마쳤습니다.
                    </p>

                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 mb-6 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-12 h-12 bg-indigo-200/30 rounded-full blur-xl"></div>
                        <p className="text-slate-700 font-bold text-sm">
                            사주, MBTI 분석부터 신비타로까지<br />
                            당신만을 위한 맞춤 운세 브리핑이 제공됩니다.
                        </p>
                        <p className="text-slate-500 text-xs mt-2 font-semibold">
                            지금 가입 축하 <span className="text-indigo-600 font-bold">10 크레딧</span>이 지급되었습니다!<br />
                            다양한 운세 서비스를 바로 이용해 보세요.
                        </p>
                    </div>

                    <div className="w-full space-y-3">
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold font-lg shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <span>내 운명 분석 리포트 확인하기</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                onCheckPlans();
                            }}
                            className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors text-sm"
                        >
                            크레딧 더 충전하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
