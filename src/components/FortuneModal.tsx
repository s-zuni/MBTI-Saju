import React, { useState, useEffect } from 'react';
import { stripMarkdown } from '../utils/textUtils';
import { Coins, Lock } from 'lucide-react';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { SERVICE_COSTS } from '../config/creditConfig';

interface FortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (service: ServiceType) => void;
  fortune: {
    today: { fortune: string; lucky: { color: string; number: string; direction: string }; mission?: string };
    tomorrow: { fortune: string; lucky: { color: string; number: string; direction: string }; mission?: string };
  } | null;
  loading: boolean;
  // 크레딧 관련 props
  credits: number;
  onUseCredit: (serviceType: 'FORTUNE_TOMORROW') => Promise<boolean>;
  onOpenCreditPurchase: (requiredCredits: number) => void;
}

const FortuneModal: React.FC<FortuneModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  fortune,
  loading,
  credits,
  onUseCredit,
  onOpenCreditPurchase
}) => {
  const [tab, setTab] = useState<'today' | 'tomorrow'>('today');
  const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTab('today');
      setTomorrowUnlocked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeData = fortune ? fortune[tab] : null;
  const tomorrowCost = SERVICE_COSTS.FORTUNE_TOMORROW;

  const handleTomorrowClick = async () => {
    if (tomorrowUnlocked) {
      setTab('tomorrow');
      return;
    }

    // 이미 내일 운세 탭인데 잠금 해제 안됨 -> 크레딧 차감 시도
    if (credits < tomorrowCost) {
      onOpenCreditPurchase(tomorrowCost);
      return;
    }

    if (!window.confirm(`내일의 운세를 확인하시겠습니까? ${tomorrowCost}크레딧이 차감됩니다.`)) {
      return;
    }

    setIsUnlocking(true);
    const success = await onUseCredit('FORTUNE_TOMORROW');
    setIsUnlocking(false);

    if (success) {
      setTomorrowUnlocked(true);
      setTab('tomorrow');
    } else {
      alert('크레딧 차감에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-[1000] animate-fade-in p-4">
      <div className="relative border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
        {/* Navigation */}
        <ServiceNavigation currentService="fortune" onNavigate={onNavigate} onClose={onClose} />

        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900">당신의 운세</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            {/* 크레딧 표시 */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-600 rounded-full text-sm font-bold">
              <Coins className="w-4 h-4" />
              {credits}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setTab('today')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'today'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              오늘의 운세
            </button>
            <button
              onClick={handleTomorrowClick}
              disabled={isUnlocking}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === 'tomorrow'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'
                : 'text-slate-500 hover:text-slate-700'
                } ${isUnlocking ? 'opacity-50' : ''}`}
            >
              {isUnlocking ? (
                <span className="animate-pulse">잠금 해제 중...</span>
              ) : tomorrowUnlocked ? (
                '내일의 운세'
              ) : (
                <>
                  내일의 운세
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px]">
                    <Coins className="w-3 h-3" />
                    {tomorrowCost}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
              <p>운세를 불러오는 중입니다...</p>
            </div>
          ) : tab === 'tomorrow' && !tomorrowUnlocked ? (
            // 내일 운세 잠금 상태
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-10 h-10 text-slate-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">내일 운세 미리보기</h4>
              <p className="text-sm text-slate-500 mb-4">
                {tomorrowCost}크레딧으로 내일의 운세를 확인하세요
              </p>
              <button
                onClick={handleTomorrowClick}
                disabled={isUnlocking}
                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Coins className="w-5 h-5" />
                {credits >= tomorrowCost ? `${tomorrowCost}크레딧으로 잠금 해제` : '크레딧 충전하기'}
              </button>
            </div>
          ) : activeData ? (
            <div className="animate-fade-up">

              {/* MISSION CARD */}
              {activeData.mission && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-2xl shadow-lg mb-6 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-3 -translate-y-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 22 4-10 4 10" /></svg>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">오늘의 미션</h4>
                    <p className="text-lg font-bold leading-tight drop-shadow-sm">
                      {stripMarkdown(activeData.mission)}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mb-6">
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {stripMarkdown(activeData.fortune)}
                </p>
              </div>

              {activeData.lucky && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                    <div className="text-2xl mb-1">🎨</div>
                    <div className="text-xs text-orange-400 font-bold mb-1">행운의 컬러</div>
                    <div className="text-slate-800 font-bold text-sm break-words">{activeData.lucky.color}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                    <div className="text-2xl mb-1">🔢</div>
                    <div className="text-xs text-blue-400 font-bold mb-1">행운의 숫자</div>
                    <div className="text-slate-800 font-bold text-sm">{activeData.lucky.number}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
                    <div className="text-2xl mb-1">🧭</div>
                    <div className="text-xs text-purple-400 font-bold mb-1">행운의 방향</div>
                    <div className="text-slate-800 font-bold text-sm break-words">{activeData.lucky.direction}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              운세 데이터가 없습니다. 다시 시도해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FortuneModal;
