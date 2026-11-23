import React, { useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useModalStore } from '../hooks/useModalStore';
import Logo from './Logo';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { isAnyModalOpen } = useModalStore();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [isMobileMenuOpen]);

  const textColor = 'text-slate-800';
  const navBg = 'bg-white/75 backdrop-blur-xl border-b border-slate-100/70 py-3 shadow-sm';

  const menuItems = [
    { label: '오늘의 운세', path: '/myluck?type=today' },
    { label: '자미두수', path: '/myluck?type=jamidusu' },
    { label: '타로', path: '/myluck?type=tarot' },
    { label: '연애 사주', path: '/relationship' },
    { label: '재물 사주', path: '/gold' },
    { label: '3년 심층 리포트', path: '/premium' },
    { label: '이용후기', path: '/reviews' },
  ];

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${navBg} ${
        isAnyModalOpen ? 'translate-y-[-105%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 relative flex items-center justify-center transition-transform group-hover:scale-105">
            <Logo className="text-slate-900 group-hover:text-violet-600 transition-colors" size={36} />
          </div>
          <span className={`text-xl font-bold tracking-tight ${textColor} transition-colors font-sans`}>MBTIJU</span>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`text-sm font-semibold transition-colors ${textColor} hover:text-violet-600 whitespace-nowrap`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/myluck?type=today')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white font-semibold rounded-full shadow-md hover:bg-violet-600 transition-all text-xs sm:text-sm active:scale-95 whitespace-nowrap"
          >
            가입 없이 바로 보기
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-1.5 ${textColor}`}
            aria-label="메뉴 열기"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-2 flex flex-col">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className="text-left py-2.5 font-semibold text-slate-700 hover:text-violet-600 border-b border-slate-100/70 last:border-b-0"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
