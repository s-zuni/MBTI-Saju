import React, { useState } from 'react';
import { X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  handleLogin: (email: string, password: string) => Promise<string | undefined>;
  openSignupModal: () => void;
  closeAllModals: () => void;
}

import { supabase } from '../supabaseClient';
import { Provider } from '@supabase/supabase-js';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, handleLogin, openSignupModal, closeAllModals }) => {
  console.log('LoginModal rendering (updated version)');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'naver') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setLoginError(error.message || '소셜 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    const error = await handleLogin(email, password);
    if (error) {
      setLoginError(error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative p-8 border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-3xl font-black text-slate-900 mb-6">로그인</h3>
        {loginError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium px-4 py-3 rounded-2xl relative mb-4" role="alert">
            <span className="block sm:inline">{loginError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="loginEmail" className="block text-sm font-bold text-slate-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              id="loginEmail"
              required
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="loginPw" className="block text-sm font-bold text-slate-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              id="loginPw"
              required
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-lg"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <div className="flex flex-col gap-3 mt-4">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium relative shadow-sm"
              disabled={loading}
            >
              <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 계속하기
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('kakao')}
              className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] rounded-xl hover:bg-[#FDD835] transition-colors font-medium relative shadow-sm"
              disabled={loading}
            >
              <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.178.483.376.351.155-.103 2.466-1.675 3.464-2.353.541.08 1.1.123 1.67.123 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
              </svg>
              카카오로 계속하기
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('naver')}
              className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-[#03C75A] text-white rounded-xl hover:bg-[#02B150] transition-colors font-medium relative shadow-sm"
              disabled={loading}
            >
              <svg className="w-4 h-4 absolute left-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
              </svg>
              네이버로 계속하기
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-slate-500 mt-6">
          아직 계정이 없으신가요?{' '}
          <button
            type="button"
            onClick={openSignupModal}
            className="text-indigo-600 font-bold hover:underline"
            disabled={loading}
          >
            회원가입
          </button>
        </p>
        <button
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
          onClick={closeAllModals}
          disabled={loading}
        >
          <span className="sr-only">닫기</span>
          <X className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};

export default LoginModal;