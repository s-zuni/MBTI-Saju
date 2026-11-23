import { useState, useEffect, useCallback } from 'react';

export interface GuestProfile {
  name: string;
  gender: 'female' | 'male';
  birthDate: string;
  birthTime: string;
  mbti: string;
}

export const MBTI_OPTIONS = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
] as const;

export const BIRTH_TIME_OPTIONS = [
  { value: '', label: '시간 모름' },
  { value: '23:00-01:00', label: '자시 (23:00~01:00)' },
  { value: '01:00-03:00', label: '축시 (01:00~03:00)' },
  { value: '03:00-05:00', label: '인시 (03:00~05:00)' },
  { value: '05:00-07:00', label: '묘시 (05:00~07:00)' },
  { value: '07:00-09:00', label: '진시 (07:00~09:00)' },
  { value: '09:00-11:00', label: '사시 (09:00~11:00)' },
  { value: '11:00-13:00', label: '오시 (11:00~13:00)' },
  { value: '13:00-15:00', label: '미시 (13:00~15:00)' },
  { value: '15:00-17:00', label: '신시 (15:00~17:00)' },
  { value: '17:00-19:00', label: '유시 (17:00~19:00)' },
  { value: '19:00-21:00', label: '술시 (19:00~21:00)' },
  { value: '21:00-23:00', label: '해시 (21:00~23:00)' },
] as const;

const STORAGE_KEY = 'mbtiju_guest_profile';
const SYNC_EVENT = 'mbtiju_guest_profile_change';

export const DEFAULT_GUEST_PROFILE: GuestProfile = {
  name: '방문자',
  gender: 'female',
  birthDate: '1998-05-15',
  birthTime: '',
  mbti: 'ENFP',
};

export function readGuestProfile(): GuestProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GUEST_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : DEFAULT_GUEST_PROFILE.name,
      gender: parsed.gender === 'male' ? 'male' : 'female',
      birthDate: typeof parsed.birthDate === 'string' && parsed.birthDate ? parsed.birthDate : DEFAULT_GUEST_PROFILE.birthDate,
      birthTime: typeof parsed.birthTime === 'string' ? parsed.birthTime : '',
      mbti: typeof parsed.mbti === 'string' && MBTI_OPTIONS.includes(parsed.mbti) ? parsed.mbti : DEFAULT_GUEST_PROFILE.mbti,
    };
  } catch {
    return { ...DEFAULT_GUEST_PROFILE };
  }
}

export function writeGuestProfile(next: GuestProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * 회원가입 없이 브라우저 내에 생년월일·시간·성별·MBTI를 보존/동기화하는 훅
 */
export const useGuestProfile = () => {
  const [profile, setProfile] = useState<GuestProfile>(() => readGuestProfile());

  useEffect(() => {
    const handleSync = () => setProfile(readGuestProfile());
    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateProfile = useCallback((patch: Partial<GuestProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      writeGuestProfile(next);
      return next;
    });
  }, []);

  return { profile, updateProfile };
};
