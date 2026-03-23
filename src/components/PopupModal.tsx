import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, AlertTriangle, Chrome } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const PopupModal: React.FC = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [dontShowToday, setDontShowToday] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            // 홈 화면(/)에서만 팝업 표시
            if (location.pathname !== '/') {
                return;
            }

            // "오늘 하루 보지 않기" 체크
            const hiddenUntil = localStorage.getItem('popup_hidden_until');
            if (hiddenUntil && new Date().getTime() < parseInt(hiddenUntil)) {
                return;
            }

            try {
                const { data } = await supabase
                    .from('site_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (data && data.popup_enabled) {
                    setSettings(data);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error('Error fetching popup settings:', err);
            }
        };

        fetchSettings();
    }, [location.pathname]);

    const handleClose = () => {
        if (dontShowToday) {
            // 24시간 동안 보지 않기 설정
            const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
            localStorage.setItem('popup_hidden_until', expiry.toString());
        }
        setIsOpen(false);
    };

    if (!isOpen || !settings) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100">
                {/* Header with Icon */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative">
                    <button 
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                        <AlertTriangle className="text-yellow-300" size={32} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight leading-tight">
                        {settings.popup_title}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="text-slate-600 font-medium leading-relaxed mb-8 whitespace-pre-wrap">
                        {settings.popup_content}
                    </div>

                    {/* Recommendation Row */}
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-8">
                        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Chrome size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900">Chrome 브라우저 권장</p>
                            <p className="text-xs text-blue-700">가장 안정적인 최적의 환경을 제공합니다.</p>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="space-y-3">
                        <button 
                            onClick={handleClose}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-slate-200"
                        >
                            확인했습니다
                        </button>
                        
                        <div className="flex justify-center">
                            <label className="flex items-center gap-2 cursor-pointer group py-2">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={dontShowToday}
                                    onChange={(e) => setDontShowToday(e.target.checked)}
                                />
                                <span className="text-sm font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                                    오늘 하루 더 이상 보지 않기
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PopupModal;
