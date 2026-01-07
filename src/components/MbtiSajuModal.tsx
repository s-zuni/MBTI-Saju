import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, Brain, ScrollText, Zap } from 'lucide-react';

interface MbtiSajuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MbtiSajuModal: React.FC<MbtiSajuModalProps> = ({ isOpen, onClose }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'fused' | 'mbti' | 'saju'>('fused');

  useEffect(() => {
    if (isOpen) {
      loadAnalysis();
    }
  }, [isOpen]);

  const loadAnalysis = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.analysis) {
      setAnalysis(session.user.user_metadata.analysis);
    }
    setLoading(false);
  };

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
      <div className="relative p-0 border w-full max-w-2xl shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              MBTI & 사주 심층 분석
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <p className="opacity-90 mt-2 text-sm font-medium">나의 선천적 운명과 후천적 성격의 완벽한 조화 🔮</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar grow">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500">분석 데이터를 불러오는 중...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Keywords */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {analysis.keywords?.split(',').map((k: string, i: number) => (
                  <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold border border-indigo-100 shadow-sm">
                    #{k.trim()}
                  </span>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  onClick={() => setActiveTab('fused')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'fused' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Zap className="w-4 h-4" /> 융합 분석
                </button>
                <button
                  onClick={() => setActiveTab('mbti')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'mbti' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Brain className="w-4 h-4" /> MBTI 심층
                </button>
                <button
                  onClick={() => setActiveTab('saju')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'saju' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ScrollText className="w-4 h-4" /> 사주 심층
                </button>
              </div>

              {/* Tab Content */}
              <div className="animate-fade-up">
                {activeTab === 'fused' && (
                  <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                    <h4 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      ✨ MBTI x 사주 시너지
                    </h4>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line font-medium text-lg">
                      {analysis.fusedAnalysis || analysis.detailedAnalysis || "종합 분석 정보가 없습니다."}
                    </p>
                  </div>
                )}

                {activeTab === 'mbti' && (
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <h4 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                      🧠 MBTI 성향 분석
                    </h4>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {analysis.mbtiAnalysis || "MBTI 심층 분석 정보가 업데이트되지 않았습니다. 마이페이지에서 다시 분석을 진행해주세요."}
                    </p>
                  </div>
                )}

                {activeTab === 'saju' && (
                  <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                    <h4 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                      📜 사주 운명 분석
                    </h4>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {analysis.sajuAnalysis || "사주 심층 분석 정보가 업데이트되지 않았습니다. 마이페이지에서 다시 분석을 진행해주세요."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-6">아직 분석 결과가 없습니다. <br />마이페이지에서 종합 분석을 먼저 받아주세요!</p>
              <button onClick={onClose} className="btn-primary px-8 py-3">확인</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MbtiSajuModal;
