import React, { useState } from 'react';
import { ArrowRight, Sparkles, MapPin, Ticket, Plane, Package, Hotel, Building2, TrainFront, Compass, Utensils, Heart, type LucideIcon, Menu, ShoppingBag, MessageSquare, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Original detailed categories
const subCategories = [
    { icon: Sparkles, label: '오늘의운세', sub: '매일 확인하는', color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-100' },
    { icon: Compass, label: 'MBTI & 사주', sub: '나를 알아보는', color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', border: 'border-indigo-100' },
    { icon: Plane, label: '맞춤 여행', sub: '함께 떠나는', color: 'text-sky-600', bg: 'bg-sky-50', hover: 'hover:bg-sky-100', border: 'border-sky-100' },
    { icon: Hotel, label: '힐링장소', sub: '마음의 안식', color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:bg-teal-100', border: 'border-teal-100' },
    { icon: Ticket, label: '추천직업', sub: '나의 천직', color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', border: 'border-orange-100' },
    { icon: Heart, label: '친구 궁합', sub: '우리는 잘 맞을까?', color: 'text-pink-600', bg: 'bg-pink-50', hover: 'hover:bg-pink-100', border: 'border-pink-100' },
];

interface FeatureGridsProps {
    onStart: () => void;
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onTripClick: () => void;
    onHealingClick: () => void;
    onJobClick: () => void;
    onCompatibilityClick: () => void;
}

const FeatureGrids: React.FC<FeatureGridsProps> = ({
    onStart,
    onFortuneClick,
    onMbtiSajuClick,
    onTripClick,
    onHealingClick,
    onJobClick,
    onCompatibilityClick
}) => {
    const navigate = useNavigate();
    const mainCategories = [
        {
            icon: Sparkles,
            label: '운세 보기',
            sub: '다양한 운세 확인',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            hover: 'hover:bg-indigo-100',
            border: 'border-indigo-100',
            action: () => navigate('/fortune')
        },
        {
            icon: ShoppingBag,
            label: '운세템',
            sub: '행운의 아이템',
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            hover: 'hover:bg-rose-100',
            border: 'border-rose-100',
            action: () => alert('준비 중인 기능입니다.')
        },
        {
            icon: Users,
            label: '커뮤니티',
            sub: '함께 나누는 이야기',
            color: 'text-slate-600',
            bg: 'bg-slate-50',
            hover: 'hover:bg-slate-100',
            border: 'border-slate-100',
            action: () => navigate('/community')
        },
    ];

    return (
        <div className="section-container !py-8">
            {/* Main 3 Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {mainCategories.map((cat, i) => (
                    <button
                        key={i}
                        onClick={cat.action}
                        className={`
                            relative h-48 p-8 rounded-3xl text-left transition-all duration-300 group
                            ${cat.bg} ${cat.hover} border ${cat.border}
                            hover:shadow-xl hover:-translate-y-1
                            flex flex-col justify-between
                        `}
                    >
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <p className={`text-sm font-semibold opacity-70 mb-2 ${cat.color.replace('600', '700')}`}>
                                    {cat.sub}
                                </p>
                                <h3 className={`text-2xl font-black ${cat.color.replace('600', '900')}`}>
                                    {cat.label}
                                </h3>
                            </div>
                            <div className={`
                                w-14 h-14 rounded-full bg-white/60 flex items-center justify-center 
                                backdrop-blur-sm transition-transform group-hover:scale-110 shadow-sm
                            `}>
                                <cat.icon className={`w-7 h-7 ${cat.color}`} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <div className={`
                                p-3 rounded-full bg-white/40
                                group-hover:bg-white/80 transition-colors
                            `}>
                                <ArrowRight className={`w-5 h-5 ${cat.color}`} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FeatureGrids;
