import React, { useState, useEffect } from 'react';
import { Search, User, Heart, ShoppingCart, Clock, Menu, Star, LogOut } from 'lucide-react'; // Added LogOut icon
import { supabase } from '../supabaseClient'; // Import supabase client
import { useNavigate } from 'react-router-dom'; // For navigation
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface NavbarProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onFortuneClick: () => void;
  onMbtiSajuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onSignupClick, onFortuneClick, onMbtiSajuClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleFortuneClick = () => {
    if (session) {
      onFortuneClick();
    } else {
      onLoginClick();
    }
  };

  const handleMbtiSajuClick = () => {
    if (session) {
      onMbtiSajuClick();
    } else {
      onLoginClick();
    }
  };


  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-3' : 'bg-transparent py-5'
      }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">MBTIJU</span>
        </div>

        {/* Search Bar Placeholder (Reference Image Style) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="w-full relative group">
            <input
              type="text"
              placeholder="당신의 운명을 검색해보세요"
              className="w-full bg-slate-100/80 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 px-12 py-3 rounded-full outline-none transition-all placeholder:text-slate-400 text-sm"
              readOnly
              onClick={onSignupClick} // Opens analysis modal
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-600">
            {/* Links removed as requested */}
          </div>

          <div className="flex items-center gap-4 md:gap-5 border-l border-slate-200 pl-6">
            <div className="hidden md:flex items-center gap-2">
              {session ? (
                <>
                  <button
                    onClick={handleMyPageClick}
                    className="relative group p-1 text-slate-600 hover:text-indigo-600 transition-colors"
                    disabled={loading}
                  >
                    <User className="w-6 h-6" />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">마이페이지</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="relative group p-1 text-slate-600 hover:text-indigo-600 transition-colors"
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
                    className="px-4 py-2 text-slate-900 font-semibold rounded-full hover:bg-slate-100 transition-colors text-sm"
                    disabled={loading}
                  >
                    로그인
                  </button>
                  <button
                    onClick={onSignupClick}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-md hover:bg-indigo-700 transition-colors text-sm"
                    disabled={loading}
                  >
                    회원가입
                  </button>
                </div>
              )}
            </div>
            <button className="relative group p-1 text-slate-600 hover:text-indigo-600 transition-colors">
              <Heart className="w-6 h-6" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">찜</span>
            </button>
            <button className="relative group p-1 text-slate-600 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">장바구니</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1 text-slate-900"
              disabled={loading}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/80 backdrop-blur-md border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 py-4">
            {/* Search Bar Placeholder for Mobile */}
            <div className="w-full relative group mb-4">
              <input
                type="text"
                placeholder="당신의 운명을 검색해보세요"
                className="w-full bg-slate-100/80 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 px-12 py-3 rounded-full outline-none transition-all placeholder:text-slate-400 text-sm"
                readOnly
                onClick={() => {
                  onSignupClick();
                  setIsMobileMenuOpen(false);
                }}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex flex-col gap-2 text-sm font-semibold text-slate-600 mb-4">
              {/* Links removed as requested */}
            </div>

            {/* Mobile User Actions */}
            <div className="border-t border-slate-200 pt-4">
              {session ? (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      handleMyPageClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-slate-900 font-semibold rounded-full hover:bg-slate-100 transition-colors text-sm"
                    disabled={loading}
                  >
                    <User className="w-5 h-5" />
                    마이페이지
                  </button>
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
                      onLoginClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-slate-900 font-semibold rounded-full hover:bg-slate-100 transition-colors text-sm"
                    disabled={loading}
                  >
                    로그인
                  </button>
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