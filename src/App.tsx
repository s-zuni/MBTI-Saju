import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import FeatureGrids from './components/FeatureGrids';
import { supabase } from './supabaseClient';
import BottomNav from './components/BottomNav';
import CommunityPage from './components/CommunityPage';
import SplashScreen from './components/SplashScreen';
import MyPage from './components/MyPage';
import ChatPage from './pages/ChatPage';
import FortunePage from './pages/FortunePage';
import StorePage from './pages/StorePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RelationshipPage from './pages/RelationshipPage';
import { useSubscription } from './hooks/useSubscription';
import { useCredits } from './hooks/useCredits';
import { SERVICE_COSTS } from './config/creditConfig';
import PremiumBanner from './components/PremiumBanner';
import PricingPage from './pages/PricingPage';
import UsageHistoryPage from './pages/UsageHistoryPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import SupportPage from './pages/SupportPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import PaymentManagement from './pages/admin/PaymentManagement';
import RefundManagement from './pages/admin/RefundManagement';
import PlanManagement from './pages/admin/PlanManagement';
import { useAuth } from './hooks/useAuth';
import { useModalStore } from './hooks/useModalStore';

// Lazy load modals for better initial performance
const AnalysisModal = lazy(() => import('./components/AnalysisModal'));
const FortuneModal = lazy(() => import('./components/FortuneModal'));
const MbtiSajuModal = lazy(() => import('./components/MbtiSajuModal'));
const RecommendationModal = lazy(() => import('./components/RecommendationModal'));
const CompatibilityModal = lazy(() => import('./components/CompatibilityModal'));
const TripModal = lazy(() => import('./components/TripModal'));
const HealingModal = lazy(() => import('./components/HealingModal'));
const JobModal = lazy(() => import('./components/JobModal'));
const TarotModal = lazy(() => import('./components/Tarot/TarotModal'));
const CoinPurchaseModal = lazy(() => import('./components/CoinPurchaseModal'));
const OnboardingModal = lazy(() => import('./components/OnboardingModal'));

