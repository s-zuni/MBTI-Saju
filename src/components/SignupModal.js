import React from 'react';
import { X, Lock, Sparkles } from 'lucide-react';

const SignupModal = ({ handleSignup, openLoginModal, closeAllModals }) => {
  return (
    <div id="signupFormView" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">회원가입 및 무료 분석</h3>
        <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {/* 계정 정보 */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-500" /> 계정 정보
          </h4>
          <input
            type="email"
            id="signupEmail"
            required
            placeholder="이메일 (아이디로 사용)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
          />
          <input
            type="password"
            id="signupPw"
            required
            placeholder="비밀번호 (6자 이상)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
          />
          <button
            type="button"
            onClick={() => {
              // handleGoogleLogin();
            }}
            className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
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
            Google로 계속하기
          </button>
        </div>

        {/* 분석 정보 */}
        <div className="space-y-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" /> 분석 정보
          </h4>
          <input
            id="inputName"
            required
            placeholder="이름 (홍길동)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              id="inputGender"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
            >
              <option value="">성별</option>
              <option>남성</option>
              <option>여성</option>
            </select>
            <select
              id="inputMbti"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
            >
              <option value="">MBTI</option>
              <option>ISTJ</option>
              <option>ISFJ</option>
              <option>INFJ</option>
              <option>INTJ</option>
              <option>ISTP</option>
              <option>ISFP</option>
              <option>INFP</option>
              <option>INTP</option>
              <option>ESTP</option>
              <option>ESFP</option>
              <option>ENFP</option>
              <option>ENTP</option>
              <option>ESTJ</option>
              <option>ESFJ</option>
              <option>ENFJ</option>
              <option>ENTJ</option>
            </select>
          </div>
          <input
            type="date"
            id="inputBirthDate"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
          />

          <div className="flex items-center gap-2">
            <select
              id="inputBirthHour"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
            >
              <option value="">시</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i).padStart(2, '0')}>
                  {String(i).padStart(2, '0')}시
                </option>
              ))}
            </select>
            <select
              id="inputBirthMinute"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm"
            >
              <option value="">분</option>
              <option value="00">00분</option>
              <option value="10">10분</option>
              <option value="20">20분</option>
              <option value="30">30분</option>
              <option value="40">40분</option>
              <option value="50">50분</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              id="birthTimeUnknown"
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            출생 시간을 모릅니다
          </label>
        </div>

        <div id="signupError" className="hidden text-red-500 text-sm text-center"></div>

        <button
          type="submit"
          id="signupBtn"
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
        >
          분석 및 가입 완료
        </button>
        <p className="text-center text-xs text-gray-400">
          이미 계정이 있으신가요?{' '}
          <button
            type="button"
            onClick={openLoginModal}
            className="text-indigo-600 font-bold underline"
          >
            로그인
          </button>
        </p>
      </form>
    </div>
  );
};

export default SignupModal;