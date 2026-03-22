import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Provider } from '@supabase/supabase-js';
import { isRestrictedBrowser } from '../utils/browserUtils';
import { useNavigate } from 'react-router-dom';

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
  mode?: 'signup' | 'login' | 'edit' | 'complete_profile';
  initialData?: any;
  onUpdate?: () => void;
}

// 소셜 로그인 전용 폼 (Google & 카카오만)
const SocialLoginForm: React.FC<{
  loading: boolean;
  handleSocialLogin: (provider: 'google' | 'kakao') => void;
  title?: string;
  onShowTestLogin: () => void;
}> = ({ loading, handleSocialLogin, title, onShowTestLogin }) => (
  <div>
    <p className="text-slate-500 font-medium mb-6 text-center">
      {title || '간편하게 소셜 계정으로 시작하세요.'}
    </p>
    <div className="flex flex-col gap-3">
      {/* Google */}
      <div className="relative group">
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
          Google로 계속하기
        </button>
        {isRestrictedBrowser() && (
          <p className="mt-2 text-[11px] text-rose-500 font-bold text-center leading-tight bg-rose-50 py-2 px-3 rounded-lg border border-rose-100">
            ⚠️ 카카오톡/인스타 브라우저에서는 구글 로그인이 원활하지 않을 수 있습니다. 
            <br />화면 우측 하단 <b>점 세 개(...)</b>를 눌러 <b>'다른 브라우저로 열기'</b>를 추천합니다.
          </p>
        )}
      </div>

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

    <div className="mt-8 pt-6 border-t border-slate-100">
      <p className="text-xs text-slate-400 mb-3 text-center">
        테스트 계정이 필요하신가요?
      </p>
      <button
        type="button"
        onClick={onShowTestLogin}
        disabled={loading}
        className="w-full py-2.5 px-4 text-sm font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all border border-dashed border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        테스트 계정으로 로그인 (임시)
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

// 테스트 계정 전용 폼
const TestLoginForm: React.FC<{
  loading: boolean;
  handleEmailLogin: (e: React.FormEvent) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onBack: () => void;
}> = ({ loading, handleEmailLogin, email, setEmail, password, setPassword, onBack }) => (
  <div className="animate-fade-in">
    <button
      onClick={onBack}
      className="mb-4 text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
      </svg>
      소셜 로그인으로 돌아가기
    </button>

    <p className="text-slate-500 font-medium mb-6">
      테스트용 이메일과 비밀번호를 입력해주세요.
    </p>

    <form className="space-y-4" onSubmit={handleEmailLogin}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          placeholder="test@examle.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5 mt-2"
      >
        {loading ? '로그인 중...' : '테스트 계정 로그인'}
      </button>
    </form>
  </div>
);

// 프로필 정보 입력 폼
const ProfileInputForm: React.FC<any> = ({
  mode,
  name, setName,
  nickname, setNickname,
  gender, setGender,
  mbti, setMbti,
  birthDate, setBirthDate,
  birthHour, setBirthHour,
  birthMinute, setBirthMinute,
  unknownBirthTime, setUnknownBirthTime,
  loading,
  handleNext,
  submitLabel,
}) => (
  <div>
    <p className="text-slate-500 font-medium mb-6">
      {mode === 'edit' ? '정보를 수정해주세요.' : '맞춤형 MBTI & 사주 분석을 위해 정보를 입력해주세요.'}
    </p>
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
      <div>
        <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">
          이름 (실명)
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
        <label htmlFor="nickname" className="block text-sm font-bold text-slate-700 mb-2">
          닉네임 (커뮤니티 표시용)
        </label>
        <input
          type="text"
          name="nickname"
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="input-field"
          placeholder="미입력 시 이름으로 표시됩니다."
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
          max="9999-12-31"
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
        {loading ? '저장 중...' : (submitLabel || (mode === 'edit' ? '수정 완료' : '완료'))}
      </button>
    </div>
  </div>
);


const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, mode: initialMode = 'signup', initialData, onUpdate }) => {
  const [mode, setMode] = useState(initialMode);
  const navigate = useNavigate();

  // Signup/Edit fields
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [mbti, setMbti] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthHour, setBirthHour] = useState('00');
  const [birthMinute, setBirthMinute] = useState('00');
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);

  const [showTestLogin, setShowTestLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const resetFields = useCallback(() => {
    if (initialData && (initialMode === 'edit' || initialMode === 'complete_profile')) {
      setName(initialData.name || initialData.full_name || '');
      setNickname(initialData.nickname || '');

      // For 'edit' mode, we keep existing data.
      // For 'complete_profile' mode, we force manual input by leaving fields empty,
      // except for name which is usually reliable from social login.
      if (initialMode === 'edit') {
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
        // complete_profile: Force manual entry
        setGender('');
        setMbti('');
        setBirthDate('');
        setBirthHour('00');
        setBirthMinute('00');
        setUnknownBirthTime(false);
      }
    } else {
      setName('');
      setNickname('');
      setGender('');
      setMbti('');
      setBirthDate('');
      setBirthHour('00');
      setBirthMinute('00');
      setUnknownBirthTime(false);
    }
    setAuthError('');
    setLoading(false);
  }, [initialData, initialMode]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Window focus listener to reset loading state
  // This handles cases where the user returns from a cancelled social login popup/redirect
  useEffect(() => {
    const handleFocus = () => {
      if (loading) {
        // Wait a small delay to see if a session is actually being established
        const timer = setTimeout(() => {
          setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading]);

  useEffect(() => {
    if (isOpen) {
      resetFields();
      setLoading(false); // Ensure loading is reset when modal opens
      setAuthError('');  // Clear previous errors
    }
  }, [isOpen, resetFields]);

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      
      // On mobile, sometimes the redirect doesn't trigger immediately.
      // We rely on Supabase's internal redirect logic which is now optimized via PKCE.
      console.log(`${provider} login initiated`);
    } catch (error: any) {
      setAuthError(error.message || `${provider} 로그인/회원가입 중 에러가 발생했습니다.`);
      console.error(`${provider} Auth Error:`, error);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleEmailLogin START');
    setLoading(true);
    setAuthError('');
    try {
      console.log('Calling supabase.auth.signInWithPassword with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('signInWithPassword result:', { data, error });

      if (error) throw error;
      console.log('Login success, calling onClose');
      onClose(); // On success, close modal
    } catch (error: any) {
      setAuthError(error.message || '로그인 중 오류가 발생했습니다.');
      console.error(`Email Login Error:`, error);
    } finally {
      console.log('handleEmailLogin FINALLY');
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    // 유효성 검사
    if (!name) { setAuthError('이름을 입력해주세요.'); return; }
    if (!gender) { setAuthError('성별을 선택해주세요.'); return; }
    if (!mbti) { setAuthError('MBTI를 선택해주세요.'); return; }
    if (!birthDate) { setAuthError('생년월일을 입력해주세요.'); return; }

    const year = birthDate?.split('-')[0] || '';
    if (year.length > 4) {
      setAuthError('연도는 4자리(예: 1990)까지만 입력 가능합니다.');
      return;
    }

    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          nickname: nickname,
          gender: gender,
          mbti: mbti,
          birth_date: birthDate,
          birth_time: unknownBirthTime ? null : `${birthHour}:${birthMinute}`,
        }
      });

      if (error) throw error;

      // Update public.profiles table simultaneously
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            name: name,
            gender: gender,
            mbti: mbti,
            birth_date: birthDate,
            birth_time: unknownBirthTime ? null : `${birthHour}:${birthMinute}`,
            email: user.email
          })
          .eq('id', user.id);
      }

      if (mode === 'edit') {
        alert('정보가 수정되었습니다.');
      }
      
      if (onUpdate) onUpdate();
      onClose();

      // If completing profile for the first time, redirect to MyPage to guide them to "My Destiny Analysis"
      if (mode === 'complete_profile') {
        navigate('/mypage');
      }

    } catch (error: any) {
      setAuthError(error.message || '프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Navigation — Escape only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      // complete_profile 모드에서는 Escape 키를 차단
      if (e.key === 'Escape' && mode !== 'complete_profile') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, mode]);

  if (!isOpen) return null;

  // 타이틀 결정
  const getTitle = () => {
    if (mode === 'login') return '로그인';
    if (mode === 'edit') return '프로필 수정';
    if (mode === 'complete_profile') return '프로필 완성하기';
    return '시작하기';
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative p-8 border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-3xl font-black text-slate-900 mb-2">
          {getTitle()}
        </h3>

        {/* 로그인/회원가입 모드 전환 (edit/complete_profile 모드에서는 숨김) */}
        {mode !== 'edit' && mode !== 'complete_profile' && (
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

        {mode === 'login' || mode === 'signup' ? (
          showTestLogin ? (
            <TestLoginForm
              loading={loading}
              handleEmailLogin={handleEmailLogin}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onBack={() => setShowTestLogin(false)}
            />
          ) : (
            <SocialLoginForm
              loading={loading}
              handleSocialLogin={handleSocialLogin}
              title={mode === 'signup' ? 'Google 또는 카카오 계정으로 가입하세요.' : '간편하게 소셜 계정으로 시작하세요.'}
              onShowTestLogin={() => setShowTestLogin(true)}
            />
          )
        ) : (
          // 프로필 수정 & 프로필 완성 (complete_profile): 정보 입력 폼
          <ProfileInputForm
            mode={mode}
            name={name} setName={setName}
            nickname={nickname} setNickname={setNickname}
            gender={gender} setGender={setGender}
            mbti={mbti} setMbti={setMbti}
            birthDate={birthDate} setBirthDate={setBirthDate}
            birthHour={birthHour} setBirthHour={setBirthHour}
            birthMinute={birthMinute} setBirthMinute={setBirthMinute}
            unknownBirthTime={unknownBirthTime} setUnknownBirthTime={setUnknownBirthTime}
            loading={loading}
            handleNext={handleSaveProfile}
            submitLabel={mode === 'complete_profile' ? '시작하기' : '수정 완료'}
          />
        )}

        {/* 닫기 버튼 (complete_profile에서는 숨김 — 필수 입력) */}
        {mode !== 'complete_profile' && (
          <button
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            onClick={onClose}
          >
            <span className="sr-only">닫기</span>
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default AnalysisModal;
