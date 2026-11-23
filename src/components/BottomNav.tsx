import React from 'react';
import { Home, Sparkles, Moon, Compass, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface BottomNavProps {}

const BottomNav: React.FC<BottomNavProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = new URLSearchParams(location.search).get('tab');
  const luckType = new URLSearchParams(location.search).get('type');
  const isRootPath = location.pathname === '/';

  const navItems = [
    {
      icon: Home,
      label: '홈',
      isActive: isRootPath && !currentTab,
      onClick: () => navigate('/'),
    },
    {
      icon: Sparkles,
      label: '사주 990',
      isActive:
        (isRootPath && currentTab === 'saju') ||
        location.pathname.startsWith('/gold') ||
        location.pathname.startsWith('/relationship'),
      onClick: () => navigate('/?tab=saju'),
    },
    {
      icon: Compass,
      label: '운세',
      isActive:
        (isRootPath && currentTab === 'fortune') ||
        (location.pathname.startsWith('/myluck') && luckType !== 'tarot'),
      onClick: () => navigate('/?tab=fortune'),
    },
    {
      icon: Moon,
      label: '타로 490',
      isActive: location.pathname.startsWith('/myluck') && luckType === 'tarot',
      onClick: () => navigate('/myluck?type=tarot'),
    },
    {
      icon: FileText,
      label: '심층리포트',
      isActive: location.pathname.startsWith('/premium'),
      onClick: () => navigate('/premium'),
    },
  ];

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
