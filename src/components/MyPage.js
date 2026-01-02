import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Sparkles, Key, Users, Calendar } from 'lucide-react'; // Import icons

const MyPage = () => {
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null); // Will hold the new analysis
  const [error, setError] = useState(null);
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
      const { full_name, gender, mbti, birth_date, birth_time } = user.user_metadata;

      if (full_name && mbti && birth_date) {
        setProfile({
            name: full_name,
            email: user.email,
            gender, mbti, birth_date, birth_time
        });
      } else {
        // Fallback to 'profiles' table if metadata is incomplete
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name, gender, mbti, birth_date, birth_time, email')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
            setError('프로필 정보를 불러오는데 실패했습니다.');
        } else {
            setProfile(profileData);
        }
      }

      setLoading(false);
    };

    fetchProfileData();
  }, [navigate]);
  
  const handleGenerateAnalysis = async () => {
    setAnalysisLoading(true);
    setError(null);

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('인증되지 않은 사용자입니다. 다시 로그인해주세요.');
        }
        
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '분석 중 오류가 발생했습니다.');
        }

        const analysisData = await response.json();
        setAnalysis(analysisData);

    } catch (e) {
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

  const renderAnalysisSection = (Icon, title, content) => (
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
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-10 border border-slate-100">
          <h1 className="text-4xl font-black text-slate-900 mb-3">마이페이지</h1>
          <p className="text-lg font-semibold text-slate-700 mb-6">{profile.name}님의 분석 리포트</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium mb-6">
            <span>MBTI: <span className="font-bold text-indigo-600">{profile.mbti}</span></span>
            <span>성별: <span className="font-bold text-indigo-600">{formattedGender}</span></span>
            <span>생년월일: <span className="font-bold text-indigo-600">{profile.birth_date}</span></span>
            <span>생시: <span className="font-bold text-indigo-600">{profile.birth_time || '알 수 없음'}</span></span>
          </div>
          <button onClick={handleLogout} className="btn-secondary px-5 py-2 text-base">로그아웃</button>
        </div>

        {analysis ? (
            <div className="space-y-8 animate-fade-up">
                {renderAnalysisSection(Key, "MBTI와 사주 핵심 키워드", analysis.keywords)}
                {renderAnalysisSection(Users, "두 결과의 공통점 및 특이사항", analysis.commonalities)}
                {renderAnalysisSection(Calendar, "2026년 간단 운세", analysis.fortune2026)}
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
    </div>
  );
};

export default MyPage;
