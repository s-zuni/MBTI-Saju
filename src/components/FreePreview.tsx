import React, { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { calculateSaju, SajuResult } from '../utils/sajuUtils';
import { savePendingProfile } from '../utils/pendingProfile';
import { track } from '../utils/analytics';

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const ELEMENT_LABEL: Record<string, string> = {
  wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)',
};

interface FreePreviewProps {
  onSignup: () => void;
}

// 가입 없이 생년월일만으로 일간/오행 요약을 보여주는 맛보기 (AI 호출 없음, 클라이언트 계산)
const FreePreview: React.FC<FreePreviewProps> = ({ onSignup }) => {
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [mbti, setMbti] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SajuResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) { setError('생년월일을 입력해주세요.'); return; }
    if ((birthDate.split('-')[0] || '').length !== 4) { setError('연도는 4자리로 입력해주세요.'); return; }
    if (!gender) { setError('성별을 선택해주세요.'); return; }
    setError('');
    track('preview_submit', { hasMbti: !!mbti });
    try {
      setResult(calculateSaju(birthDate, null, gender));
      track('preview_result_view');
    } catch {
      setError('사주 계산에 실패했어요. 생년월일을 다시 확인해주세요.');
    }
  };

  const handleSignup = () => {
    savePendingProfile({ birthDate, gender, mbti: mbti || undefined });
    onSignup();
  };

  return (
    <section className="bg-slate-50 border-b border-slate-100 py-12">
      <div className="max-w-md mx-auto px-5">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> 가입 없이 30초 무료 체험
          </span>
          <h2 className="text-xl font-extrabold text-slate-900">내 사주 한 줄 요약 먼저 보기</h2>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div>
              <label htmlFor="pv-birth" className="block text-sm font-bold text-slate-700 mb-1.5">생년월일 (양력)</label>
              <input
                id="pv-birth"
                type="date"
                value={birthDate}
                max="9999-12-31"
                onChange={(e) => setBirthDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-700 mb-1.5">성별</span>
              <div className="grid grid-cols-2 gap-2">
                {[['female', '여성'], ['male', '남성']].map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGender(v!)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${gender === v ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="pv-mbti" className="block text-sm font-bold text-slate-700 mb-1.5">
                MBTI <span className="text-slate-400 font-medium">(선택)</span>
              </label>
              <select id="pv-mbti" value={mbti} onChange={(e) => setMbti(e.target.value)} className="input-field appearance-none">
                <option value="">모르면 건너뛰어도 돼요</option>
                {MBTI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-rose-600 font-medium" role="alert">{error}</p>}
            <button type="submit" className="w-full py-3.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">
              무료로 결과 보기
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-bold text-slate-400 mb-1">당신의 일간</p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {result.dayMaster.korean} <span className="text-slate-400 text-lg">{result.dayMaster.chinese}</span>
              {mbti && <span className="ml-2 text-violet-600 text-lg">· {mbti}</span>}
            </h3>
            <p className="text-sm text-slate-600 mt-2">{result.dayMaster.description}</p>

            <div className="mt-5 space-y-2">
              {(Object.keys(ELEMENT_LABEL) as Array<keyof SajuResult['elementRatio']>).map((k) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-12 font-semibold text-slate-600">{ELEMENT_LABEL[k]}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${result.elementRatio[k]}%` }} />
                  </div>
                  <span className="w-9 text-right text-slate-500">{result.elementRatio[k]}%</span>
                </div>
              ))}
            </div>

            <div className="mt-5 relative rounded-xl bg-slate-50 p-4 overflow-hidden">
              <p className="text-sm text-slate-500 blur-[5px] select-none" aria-hidden="true">
                올해 연애운과 재물운의 흐름, 이번 달 주의할 시기, 나에게 맞는 MBTI 조합 해석까지 한눈에 확인할 수 있어요.
              </p>
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
                <Lock className="w-4 h-4" /> 연애·재물·올해 운세는 가입 후 공개
              </div>
            </div>

            <button onClick={handleSignup} className="mt-4 w-full py-3.5 bg-slate-950 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
              무료 가입하고 전체 결과 보기
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">방금 입력한 정보는 가입 후 자동으로 채워져요.</p>
            <button onClick={() => setResult(null)} className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600">
              다시 입력하기
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FreePreview;
