import React from 'react';
import { Home, Sparkles, Users, User, MessagesSquare, ShoppingBag } from 'lucide-react'; // MessagesSquare for Community? Or Users? 
// Let's use: Home, Sparkles(Fortune), Brain(AI Center - using Sparkles or similar?), ShoppingBag(Store), Users(Community)
// For AI Center let's use a special icon or button.
import { useNavigate, useLocation } from 'react-router-dom';

export interface BottomNavProps {
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onLoginClick: () => void;
    onHealingClick: () => void;
    isAuthenticated: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ onFortuneClick, onMbtiSajuClick, onLoginClick, onHealingClick, isAuthenticated }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        {
            icon: Home,
            label: '홈',
            path: '/',
            onClick: () => navigate('/')
        },
        {
            icon: Sparkles,
            label: '운세',
            path: '/fortune',
            onClick: () => navigate('/fortune') // Using route instead of modal trigger for better navigation as per previous request
        },
        {
            icon: Sparkles, // Center Button
            label: 'AI상담',
            isCenter: true,
            onClick: onHealingClick
        },
        {
            icon: ShoppingBag,
            label: '스토어',
            path: '/store',
            onClick: () => navigate('/store')
        },
        {
            icon: Users,
            label: '커뮤니티',
            path: '/community',
            onClick: () => navigate('/community')
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 pb-safe pt-2 z-50 rounded-t-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-end h-16 pb-2">
                {navItems.map((item, index) => {
                    const isActive = item.path === location.pathname;

                    if (item.isCenter) {
                        return (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className="relative -top-6 flex flex-col items-center justify-center"
                            >
                                <div className="w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center transform active:scale-95 transition-all text-white">
                                    <Sparkles className="w-7 h-7" />
                                </div>
                                <span className="text-xs font-bold text-indigo-900 mt-1">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`flex flex-col items-center justify-center w-14 gap-1 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} active:scale-90 transition-transform duration-200`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
