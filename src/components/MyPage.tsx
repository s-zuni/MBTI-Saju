import React, { useState, useEffect } from 'react';
import { supabase, ensureValidSession } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Users, Sparkles, Coins, Loader2, AlertCircle, Key, FileText } from 'lucide-react';
import AnalysisModal from './AnalysisModal';
import { useCredits } from '../hooks/useCredits';
import CreditPurchaseModal from './CreditPurchaseModal';

interface Profile {
  id: string;
  name: string;
  email: string | undefined;
  gender: string;
  mbti: string;
  birth_date: string;
  birth_time: string | null;
}

interface Analysis {
  keywords: string;
  reportTitle?: string;
  nature?: {
    title: string;
    dayPillarSummary: string;
    dayMasterAnalysis: string;
    dayBranchAnalysis: string;
    monthBranchAnalysis: string;
  };
  fiveElements?: {
    title: string;
    elements: Array<{ element: string; count: number; function: string; interpretation: string }>;
    summary: string;
  };
  persona?: {
    title: string;
    mbtiNickname: string;
    dominantFunction: string;
    auxiliaryFunction: string;
    tertiaryFunction: string;
    inferiorFunction: string;
  };
  deepIntegration?: {
    title: string;
    integrationPoints: Array<{ subtitle: string; content: string }>;
  };
  yearlyFortune?: any;
  monthlyFortune?: any;
  warnings?: any;
  fieldStrategies?: any;
  finalSolution?: any;
  saju?: any;
  // Legacy fields
  typeDescription?: string;
  elementAnalysis?: string;
  commonalities?: string;
}

interface MyPageProps {
  onOpenMbtiSaju: () => void;
  onOpenNaming: () => void;
  onOpenCompatibility: () => void;
  isMbtiSajuOpen?: boolean;
  onCloseMbtiSaju?: () => void;
  credits: number;
  refreshCredits: () => Promise<void>;
  session: any; // Add session prop
}

