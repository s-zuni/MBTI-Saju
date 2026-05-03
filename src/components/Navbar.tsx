import React, { useState, useEffect, useRef } from 'react';
import { User, Heart, Menu, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModalStore } from '../hooks/useModalStore';
import { useCredits } from '../hooks/useCredits';
import { SERVICE_COSTS } from '../config/creditConfig';

interface NavbarProps { }

const Navbar: React.FC<NavbarProps> = () => {
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { session } = useAuth();
  const { openModal, isAnyModalOpen } = useModalStore();
  const { credits } = useCredits(session);

  // 라우트 변경 시 모바일 메뉴 자동 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // 외부 클릭 시 모바일 메뉴 닫기
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
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000));
      await Promise.race([supabase.auth.signOut({ scope: 'local' }), timeoutPromise]);
    } catch (error: any) {
      console.error('Logout Error:', error.message);
    } finally {
      setLoading(false);
      window.location.href = '/';
    }
  };

  const handleMyPageClick = () => {
    if (session) {
      navigate('/mypage');
    } else {
      openModal('analysis', 'login');
    }
  };

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

  const handleTarotClick = () => {
    openModal('tarot');
  };

  // Dynamic styles: Aura Ethereal high-contrast style
  const textColor = "text-slate-800"; // #30323a equivalent
  const iconColor = "text-slate-700";
  const buttonHover = "hover:text-slate-950";
  const navBg = 'bg-white/70 backdrop-blur-xl border-b border-slate-100/50 py-3 shadow-sm';

  return (
    <nav ref={navRef} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${navBg} ${isAnyModalOpen ? 'translate-y-[-105%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 relative flex items-center justify-center transition-transform group-hover:scale-105">
            <img src="/logo.png" alt="MBTIJU Logo" className="w-full h-full object-contain drop-shadow-md rounded-full" />
          </div>
          <span className={`text-xl font-bold tracking-tight ${textColor} transition-colors font-sans`}>MBTIJU</span>
        </div>

        {/* Center Navigation Menu (Hidden on Home) */}
        <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <button onClick={() => navigate('/fortune')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-slate-950`}>
            운세 보기
          </button>
          <button onClick={handleChatClick} className={`text-sm font-semibold transition-colors ${textColor} hover:text-slate-950`}>
            운명 심층 상담
          </button>
          <button onClick={handleTarotClick} className={`text-sm font-semibold transition-colors ${textColor} hover:text-slate-950`}>
            타로
          </button>
          <button onClick={() => navigate('/community')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-slate-950`}>
            커뮤니티
          </button>
          <button onClick={() => openModal('creditPurchase')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-slate-950`}>
            요금제
          </button>
        </div>

        <div className="flex-1"></div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-4 md:gap-5 border-l pl-6 transition-colors border-slate-200`}>
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <button
                    onClick={handleMyPageClick}
                    className={`relative group p-1 ${iconColor} ${buttonHover} transition-all`}
                    disabled={loading}
                  >
                    <User className="w-6 h-6" />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">마이페이지</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`hidden md:block relative group p-1 ${iconColor} ${buttonHover} transition-all`}
                    disabled={loading}
                  >
                    <LogOut className="w-6 h-6" />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">로그아웃</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal('analysis', 'login')}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-slate-950 text-white font-semibold rounded-full shadow-md hover:bg-slate-800 transition-all text-sm active:scale-95"
                    disabled={loading}
                  >
                    시작하기
                  </button>
                </div>
              )}
            </div>
            <button className={`relative group p-1 ${iconColor} ${buttonHover} transition-all hidden md:block`}>
              <Heart className="w-6 h-6" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">찜</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-1 ${textColor}`}
              disabled={loading}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
            <div className="flex flex-col gap-2">
              <button onClick={() => { navigate('/fortune'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-slate-950">운세 보기</button>
              <button onClick={() => { handleChatClick(); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-slate-950">운명 심층 상담</button>
              <button onClick={() => { handleTarotClick(); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-slate-950">타로</button>
              <button onClick={() => { navigate('/community'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-slate-950">커뮤니티</button>
              <button onClick={() => { openModal('creditPurchase'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-slate-950">요금제</button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              {session ? (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-500 font-semibold rounded-full hover:bg-red-50 transition-colors text-sm"
                    disabled={loading}
                  >
                    <LogOut className="w-5 h-5" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      openModal('analysis', 'login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-950 text-white font-semibold rounded-full shadow-md hover:bg-slate-800 transition-colors text-sm"
                    disabled={loading}
                  >
                    시작하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;