import React, { useState } from 'react';
import { X, Sparkles, User, Calendar, Clock, Brain, Loader2, ChevronRight } from 'lucide-react';

interface SignupModalProps {
  handleSignup: (e: React.FormEvent) => void;
  closeAllModals: () => void;
  isLoading: boolean;
  error: string | null;
}

const SignupModal: React.FC<SignupModalProps> = ({ handleSignup, closeAllModals, isLoading, error }) => {
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Modal Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 transition-all">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white fill-white" />
          </div>
          <h3 className="font-bold text-slate-900">맞춤 데이터 입력</h3>
        </div>
        <button
          onClick={closeAllModals}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSignup} className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar space-y-6">
        <div className="text-center mb-4">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Exclusive Analysis</p>
          <h4 className="text-3xl font-black text-slate-900">당신을 위한 정밀 분석</h4>
          <p className="text-sm text-slate-500 mt-2 font-medium">정확한 정보를 입력할수록 결과의 깊이가 더해집니다.</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div>
            {error}
          </div>
        )}

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" /> 이름
          </label>
          <input
            name="inputName"
            type="text"
            required
            placeholder="예: 홍길동"
            className="input-field"
          />
        </div>

        {/* Gender Select */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" /> 성별
          </label>
          <select name="inputGender" required className="input-field appearance-none">
            <option value="">성별 선택</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </div>

        {/* MBTI Select */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" /> MBTI 유행
          </label>
          <select name="inputMbti" required className="input-field appearance-none">
            <option value="">MBTI 선택</option>
            {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(mbti => (
              <option key={mbti} value={mbti}>{mbti}</option>
            ))}
          </select>
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" /> 생년월일
          </label>
          <input
            name="inputBirthDate"
            type="date"
            required
            className="input-field"
          />
        </div>

        {/* Birth Time */}
        <div className="space-y-3 p-5 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" /> 출생 시간
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="birthTimeUnknown"
                checked={birthTimeUnknown}
                onChange={(e) => setBirthTimeUnknown(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">모름</span>
            </label>
          </div>

          <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${birthTimeUnknown ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <select name="inputBirthHour" disabled={birthTimeUnknown} className="input-field appearance-none bg-white">
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}시</option>
              ))}
            </select>
            <select name="inputBirthMinute" disabled={birthTimeUnknown} className="input-field appearance-none bg-white">
              {Array.from({ length: 60 }).map((_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}분</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                분석 데이터를 가공 중입니다...
              </>
            ) : (
              <>
                분석 리포트 확인하기
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignupModal;