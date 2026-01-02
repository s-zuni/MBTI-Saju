import React from 'react';
import { X, User, Sparkles, Brain } from 'lucide-react';

interface MyPageModalProps {
  closeAllModals: () => void;
  myPageData: {
    profile: {
      name: string;
      birth_date: string;
      birth_time: string;
      mbti: string;
    };
    saju: string;
    mbti: string;
    trait: string;
    jobs: string;
    match: string;
  } | null;
}

const MyPageModal: React.FC<MyPageModalProps> = ({ closeAllModals, myPageData }) => {
  return (
    <div id="myPageView" className="p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900">마이페이지</h3>
        <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {myPageData ? (
        <div id="myPageContent" className="space-y-6">
          <div className="text-center">
            <div className="inline-block p-3 bg-indigo-100 rounded-full mb-3">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 id="mpName" className="text-2xl font-bold text-gray-900">
              {myPageData.profile.name}님
            </h2>
            <p id="mpInfo" className="text-gray-500 text-sm">
              {myPageData.profile.birth_date} ({myPageData.profile.birth_time}) ·{' '}
              {myPageData.profile.mbti}
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> 사주 분석
            </h4>
            <div
              id="mpSaju"
              className="text-gray-700 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: myPageData.saju }}
            ></div>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5" /> MBTI 분석
            </h4>
            <div
              id="mpMbti"
              className="text-gray-700 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: myPageData.mbti }}
            ></div>
          </div>
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
            <h4 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
              🤝 핵심 성향 (결합)
            </h4>
            <div
              id="mpTrait"
              className="text-indigo-800 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: myPageData.trait }}
            ></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl">
              <h4 className="font-bold text-gray-900 mb-2">💼 추천 직업</h4>
              <div
                id="mpJobs"
                className="text-gray-600 text-sm"
                dangerouslySetInnerHTML={{ __html: myPageData.jobs }}
              ></div>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl">
              <h4 className="font-bold text-gray-900 mb-2">❤️ 추천 궁합</h4>
              <div
                id="mpMatch"
                className="text-gray-600 text-sm"
                dangerouslySetInnerHTML={{ __html: myPageData.match }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        <div id="myPageLoading" className="text-center py-10">
          <svg
            className="animate-spin h-8 w-8 text-indigo-500 mx-auto"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
        </div>
      )}
    </div>
  );
};

export default MyPageModal;