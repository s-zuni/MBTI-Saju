import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RelationshipPage from './pages/RelationshipPage';
import DeepReportLandingPage from './pages/DeepReportLandingPage';
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
import AdminCommunity from './pages/admin/AdminCommunity';
import AdminDeepReports from './pages/admin/AdminDeepReports';
import { useAuth } from './hooks/useAuth';
import { useModalStore } from './hooks/useModalStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { singleDayFortuneSchema } from './config/schemas';
import { calculateSaju } from './utils/sajuUtils';
import { isTossApp } from './utils/envUtils';

// Lazy load modals for better initial performance
const AnalysisModal = lazy(() => import('./components/AnalysisModal'));
const FortuneModal = lazy(() => import('./components/FortuneModal'));
const MbtiSajuModal = lazy(() => import('./components/MbtiSajuModal'));
const DeepReportModal = lazy(() => import('./components/DeepReportModal'));
const RecommendationModal = lazy(() => import('./components/RecommendationModal'));
const CompatibilityModal = lazy(() => import('./components/CompatibilityModal'));
const TripModal = lazy(() => import('./components/TripModal'));
const NamingModal = lazy(() => import('./components/NamingModal'));
const KboAnalysisModal = lazy(() => import('./components/KboAnalysisModal'));
const TarotModal = lazy(() => import('./components/Tarot/TarotModal'));
const CreditPurchaseModal = lazy(() => import('./components/CreditPurchaseModal'));
const AdminInquiries = lazy(() => import('./pages/admin/AdminInquiries'));
const OnboardingModal = lazy(() => import('./components/OnboardingModal'));
const DeepReportEventModal = lazy(() => import('./components/DeepReportEventModal'));

