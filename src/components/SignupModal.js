import React from 'react';
import { X, Lock, Sparkles } from 'lucide-react';

const SignupModal = ({ handleSignup, openLoginModal, closeAllModals, isLoading, error }) => {
  return (
    <div id="signupFormView" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">회원가입 및 무료 분석</h3>
        <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {/* 분석 정보 섹션 바로 시작 */}

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

        {error && <div id="signupError" className="text-red-500 text-sm text-center font-bold">{error}</div>}

        <button
          type="submit"
          id="signupBtn"
          disabled={isLoading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              분석 중...
            </>
          ) : (
            <>분석 리포트 확인하기 <Sparkles className="w-5 h-5" /></>
          )}
        </button>
      </form>
    </div>
  );
};

export default SignupModal;