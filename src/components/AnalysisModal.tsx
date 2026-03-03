import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Provider } from '@supabase/supabase-js';

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'signup' | 'login' | 'edit';
  initialData?: any;
  onUpdate?: () => void;
}

// 소셜 로그인 전용 폼 (Google & 카카오만)
const SocialLoginForm: React.FC<{
  loading: boolean;
  handleSocialLogin: (provider: 'google' | 'kakao') => void;
}> = ({ loading, handleSocialLogin }) => (
  <div>
    <p className="text-slate-500 font-medium mb-6 text-center">
      간편하게 소셜 계정으로 시작하세요.
    </p>
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        type="button"
        onClick={() => handleSocialLogin('google')}
        className="w-full py-3.5 px-4 flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all font-semibold relative shadow-sm"
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

      {/* 카카오 */}
      <button
        type="button"
        onClick={() => handleSocialLogin('kakao')}
        className="w-full py-3.5 px-4 flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] rounded-xl hover:bg-[#FDD835] hover:shadow-md transition-all font-semibold relative shadow-sm"
        disabled={loading}
      >
        <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.178.483.376.351.155-.103 2.466-1.675 3.464-2.353.541.08 1.1.123 1.67.123 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
        </svg>
        카카오로 계속하기
      </button>
    </div>

    <div className="mt-6 text-center">
      <p className="text-xs text-slate-400">
        계속 진행하시면{' '}
        <a href="/terms" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">이용약관</a> 및{' '}
        <a href="/privacy" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
      </p>
    </div>
  </div>
);

// 프로필 정보 입력 폼 (회원가입 시 Step 1)
const ProfileInputForm: React.FC<any> = ({
  mode,
  name, setName,
  gender, setGender,
  mbti, setMbti,
  birthDate, setBirthDate,
  birthHour, setBirthHour,
  birthMinute, setBirthMinute,
  unknownBirthTime, setUnknownBirthTime,
  loading,
  handleNext,
}) => (
  <div>
    <p className="text-slate-500 font-medium mb-6">
      {mode === 'edit' ? '정보를 수정해주세요.' : '맞춤형 MBTI & 사주 분석을 위해 정보를 입력해주세요.'}
    </p>
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
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
          onChange={(e) => setBirthDate(e.target.value)}
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
        {loading ? '저장 중...' : (mode === 'edit' ? '수정 완료' : '다음')}
      </button>
    </div>
  </div>
);

// Step 2: 소셜 로그인 선택 (회원가입 시)
const SignupSocialStep: React.FC<{
  loading: boolean;
  handleSocialLogin: (provider: 'google' | 'kakao') => void;
  setStep: (step: number) => void;
}> = ({ loading, handleSocialLogin, setStep }) => (
  <div>
    <p className="text-slate-500 font-medium mb-6">
      분석 결과를 저장하고 보려면 소셜 계정으로 가입하세요.
    </p>

    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        type="button"
        onClick={() => handleSocialLogin('google')}
        className="w-full py-3.5 px-4 flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all font-semibold relative shadow-sm"
        disabled={loading}
      >
        <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google로 가입하기
      </button>

      {/* 카카오 */}
      <button
        type="button"
        onClick={() => handleSocialLogin('kakao')}
        className="w-full py-3.5 px-4 flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] rounded-xl hover:bg-[#FDD835] hover:shadow-md transition-all font-semibold relative shadow-sm"
        disabled={loading}
      >
        <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.178.483.376.351.155-.103 2.466-1.675 3.464-2.353.541.08 1.1.123 1.67.123 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
        </svg>
        카카오로 가입하기
      </button>
    </div>

    <div className="mt-4 text-center">
      <p className="text-xs text-slate-400">
        계속 진행하시면{' '}
        <a href="/terms" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">이용약관</a> 및{' '}
        <a href="/privacy" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
      </p>
    </div>

    <div className="mt-6">
      <button
        type="button"
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 group"
        onClick={() => setStep(1)}
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left group-hover:-translate-x-1 transition-transform"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
        뒤로
      </button>
    </div>
  </div>
);


