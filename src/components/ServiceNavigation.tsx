import React from 'react';
import { Compass, Plane, PenTool, Heart, X, CircleDot } from 'lucide-react';

export type ServiceType = 'fortune' | 'mbti' | 'trip' | 'naming' | 'kbo' | 'compatibility';

interface ServiceNavigationProps {
    currentService: ServiceType;
    onNavigate: (service: ServiceType) => void;
    onClose: () => void;
}

const services = [
    { id: 'fortune', label: '운세', icon: Compass, color: 'text-purple-500', userCount: '4,200+', isPopular: false },
    { id: 'mbti', label: '융합분석', icon: Compass, color: 'text-indigo-500', userCount: '5,300+', isPopular: true },
    { id: 'trip', label: '여행', icon: Plane, color: 'text-sky-500', userCount: '800+', isPopular: false },
    { id: 'naming', label: '작명', icon: PenTool, color: 'text-teal-500', userCount: '1,200+', isPopular: false },
    { id: 'kbo', label: '야구 궁합', icon: CircleDot, color: 'text-blue-500', userCount: '1,500+', isPopular: true },
    { id: 'compatibility', label: '궁합', icon: Heart, color: 'text-pink-500', userCount: '3,300+', isPopular: true },
] as const;

const ServiceNavigation: React.FC<ServiceNavigationProps> = ({ currentService, onNavigate, onClose }) => {
    return (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-gradient-r md:mask-none">
                {services.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => s.id !== currentService && onNavigate(s.id as ServiceType)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all relative
                            ${currentService === s.id
                                ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
                        `}
                    >
                        <s.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${currentService === s.id ? 'text-white' : s.color}`} />
                        <span className="flex flex-col items-start leading-none">
                            <span className="flex items-center gap-1">
                                {s.label}
                                {s.isPopular && (
                                    <span className="bg-amber-400 text-white text-[10px] px-1 rounded-sm scale-90 origin-left">인기</span>
                                )}
                            </span>
                            <span className={`text-[9px] font-medium ${currentService === s.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                {s.userCount}
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="pl-4 border-l border-slate-200 ml-2">
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ServiceNavigation;