const MyPage: React.FC<MyPageProps> = ({ onOpenMbtiSaju, onOpenNaming, onOpenCompatibility, credits, refreshCredits, session: initialSession }) => {
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const navigate = useNavigate();
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // useCredits hook은 purchaseCredits/spendCredits/checkSufficientCredits에만 사용
  // credits 표시는 props에서 전달받은 값 사용 (즉시 동기화)
  const creditHook = useCredits(initialSession);
  const { purchaseCredits, useCredits: spendCredits, checkSufficientCredits, getCost } = creditHook;

  const fetchProfileData = React.useCallback(async () => {
    try {
      // Safari ITP 대응: 세션 유효성 서버 사이드 검증
      const validSession = await ensureValidSession();
      const activeSession = validSession || initialSession;

      if (!activeSession) {
        setLoading(false);
        navigate('/');
        return;
      }

      const user = activeSession.user;
      const metadata = user.user_metadata || {};
      const { full_name, gender, mbti, birth_date, birth_time, analysis: metaAnalysis } = metadata;

      setProfile({
        id: user.id,
        name: full_name || user.email?.split('@')[0] || '사용자',
        email: user.email,
        gender: gender || '',
        mbti: mbti || '',
        birth_date: birth_date || '',
        birth_time: birth_time || null
      });

      if (metaAnalysis) {
        setAnalysis(metaAnalysis);
      }
      
      if (refreshCredits) {
        refreshCredits().catch(console.error);
      }

    } catch (err: any) {
      console.error('Error fetching profile in MyPage:', err);
      setError(err.message || '프로필 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [navigate, initialSession, refreshCredits]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Handle re-analysis manually
  const handleReAnalyze = () => {
    const isFirstTime = !analysis;
    const cost = getCost('REGENERATE_MBTI_SAJU');
    const confirmMsg = isFirstTime
      ? '처음 분석은 무료입니다. 분석을 시작하시겠습니까?'
      : `기존 분석 결과가 사라지고 새로 분석합니다.\n재분석은 ${cost}코인이 차감됩니다. 계속하시겠습니까?`;
    if (window.confirm(confirmMsg)) {
      handleGenerateAnalysis();
    }
  };

  const handleGenerateAnalysis = async () => {
    // 크레딧 확인 (재분석의 경우)
    if (analysis) {
      if (!checkSufficientCredits('REGENERATE_MBTI_SAJU')) {
        setError(`크레딧이 부족합니다. (재분석 비용: ${getCost('REGENERATE_MBTI_SAJU')} 크레딧)`);
        setIsCreditModalOpen(true);
        return;
      }
    }

    setAnalysisLoading(true);
    setError(null);

    try {
      if (!initialSession) {
        throw new Error('인증되지 않은 사용자입니다. 다시 로그인해주세요.');
      }
      if (!profile) throw new Error('프로필 정보가 없습니다.');

      setIsNavigating(true);
      // 재분석의 경우 선제적으로 크레딧 차감 시도
      if (analysis) {
        const spendSuccess = await spendCredits('REGENERATE_MBTI_SAJU');
        if (!spendSuccess) {
          setIsNavigating(false);
          return;
        }
      }

      const requestPayload = {
        name: profile.name,
        gender: profile.gender,
        birthDate: profile.birth_date,
        birthTime: profile.birth_time,
        mbti: profile.mbti,
      };

      const authHeader = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${initialSession.access_token}`,
      };

      // 1. Core analysis (Nature, Persona, Keywords)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(requestPayload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`분석 실패: ${errData.error || errData.message || res.statusText}`);
      }

      const coreData = await res.json();
      const initialAnalysisData = { ...coreData };
      setAnalysis(initialAnalysisData);

      // Save to Supabase metadata for persistence
      await supabase.auth.updateUser({
        data: { ...profile, analysis: initialAnalysisData }
      });

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsNavigating(false);
      setAnalysisLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000));
      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/';
    }
  };

  const handleWithdraw = async () => {
    const confirm1 = window.confirm('정말 탈퇴하시겠습니까? 탈퇴 시 모든 크레딧 정보와 분석 리포트가 즉시 삭제됩니다.');
    if (!confirm1) return;
    
    const confirm2 = window.confirm('마지막 확인입니다. 모든 데이터는 복구가 불가능합니다. 정말 탈퇴하시겠습니까?');
    if (!confirm2) return;

    setLoading(true);
    try {
      if (!initialSession?.user?.id) throw new Error('유저 정보를 찾을 수 없습니다.');

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', initialSession.user.id);

      if (deleteError) throw deleteError;

      await handleLogout();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      alert('탈퇴 처리 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
      setLoading(false);
    }
  };

  const handleNavigateToHistory = async () => {
    setIsNavigating(true);
    // Give time for spinner to be visible
    await new Promise(resolve => setTimeout(resolve, 800));
    navigate('/usage-history');
  };

  const renderAnalysisSection = (Icon: React.ElementType, title: string, content: string, isLongText = false) => (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/40 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-indigo-500" />
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
      <p className={`text-slate-600 leading-relaxed font-medium whitespace-pre-line`}>{content}</p>
    </div>
  );


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-6">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <span className="text-lg font-bold text-slate-700">마이페이지 정보를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700 mb-2">오류가 발생했습니다</h2>
        <p className="text-red-500 text-center">{error}</p>
        <button onClick={() => navigate('/')} className="mt-6 btn-primary px-6 py-3">홈으로 돌아가기</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-4">
        <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
        <h2 className="text-xl font-bold text-orange-700 mb-2">프로필을 찾을 수 없습니다</h2>
        <p className="text-orange-500 text-center">사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</p>
        <button onClick={handleLogout} className="mt-6 btn-primary px-6 py-3">로그인 페이지로</button>
      </div>
    );
  }

  const formattedGender = profile.gender === 'male' ? '남성' : '여성';

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 border border-slate-100 relative">
          <div className='flex justify-between items-start mb-3'>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900">마이페이지</h1>
            </div>
            <div className='flex gap-2 min-w-fit'>
              <button onClick={() => setIsEditModalOpen(true)} className="btn-secondary px-3 py-2 text-xs md:text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold">정보 수정</button>
              <button onClick={handleLogout} className="btn-secondary px-3 py-2 text-xs md:text-sm bg-slate-900 text-white rounded-lg font-bold">로그아웃</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <p className="text-lg font-semibold text-slate-700 mb-4">{profile.name}님의 분석 리포트</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium mb-6">
                <span>MBTI: <span className="font-bold text-indigo-600">{profile.mbti}</span></span>
                <span>성별: <span className="font-bold text-indigo-600">{formattedGender}</span></span>
                <span>생년월일: <span className="font-bold text-indigo-600">{profile.birth_date}</span></span>
                <span>태어난 시간: <span className="font-bold text-indigo-600">{profile.birth_time || '모름'}</span></span>
              </div>
            </div>

            {/* Credit & Account Management Card */}
            <div className="flex-1 space-y-4">
              {/* Credit Balance Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-slate-800">보유 크레딧</h3>
                  </div>
                  <button
                    onClick={() => setIsCreditModalOpen(true)}
                    className="text-amber-600 text-xs font-bold hover:underline"
                  >
                    충전하기
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-600">{credits}</span>
                  <span className="text-sm text-slate-500">크레딧</span>
                </div>

                {/* Quick Transaction History Summary */}
                <div className="mt-4 pt-4 border-t border-amber-200/50">
                  <div className="flex items-center justify-between text-xs text-amber-700/70 font-bold mb-2">
                    <span>최근 이용 내역</span>
                    <button onClick={() => navigate('/usage-history')} className="hover:text-amber-800 hover:underline">전체보기</button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg text-xs">
                      <span className="text-slate-600">결제 및 환불 문의</span>
                      <button onClick={() => navigate('/support')} className="text-indigo-600 font-bold">고객센터</button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full mt-4">
                  <button
                    onClick={() => setIsCreditModalOpen(true)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-colors shadow-sm"
                  >
                    크레딧 충전하기
                  </button>
                  <button
                    onClick={handleNavigateToHistory}
                    className="flex-1 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-sm hover:bg-amber-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" /> 내역 보기
                  </button>
                </div>
              </div>


            </div>
          </div>
        </div>

        {analysis ? (
          <div className="space-y-6 animate-fade-up">
            {/* Saju Type Section */}
            {(analysis.nature || (analysis as any).typeDescription) && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl shadow-lg shadow-indigo-100/50 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-indigo-900">운명 분석 리포트</h2>
                </div>

                <div className="space-y-6">
                  {/* Day Master Analysis */}
                  <div className='bg-white bg-opacity-60 rounded-xl p-5'>
                    <h3 className="font-bold text-indigo-800 mb-2">💎 나의 천간 및 본성</h3>
                    <p className="text-indigo-900 text-lg font-black mb-1">
                      {analysis.nature?.dayMasterAnalysis || (analysis as any).typeDescription}
                    </p>
                    {/* Show calculation details if available */}
                    {analysis.saju && (
                      <div className="text-sm text-indigo-600 mt-2">
                        <span className="inline-block bg-indigo-100 px-2 py-1 rounded text-xs font-bold mr-2">
                          {analysis.saju.dayMaster.korean}({analysis.saju.dayMaster.chinese})
                        </span>
                        <span className="text-slate-600">{analysis.saju.dayMaster.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Five Elements Analysis */}
                  {(analysis.fiveElements || (analysis as any).elementAnalysis) && (
                    <div>
                      <h3 className="font-bold text-indigo-800 mb-2">🌊 오행 분석</h3>
                      <p className="text-indigo-700 leading-relaxed">
                        {analysis.fiveElements?.summary || (analysis as any).elementAnalysis}
                      </p>
                    </div>
                  )}

                  {/* Five Elements Visualizer */}
                  {analysis.saju && analysis.saju.elements && (
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">오행 분포 (Five Elements)</h4>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                          { label: '목(木)', count: analysis.saju.elements.wood, color: 'bg-green-100 text-green-700 border-green-200' },
                          { label: '화(火)', count: analysis.saju.elements.fire, color: 'bg-red-100 text-red-700 border-red-200' },
                          { label: '토(土)', count: analysis.saju.elements.earth, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                          { label: '금(金)', count: analysis.saju.elements.metal, color: 'bg-slate-100 text-slate-700 border-slate-200' },
                          { label: '수(水)', count: analysis.saju.elements.water, color: 'bg-blue-100 text-blue-700 border-blue-200' }
                        ].map((el) => (
                          <div key={el.label} className={`rounded-xl p-2 border ${el.color} flex flex-col items-center justify-center`}>
                            <span className="text-2xl font-black mb-1">{el.count}</span>
                            <span className="text-xs font-bold">{el.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

                    {renderAnalysisSection(Key, "MBTI와 사주 핵심 키워드", 
                      Array.isArray(analysis.keywords) 
                        ? (analysis.keywords as string[]).join(', ') 
                        : (typeof analysis.keywords === 'string' ? analysis.keywords : '')
                    )}
            {(analysis.deepIntegration || (analysis as any).commonalities) &&
              renderAnalysisSection(Users, "두 결과의 공통점 및 융합 분석",
                analysis.deepIntegration?.integrationPoints 
                  ? analysis.deepIntegration.integrationPoints.map((p: any) => p.content).join('\n\n') 
                  : (analysis as any).commonalities, 
                true)
            }


            {/* Navigation Buttons for Deep Analysis */}
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={onOpenMbtiSaju}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col justify-between h-40 group"
              >
                <span className="text-2xl mb-2">🔮</span>
                <div>
                  <h3 className="text-xl font-bold mb-1">내 MBTI & 사주<br />심층 분석 보러가기</h3>
                  <p className="text-indigo-100 text-sm opacity-0 group-hover:opacity-100 transition-opacity">나에 대해 더 깊이 알아보기 &rarr;</p>
                </div>
              </button>

              <div className="grid gap-4">
                <button
                  onClick={onOpenNaming}
                  className="bg-white border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-left flex items-center gap-4 group"
                >
                  <span className="text-2xl bg-teal-50 p-3 rounded-full">✍️</span>
                  <div>
                    <h3 className="font-bold text-lg">사주 작명소</h3>
                    <p className="text-slate-500 text-sm">사주에 맞는 행운의 이름</p>
                  </div>
                </button>

                <button
                  onClick={onOpenCompatibility}
                  className="bg-white border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-left flex items-center gap-4 group"
                >
                  <span className="text-2xl bg-rose-50 p-3 rounded-full">💑</span>
                  <div>
                    <h3 className="font-bold text-lg">궁합 보러 가기</h3>
                    <p className="text-slate-500 text-sm">그 사람과의 시너지는?</p>
                  </div>
                </button>
              </div>
            </div>

            <div className='text-center mt-12'>
              <button
                onClick={handleReAnalyze}
                disabled={analysisLoading}
                className="text-slate-400 hover:text-indigo-500 underline text-sm transition-colors"
              >
                {analysisLoading ? '분석 중...' : '다시 분석하기'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center bg-white p-12 rounded-2xl shadow-lg border border-slate-100">
            <Sparkles className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">아직 분석 결과가 없습니다</h2>
            <p className="text-slate-500 font-medium mb-8">아래 버튼을 눌러 종합 분석을 받아보세요.</p>
            <button
              onClick={handleGenerateAnalysis}
              className="btn-primary w-full sm:w-auto px-10 py-4 text-lg font-bold flex items-center justify-center gap-2 mx-auto"
              disabled={analysisLoading}
            >
              {analysisLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>분석 중입니다...</span>
                </>
              ) : (
                "내 운명 분석 시작"
              )}
            </button>
          </div>
        )}

        {/* Footer Support Links */}
        <div className="mt-16 border-t border-slate-200 pt-8 text-center text-slate-400 text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <button onClick={() => navigate('/terms')} className="hover:text-slate-600">이용약관</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-600">개인정보처리방침</button>
            <button onClick={() => navigate('/support')} className="hover:text-slate-600">고객센터 문의</button>
          </div>
          <div className='mb-4'>
            <button onClick={handleWithdraw} className="text-slate-300 hover:text-rose-400 underline transition-colors text-xs">회원 탈퇴</button>
          </div>
          <p>© 2026 MBTI Saju. All rights reserved.</p>
        </div>
 
        {/* Navigation Overlay Spinner */}
        {isNavigating && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-indigo-900 font-bold animate-pulse">정보를 불러오는 중입니다...</p>
          </div>
        )}
      </div>

      <AnalysisModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="edit"
        initialData={profile}
        onUpdate={() => fetchProfileData()}
      />

      <CreditPurchaseModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        userEmail={profile?.email}
        currentCredits={credits}
        onSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
          await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
        }}
      />
    </div>
  );
};

export default MyPage;
