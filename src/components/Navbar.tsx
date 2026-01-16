import React, { useState, useEffect } from 'react';
import { User, Heart, Menu, LogOut } from 'lucide-react'; // Added LogOut icon
import { supabase } from '../supabaseClient'; // Import supabase client
import { useNavigate, useLocation } from 'react-router-dom'; // For navigation
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface NavbarProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onFortuneClick: () => void;
  onMbtiSajuClick: () => void;
  onTarotClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onSignupClick, onFortuneClick, onMbtiSajuClick, onTarotClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          navigate('/'); // Redirect to home on logout
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
    });


    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe(); // Correctly clean up the auth listener
    };
  }, [navigate]);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error.message);
    }
    setLoading(false); // Always reset loading state
    // Auth state change listener will handle navigation
  };

  const handleMyPageClick = () => {
    if (session) {
      navigate('/mypage'); // Navigate to MyPage
    } else {
      onLoginClick();
    }
  };

  // Removed unused handlers

  // Dynamic styles: If scrolled OR not on home page, use dark text/white bg style
  const useDarkStyle = isScrolled || !isHome;

  const textColor = useDarkStyle ? "text-slate-900" : "text-white";
  const iconColor = useDarkStyle ? "text-slate-900" : "text-indigo-100";
  const buttonHover = useDarkStyle ? "hover:text-indigo-600" : "hover:text-white";
  const navBg = useDarkStyle
    ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 py-3 shadow-sm'
    : 'bg-transparent py-5';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 relative flex items-center justify-center transition-transform group-hover:scale-105">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6366f1" /> {/* Indigo-500 */}
                  <stop offset="100%" stopColor="#a855f7" /> {/* Purple-500 */}
                </linearGradient>
              </defs>
              {/* Compass Ring */}
              <circle cx="20" cy="20" r="18" stroke="url(#logoGradient)" strokeWidth="2.5" className="opacity-90" />
              {/* Star / Needle */}
              <path d="M20 5L23 17L35 20L23 23L20 35L17 23L5 20L17 17L20 5Z" fill="url(#logoGradient)" />
              {/* Center dot */}
              <circle cx="20" cy="20" r="3" fill="white" />
            </svg>
          </div>
          <span className={`text-xl font-bold tracking-tight ${textColor} transition-colors font-sans`}>MBTIJU</span>
        </div>

        {/* Spacer to push actions to right if search is removed */}
        {/* Center Navigation Menu (Hidden on Home) */}
        {!isHome && (
          <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <button onClick={() => navigate('/fortune')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-indigo-600`}>
              운세 보기
            </button>
            <button onClick={() => navigate('/chat')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-indigo-600`}>
              AI 심층상담
            </button>
            <button onClick={() => navigate('/store')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-indigo-600`}>
              운세템 상점
            </button>
            <button onClick={() => navigate('/community')} className={`text-sm font-semibold transition-colors ${textColor} hover:text-indigo-600`}>
              커뮤니티
            </button>
            <button onClick={onTarotClick} className={`text-sm font-semibold transition-colors ${textColor} hover:text-indigo-600`}>
              신비 타로
            </button>
          </div>
        )}

        {/* Spacer to push actions to right if search is removed */}
        <div className="flex-1"></div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-600">
            {/* Links removed as requested */}
          </div>

          <div className={`flex items-center gap-4 md:gap-5 border-l pl-6 transition-colors ${useDarkStyle ? 'border-slate-200' : 'border-white/20'}`}>
            <div className="flex items-center gap-2"> {/* Changed from hidden md:flex to flex to show on mobile */}
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
                  {/* Logout button moved to menu or kept here? User asked for MyPage on top right. Let's keep Logout hidden on mobile to save space if needed, or keep both if space allows. Mobile screen is small. Let's keep MyPage here and Logout in valid menu or next to it. Let's start with MyPage. */}
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
                    onClick={onLoginClick}
                    className={`px-4 py-2 font-semibold rounded-full transition-all text-sm active:scale-95 ${useDarkStyle ? 'text-slate-900 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
                    disabled={loading}
                  >
                    로그인
                  </button>
                  <button
                    onClick={onSignupClick}
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-md hover:bg-indigo-700 transition-all text-sm active:scale-95"
                    disabled={loading}
                  >
                    회원가입
                  </button>
                </div>
              )}
            </div>
            <button className={`relative group p-1 ${iconColor} ${buttonHover} transition-all hidden md:block`}>
              <Heart className="w-6 h-6" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">찜</span>
            </button>
            {/* Shopping Cart Removed */}
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
            {/* Mobile Navigation Links */}
            <div className="flex flex-col gap-2">
              <button onClick={() => { navigate('/fortune'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-indigo-600">운세 보기</button>
              <button onClick={() => { navigate('/chat'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-indigo-600">AI 심층상담</button>
              <button onClick={() => { navigate('/store'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-indigo-600">운세템 상점</button>
              <button onClick={() => { navigate('/community'); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-indigo-600">커뮤니티</button>
              <button onClick={() => { onTarotClick(); setIsMobileMenuOpen(false); }} className="text-left py-2 font-medium text-slate-700 hover:text-indigo-600">신비 타로</button>
            </div>

            {/* Mobile User Actions - Logout only since MyPage is on top */}
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
                // Already shown in top bar somewhat, but good fallback
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSignupClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-md hover:bg-indigo-700 transition-colors text-sm"
                    disabled={loading}
                  >
                    회원가입
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