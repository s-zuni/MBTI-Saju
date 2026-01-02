import React, { useState } from 'react';
import { X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  handleLogin: (email: string, password: string) => Promise<string | undefined>;
  openSignupModal: () => void;
  closeAllModals: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, handleLogin, openSignupModal, closeAllModals }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false); // Assuming loading state is managed within handleLogin or passed down

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(''); // Clear previous errors
    // handleLogin should ideally accept email, password and return success/error
    const error = await handleLogin(email, password); // Assuming handleLogin returns an error message if failed
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
          <button
            type="button"
            onClick={() => {
              // handleGoogleLogin(); // Placeholder for actual Google login function
            }}
            className="btn-secondary w-full py-3 text-lg flex items-center justify-center gap-2"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Google로 로그인
          </button>
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