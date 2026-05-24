import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check for explicit error parameters
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isErrorParam = params.get('error') || params.get('error_description') || hashParams.get('error') || hashParams.get('error_description');

    if (isErrorParam) {
      console.error('OAuth Callback Error:', isErrorParam);
      setErrorMsg(isErrorParam);
      return;
    }

    const handleAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          navigate('/', { replace: true });
        } else {
          supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              navigate('/', { replace: true });
            }
          });
        }
      } catch (err: any) {
        console.error('AuthCallback error:', err);
        setErrorMsg(err.message || '인증 중 예기치 않은 오류가 발생했습니다.');
      }
    };

    handleAuth();
  }, [navigate]);

  if (errorMsg) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">로그인 실패</h2>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium tracking-tight mb-3">인증 처리 중입니다...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
