import React, { useState, useEffect } from 'react';
import { Top } from '@toss/tds-mobile';
import { User, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModalStore } from '../hooks/useModalStore';

interface NavbarProps { }

const Navbar: React.FC<NavbarProps> = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { session } = useAuth();
  const { openModal, isAnyModalOpen } = useModalStore();

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

  if (isAnyModalOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white">
      <Top
        title={
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 relative flex items-center justify-center">
              <img src="/logo.png" alt="MBTIJU Logo" className="w-full h-full object-contain rounded-full shadow-sm" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">MBTIJU</span>
          </div>
        }
        rightNode={
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <button onClick={handleMyPageClick} disabled={loading} className="p-2">
                  <User className="w-6 h-6 text-slate-700" />
                </button>
                <button onClick={handleLogout} disabled={loading} className="p-2">
                  <LogOut className="w-6 h-6 text-slate-700" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => openModal('analysis', 'login')} 
                disabled={loading}
                className="px-4 py-1.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-full hover:bg-slate-200 transition-colors"
               >
                시작하기
              </button>
            )}
          </div>
        }
      />
    </div>
  );
};

export default Navbar;