const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, mode: initialMode = 'signup', initialData, onUpdate }) => {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(1);

  // Signup/Edit fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [mbti, setMbti] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthHour, setBirthHour] = useState('00');
  const [birthMinute, setBirthMinute] = useState('00');
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const resetFields = useCallback(() => {
    if (initialData && initialMode === 'edit') {
      setName(initialData.name || '');
      setGender(initialData.gender || '');
      setMbti(initialData.mbti || '');
      setBirthDate(initialData.birth_date || '');

      if (initialData.birth_time) {
        const [h, m] = initialData.birth_time.split(':');
        setBirthHour(h);
        setBirthMinute(m);
        setUnknownBirthTime(false);
      } else {
        setBirthHour('00');
        setBirthMinute('00');
        setUnknownBirthTime(true);
      }
    } else {
      setName('');
      setGender('');
      setMbti('');
      setBirthDate('');
      setBirthHour('00');
      setBirthMinute('00');
      setUnknownBirthTime(false);
    }
    setAuthError('');
    setStep(1);
    setLoading(false);
  }, [initialData, initialMode]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      resetFields();
    }
  }, [isOpen, resetFields]);

  const handleNext = () => {
    if (!name) {
      setAuthError('이름을 입력해주세요.');
      return;
    }
    if (!gender) {
      setAuthError('성별을 선택해주세요.');
      return;
    }
    if (!mbti) {
      setAuthError('MBTI를 선택해주세요.');
      return;
    }
    if (!birthDate) {
      setAuthError('생년월일을 입력해주세요.');
      return;
    }

    setAuthError('');
    setStep(2);
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setLoading(true);
    setAuthError('');
    try {
      // 회원가입 모드에서 소셜 로그인 전에 입력된 정보를 localStorage에 임시 저장
      if (mode === 'signup' && step === 2) {
        const profileData = {
          full_name: name,
          gender: gender,
          mbti: mbti,
          birth_date: birthDate,
          birth_time: unknownBirthTime ? null : `${birthHour}:${birthMinute}`,
        };
        localStorage.setItem('pendingProfileData', JSON.stringify(profileData));
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

    } catch (error: any) {
      setAuthError(error.message || `${provider} 로그인/회원가입 중 에러가 발생했습니다.`);
      console.error(`${provider} Auth Error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          gender: gender,
          mbti: mbti,
          birth_date: birthDate,
          birth_time: unknownBirthTime ? null : `${birthHour}:${birthMinute}`,
        }
      });

      if (error) throw error;

      alert('정보가 수정되었습니다.');
      if (onUpdate) onUpdate();
      onClose();

    } catch (error: any) {
      setAuthError(error.message || '프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Navigation — Escape only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 타이틀 결정
  const getTitle = () => {
    if (mode === 'login') return '로그인';
    if (mode === 'edit') return '프로필 수정';
    return step === 1 ? '무료 분석 시작하기' : '계정으로 가입하기';
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative p-8 border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-3xl font-black text-slate-900 mb-2">
          {getTitle()}
        </h3>

        {/* 로그인/회원가입 모드 전환 (edit 모드에서는 숨김) */}
        {mode !== 'edit' && (
          <div className='text-center mb-6'>
            {mode === 'login' ? (
              <p className="text-sm text-slate-500">
                계정이 없으신가요?{' '}
                <button onClick={() => setMode('signup')} className="font-bold text-indigo-600 hover:underline">
                  회원가입
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                이미 계정이 있으신가요?{' '}
                <button onClick={() => setMode('login')} className="font-bold text-indigo-600 hover:underline">
                  로그인
                </button>
              </p>
            )}
          </div>
        )}

        {authError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium px-4 py-3 rounded-2xl relative mb-4" role="alert">
            <span className="block sm:inline">{authError}</span>
          </div>
        )}

        {mode === 'login' ? (
          // 로그인: 소셜 로그인 버튼만 표시
          <SocialLoginForm
            loading={loading}
            handleSocialLogin={handleSocialLogin}
          />
        ) : mode === 'edit' ? (
          // 프로필 수정: 정보 입력 폼만 표시
          <ProfileInputForm
            mode={mode}
            name={name} setName={setName}
            gender={gender} setGender={setGender}
            mbti={mbti} setMbti={setMbti}
            birthDate={birthDate} setBirthDate={setBirthDate}
            birthHour={birthHour} setBirthHour={setBirthHour}
            birthMinute={birthMinute} setBirthMinute={setBirthMinute}
            unknownBirthTime={unknownBirthTime} setUnknownBirthTime={setUnknownBirthTime}
            loading={loading}
            handleNext={handleUpdate}
          />
        ) : (
          // 회원가입: Step 1(정보 입력) → Step 2(소셜 로그인)
          <>
            {step === 1 ? (
              <ProfileInputForm
                mode={mode}
                name={name} setName={setName}
                gender={gender} setGender={setGender}
                mbti={mbti} setMbti={setMbti}
                birthDate={birthDate} setBirthDate={setBirthDate}
                birthHour={birthHour} setBirthHour={setBirthHour}
                birthMinute={birthMinute} setBirthMinute={setBirthMinute}
                unknownBirthTime={unknownBirthTime} setUnknownBirthTime={setUnknownBirthTime}
                loading={loading}
                handleNext={handleNext}
              />
            ) : (
              <SignupSocialStep
                loading={loading}
                handleSocialLogin={handleSocialLogin}
                setStep={setStep}
              />
            )}
          </>
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
