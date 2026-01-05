import React from 'react';

interface MbtiSajuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MbtiSajuModal: React.FC<MbtiSajuModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in">
      <div className="relative p-8 border w-full max-w-lg shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-3xl font-black text-slate-900 mb-4">
          MBTI & 사주
        </h3>

        <div className="text-slate-600 leading-relaxed font-medium space-y-4">
            <p>
            MBTI는 개인의 선호도를 바탕으로 16가지 성격 유형을 제시하는 자기보고식 성격 유형 검사입니다. 각 유형은 개인이 에너지를 얻는 방식, 정보를 인식하는 형태, 판단을 내리는 기준, 그리고 선호하는 삶의 패턴에 따라 결정됩니다. 이를 통해 자신과 타인을 더 깊이 이해할 수 있습니다.
            </p>
            <p>
            사주(四柱)는 사람이 태어난 연, 월, 일, 시를 바탕으로 그 사람의 타고난 운명과 길흉화복을 알아보는 동양의 전통적인 명리학입니다. 네 개의 기둥(四柱)에 해당하는 간지(干支)를 통해 개인의 기질, 잠재력, 그리고 삶의 큰 흐름을 예측하고 조언을 얻습니다.
            </p>
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

export default MbtiSajuModal;
