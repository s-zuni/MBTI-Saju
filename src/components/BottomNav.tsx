import React from 'react';
import { Home, Compass, MessageSquare, Layers, Users } from 'lucide-react'; 
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
            isActive: (p: string) => p === '/',
            onClick: () => navigate('/')
        },
        {
            icon: Compass,
            label: '운세',
            path: '/fortune',
            isActive: (p: string) => p.startsWith('/fortune'),
            onClick: () => navigate('/fortune')
        },
        {
            icon: MessageSquare,
            label: '상담',
            path: '/chat',
            isActive: (p: string) => p.startsWith('/chat') || p.startsWith('/room'),
            onClick: () => navigate('/chat')
        },
        {
            icon: Layers, 
            label: '타로',
            path: '/tarot',
            isActive: (p: string) => p === '/tarot',
            onClick: () => openModal('tarot')
        },
        {
            icon: Users,
            label: '커뮤니티',
            path: '/community',
            isActive: (p: string) => p.startsWith('/community'),
            onClick: () => navigate('/community')
        }
    ];

    // Admin, auth callback 페이지에서는 하단바 숨김
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth')) {
        return null;
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe">
            <div className="flex justify-between items-center h-16 px-2">
                {navItems.map((item, index) => {
                    const isActive = item.isActive(location.pathname);

                    return (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <item.icon className="w-6 h-6 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
