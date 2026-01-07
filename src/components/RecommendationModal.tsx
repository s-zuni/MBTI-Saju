import React, { useState, useEffect } from 'react';
import { X, MapPin, Briefcase } from 'lucide-react';

interface RecommendationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'travel' | 'career';
}

const RecommendationModal: React.FC<RecommendationModalProps> = ({ isOpen, onClose, initialTab = 'travel' }) => {
    const [activeTab, setActiveTab] = useState<'travel' | 'career'>(initialTab);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-up max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('travel')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'travel' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                            맞춤 여행지
                        </button>
                        <button
                            onClick={() => setActiveTab('career')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'career' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                            추천 커리어
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {activeTab === 'travel' ? (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">당신을 위한 힐링 여행지</h3>
                                <p className="text-slate-500 mt-2">자유로운 영혼을 가진 당신에게 딱 맞는 장소입니다.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="group cursor-pointer">
                                    <div className="bg-slate-200 rounded-2xl h-40 mb-3 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-slate-800">국내</span>
                                    </div>
                                    <h4 className="font-bold text-lg text-slate-800">제주도 월정리 해변</h4>
                                    <p className="text-sm text-slate-500">탁 트인 바다와 예쁜 카페 거리</p>
                                </div>
                                <div className="group cursor-pointer">
                                    <div className="bg-slate-200 rounded-2xl h-40 mb-3 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-slate-800">해외</span>
                                    </div>
                                    <h4 className="font-bold text-lg text-slate-800">발리 우붓</h4>
                                    <p className="text-sm text-slate-500">예술과 자연이 공존하는 공간</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Briefcase className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">타고난 직업 운</h3>
                                <p className="text-slate-500 mt-2">당신의 잠재력이 폭발하는 분야를 확인하세요.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-5 border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors hover:shadow-md bg-slate-50">
                                    <h4 className="font-bold text-lg text-slate-800 mb-1">크리에이티브 디렉터</h4>
                                    <p className="text-sm text-slate-600">창의적인 아이디어를 현실로 만드는 능력이 탁월합니다.</p>
                                </div>
                                <div className="p-5 border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors hover:shadow-md bg-slate-50">
                                    <h4 className="font-bold text-lg text-slate-800 mb-1">스타트업 창업가</h4>
                                    <p className="text-sm text-slate-600">위험을 감수하고 새로운 가치를 창출하는 데 강점이 있습니다.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecommendationModal;
