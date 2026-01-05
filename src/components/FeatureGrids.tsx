import React from 'react';
import { ArrowRight, Sparkles, MapPin, Ticket, Plane, Package, Hotel, Building2, TrainFront, Compass, Utensils, Heart } from 'lucide-react';

const categories = [
    { icon: Sparkles, label: '오늘의운세', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Compass, label: 'MBTI & 사주', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { icon: Plane, label: '궁합여행', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: Hotel, label: '힐링장소', color: 'text-teal-500', bg: 'bg-teal-50' },
    { icon: Ticket, label: '추천직업', color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: Package, label: '운세템', color: 'text-rose-500', bg: 'bg-rose-50' },
    { icon: Building2, label: '커뮤니티', color: 'text-slate-500', bg: 'bg-slate-100' },
];

interface FeatureGridsProps {
    onStart: () => void;
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
}

const FeatureGrids: React.FC<FeatureGridsProps> = ({ onStart, onFortuneClick, onMbtiSajuClick }) => {
    return (
        <div className="section-container !py-4">
            {/* Category Icons Bar (Reference Style) */}
            <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-4">
                {categories.map((cat, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (i === 0) onFortuneClick();
                            else if (i === 1) onMbtiSajuClick();
                            else onStart();
                        }}
                        className="flex flex-col items-center gap-2 min-w-[70px] group"
                    >
                        <div className={`w-14 h-14 ${cat.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                            <cat.icon className={`w-7 h-7 ${cat.color}`} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Banner Grid */}
            <div className="grid md:grid-cols-2 gap-6 mt-12">
                <div
                    onClick={onStart}
                    className="relative h-[280px] rounded-3xl overflow-hidden cursor-pointer group shadow-xl shadow-indigo-100"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-500"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <div className="relative h-full p-8 flex flex-col justify-between text-white">
                        <div>
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase">New Release</span>
                            <h3 className="text-2xl font-bold mt-4 leading-tight">
                                2026년을 미리 보는<br />AI 신년 운세 대공개
                            </h3>
                            <p className="text-white/80 text-sm mt-2 font-medium">지금 내 무의식의 흐름을 확인하세요</p>
                        </div>
                        <div className="flex items-center gap-2 font-bold group-hover:translate-x-2 transition-transform">
                            시작하기 <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div
                        onClick={onStart}
                        className="relative h-[128px] bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col justify-center cursor-pointer hover:bg-white hover:shadow-lg transition-all"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-indigo-500">Event</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">친구와 궁합 확인하고 포인트 받기</h4>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                            </div>
                        </div>
                    </div>
                    <div
                        onClick={onStart}
                        className="relative h-[128px] bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col justify-center cursor-pointer hover:bg-white hover:shadow-lg transition-all"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-teal-500">Hot Tip</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">오늘 나의 행운의 아이템은 무엇?</h4>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <Utensils className="w-6 h-6 text-teal-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeatureGrids;
