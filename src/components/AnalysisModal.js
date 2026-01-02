import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path if necessary

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // Every 5 minutes

const AnalysisModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Data Input, 2: Account Creation
  const [name, setName] = useState('');
  const [gender, setGender] = useState(''); // 'male', 'female'
  const [mbti, setMbti] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [birthHour, setBirthHour] = useState('00');
  const [birthMinute, setBirthMinute] = useState('00');
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    // Basic validation for Step 1 before proceeding
    if (!name || !gender || !mbti || !birthDate) {
      setAuthError('Please fill in all required fields in Step 1.');
      return;
    }
    setAuthError(''); // Clear any previous errors
    setStep(2);
  };

  const handleBirthDateChange = (e) => {
    setBirthDate(e.target.value);
  };

  const handleEmailSignup = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) {
        setAuthError('Sign up failed: No user data received.');
        return;
      }

      alert('회원가입이 성공적으로 완료되었습니다! 이메일을 확인하여 계정을 인증해주세요.');
      onClose(); // Close modal on success

    } catch (error) {
      setAuthError(error.message || 'An unexpected error occurred during signup.');
      console.error('Email Signup Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redirects back to your app after Google login
        },
      });

      if (error) throw error;
      // Supabase will handle redirection and session creation

    } catch (error) {
      setAuthError(error.message || 'An unexpected error occurred during Google signup.');
      console.error('Google Signup Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative p-8 border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-3xl font-black text-slate-900 mb-6">
          {step === 1 ? '무료 분석 시작하기' : '계정 생성하기'}
        </h3>
        {authError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium px-4 py-3 rounded-2xl relative mb-4" role="alert">
            <span className="block sm:inline">{authError}</span>
          </div>
        )}
        {step === 1 && (
          // Step 1: Data Input
          <div>
            <p className="text-slate-500 font-medium mb-6">
              맞춤형 MBTI & 사주 분석을 위해 정보를 입력해주세요.
            </p>
            <form className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  성별
                </label>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <input
                      id="gender-male"
                      name="gender"
                      type="radio"
                      value="male"
                      checked={gender === 'male'}
                      onChange={(e) => setGender(e.target.value)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="gender-male" className="ml-2 block text-sm text-gray-900">
                      남성
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="gender-female"
                      name="gender"
                      type="radio"
                      value="female"
                      checked={gender === 'female'}
                      onChange={(e) => setGender(e.target.value)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="gender-female" className="ml-2 block text-sm text-gray-900">
                      여성
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="mbti" className="block text-sm font-bold text-slate-700 mb-2">
                  MBTI 유형
                </label>
                <select
                  id="mbti"
                  name="mbti"
                  value={mbti}
                  onChange={(e) => setMbti(e.target.value)}
                  className="input-field appearance-none"
                  required
                >
                  <option value="">MBTI 선택</option>
                  {MBTI_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-bold text-slate-700 mb-2">
                  생년월일 (양력)
                </label>
                <input
                  type="date"
                  name="birthDate"
                  id="birthDate"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label htmlFor="birthHour" className="block text-sm font-bold text-slate-700 mb-2">
                    출생 시간
                  </label>
                  <select
                    id="birthHour"
                    name="birthHour"
                    value={birthHour}
                    onChange={(e) => setBirthHour(e.target.value)}
                    className="input-field appearance-none"
                    disabled={unknownBirthTime}
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}시
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="birthMinute" className="block text-sm font-bold text-slate-700 mb-2">
                    출생 분
                  </label>
                  <select
                    id="birthMinute"
                    name="birthMinute"
                    value={birthMinute}
                    onChange={(e) => setBirthMinute(e.target.value)}
                    className="input-field appearance-none"
                    disabled={unknownBirthTime}
                  >
                    {MINUTES.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}분
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="unknownBirthTime"
                  name="unknownBirthTime"
                  type="checkbox"
                  checked={unknownBirthTime}
                  onChange={(e) => setUnknownBirthTime(e.target.checked)}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="unknownBirthTime" className="ml-2 block text-sm text-gray-900">
                  출생 시간 모름
                </label>
              </div>
            </form>

            <div className="mt-8">
              <button
                type="button"
                className="btn-primary w-full py-3 text-lg"
                onClick={handleNext}
                disabled={loading}
              >
                다음
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          // Step 2: Account Creation
          <div>
            <p className="text-slate-500 font-medium mb-6">
              분석 결과를 저장하고 보려면 계정을 생성하세요.
            </p>
            <form className="space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                        이메일
                    </label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2">
                        비밀번호
                    </label>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        required
                    />
                </div>
            </form>
            <div className="mt-8 flex flex-col space-y-4">
                <button
                    type="button"
                    className="btn-primary w-full py-3 text-lg"
                    onClick={handleEmailSignup}
                    disabled={loading}
                >
                    {loading ? '회원가입 중...' : '이메일로 회원가입'}
                </button>
                <button
                    type="button"
                    className="btn-secondary w-full py-3 text-lg"
                    onClick={handleGoogleSignup}
                    disabled={loading}
                >
                    Google로 회원가입
                </button>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 group"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left group-hover:-translate-x-1 transition-transform"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                뒤로
              </button>
            </div>
          </div>
        )}
        <button
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
          onClick={onClose}
          disabled={loading}
        >
          <span className="sr-only">닫기</span>
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AnalysisModal;
