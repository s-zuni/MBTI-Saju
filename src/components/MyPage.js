import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react'; // Import icons for better UI

const MyPage = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        navigate('/');
        return;
      }

      if (!session) {
        navigate('/');
        setLoading(false);
        return;
      }

      const user = session.user;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, gender, mbti, birth_date, birth_time, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
      } else {
        setProfile(profileData);
      }

      // Fetch analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .select('saju, mbti_analysis, trait, jobs, match')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (analysisError) {
        setError(analysisError.message);
      } else {
        setAnalysis(analysisData);
      }

      setLoading(false);
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-lg font-medium text-slate-700">리포트 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700 mb-2">오류가 발생했습니다</h2>
        <p className="text-red-500 text-center">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 btn-primary px-6 py-3"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (!profile || !analysis) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-4">
        <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
        <h2 className="text-xl font-bold text-orange-700 mb-2">데이터 없음</h2>
        <p className="text-orange-500 text-center">프로필 또는 분석 데이터를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 btn-primary px-6 py-3"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const formatAnalysisContent = (content) => {
    return content ? content.split('\n').map((item, index) => (
      <p key={index} className="text-sm leading-relaxed mb-1 text-slate-700">{item}</p>
    )) : <p className="text-sm leading-relaxed text-slate-500">데이터가 없습니다.</p>;
  };

  const formattedGender = profile.gender === 'male' ? '남성' : '여성';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 border border-slate-100">
          <h1 className="text-4xl font-black text-slate-900 mb-3">마이페이지</h1>
          <p className="text-lg font-semibold text-slate-700 mb-6">{profile.name}님의 분석 리포트</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium mb-6">
            <span>MBTI: <span className="font-bold text-indigo-600">{profile.mbti}</span></span>
            <span>성별: <span className="font-bold text-indigo-600">{formattedGender}</span></span>
            <span>생년월일: <span className="font-bold text-indigo-600">{profile.birth_date}</span></span>
            <span>생시: <span className="font-bold text-indigo-600">{profile.birth_time}</span></span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary px-5 py-2 text-base"
            disabled={loading}
          >
            로그아웃
          </button>
        </div>

        <div className="space-y-8">
          {/* Saju Analysis */}
          <div className="bg-white border border-blue-100 rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">사주 분석</h2>
            {formatAnalysisContent(analysis.saju)}
          </div>

          {/* MBTI Analysis */}
          <div className="bg-white border border-green-100 rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-green-800 mb-4">MBTI 분석</h2>
            {formatAnalysisContent(analysis.mbti_analysis)}
          </div>

          {/* Trait Synthesis */}
          <div className="bg-white border border-purple-100 rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-purple-800 mb-4">공통 성향</h2>
            {formatAnalysisContent(analysis.trait)}
          </div>

          {/* Recommended Jobs */}
          <div className="bg-white border border-yellow-100 rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">추천 직업</h2>
            {formatAnalysisContent(analysis.jobs)}
          </div>

          {/* Compatibility Match */}
          <div className="bg-white border border-red-100 rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">추천 궁합</h2>
            {formatAnalysisContent(analysis.match)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