const ReviewsSection = lazy(() => import('./components/ReviewsSection'));
const PopupModal = lazy(() => import('./components/PopupModal'));
const CompatibilitySharePage = lazy(() => import('./pages/CompatibilitySharePage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));

function App() {
  const [showSplash, setShowSplash] = useState(false); // Disable splash screen by default for faster access
  const { session, loading: isAuthLoading } = useAuth();
  


  // Apply inactivity logout
  useInactivityLogout(session);

  const { modals, openModal, closeModal, closeAllModals } = useModalStore();


  // Streaming today's fortune
  const { object: fortune, submit: fetchFortune, isLoading: isFortuneLoading } = useObject({
    api: '/api/fortune?scope=today',
    schema: singleDayFortuneSchema,
    headers: {
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
  });

  // Streaming tomorrow's fortune
  const { object: tomorrowFortune, submit: fetchTomorrow, isLoading: isTomorrowLoading } = useObject({
    api: '/api/fortune?scope=tomorrow',
    schema: singleDayFortuneSchema,
    headers: {
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    onFinish: async () => {
        // Only deduct credits when generation is successfully finished
        await consumeCredits('FORTUNE_TOMORROW');
        console.log('[App] Tomorrow fortune generation finished and credits deducted.');
    },
    onError: (error) => {
        console.error('[App] Tomorrow fortune generation failed:', error);
        alert('내일 운세를 불러오는 중 오류가 발생했습니다. 크레딧은 차감되지 않았습니다.');
    }
  });

  // Syncing with legacy state if necessary, but recommended to use 'fortune' directly

  const { tier } = useSubscription(session);
  const creditHook = useCredits(session);
  const { credits, refreshCredits, purchaseCredits, useCredits: consumeCredits, loading: isCreditsLoading } = creditHook;
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

  // Unified loading state for Safari (Session + Credits initial fetch)
  const isAppInitializing = isAuthLoading || (isCreditsLoading && !!session);

  // Check if profile needs completion
  useEffect(() => {
    if (session?.user && !isAuthLoading) {
      const meta = session.user.user_metadata;
      const needsProfile = !meta?.mbti || !meta?.birth_date || !meta?.gender;

      if (needsProfile) {
        // Prevent infinite loop by checking if the modal is already open in the correct mode
        if (modals?.analysis?.mode !== 'complete_profile' || !modals?.analysis?.isOpen) {
          openModal('analysis', 'complete_profile');
        }
      } else {
        const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding_${session.user.id}`);
        if (!hasSeenOnboarding && !modals?.onboarding?.isOpen) {
          openModal('onboarding');
        }
      }
    }
  }, [session, isAuthLoading, openModal, modals?.analysis?.mode, modals?.analysis?.isOpen, modals?.onboarding?.isOpen]);

  // Handle login trigger from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true' && !session && !isAuthLoading) {
      openModal('analysis', 'login');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 심층 리포트 구매 후 비회원이 가입하고 돌아왔을 때 이벤트 모달 자동 노출
    if (params.get('event_trigger') === 'true' && session && !isAuthLoading) {
        openModal('deepReportEvent');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [session, isAuthLoading, openModal]);



  const handleFetchFortune = async () => {
    const cost = SERVICE_COSTS.FORTUNE_TODAY;
    if (credits < cost) {
      openModal('creditPurchase', undefined, { requiredCredits: cost });
      return;
    }

    if (!session) return;
    
    openModal('fortune');

    const sajuData = calculateSaju(session.user.user_metadata.birth_date, session.user.user_metadata.birth_time);
    fetchFortune({ 
      birthDate: session.user.user_metadata.birth_date, 
      mbti: session.user.user_metadata.mbti,
      sajuData,
      scope: 'today' // Explicitly request today only
    });
  };

  const handleFetchTomorrowFortune = async () => {
    const cost = SERVICE_COSTS.FORTUNE_TOMORROW;
    if (credits < cost) {
      openModal('creditPurchase', undefined, { requiredCredits: cost });
      return false;
    }

    if (!session) return false;
    
    const sajuData = calculateSaju(session.user.user_metadata.birth_date, session.user.user_metadata.birth_time);
    fetchTomorrow({ 
      birthDate: session.user.user_metadata.birth_date, 
      mbti: session.user.user_metadata.mbti,
      sajuData,
      scope: 'tomorrow'
    });
    return true;
  };

  // handleSwitchService and checkCreditsAndOpen removed as components now handle their own navigation and credit checks

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
      <AppContent 
        session={session} 
        isAuthLoading={isAppInitializing}
        credits={credits}
        refreshCredits={refreshCredits}
        purchaseCredits={purchaseCredits}
        consumeCredits={consumeCredits}
        checkSufficientCredits={creditHook.checkSufficientCredits}
        getCost={creditHook.getCost}
        debugInfo={creditHook.debugInfo}
        tier={tier}
        fortune={fortune}
        isFortuneLoading={isFortuneLoading}
        tomorrowFortune={tomorrowFortune}
        isTomorrowLoading={isTomorrowLoading}
        handleFetchFortune={handleFetchFortune}
        handleFetchTomorrowFortune={handleFetchTomorrowFortune}
        handleStart={handleStart}
        showPremiumBanner={showPremiumBanner}
        setShowPremiumBanner={setShowPremiumBanner}
        modals={modals}
        closeModal={closeModal}
        closeAllModals={closeAllModals}
        openModal={openModal}
      />
    </BrowserRouter>
  );
}

function AppContent({ 
  session, isAuthLoading, credits, refreshCredits, purchaseCredits, consumeCredits, 
  checkSufficientCredits, getCost,
  tier, fortune, isFortuneLoading, tomorrowFortune, isTomorrowLoading, handleFetchFortune, handleFetchTomorrowFortune, handleStart, 
  showPremiumBanner, setShowPremiumBanner, modals, closeModal, closeAllModals, openModal 
}: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const isChatPage = location.pathname.startsWith('/chat') || location.pathname.startsWith('/room');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isInToss = isTossApp();
  
  // Handle automatic modal opening from share link
  useEffect(() => {
    if (location.state?.openCompatibility && session) {
      openModal('compatibility');
      // Clear state to prevent re-opening
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, session, openModal, navigate, location.pathname]);

  // 라우트 변경 시 모든 모달 닫기 (타로 등 모달이 열린 채로 다른 화면 이동 방지)
  useEffect(() => {
    closeAllModals();
  }, [location.pathname, closeAllModals]);

  const handleCloseOnboarding = () => {
    if (session?.user) {
      localStorage.setItem(`hasSeenOnboarding_${session.user.id}`, 'true');
    }
    closeModal('onboarding');
  };

  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white/50 backdrop-blur-sm z-[1000]">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      }>
        <Routes>
          {/* 인증 콜백 경로는 로딩 상태와 무관하게 즉시 렌더링하여 데드락 방지 */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Admin Login - No Sidebar/Header/Footer */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin System - With Sidebar, No Header/Footer */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="community" element={<AdminCommunity />} />
            <Route path="deep-reports" element={<AdminDeepReports />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="payments" element={<PaymentManagement />} />
            <Route path="refunds" element={<RefundManagement />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="plans" element={<PlanManagement />} />
          </Route>

          {/* 나머지 모든 경로는 로딩 상태에 따라 분기 */}
          <Route path="*" element={
            <div className={`selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden ${isInToss ? 'pt-0 pb-safe' : 'pb-20 md:pb-0'}`}>
              {!isInToss && <Navbar />}

              {isAuthLoading && !session && location.pathname !== '/premium' ? (
                <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in p-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-500 font-bold tracking-tight mb-4">당신의 운명을 불러오는 중...</p>
                  
                </div>
              ) : (
                <Routes>
                  <Route path="/" element={
                    <>
                      <HeroSection onStart={handleStart} user={session?.user} onOpenDeepReport={() => navigate('/premium')} />
                      <FeatureGrids />


                      <ReviewsSection />
                      
                      {/* Featured Analysis Section */}
                      <section className="py-16 bg-[#faf8fe] relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                        <div className="section-container relative z-10">
                          <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">MBTI와 사주의 새로운 만남</h2>
                            <p className="text-slate-500 font-medium">단순한 재미를 넘어, 깊이 있는 자아 분석을 제공합니다.</p>
                          </div>

                          <div className="grid md:grid-cols-3 gap-8">
                            <button
                              onClick={() => {
                                navigate('/premium');
                              }}
                              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                            >
                              <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-7 h-7 text-violet-600"><path d="M9 18a4 4 0 0 1-2-3.82 4 4 0 0 1-1-2.18V7l3-4 4 4" /><path d="M15 18a4 4 0 0 0 2-3.82 4 4 0 0 0 1-2.18V7l-3-4-4 4" /><path d="M12 2c-1.8 0-3.6.48-5.11 1.34A6 6 0 0 0 12 18V2z" /><path d="M12 2a6 6 0 0 0 5.11 1.34A6 6 0 0 1 12 18V2z" /><path d="M12 18h0" /></svg>
                              </div>
                              <h3 className="text-xl font-bold mb-3 group-hover:text-violet-600 transition-colors">심도 있는 성격 매칭</h3>
                              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">당신의 무의식과 타고난 운명이 어떻게 연결되어 있는지 과학적으로 분석합니다.</p>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-violet-50 text-violet-600 text-[10px] font-bold rounded-md">5,300+ 이용 중</span>
                                <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-md">인기</span>
                              </div>
                            </button>

                            <button
                              onClick={() => openModal('kbo')}
                              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                            >
                              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors p-2">
                                <img
                                  src="/assets/icons/3d_kbo.png"
                                  alt="KBO"
                                  className="w-full h-full object-contain drop-shadow-lg"
                                />
                              </div>
                              <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors">KBO 팬 궁합</h3>
                              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">MBTI와 사주를 분석해 나와 가장 잘 맞는 KBO 프로야구 구단을 알려드립니다.</p>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">1,500+ 이용 중</span>
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">NEW</span>
                              </div>
                            </button>

                            <button
                              onClick={() => openModal('compatibility')}
                              className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                            >
                              <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-pink-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-7 h-7 text-pink-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                              </div>
                              <h3 className="text-xl font-bold mb-3 group-hover:text-pink-600 transition-colors">인간관계 솔루션</h3>
                              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">당신이 조심해야 할 운명과 시너지를 낼 수 있는 인연의 색깔을 알려드립니다.</p>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-md">3,300+ 이용 중</span>
                                <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md">만족도 99%</span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </section>
                    </>
                  } />
                  <Route path="/support" element={<SupportPage session={session} />} />
                  <Route path="/mypage" element={
                    <MyPage
                      onOpenDeepReport={() => openModal('deepReport')}
                      onOpenMbtiSaju={() => openModal('mbtiSaju')}
                      onOpenNaming={() => openModal('naming')}
                      onOpenCompatibility={() => openModal('compatibility')}
                      credits={credits}
                      refreshCredits={refreshCredits}
                      purchaseCredits={purchaseCredits}
                      spendCredits={consumeCredits}
                      checkSufficientCredits={checkSufficientCredits}
                      getCost={getCost}
                      session={session}
                    />
                  } />
                  <Route path="/community" element={<CommunityPage session={session} />} />
                  <Route path="/community/post/:id" element={<PostDetailPage />} />
                  <Route path="/fortune" element={
                    <FortunePage
                      onFortuneClick={handleFetchFortune}
                      onMbtiSajuClick={() => {
                        navigate('/premium');
                      }}
                      onTarotClick={() => openModal('tarot')}
                      onTripClick={() => openModal('trip')}
                      onNamingClick={() => openModal('naming')}
                      onKboClick={() => openModal('kbo')}
                      onCompatibilityClick={() => openModal('compatibility')}
                    />
                  } />
                  <Route path="/store" element={
                    <PricingPage
                      currentCredits={credits}
                      session={session}
                      onPurchaseSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                        await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                      }}
                    />
                  } />
                  <Route path="/pricing" element={
                    <PricingPage
                      currentCredits={credits}
                      session={session}
                      onPurchaseSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                        await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                      }}
                    />
                  } />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/fail" element={<PaymentFail />} />
                  <Route path="/usage-history" element={<UsageHistoryPage session={session} />} />
                  <Route path="/tarot" element={<ChatPage session={session} defaultService="tarot" />} />
                  <Route path="/saju" element={<ChatPage session={session} defaultService="saju" />} />
                  <Route path="/share/compatibility/:userId" element={<CompatibilitySharePage />} />
                  <Route path="/room" element={<ChatPage session={session} />} />
                  <Route path="/chat" element={<ChatPage session={session} />} />
                  <Route path="/relationship" element={<RelationshipPage session={session} />} />
                  <Route path="/premium" element={<DeepReportLandingPage onOpenDeepReport={() => openModal('deepReport')} />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                </Routes>
              )}

              {!isChatPage && !isInToss && <Footer />}
              {!isAdminPage && !isInToss && <BottomNav />}


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
                tomorrowFortune={tomorrowFortune}
                isTomorrowLoading={isTomorrowLoading}
                onFetchTomorrow={handleFetchTomorrowFortune}
                onNavigate={(service) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'deepReport' : service) as any);
                }}
                credits={credits}
                onUseCredit={async (serviceType) => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits(serviceType);
                }}
                onOpenCreditPurchase={(requiredCredits) => {
                  openModal('creditPurchase', undefined, { requiredCredits });
                }}
              />
              <MbtiSajuModal
                isOpen={modals?.mbtiSaju?.isOpen || false}
                onClose={() => closeModal('mbtiSaju')}
                onNavigate={(service) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'deepReport' : service) as any);
                }}
                onUseCredit={async (isRegenerate?: boolean) => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits(isRegenerate ? 'REGENERATE_MBTI_SAJU' : 'MBTI_SAJU');
                }}
                credits={credits}
                session={session}
                onOpenDeepReport={() => openModal('deepReport')}
              />
              <DeepReportModal
                isOpen={modals?.deepReport?.isOpen || false}
                onClose={() => closeModal('deepReport')}
                session={session}
              />

              <RecommendationModal
                isOpen={modals?.recommendation?.isOpen || false}
                onClose={() => closeModal('recommendation')}
                initialTab={modals?.recommendation?.mode}
              />
              <CompatibilityModal
                isOpen={modals?.compatibility?.isOpen || false}
                onClose={() => closeModal('compatibility')}
                onNavigate={(service: any) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('COMPATIBILITY_TRIP');
                }}
                credits={credits}
                session={session}
              />

              <TripModal
                isOpen={modals?.trip?.isOpen || false}
                onClose={() => closeModal('trip')}
                onNavigate={(service: any) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('COMPATIBILITY_TRIP');
                }}
                credits={credits}
                session={session}
              />
              <NamingModal
                isOpen={modals?.naming?.isOpen || false}
                onClose={() => closeModal('naming')}
                onNavigate={(service: string) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('NAMING');
                }}
                credits={credits}
                session={session}
              />
              <KboAnalysisModal
                isOpen={modals?.kbo?.isOpen || false}
                onClose={() => closeModal('kbo')}
                onNavigate={(service: any) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('KBO');
                }}
                credits={credits}
                session={session}
              />
              <TarotModal
                isOpen={modals?.tarot?.isOpen || false}
                onClose={() => closeModal('tarot')}
                tier={tier}
                onUpgradeRequired={() => {
                  openModal('creditPurchase', undefined, { requiredCredits: SERVICE_COSTS.TAROT });
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('TAROT');
                }}
                onNavigate={(service: any) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                credits={credits}
                session={session}
              />

              <CreditPurchaseModal
                isOpen={modals?.creditPurchase?.isOpen || false}
                onClose={() => closeModal('creditPurchase')}
                userEmail={session?.user?.email}
                currentCredits={credits}
                requiredCredits={modals?.creditPurchase?.data?.requiredCredits}
                onSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                  await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                }}
              />

              <OnboardingModal
                isOpen={modals?.onboarding?.isOpen || false}
                onClose={handleCloseOnboarding}
                onCheckPlans={() => openModal('creditPurchase')}
                userName={session?.user?.user_metadata?.full_name}
              />

              <DeepReportEventModal
                isOpen={modals?.deepReportEvent?.isOpen || false}
                onClose={() => closeModal('deepReportEvent')}
                session={session}
              />


              <PremiumBanner
                isVisible={showPremiumBanner}
                onClose={() => setShowPremiumBanner(false)}
                onCheckPlans={() => openModal('creditPurchase')}
                currentCredits={credits}
              />
              <PopupModal />
            </div>
          } />
        </Routes>
      </Suspense>
  );
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check for explicit error parameters
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isErrorParam = params.get('error') || params.get('error_description') || hashParams.get('error') || hashParams.get('error_description');

    if (isErrorParam) {
      console.error('OAuth Callback Error:', isErrorParam);
      setErrorMsg(isErrorParam);
      return;
    }

    const handleAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          navigate('/', { replace: true });
        } else {
          supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              navigate('/', { replace: true });
            }
          });
        }
      } catch (err: any) {
        console.error('AuthCallback error:', err);
        setErrorMsg(err.message || '인증 중 예기치 않은 오류가 발생했습니다.');
      }
    };

    handleAuth();
  }, [navigate]);

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
            onClick={() => navigate('/', { replace: true })}
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
        <p className="text-slate-600 font-medium tracking-tight mb-3">인증 처리 중입니다...</p>
      </div>
    </div>
  );
};

export default App;
