import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; // Will be used for redirection

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
        navigate('/'); // Redirect to home if no session
        return;
      }

      if (!session) {
        navigate('/'); // Redirect to home if no session
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
        .order('created_at', { ascending: false }) // Get the latest analysis
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
      navigate('/'); // Redirect to home after logout
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-10">Loading your report...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  if (!profile || !analysis) {
    return <div className="text-center py-10">No profile or analysis found.</div>;
  }

  const formatAnalysisContent = (content) => {
    // Simple formatting for display, assumes content is plain text
    return content ? content.split('\n').map((item, index) => (
      <p key={index} className="text-sm leading-relaxed mb-1">{item}</p>
    )) : <p className="text-sm leading-relaxed text-gray-500">No data available.</p>;
  };


  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}님의 분석 리포트</h1>
        <p className="text-gray-600 text-sm">
          MBTI: {profile.mbti} | 성별: {profile.gender} | 생년월일: {profile.birth_date} | 생시: {profile.birth_time}
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          Logout
        </button>
      </div>

      <div className="space-y-6">
        {/* Saju Analysis */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">사주 분석</h2>
          {formatAnalysisContent(analysis.saju)}
        </div>

        {/* MBTI Analysis */}
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-green-800 mb-3">MBTI 분석</h2>
          {formatAnalysisContent(analysis.mbti_analysis)}
        </div>

        {/* Trait Synthesis */}
        <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-purple-800 mb-3">공통 성향</h2>
          {formatAnalysisContent(analysis.trait)}
        </div>

        {/* Recommended Jobs */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-3">추천 직업</h2>
          {formatAnalysisContent(analysis.jobs)}
        </div>

        {/* Compatibility Match */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-3">추천 궁합</h2>
          {formatAnalysisContent(analysis.match)}
        </div>
      </div>
    </div>
  );
};

export default MyPage;
