import React, { useState, useEffect, useRef } from 'react';
import { Menu, ShoppingCart, User, LogOut, LogIn } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useModalStore } from '../hooks/useModalStore';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import Logo from './Logo';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { session } = useAuth();
  const { openModal, isAnyModalOpen } = useModalStore();

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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000));
      await Promise.race([supabase.auth.signOut({ scope: 'local' }), timeoutPromise]);
    } catch (error: any) {
      console.error('Logout Error:', error?.message);
    } finally {
      setLoggingOut(false);
      window.location.href = '/';
    }
  };

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

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/myluck?type=today')}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-slate-950 text-white font-semibold rounded-full shadow-md hover:bg-violet-600 transition-all text-xs sm:text-sm active:scale-95 whitespace-nowrap"
          >
            가입 없이 바로 보기
          </button>

          <button
            onClick={() => navigate('/shop/cart')}
            className="p-2 rounded-full text-slate-700 hover:text-violet-600 hover:bg-slate-100/80 transition-colors"
            title="운세 상점 장바구니"
            aria-label="운세 상점 장바구니"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>

          {session ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => navigate('/mypage')}
                className="p-2 rounded-full text-slate-700 hover:text-violet-600 hover:bg-slate-100/80 transition-colors"
                title="마이페이지"
                aria-label="마이페이지"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 rounded-full text-slate-500 hover:text-rose-600 hover:bg-slate-100/80 transition-colors"
                title="로그아웃"
                aria-label="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openModal('analysis', 'login')}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-600 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              로그인
            </button>
          )}

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
                className="text-left py-2.5 font-semibold text-slate-700 hover:text-violet-600 border-b border-slate-100/70"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/shop/cart');
              }}
              className="text-left py-2.5 font-semibold text-slate-700 hover:text-violet-600 border-b border-slate-100/70 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              운세 상점 · 장바구니
            </button>
            {session ? (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/mypage');
                  }}
                  className="py-2 font-semibold text-violet-600 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  마이페이지
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="py-2 text-sm font-semibold text-slate-500 hover:text-rose-600"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openModal('analysis', 'login');
                }}
                className="text-left py-2.5 font-semibold text-slate-600 hover:text-violet-600 flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                로그인 (선택 · 후기 작성)
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
