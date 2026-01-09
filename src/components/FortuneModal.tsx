import React, { useEffect } from 'react';

interface FortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  fortune: string | null;
  loading: boolean;
}

const FortuneModal: React.FC<FortuneModalProps> = ({ isOpen, onClose, fortune, loading }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in">
      <div className="relative p-8 border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-3xl font-black text-slate-900 mb-2">
          오늘의 운세
        </h3>
        <p className="text-slate-500 font-bold mb-6">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>

        <div className="text-slate-600 leading-relaxed font-medium">
          {loading && <p>운세를 불러오는 중입니다...</p>}
          {fortune && <p>{fortune}</p>}
        </div>

        <button
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
          onClick={onClose}
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

export default FortuneModal;
