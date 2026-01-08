import React from 'react';
import { Home, Sparkles, Heart, Users, User, Compass } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomNavProps {
    onFortuneClick: () => void;
    onMbtiSajuClick: () => void;
    onLoginClick: () => void;
    isAuthenticated: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ onFortuneClick, onMbtiSajuClick, onLoginClick, isAuthenticated }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleProtectedNavigation = (path: string) => {
        if (isAuthenticated) {
            navigate(path);
        } else {
            onLoginClick();
        }
    };

    const navItems = [
        { icon: Home, label: '홈', path: '/', onClick: () => navigate('/') },
        { icon: Sparkles, label: '운세', onClick: onFortuneClick },
        { icon: Compass, label: '분석', onClick: onMbtiSajuClick },
        { icon: Users, label: '커뮤니티', path: '/community', onClick: () => navigate('/community') },
        { icon: User, label: '마이', path: '/mypage', onClick: () => handleProtectedNavigation('/mypage') },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 z-50 pb-safe">
            <div className="flex justify-between items-center">
                {navItems.map((item, index) => {
                    const isActive = item.path ? location.pathname === item.path : false;
                    return (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`flex flex-col items-center gap-1 p-1 min-w-[48px] ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
