import React from 'react';
import { Compass, Plane, Hotel, Ticket, Heart, Sparkles, X } from 'lucide-react';

export type ServiceType = 'fortune' | 'mbti' | 'trip' | 'healing' | 'job' | 'compatibility';

interface ServiceNavigationProps {
    currentService: ServiceType;
    onNavigate: (service: ServiceType) => void;
    onClose: () => void;
}

const services = [
    { id: 'fortune', label: '운세', icon: Sparkles, color: 'text-purple-500' },
    { id: 'mbti', label: '분석', icon: Compass, color: 'text-indigo-500' },
    { id: 'trip', label: '여행', icon: Plane, color: 'text-sky-500' },
    { id: 'healing', label: '힐링', icon: Hotel, color: 'text-teal-500' },
    { id: 'job', label: '직업', icon: Ticket, color: 'text-orange-500' },
    { id: 'compatibility', label: '궁합', icon: Heart, color: 'text-pink-500' },
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
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all
                            ${currentService === s.id
                                ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
                        `}
                    >
                        <s.icon className={`w-3.5 h-3.5 ${currentService === s.id ? 'text-white' : s.color}`} />
                        {s.label}
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
