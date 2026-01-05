import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import FeatureGrids from './components/FeatureGrids';
import AnalysisModal from './components/AnalysisModal';
import MyPage from './components/MyPage';
import FortuneModal from './components/FortuneModal';
import MbtiSajuModal from './components/MbtiSajuModal';
import { supabase } from './supabaseClient';
import BottomNav from './components/BottomNav';
import CommunityPage from './components/CommunityPage';
import RecommendationModal from './components/RecommendationModal';
import CompatibilityModal from './components/CompatibilityModal';

function App() {
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisModalMode, setAnalysisModalMode] = useState<'signup' | 'login'>('signup');
  const [showFortuneModal, setShowFortuneModal] = useState(false);
  const [showMbtiSajuModal, setShowMbtiSajuModal] = useState(false);

  // New Modal States
  const [showRecModal, setShowRecModal] = useState(false);
  const [recModalTab, setRecModalTab] = useState<'travel' | 'career'>('travel');
  const [showCompModal, setShowCompModal] = useState(false);

  const [fortune, setFortune] = useState<string | null>(null);
  const [isFortuneLoading, setIsFortuneLoading] = useState(false);


  const openAnalysisModal = (mode: 'signup' | 'login') => {
    setAnalysisModalMode(mode);
    setShowAnalysisModal(true);
  };

  const closeAnalysisModal = () => {
    setShowAnalysisModal(false);
  };

  const handleFetchFortune = async () => {
    setIsFortuneLoading(true);
    setFortune(null);
    setShowFortuneModal(true); // Open modal immediately

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch fortune.");
      }

      const data = await response.json();
      setFortune(data.fortune);

    } catch (error: any) {
      console.error(error);
      setFortune("운세를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsFortuneLoading(false);
    }
  };

  const closeFortuneModal = () => setShowFortuneModal(false);

  const openMbtiSajuModal = () => setShowMbtiSajuModal(true);
  const closeMbtiSajuModal = () => setShowMbtiSajuModal(false);

  const openRecModal = (tab: 'travel' | 'career') => {
    setRecModalTab(tab);
    setShowRecModal(true);
  };
  const closeRecModal = () => setShowRecModal(false);

  const openCompModal = () => setShowCompModal(true);
  const closeCompModal = () => setShowCompModal(false);


  return (
    <BrowserRouter>
      <div className="selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden pb-20 md:pb-0"> {/* Added padding for BottomNav */}
        <Navbar
          onLoginClick={() => openAnalysisModal('login')}
          onSignupClick={() => openAnalysisModal('signup')}
          onFortuneClick={handleFetchFortune}
          onMbtiSajuClick={openMbtiSajuModal}
        />

        <Routes>
          <Route path="/" element={
            <>
              <HeroSection onStart={() => openAnalysisModal('signup')} />
              <FeatureGrids
                onStart={() => openAnalysisModal('signup')}
                onFortuneClick={handleFetchFortune}
                onMbtiSajuClick={openMbtiSajuModal}
                onTravelClick={() => openRecModal('travel')}
                onJobClick={() => openRecModal('career')}
                onCompatibilityClick={openCompModal}
              />

              {/* Featured Analysis Section */}
              <section className="py-24 bg-slate-50/50 relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                <div className="section-container relative z-10">
                  <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">MBTI와 사주의 새로운 만남</h2>
                    <p className="text-slate-500 font-medium">단순한 재미를 넘어, 깊이 있는 자아 분석을 제공합니다.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                        {/* Placeholder for Brain icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-7 h-7 text-indigo-600"><path d="M9 18a4 4 0 0 1-2-3.82 4 4 0 0 1-1-2.18V7l3-4 4 4" /><path d="M15 18a4 4 0 0 0 2-3.82 4 4 0 0 0 1-2.18V7l-3-4-4 4" /><path d="M12 2c-1.8 0-3.6.48-5.11 1.34A6 6 0 0 0 12 18V2z" /><path d="M12 2a6 6 0 0 0 5.11 1.34A6 6 0 0 1 12 18V2z" /><path d="M12 18h0" /></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-3">심도 있는 성격 매칭</h3>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">당신의 무의식과 타고난 운명이 어떻게 연결되어 있는지 과학적으로 분석합니다.</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform">
                      <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                        {/* Placeholder for Briefcase icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase w-7 h-7 text-teal-600"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M22 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2" /><path d="M12 15h0" /></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-3">커리어 컨설팅</h3>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">나의 선천적 기운과 후천적 성향이 가장 잘 발휘될 수 있는 직업군을 제안합니다.</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform">
                      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                        {/* Placeholder for Users icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-7 h-7 text-purple-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-3">인간관계 솔루션</h3>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">당신이 조심해야 할 운명과 시너지를 낼 수 있는 인연의 색깔을 알려드립니다.</p>
                    </div>
                  </div>
                </div>
              </section>
              <Footer />
            </>
          } />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>

        <BottomNav
          onFortuneClick={handleFetchFortune}
          onMbtiSajuClick={openMbtiSajuModal}
        />

        {/* Conditionally render the new AnalysisModal */}
        <AnalysisModal isOpen={showAnalysisModal} onClose={closeAnalysisModal} mode={analysisModalMode} />
        <FortuneModal isOpen={showFortuneModal} onClose={closeFortuneModal} fortune={fortune} loading={isFortuneLoading} />
        <MbtiSajuModal isOpen={showMbtiSajuModal} onClose={closeMbtiSajuModal} />

        <RecommendationModal isOpen={showRecModal} onClose={closeRecModal} initialTab={recModalTab} />
        <CompatibilityModal isOpen={showCompModal} onClose={closeCompModal} />
      </div>
    </BrowserRouter>
  );
}

// A simple component to handle OAuth redirects. Supabase client will handle session.
const AuthCallback = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <p>Loading...</p>
    </div>
  );
};

export default App;