function App() {
  const [showSplash, setShowSplash] = useState(false); // Disable splash screen by default for faster access
  const { session, loading: isAuthLoading } = useAuth();
  const { modals, openModal, closeModal, closeAllModals } = useModalStore();

  const [fortune, setFortune] = useState<{
    today: { fortune: string; lucky: { color: string; number: string; direction: string } };
    tomorrow: { fortune: string; lucky: { color: string; number: string; direction: string } };
  } | null>(null);
  const [isFortuneLoading, setIsFortuneLoading] = useState(false);

  const { tier } = useSubscription(session);
  const { credits: coins, purchaseCredits, useCredits: consumeCredits, requestRefund } = useCredits(session);
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

  // Check if profile needs completion
  useEffect(() => {
    if (session?.user && !isAuthLoading) {
      const meta = session.user.user_metadata;
      const needsProfile = !meta?.mbti || !meta?.birth_date || !meta?.gender;

      if (needsProfile) {
        openModal('analysis', 'complete_profile');
      } else {
        const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding_${session.user.id}`);
        if (!hasSeenOnboarding) {
          openModal('onboarding');
        }
      }
    }
  }, [session, isAuthLoading, openModal]);

  const handleCloseOnboarding = () => {
    if (session?.user) {
      localStorage.setItem(`hasSeenOnboarding_${session.user.id}`, 'true');
    }
    closeModal('onboarding');
  };

  const handleFetchFortune = async () => {
    setIsFortuneLoading(true);
    setFortune(null);
    openModal('fortune');

    try {
      if (!session) throw new Error("User not authenticated");
      const birthDate = session.user.user_metadata.birth_date;
      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ birthDate })
      });
      if (!response.ok) throw new Error("Failed to fetch fortune.");
      const data = await response.json();
      setFortune(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsFortuneLoading(false);
    }
  };

  // handleSwitchService and checkCoinsAndOpen removed as components now handle their own navigation and credit checks

  const handleStart = async () => {
    if (session) handleFetchFortune();
    else openModal('analysis', 'signup');
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 로딩 화면 표시 로직을 BrowserRouter 내부로 이동하여 /auth/callback 경로가 차단되지 않도록 함
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* 인증 콜백 경로는 로딩 상태와 무관하게 즉시 렌더링하여 데드락 방지 */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Admin Login - No Sidebar/Header/Footer */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin System - With Sidebar, No Header/Footer */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="payments" element={<PaymentManagement />} />
            <Route path="refunds" element={<RefundManagement />} />
            <Route path="plans" element={<PlanManagement />} />
          </Route>

          {/* 나머지 모든 경로는 로딩 상태에 따라 분기 */}
          <Route path="*" element={
            isAuthLoading ? (
              <div className="min-h-screen bg-indigo-50/50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-800">MBTIJU</h2>
                <p className="text-sm text-slate-500 mt-2">잠시만 기다려주세요...</p>
              </div>
            ) : (
              <div className="selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden pb-20 md:pb-0">
                <Navbar />

                <Routes>
                  <Route path="/" element={
                    <>
                      <HeroSection onStart={handleStart} user={session?.user} />
                      <FeatureGrids />

                      {/* Featured Analysis Section */}
                      <section className="py-24 bg-slate-50/50 relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                        <div className="section-container relative z-10">
                          <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">MBTI와 사주의 새로운 만남</h2>
                            <p className="text-slate-500 font-medium">단순한 재미를 넘어, 깊이 있는 자아 분석을 제공합니다.</p>
                          </div>

                          <div className="grid md:grid-cols-3 gap-8">
                            <button
                              onClick={() => {
                                if (session) openModal('mbtiSaju');
                                else openModal('analysis', 'login');
                              }}
                              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                            >
                              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-7 h-7 text-indigo-600"><path d="M9 18a4 4 0 0 1-2-3.82 4 4 0 0 1-1-2.18V7l3-4 4 4" /><path d="M15 18a4 4 0 0 0 2-3.82 4 4 0 0 0 1-2.18V7l-3-4-4 4" /><path d="M12 2c-1.8 0-3.6.48-5.11 1.34A6 6 0 0 0 12 18V2z" /><path d="M12 2a6 6 0 0 0 5.11 1.34A6 6 0 0 1 12 18V2z" /><path d="M12 18h0" /></svg>
                              </div>
                              <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">심도 있는 성격 매칭</h3>
                              <p className="text-sm text-slate-500 leading-relaxed font-medium">당신의 무의식과 타고난 운명이 어떻게 연결되어 있는지 과학적으로 분석합니다.</p>
                            </button>

                            <button
                              onClick={() => openModal('job')}
                              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                            >
                              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase w-7 h-7 text-teal-600"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M22 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2" /><path d="M12 15h0" /></svg>
                              </div>
                              <h3 className="text-xl font-bold mb-3 group-hover:text-teal-600 transition-colors">커리어 컨설팅</h3>
                              <p className="text-sm text-slate-500 leading-relaxed font-medium">나의 선천적 기운과 후천적 성향이 가장 잘 발휘될 수 있는 직업군을 제안합니다.</p>
                            </button>

                            <button
                              onClick={() => openModal('compatibility')}
                              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                            >
                              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-7 h-7 text-purple-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                              </div>
                              <h3 className="text-xl font-bold mb-3 group-hover:text-purple-600 transition-colors">인간관계 솔루션</h3>
                              <p className="text-sm text-slate-500 leading-relaxed font-medium">당신이 조심해야 할 운명과 시너지를 낼 수 있는 인연의 색깔을 알려드립니다.</p>
                            </button>
                          </div>
                        </div>
                      </section>
                    </>
                  } />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/mypage" element={
                    <MyPage
                      onOpenMbtiSaju={() => openModal('mbtiSaju')}
                      onOpenHealing={() => openModal('healing')}
                      onOpenCompatibility={() => openModal('compatibility')}
                    />
                  } />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/fortune" element={
                    <FortunePage
                      onFortuneClick={handleFetchFortune}
                      onMbtiSajuClick={() => {
                        if (session) openModal('mbtiSaju');
                        else openModal('analysis', 'login');
                      }}
                      onTripClick={() => openModal('trip')}
                      onHealingClick={() => openModal('healing')}
                      onJobClick={() => openModal('job')}
                      onCompatibilityClick={() => openModal('compatibility')}
                    />
                  } />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/pricing" element={
                    <PricingPage
                      currentCredits={coins}
                      onPurchaseSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                        await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                      }}
                    />
                  } />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/fail" element={<PaymentFail />} />
                  <Route path="/usage-history" element={
                    <UsageHistoryPage
                      currentCredits={coins}
                      onRequestRefund={requestRefund}
                    />
                  } />
                  <Route path="/room" element={<ChatPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/relationship" element={<RelationshipPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                </Routes>

                <Footer />
                <BottomNav />

                {/* Modals are now lazy loaded and managed by openModal store */}
                <AnalysisModal
                  isOpen={modals?.analysis?.isOpen || false}
                  onClose={() => closeModal('analysis')}
                  mode={modals?.analysis?.mode}
                  initialData={session?.user?.user_metadata}
                />
                <FortuneModal
                  isOpen={modals?.fortune?.isOpen || false}
                  onClose={() => closeModal('fortune')}
                  fortune={fortune}
                  loading={isFortuneLoading}
                  onNavigate={(service) => {
                    closeAllModals();
                    if (service === 'fortune') handleFetchFortune();
                    else openModal(service as any);
                  }}
                  coins={coins}
                  onUseCoin={async (serviceType) => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits(serviceType);
                  }}
                  onOpenCoinPurchase={(requiredCoins) => {
                    openModal('coinPurchase', undefined, { requiredCoins });
                  }}
                />
                <MbtiSajuModal
                  isOpen={modals?.mbtiSaju?.isOpen || false}
                  onClose={() => closeModal('mbtiSaju')}
                  onNavigate={(service) => {
                    closeAllModals();
                    if (service === 'fortune') handleFetchFortune();
                    else openModal(service as any);
                  }}
                  onUseCoin={async (isRegenerate?: boolean) => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits(isRegenerate ? 'REGENERATE_MBTI_SAJU' : 'MBTI_SAJU');
                  }}
                />

                <RecommendationModal
                  isOpen={modals?.recommendation?.isOpen || false}
                  onClose={() => closeModal('recommendation')}
                  initialTab={modals?.recommendation?.mode}
                />
                <CompatibilityModal
                  isOpen={modals?.compatibility?.isOpen || false}
                  onClose={() => closeModal('compatibility')}
                  onNavigate={(service) => {
                    closeAllModals();
                    if (service === 'fortune') handleFetchFortune();
                    else openModal(service as any);
                  }}
                  onUseCoin={async () => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits('COMPATIBILITY_TRIP');
                  }}
                />

                <TripModal
                  isOpen={modals?.trip?.isOpen || false}
                  onClose={() => closeModal('trip')}
                  onNavigate={(service) => {
                    closeAllModals();
                    if (service === 'fortune') handleFetchFortune();
                    else openModal(service as any);
                  }}
                  onUseCoin={async () => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits('COMPATIBILITY_TRIP');
                  }}
                />
                <HealingModal
                  isOpen={modals?.healing?.isOpen || false}
                  onClose={() => closeModal('healing')}
                  onNavigate={(service) => {
                    closeAllModals();
                    if (service === 'fortune') handleFetchFortune();
                    else openModal(service as any);
                  }}
                  onUseCoin={async () => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits('HEALING');
                  }}
                />
                <JobModal
                  isOpen={modals?.job?.isOpen || false}
                  onClose={() => closeModal('job')}
                  onNavigate={(service) => {
                    closeAllModals();
                    if (service === 'fortune') handleFetchFortune();
                    else openModal(service as any);
                  }}
                  onUseCoin={async () => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits('JOB');
                  }}
                />
                <TarotModal
                  isOpen={modals?.tarot?.isOpen || false}
                  onClose={() => closeModal('tarot')}
                  tier={tier}
                  onUpgradeRequired={() => {
                    openModal('coinPurchase', undefined, { requiredCoins: SERVICE_COSTS.TAROT });
                  }}
                  onUseCoin={async () => {
                    if (!session?.user?.id) return false;
                    return await consumeCredits('TAROT');
                  }}
                />

                <CoinPurchaseModal
                  isOpen={modals?.coinPurchase?.isOpen || false}
                  onClose={() => closeModal('coinPurchase')}
                  userEmail={session?.user?.email}
                  currentCoins={coins}
                  requiredCoins={modals?.coinPurchase?.data?.requiredCoins}
                  onSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                    await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                  }}
                />

                <OnboardingModal
                  isOpen={modals?.onboarding?.isOpen || false}
                  onClose={handleCloseOnboarding}
                  onCheckPlans={() => openModal('coinPurchase')}
                  userName={session?.user?.user_metadata?.full_name}
                />

                <PremiumBanner
                  isVisible={showPremiumBanner}
                  onClose={() => setShowPremiumBanner(false)}
                  onCheckPlans={() => openModal('coinPurchase')}
                  currentCoins={coins}
                />
              </div>
            )
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// A component to handle OAuth redirects (PKCE flow).
const AuthCallback = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasExchanged = React.useRef(false);

  React.useEffect(() => {
    // Check for error parameters in the URL first (common in OAuth failures)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const paramsError = params.get('error');
    const paramsErrorDesc = params.get('error_description');

    if (paramsError || paramsErrorDesc) {
      console.error('OAuth URL Error:', paramsError, paramsErrorDesc);
      setErrorMsg(paramsErrorDesc || paramsError || '인증 중 오류가 발생했습니다.');
      return;
    }

    // Check hash fragments as well
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error') || hashParams.get('error_description');
    if (hashError) {
      setErrorMsg(hashError);
      return;
    }

    const processAuth = async () => {
      // Prevent double execution in React Strict Mode (code is single-use)
      if (hasExchanged.current) return;

      try {
        if (code) {
          hasExchanged.current = true;
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.location.href = '/';
        } else {
          // If no code, check if session already exists
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (session) {
            window.location.href = '/';
          } else {
            // Wait briefly for background recovery
            const timer = setTimeout(() => {
              window.location.href = '/';
            }, 2000);
            return () => clearTimeout(timer);
          }
        }
      } catch (err: any) {
        console.error('Auth processing error:', err);
        setErrorMsg(err.message || '인증 처리 중 오류가 발생했습니다.');
      }
    };

    processAuth();
  }, []);

  if (errorMsg) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">로그인 실패</h2>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">인증 정보를 확인 중입니다...</p>
      </div>
    </div>
  );
};

export default App;
