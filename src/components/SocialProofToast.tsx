import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Zap } from 'lucide-react';

const activities: { name: string; location: string; action: string; icon: any; color: string }[] = [
    { name: '김*현', location: '서울 강남구', action: '융합 분석 완료', icon: Sparkles, color: 'text-indigo-500' },
    { name: '이*우', location: '부산 해운대구', action: '궁합 진단 중', icon: Zap, color: 'text-purple-500' },
    { name: '박*아', location: '대구 수성구', action: '작명 리포트 다운로드', icon: Users, color: 'text-teal-500' },
    { name: '최*준', location: '인천 연수구', action: '오늘의 운세 확인', icon: Sparkles, color: 'text-amber-500' },
    { name: '정*윤', location: '광주 남구', action: '커리어 전략 수립', icon: Zap, color: 'text-orange-500' },
    { name: '강*훈', location: '대전 유성구', action: '여행지 추천 완료', icon: Sparkles, color: 'text-sky-500' },
];

const SocialProofToast: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const showToast = () => {
            setCurrentIndex((prev) => (prev + 1) % activities.length);
            setIsVisible(true);
            
            setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        };

        // Initial delay
        const initialTimeout = setTimeout(showToast, 3000);

        // Interval
        const interval = setInterval(showToast, 12000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, []);

    const activity = activities[currentIndex] ?? activities[0];
    if (!activity) return null;

    return (
        <div 
            className={`
                fixed bottom-24 left-4 right-4 md:left-6 md:right-auto md:max-w-xs z-[100] transition-all duration-700 transform
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}
            `}
        >
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl p-4 flex items-center gap-4 group hover:scale-[1.02] transition-transform">
                <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0`}>
                    {activity.icon && <activity.icon className={`w-5 h-5 ${activity.color} animate-pulse`} />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Real-time Activity
                    </p>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{activity.name}</span>
                        <span className="text-[10px] text-slate-500">{activity.location}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {activity.action}
                    </p>
                </div>

                <div className="absolute -top-1 -right-1">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>
                        <div className="relative w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialProofToast;
