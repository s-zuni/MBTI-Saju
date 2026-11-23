import React from 'react';
import { User, Sparkles } from 'lucide-react';
import { GuestProfile, MBTI_OPTIONS, BIRTH_TIME_OPTIONS } from '../hooks/useGuestProfile';

interface GuestProfileCardProps {
  profile: GuestProfile;
  onChange: (patch: Partial<GuestProfile>) => void;
  title?: string;
  showName?: boolean;
  compact?: boolean;
}

const GuestProfileCard: React.FC<GuestProfileCardProps> = ({
  profile,
  onChange,
  title = '내 사주 · MBTI 정보',
  showName = false,
  compact = false,
}) => {
  return (
    <div className={`bg-slate-50/90 border border-slate-200/80 rounded-2xl ${compact ? 'p-4' : 'p-5'} text-left space-y-3.5`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-violet-600 shrink-0" />
          <span className="text-xs font-black text-slate-800">{title}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
          <Sparkles className="w-2.5 h-2.5" /> 비회원 즉시 분석
        </span>
      </div>

      {showName && (
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500">이름 (별명)</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="이름 또는 닉네임"
            maxLength={12}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500">성별</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ gender: 'female' })}
              className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                profile.gender === 'female'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              여성
            </button>
            <button
              type="button"
              onClick={() => onChange({ gender: 'male' })}
              className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                profile.gender === 'male'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              남성
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500">MBTI</label>
          <select
            value={profile.mbti}
            onChange={(e) => onChange({ mbti: e.target.value })}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
          >
            {MBTI_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500">생년월일</label>
          <input
            type="date"
            value={profile.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500">태어난 시간 (선택)</label>
          <select
            value={profile.birthTime}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
          >
            {BIRTH_TIME_OPTIONS.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 pt-2 border-t border-slate-200/70">
        입력 정보는 현재 브라우저에만 임시 저장되며, 결제 진행 시{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-bold text-slate-700 hover:text-violet-600">
          이용약관
        </a>
        {' '}및{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-bold text-slate-700 hover:text-violet-600">
          개인정보처리방침
        </a>
        과 함께 <strong>결제 즉시 분석 생성이 개시되어 단순 변심·입력 오기재·브라우저 삭제로 인한 환불(청약철회)이 제한</strong>됨에 동의하게 됩니다.
      </p>
    </div>
  );
};

export default GuestProfileCard;
