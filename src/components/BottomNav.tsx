import React from 'react';
import { Home, Compass, MessagesSquare, Moon, Users } from 'lucide-react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useModalStore } from '../hooks/useModalStore';

export interface BottomNavProps { }

const BottomNav: React.FC<BottomNavProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openModal } = useModalStore();

    const navItems = [
        {
            icon: Home,
            label: '홈',
            path: '/',
            onClick: () => navigate('/')
        },
        {
            icon: Compass,
            label: '운세',
            path: '/fortune',
            onClick: () => navigate('/fortune') // Using route instead of modal trigger for better navigation as per previous request
        },
        {
            icon: MessagesSquare, // Center Button
            label: '심층상담',
            isCenter: true,
            onClick: () => navigate('/chat')
        },
        {
            icon: Moon, 
            label: '타로',
            path: '/tarot',
            onClick: () => openModal('tarot')
        },
        {
            icon: Users,
            label: '커뮤니티',
            path: '/community',
            onClick: () => navigate('/community')
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50">
            <div className="glass-card rounded-[32px] px-2 py-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-white/40">
                {navItems.map((item, index) => {
                    const isActive = item.path === location.pathname;

                    if (item.isCenter) {
                        return (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className="relative flex flex-col items-center justify-center -mt-8"
                            >
                                <div className="w-14 h-14 bg-slate-950 rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center transform active:scale-95 transition-all text-white border-4 border-white">
                                    <MessagesSquare className="w-6 h-6" />
                                    {/* HIT Badge */}
                                    <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                                        HIT
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-900 mt-2">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl gap-1 transition-all duration-300 ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:text-slate-600'} active:scale-90`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'fill-slate-950/10' : ''}`} />
                            <span className="text-[10px] font-bold">{item.label}</span>
                            {isActive && <div className="w-1 h-1 bg-slate-950 rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
