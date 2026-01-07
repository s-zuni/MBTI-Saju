import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Sparkles, Key, Users, Calendar } from 'lucide-react';
import AnalysisModal from './AnalysisModal';

interface Profile {
  name: string;
  email: string | undefined;
  gender: string;
  mbti: string;
  birth_date: string;
  birth_time: string | null;
}

interface Analysis {
  keywords: string;
  commonalities: string;
  fortune2026: string;
  typeDescription?: string; // Saju Day Master description from AI
  elementAnalysis?: string; // Element analysis from AI
  saju?: any; // Full Saju calculation result
}

const MyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/'); // Redirect if no session
        return;
      }

      const user = session.user;

      // The user object from auth might contain the metadata we need.
      // Let's check user_metadata first.
      const { full_name, gender, mbti, birth_date, birth_time, analysis } = user.user_metadata;

      if (full_name && mbti && birth_date) {
        setProfile({
          name: full_name,
          email: user.email,
          gender, mbti, birth_date, birth_time
        });
        if (analysis) {
          setAnalysis(analysis);
        }
      } else {
        // If essential metadata is missing, it indicates an incomplete profile.
        setError('프로필 정보가 완전하지 않습니다. 앱을 원활하게 이용하시려면, 로그아웃 후 다시 회원가입하여 프로필 정보를 완성해주세요.');
      }

      setLoading(false);
    };

    fetchProfileData();
  }, [navigate]);

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
        // We can choose to notify the user, but for now, we'll just log it.
        // The analysis is still visible for the current session.
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

  const renderAnalysisSection = (Icon: React.ElementType, title: string, content: string) => (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/40 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-indigo-500" />
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
      <p className="text-slate-600 leading-relaxed font-medium">{content}</p>
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

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 border border-slate-100 relative">
          <div className='flex justify-between items-start mb-3'>
            <h1 className="text-4xl font-black text-slate-900">마이페이지</h1>
            <div className='flex gap-2'>
              <button onClick={() => setIsEditModalOpen(true)} className="btn-secondary px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600">정보 수정</button>
              <button onClick={handleLogout} className="btn-secondary px-4 py-2 text-sm">로그아웃</button>
            </div>
          </div>
          <p className="text-lg font-semibold text-slate-700 mb-6">{profile.name}님의 분석 리포트</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium mb-6">
            <span>MBTI: <span className="font-bold text-indigo-600">{profile.mbti}</span></span>
            <span>성별: <span className="font-bold text-indigo-600">{formattedGender}</span></span>
            <span>생년월일: <span className="font-bold text-indigo-600">{profile.birth_date}</span></span>
            <span>생시: <span className="font-bold text-indigo-600">{profile.birth_time || '알 수 없음'}</span></span>
          </div>
        </div>

        {analysis ? (
          <div className="space-y-8 animate-fade-up">
            {/* Saju Type Section */}
            {analysis.typeDescription && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl shadow-lg shadow-indigo-100/50 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-2xl font-bold text-indigo-900">나의 사주 유형</h2>
                </div>
                <p className="text-indigo-800 leading-relaxed font-bold text-lg">{analysis.typeDescription}</p>
                {analysis.elementAnalysis && <p className="text-indigo-700 mt-2">{analysis.elementAnalysis}</p>}
              </div>
            )}

            {renderAnalysisSection(Key, "MBTI와 사주 핵심 키워드", analysis.keywords)}
            {renderAnalysisSection(Users, "두 결과의 공통점 및 특이사항", analysis.commonalities)}
            {renderAnalysisSection(Calendar, "2026년 간단 운세", analysis.fortune2026)}

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
      </div>

      <AnalysisModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="edit"
        initialData={profile}
      />
    </div>
  );
};

export default MyPage;
