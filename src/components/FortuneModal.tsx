import React, { useState, useEffect } from 'react';
import { stripMarkdown } from '../utils/textUtils';
import { getRandomLoadingMessage } from '../config/loadingMessages';
import { Coins, Lock } from 'lucide-react';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';
import { SERVICE_COSTS } from '../config/creditConfig';

interface FortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (service: ServiceType) => void;
  fortune: any; // 오늘 운세 객체
  loading: boolean;
  tomorrowFortune?: any; // 내일 운세 객체
  isTomorrowLoading?: boolean;
  onFetchTomorrow?: () => Promise<boolean>;
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
  tomorrowFortune,
  isTomorrowLoading,
  onFetchTomorrow,
  credits,
  onOpenCreditPurchase
}) => {
  const [tab, setTab] = useState<'today' | 'tomorrow'>('today');
  const [tomorrowUnlocked, setTomorrowUnlocked] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');

  // 로딩 메시지 순환 효과
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isLoading = tab === 'today' ? (loading && !fortune) : (isTomorrowLoading && !tomorrowFortune);
    
    if (isLoading) {
      setCurrentLoadingMessage(getRandomLoadingMessage('fortune'));
      interval = setInterval(() => {
        setCurrentLoadingMessage(getRandomLoadingMessage('fortune'));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [loading, isTomorrowLoading, fortune, tomorrowFortune, tab]);

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

  const activeData = tab === 'today' ? fortune?.fortune : tomorrowFortune?.fortune;
  const activeDate = tab === 'today' ? fortune?.date : tomorrowFortune?.date;
  const tomorrowCost = SERVICE_COSTS.FORTUNE_TOMORROW;

  const handleTomorrowClick = async () => {
    if (tomorrowUnlocked) {
      setTab('tomorrow');
      return;
    }

    if (credits < tomorrowCost) {
      onOpenCreditPurchase(tomorrowCost);
      return;
    }

    if (!window.confirm(`내일의 운세를 확인하시겠습니까? ${tomorrowCost}크레딧이 사용됩니다. (생성 오류 시 차감되지 않습니다.)`)) {
      return;
    }

    if (onFetchTomorrow) {
      const started = await onFetchTomorrow();
      if (started) {
        setTomorrowUnlocked(true);
        setTab('tomorrow');
      }
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
                {activeDate ? new Date(activeDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : 
                 new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
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
                ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-100'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              오늘의 운세
            </button>
            <button
              onClick={handleTomorrowClick}
              disabled={isTomorrowLoading}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === 'tomorrow'
                ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-100'
                : 'text-slate-500 hover:text-slate-700'
                } ${isTomorrowLoading ? 'opacity-50' : ''}`}
            >
              {isTomorrowLoading && !tomorrowFortune ? (
                <span className="animate-pulse">생성 중...</span>
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
          {((tab === 'today' && loading && !fortune) || (tab === 'tomorrow' && isTomorrowLoading && !tomorrowFortune)) ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mb-6"></div>
              <div className="space-y-3">
                <p className="text-slate-900 font-black text-lg tracking-tight">
                  {currentLoadingMessage || '운세를 불러오는 중입니다...'}
                </p>
                <p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">
                  잠시만 기다려주세요
                </p>
              </div>
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
                disabled={isTomorrowLoading}
                className="px-6 py-3 bg-slate-950 text-white font-bold rounded-xl shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2"
              >
                <Coins className="w-5 h-5 text-amber-400" />
                {credits >= tomorrowCost ? `${tomorrowCost}크레딧으로 잠금 해제` : '크레딧 충전하기'}
              </button>
            </div>
          ) : activeData ? (
            <div className="animate-fade-up">

              {/* MISSION CARD */}
              {activeData.mission && (
                <div className="bg-slate-950 p-5 rounded-2xl shadow-lg mb-6 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-3 -translate-y-3 text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 22 4-10 4 10" /></svg>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">오늘의 미션</h4>
                    <p className="text-lg font-bold leading-tight drop-shadow-sm">
                      {stripMarkdown(activeData.mission)}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 mb-6 group hover:bg-white hover:shadow-xl hover:shadow-amber-50 transition-all duration-500">
                <p className="text-slate-800 leading-relaxed font-semibold whitespace-pre-wrap text-base">
                  {stripMarkdown(activeData.fortune)}
                </p>
              </div>

              {/* CHARM STATS */}
              {activeData.charm_stats && (
                <div className="mb-6 bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
                    오늘의 매력 스탯
                  </h4>
                  <div className="space-y-4">
                    {activeData.charm_stats.map((stat: { label: string; value: number }, idx: number) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black text-slate-600">
                          <span>{stat.label}</span>
                          <span className="text-amber-500">{stat.value}%</span>
                        </div>
                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-200 to-amber-400 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${stat.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OOTD RECOMMENDATION */}
              {activeData.lucky_ootd && (
                <div className="mb-6 bg-slate-50 border border-slate-100 p-6 rounded-[32px] relative overflow-hidden group hover:border-amber-200 hover:bg-white transition-all duration-500">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500 group-hover:scale-110 transition-transform">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 12V8H16V12H20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 12V8H8V12H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 12V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 21C16.9706 21 21 16.9706 21 12H3C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2">Lucky OOTD</h4>
                  <p className="text-slate-800 font-bold text-lg leading-snug">
                    {activeData.lucky_ootd}
                  </p>
                </div>
              )}

              {activeData.lucky && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                    <div className="text-2xl mb-1">🎨</div>
                    <div className="text-xs text-amber-400 font-bold mb-1">행운의 컬러</div>
                    <div className="text-slate-800 font-bold text-sm break-words">{activeData.lucky.color}</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                    <div className="text-2xl mb-1">🔢</div>
                    <div className="text-xs text-amber-400 font-bold mb-1">행운의 숫자</div>
                    <div className="text-slate-800 font-bold text-sm">{activeData.lucky.number}</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                    <div className="text-2xl mb-1">🧭</div>
                    <div className="text-xs text-amber-400 font-bold mb-1">행운의 방향</div>
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
