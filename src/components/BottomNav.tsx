import React from 'react';
import { Home, Sparkles, MessageSquare, Compass, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useModalStore } from '../hooks/useModalStore';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { SERVICE_COSTS } from '../config/creditConfig';

export interface BottomNavProps { }

const BottomNav: React.FC<BottomNavProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openModal } = useModalStore();
    const { session } = useAuth();
    const { credits } = useCredits(session);

    const handleChatClick = () => {
        if (!session) {
            openModal('analysis', 'login');
            return;
        }
        if (credits >= SERVICE_COSTS.AI_CHAT_5) {
            navigate('/chat');
        } else {
            openModal('creditPurchase', undefined, { requiredCredits: SERVICE_COSTS.AI_CHAT_5 });
        }
    };

    // URL 파라미터로 현재 탭 판별
    const currentTab = new URLSearchParams(location.search).get('tab');
    const isRootPath = location.pathname === '/';

    const navItems = [
        {
            icon: Home,
            label: '홈',
            isActive: isRootPath && !currentTab,
            onClick: () => navigate('/')
        },
        {
            icon: Sparkles,
            label: '사주',
            isActive: isRootPath && currentTab === 'saju',
            onClick: () => navigate('/?tab=saju')
        },
        {
            icon: MessageSquare,
            label: '상담',
            isActive: location.pathname.startsWith('/chat') || location.pathname.startsWith('/room'),
            onClick: handleChatClick
        },
        {
            icon: Compass,
            label: '운세',
            isActive: isRootPath && currentTab === 'fortune',
            onClick: () => navigate('/?tab=fortune')
        },
        {
            icon: User,
            label: '마이페이지',
            isActive: location.pathname.startsWith('/mypage'),
            onClick: () => navigate('/mypage')
        },
    ];

    // Admin, auth callback 페이지에서는 하단바 숨김
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth')) {
        return null;
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-slate-100/80 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.015)]">
            <div className="flex justify-between items-center h-14 px-2">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={item.onClick}
                        className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-95 ${
                            item.isActive ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <item.icon className="w-5 h-5 mb-0.5" strokeWidth={item.isActive ? 2.4 : 1.8} />
                        <span className={`text-[9.5px] tracking-tight ${item.isActive ? 'font-bold' : 'font-medium'}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
