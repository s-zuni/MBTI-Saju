import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Users, Sparkles, CreditCard, Loader2, AlertCircle, Key } from 'lucide-react';
import AnalysisModal from './AnalysisModal';
import SubscriptionModal from './SubscriptionModal';
import { Tier } from '../hooks/useSubscription';

interface Profile {
  id: string; // Added ID for updates
  name: string;
  email: string | undefined;
  gender: string;
  mbti: string;
  birth_date: string;
  birth_time: string | null;
  tier?: Tier; // Added tier
}

interface Analysis {
  keywords: string;
  commonalities: string;
  typeDescription?: string;
  elementAnalysis?: string;
  detailedAnalysis?: string;
  mbtiAnalysis?: string;
  sajuAnalysis?: string;
  fusedAnalysis?: string;
  saju?: any;
}

interface MyPageProps {
  onOpenMbtiSaju: () => void;
  onOpenHealing: () => void;
  onOpenCompatibility: () => void;
  isMbtiSajuOpen?: boolean;
  onCloseMbtiSaju?: () => void;
}

const MyPage: React.FC<MyPageProps> = ({ onOpenMbtiSaju, onOpenHealing, onOpenCompatibility }) => {
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false); // Subscription Modal State
  const navigate = useNavigate();

  const fetchProfileData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      navigate('/');
      return;
    }

    const user = session.user;

    // Fetch Tier from profiles table to be accurate
    const { data: profileTableData } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const currentTier = (profileTableData?.tier as Tier) || 'free';

    const { full_name, gender, mbti, birth_date, birth_time, analysis } = user.user_metadata;

    if (full_name && mbti && birth_date) {
      setProfile({
        id: user.id,
        name: full_name,
        email: user.email,
        gender, mbti, birth_date, birth_time,
        tier: currentTier
      });
      if (analysis) {
        setAnalysis(analysis);
      }
    } else {
      setError('프로필 정보가 완전하지 않습니다. 앱을 원활하게 이용하시려면, 로그아웃 후 다시 회원가입하여 프로필 정보를 완성해주세요.');
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Handle re-analysis manually
  const handleReAnalyze = () => {
    if (window.confirm('기존 분석 결과가 사라지고 새로 분석합니다. 계속하시겠습니까?')) {
      handleGenerateAnalysis();
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalysisLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('인증되지 않은 사용자입니다. 다시 로그인해주세요.');
      }

      if (!profile) throw new Error('프로필 정보가 없습니다.');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          gender: profile.gender,
          birthDate: profile.birth_date,
          birthTime: profile.birth_time,
          mbti: profile.mbti,
        })
      });

      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        // Response is not JSON
      }

      if (!response.ok) {
        throw new Error(
          (responseData && responseData.error) ||
          responseText ||
          '분석 중 오류가 발생했습니다.'
        );
      }

      const analysisData = responseData;
      setAnalysis(analysisData);

      // Save the analysis to user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...profile, analysis: analysisData }
      });

      if (updateError) {
        console.error('Failed to save analysis to user profile:', updateError);
      }

    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCancelSubscription = async () => {
    if (!profile || profile.tier === 'free') return;

    if (window.confirm('정말 구독을 해지하시겠습니까? 해지 시 무료 등급으로 전환됩니다.')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ tier: 'free' })
          .eq('id', profile.id);

        if (error) throw error;
        alert('구독이 해지되었습니다.');
        fetchProfileData(); // Refresh
      } catch (e) {
        console.error(e);
        alert('해지 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderAnalysisSection = (Icon: React.ElementType, title: string, content: string, isLongText = false) => (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/40 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-indigo-500" />
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
      <p className={`text-slate-600 leading-relaxed font-medium ${isLongText ? 'whitespace-pre-line' : ''}`}>{content}</p>
    </div>
  );


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-lg font-medium text-slate-700">마이페이지 불러오는 중...</span>
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
  const isPremium = profile.tier === 'basic' || profile.tier === 'deep';

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 border border-slate-100 relative">
          <div className='flex justify-between items-start mb-3'>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900">마이페이지</h1>
              {isPremium && (
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                  {profile.tier?.toUpperCase()} MEMBER
                </span>
              )}
            </div>
            <div className='flex gap-2 invisible md:visible'> {/* Hide on mobile, use bottom nav or profile section */}
              <button onClick={() => setIsEditModalOpen(true)} className="btn-secondary px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600">정보 수정</button>
              <button onClick={handleLogout} className="btn-secondary px-4 py-2 text-sm">로그아웃</button>
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

            {/* Subscription Management Card */}
            <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-800">구독 멤버십</h3>
                </div>
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="text-indigo-600 text-xs font-bold hover:underline"
                >
                  {isPremium ? '변경' : '업그레이드'}
                </button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">현재 이용 중인 플랜</span>
                <span className={`font-bold ${isPremium ? 'text-indigo-600' : 'text-slate-600'}`}>
                  {profile.tier === 'free' ? 'Free (무료)' :
                    profile.tier === 'basic' ? 'Basic (베이직)' : 'Deep (딥)'}
                </span>
              </div>

              {isPremium ? (
                <button
                  onClick={handleCancelSubscription}
                  className="w-full mt-4 py-2 text-xs text-red-400 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
                >
                  구독 해지하기
                </button>
              ) : (
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="w-full mt-4 py-2 text-xs bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  프리미엄 기능 잠금해제
                </button>
              )}
            </div>
          </div>
        </div>

        {analysis ? (
          <div className="space-y-6 animate-fade-up">
            {/* Saju Type Section */}
            {analysis.typeDescription && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl shadow-lg shadow-indigo-100/50 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-indigo-900">운명 분석 리포트</h2>
                </div>

                <div className="space-y-6">
                  {/* Day Master */}
                  <div className='bg-white bg-opacity-60 rounded-xl p-5'>
                    <h3 className="font-bold text-indigo-800 mb-2">💎 나의 천간 (Day Master)</h3>
                    <p className="text-indigo-900 text-lg font-black mb-1">{analysis.typeDescription}</p>
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

                  {/* Element Analysis Text */}
                  {analysis.elementAnalysis && (
                    <div>
                      <h3 className="font-bold text-indigo-800 mb-2">🌊 오행 분석</h3>
                      <p className="text-indigo-700 leading-relaxed">{analysis.elementAnalysis}</p>
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

            {renderAnalysisSection(Key, "MBTI와 사주 핵심 키워드", analysis.keywords)}
            {renderAnalysisSection(Users, "두 결과의 공통점 및 특이사항", analysis.commonalities)}

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
                  onClick={onOpenHealing}
                  className="bg-white border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-left flex items-center gap-4 group"
                >
                  <span className="text-2xl bg-teal-50 p-3 rounded-full">🌿</span>
                  <div>
                    <h3 className="font-bold text-lg">나에게 맞는 여행지 추천</h3>
                    <p className="text-slate-500 text-sm">힐링이 필요하다면?</p>
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
            <p className="text-slate-500 font-medium mb-8">아래 버튼을 눌러 AI 기반 종합 분석을 받아보세요.</p>
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
                "AI로 내 운명 분석하기"
              )}
            </button>
          </div>
        )}

        {/* Footer Support Links (Requested Enhancement) */}
        <div className="mt-16 border-t border-slate-200 pt-8 text-center text-slate-400 text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <button onClick={() => navigate('/terms')} className="hover:text-slate-600">이용약관</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-600">개인정보처리방침</button>
            <a href="mailto:support@mbtisaju.com" className="hover:text-slate-600">고객센터 문의</a>
          </div>
          <p>© 2026 MBTI Saju. All rights reserved.</p>
        </div>

      </div>

      <AnalysisModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="edit"
        initialData={profile}
        onUpdate={() => fetchProfileData()} // Refresh after edit
      />

      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        currentTier={profile?.tier || 'free'}
        userEmail={profile?.email}
        onSuccess={() => {
          fetchProfileData();
          setIsSubModalOpen(false);
        }}
      />
    </div>
  );
};

export default MyPage;
