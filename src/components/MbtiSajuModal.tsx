import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, Brain, ScrollText, Zap, Share2, Download } from 'lucide-react';
import { SAJU_ELEMENTS, getDetailedFusedAnalysis, getMbtiDescription, getSajuDescription } from '../utils/sajuLogic';
import ShareCard from './ShareCard';
import { DetailedReportCard } from './DetailedReportCard';
import html2canvas from 'html2canvas';
import ServiceNavigation, { ServiceType } from './ServiceNavigation';

interface MbtiSajuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (service: ServiceType) => void;
}

const MbtiSajuModal: React.FC<MbtiSajuModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'fused' | 'mbti' | 'saju'>('fused');
  const [fusedReport, setFusedReport] = useState<string>("");
  const shareCardRef = React.useRef<HTMLDivElement>(null);
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnalysis();
    }
  }, [isOpen]);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setIsSharing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `MBTI-Saju-Analysis-${analysis.mbti}.png`;
      link.click();
    } catch (error) {
      console.error("Sharing failed:", error);
      alert("이미지 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for render
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff"
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `MBTI-Saju-Full-Report-${analysis.full_name}.png`;
      link.click();
    } catch (error) {
      console.error("Download failed", error);
      alert("리포트 저장 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const loadAnalysis = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata) {
      const metadata = session.user.user_metadata;

      if (metadata.analysis) {
        setAnalysis({
          ...metadata.analysis,
          birth_date: metadata.birth_date,
          full_name: metadata.full_name,
          mbti: metadata.mbti, // Fix: Ensure MBTI is passed
          gender: metadata.gender
        });
      }

      const report = getDetailedFusedAnalysis({
        mbti: metadata.mbti,
        birthDate: metadata.birth_date,
        birthTime: metadata.birth_time,
        name: metadata.full_name
      });
      setFusedReport(report);
    }
    setLoading(false);
  };

  const handleRegenerate = async () => {
    if (!window.confirm("새로운 분석 결과를 생성하시겠습니까? 기존 결과는 사라집니다.")) return;

    setIsRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다.");

      const metadata = session.user.user_metadata;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: metadata.full_name,
          gender: metadata.gender,
          birthDate: metadata.birth_date,
          birthTime: metadata.birth_time,
          mbti: metadata.mbti,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.details || "분석 생성에 실패했습니다.");
      }

      const newAnalysis = await response.json();

      await supabase.auth.updateUser({
        data: { ...metadata, analysis: newAnalysis }
      });

      setAnalysis({ ...newAnalysis, birth_date: metadata.birth_date, full_name: metadata.full_name });

    } catch (error: any) {
      console.error("Regenerate Error:", error);
      alert(`오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSajuKey = (birthDate?: string) => {
    if (!birthDate) return 'wood';
    const yearString = birthDate.split('-')[0];
    const yearLastDigit = parseInt((yearString || '0').slice(-1));
    const keys = Object.keys(SAJU_ELEMENTS);
    return keys[yearLastDigit % 5] as keyof typeof SAJU_ELEMENTS;
  };

  const currentSajuKey = analysis ? getSajuKey(analysis.birth_date) : 'wood';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fade-in">
      <div className="relative p-0 border w-full max-w-2xl shadow-2xl rounded-3xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
        {/* Navigation */}
        <ServiceNavigation currentService="mbti" onNavigate={onNavigate} onClose={onClose} />

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              MBTI & 사주 심층 분석
            </h3>
            <div className="flex items-center gap-2">
              {analysis && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors flex items-center gap-1 text-sm font-bold"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">공유</span>
                </button>
              )}
            </div>
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
                  <div className="space-y-4 animate-fade-up">
                    {/* 1. Saju Reading */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        📜 1. 사주 풀이
                      </h4>
                      <div className="text-slate-600 leading-relaxed font-medium text-md whitespace-pre-wrap">
                        {analysis.sajuReading || analysis.sajuAnalysis || fusedReport || "분석을 불러오는 중입니다..."}
                      </div>
                    </div>

                    {/* 2. MBTI Compatibility */}
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                      <h4 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        💞 2. MBTI와 궁합
                      </h4>
                      <div className="text-slate-700 leading-relaxed font-medium text-md whitespace-pre-wrap">
                        {analysis.mbtiCompatibility || analysis.commonalities || "분석 결과가 없습니다."}
                      </div>
                    </div>

                    {/* 3. 2026 Fortune */}
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                      <h4 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                        📅 3. 2026 대운세
                      </h4>
                      <div className="text-slate-700 leading-relaxed font-medium text-md whitespace-pre-wrap">
                        {analysis.fortune2026 || <span className="text-amber-600/70">데이터가 없습니다. 아래 [AI로 다시 상세 분석하기] 버튼을 눌러주세요.</span>}
                      </div>
                    </div>

                    {/* 4. Other Luck (Wealth, Love) */}
                    <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
                      <h4 className="text-lg font-bold text-rose-900 mb-3 flex items-center gap-2">
                        💰 4. 기타 운수 (재물/사랑)
                      </h4>
                      <div className="text-slate-700 leading-relaxed font-medium text-md whitespace-pre-wrap">
                        {analysis.otherLuck || <span className="text-rose-600/70">데이터가 없습니다. 아래 [AI로 다시 상세 분석하기] 버튼을 눌러주세요.</span>}
                      </div>
                    </div>

                    {/* 5. Advice (Do's & Don'ts) */}
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                      <h4 className="text-lg font-bold text-emerald-900 mb-3 flex items-center gap-2">
                        ✅ 5. 같이해야 할 것 & 피해야 할 것
                      </h4>
                      <div className="text-slate-700 leading-relaxed font-medium text-md whitespace-pre-wrap">
                        {analysis.advice || <span className="text-emerald-600/70">데이터가 없습니다. 아래 [AI로 다시 상세 분석하기] 버튼을 눌러주세요.</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center gap-4">
                      <button
                        onClick={handleDownloadReport}
                        disabled={isDownloading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl text-md font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        전체 리포트 다운로드
                      </button>

                      <div className="flex flex-col items-center">
                        <p className="text-sm text-slate-400 mb-2">결과가 상세하지 않나요?</p>
                        <button
                          onClick={handleRegenerate}
                          disabled={isRegenerating}
                          className="text-indigo-500 underline text-sm hover:text-indigo-700 disabled:opacity-50"
                        >
                          {isRegenerating ? "AI가 다시 분석 중..." : "AI로 다시 상세 분석하기 (재생성)"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'mbti' && (
                  <div className="bg-blue-50/50 p-8 rounded-2xl border border-blue-100 text-center animate-fade-in">
                    <div className="inline-block p-4 rounded-full bg-blue-100 text-blue-600 mb-4">
                      <Brain className="w-12 h-12" />
                    </div>
                    <h4 className="text-2xl font-black text-blue-900 mb-2">
                      {analysis.mbti || "MBTI"}
                    </h4>
                    <p className="text-blue-700 font-medium leading-relaxed">
                      {analysis.mbti ? getMbtiDescription(analysis.mbti) : "당신의 핵심 성격 유형입니다."}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {analysis.keywords?.split(',').slice(0, 3).map((k: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white rounded-full text-xs font-bold text-blue-600 shadow-sm border border-blue-100">
                          #{k.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'saju' && (
                  <div className="bg-amber-50/50 p-8 rounded-2xl border border-amber-100 text-center animate-fade-in">
                    <div className="inline-block p-4 rounded-full bg-amber-100 text-amber-600 mb-4">
                      <ScrollText className="w-12 h-12" />
                    </div>
                    <h4 className="text-2xl font-black text-amber-900 mb-2">
                      {SAJU_ELEMENTS[currentSajuKey]} 형
                    </h4>
                    <p className="text-amber-700 font-medium leading-relaxed">
                      {getSajuDescription(currentSajuKey)}
                    </p>
                    <div className="mt-4 text-sm text-slate-500">
                      * 더 자세한 사주 풀이와 운세는 [융합 분석] 탭에서 확인하세요.
                    </div>
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
      {/* Hidden Share Card for generating image */}
      {analysis && (
        <div className="fixed -top-[9999px] left-0">
          <ShareCard
            ref={shareCardRef}
            userName={analysis.full_name || '회원'}
            mbti={analysis.mbti}
            sajuElement={SAJU_ELEMENTS[Object.keys(SAJU_ELEMENTS)[(analysis.birth_date ? parseInt(analysis.birth_date.split('-')[0].slice(-1) || '0') : 0) % 5] as keyof typeof SAJU_ELEMENTS]}
            sajuTrait="타고난 운명과 후천적 성격의 조화"
            keywords={analysis.keywords?.split(',') || []}
          />
        </div>
      )}
      {analysis && (
        <div className="fixed -top-[9999px] left-0">
          <DetailedReportCard
            ref={reportRef}
            userName={analysis.full_name || '회원'}
            mbti={analysis.mbti}
            sajuElement={SAJU_ELEMENTS[Object.keys(SAJU_ELEMENTS)[(analysis.birth_date ? parseInt(analysis.birth_date.split('-')[0].slice(-1) || '0') : 0) % 5] as keyof typeof SAJU_ELEMENTS]}
            analysis={analysis}
          />
        </div>
      )}
    </div>
  );
};

export default MbtiSajuModal;
