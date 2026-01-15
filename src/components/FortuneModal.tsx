import React, { useState, useEffect } from 'react';

interface FortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  fortune: {
    today: { fortune: string; lucky: { color: string; number: string; direction: string } };
    tomorrow: { fortune: string; lucky: { color: string; number: string; direction: string } };
  } | null;
  loading: boolean;
}

const FortuneModal: React.FC<FortuneModalProps> = ({ isOpen, onClose, fortune, loading }) => {
  const [tab, setTab] = useState<'today' | 'tomorrow'>('today');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setTab('today');
  }, [isOpen]);

  if (!isOpen) return null;

  const activeData = fortune ? fortune[tab] : null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in p-4">
      <div className="relative border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900">당신의 운세</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            <button
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              onClick={onClose}
            >
              <span className="sr-only">닫기</span>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
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
              onClick={() => setTab('tomorrow')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'tomorrow'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              내일의 운세
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
          ) : activeData ? (
            <div className="animate-fade-up">
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mb-6">
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {activeData.fortune}
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
