import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react'; // Added Loader2 for auth loading state
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import FeatureGrids from './components/FeatureGrids';
import AnalysisModal from './components/AnalysisModal';
import MyPage from './components/MyPage';
import FortuneModal from './components/FortuneModal';
import MbtiSajuModal from './components/MbtiSajuModal';
import { supabase } from './supabaseClient';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import BottomNav from './components/BottomNav';
import CommunityPage from './components/CommunityPage';
import RecommendationModal from './components/RecommendationModal';
import CompatibilityModal from './components/CompatibilityModal';
import TripModal from './components/TripModal';
import HealingModal from './components/HealingModal';
import JobModal from './components/JobModal';
import TarotModal from './components/Tarot/TarotModal';
import SplashScreen from './components/SplashScreen';
import ChatPage from './pages/ChatPage';
import FortunePage from './pages/FortunePage';
import StorePage from './pages/StorePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RelationshipPage from './pages/RelationshipPage';
import { useSubscription, FEATURES } from './hooks/useSubscription';
import { useCredits } from './hooks/useCredits';
import { SERVICE_COSTS, ServiceType } from './config/creditConfig';
import CoinPurchaseModal from './components/CoinPurchaseModal';
import OnboardingModal from './components/OnboardingModal';
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

function App() {
  // Only show splash screen on mobile devices (width <= 768px)
  const [showSplash, setShowSplash] = useState(window.innerWidth <= 768);

  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisModalMode, setAnalysisModalMode] = useState<'signup' | 'login' | 'edit' | 'complete_profile'>('signup');
  const [showFortuneModal, setShowFortuneModal] = useState(false);
  const [showMbtiSajuModal, setShowMbtiSajuModal] = useState(false);

  // New Modal States
  const [showRecModal, setShowRecModal] = useState(false);
  const [recModalTab] = useState<'travel' | 'career'>('travel'); // setRecModalTab unused
  const [showCompModal, setShowCompModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showHealingModal, setShowHealingModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showTarotModal, setShowTarotModal] = useState(false);


  // Fortune State - now holding object data
  const [fortune, setFortune] = useState<{
    today: { fortune: string; lucky: { color: string; number: string; direction: string } };
    tomorrow: { fortune: string; lucky: { color: string; number: string; direction: string } };
  } | null>(null);
  const [isFortuneLoading, setIsFortuneLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Added auth loading state

  const { tier, checkAccess } = useSubscription(session);
  const { credits: coins, purchaseCredits, useCredits: consumeCredits, requestRefund } = useCredits(session);
  const [showCoinPurchaseModal, setShowCoinPurchaseModal] = useState(false);
  const [requiredCoinsForPurchase, setRequiredCoinsForPurchase] = useState<number | undefined>(undefined);

  // Onboarding & Banner State
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    // 6초 타임아웃: 어떤 이유로든 인증 상태 확인이 멈추면 강제로 로딩을 해제하여 앱 접근 차단 방지
    const failsafeTimeout = setTimeout(() => {
      if (isSubscribed && isAuthLoading) {
        console.warn('Auth initialization timed out. Proceeding to app...');
        setIsAuthLoading(false);
      }
    }, 6000);

    const fetchOrCreateProfile = async (session: Session) => {
      try {
        const { user } = session;
        // 1. 프로필 존재 여부 확인
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        // 2. 프로필 없으면 생성 (Upsert)
        if (!profile) {
          console.log('Profile not found, creating default profile for:', user.id);
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata.full_name || user.user_metadata.name || 'User',
              gender: user.user_metadata.gender || null,
              mbti: user.user_metadata.mbti || null,
              birth_date: user.user_metadata.birth_date || null,
              birth_time: user.user_metadata.birth_time || null,
              tier: 'free',
              credits: 0,
              updated_at: new Date().toISOString(),
            });

          if (upsertError) throw upsertError;
        }
      } catch (error) {
        console.error('Profile fetch/create error:', error);
        // 에러가 발생해도 로딩은 해제되어야 함
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (isSubscribed) {
          setSession(currentSession);
          if (currentSession) {
            await fetchOrCreateProfile(currentSession);
          }
        }
      } catch (error) {
        console.error('Initial auth error:', error);
      } finally {
        if (isSubscribed) {
          setIsAuthLoading(false);
          clearTimeout(failsafeTimeout);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, currentSession: Session | null) => {
      try {
        if (isSubscribed) {
          setSession(currentSession);
          if (currentSession && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED')) {
            await fetchOrCreateProfile(currentSession);
          }
        }
      } catch (error) {
        console.error('Auth state change processing error:', error);
      } finally {
        if (isSubscribed) {
          setIsAuthLoading(false);
          clearTimeout(failsafeTimeout);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      clearTimeout(failsafeTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if profile needs completion (after social login redirect)
  useEffect(() => {
    if (session?.user) {
      const meta = session.user.user_metadata;
      const needsProfile = !meta?.mbti || !meta?.birth_date || !meta?.gender;

      if (needsProfile) {
        // 신규 사용자 — 프로필 완성 모달 오픈
        setAnalysisModalMode('complete_profile');
        setShowAnalysisModal(true);
      } else {
        // 기존 사용자 — 온보딩 체크
        const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding_${session.user.id}`);
        if (!hasSeenOnboarding) {
          setShowOnboardingModal(true);
        }
      }
    }
  }, [session]);

  const handleCloseOnboarding = () => {
    if (session?.user) {
      localStorage.setItem(`hasSeenOnboarding_${session.user.id}`, 'true');
    }
    setShowOnboardingModal(false);
  };

  const openAnalysisModal = (mode: 'signup' | 'login' | 'edit' | 'complete_profile') => {
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

      const birthDate = session.user.user_metadata.birth_date;

      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ birthDate })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch fortune.");
      }

      const data = await response.json();
      setFortune(data); // Expecting { today: ..., tomorrow: ... } now

    } catch (error: any) {
      console.error(error);
      // setFortune will remain null or could set an error state if handled
    } finally {
      setIsFortuneLoading(false);
    }
  };

  const closeFortuneModal = () => setShowFortuneModal(false);

  const closeMbtiSajuModal = () => setShowMbtiSajuModal(false);

  // RecModal (Legacy or specific uses)
  const closeRecModal = () => setShowRecModal(false);

  const closeCompModal = () => setShowCompModal(false);

  const closeTripModal = () => setShowTripModal(false);

  const closeHealingModal = () => setShowHealingModal(false);

  const closeJobModal = () => setShowJobModal(false);

  const closeTarotModal = () => setShowTarotModal(false);

  // 코인 체크 후 모달 열기 헬퍼 함수
  const checkCoinsAndOpen = (cost: number, serviceType: ServiceType, openFn: () => void) => {
    if (!session) {
      openAnalysisModal('login');
      return;
    }
    if (coins >= cost) {
      openFn();
    } else {
      setRequiredCoinsForPurchase(cost);
      setShowCoinPurchaseModal(true);
    }
  };

  // 코인 체크 포함 모달 오픈 함수들
  const openMbtiSajuModal = () => checkCoinsAndOpen(SERVICE_COSTS.MBTI_SAJU, 'MBTI_SAJU', () => setShowMbtiSajuModal(true));
  const openCompModal = () => checkCoinsAndOpen(SERVICE_COSTS.COMPATIBILITY_TRIP, 'COMPATIBILITY_TRIP', () => setShowCompModal(true));
  const openTripModal = () => checkCoinsAndOpen(SERVICE_COSTS.COMPATIBILITY_TRIP, 'COMPATIBILITY_TRIP', () => setShowTripModal(true));
  const openHealingModal = () => checkCoinsAndOpen(SERVICE_COSTS.HEALING, 'HEALING', () => setShowHealingModal(true));
  const openJobModal = () => checkCoinsAndOpen(SERVICE_COSTS.JOB, 'JOB', () => setShowJobModal(true));
  const openTarotModal = () => checkCoinsAndOpen(SERVICE_COSTS.TAROT, 'TAROT', () => setShowTarotModal(true));


  // Service Navigation Handler
  const handleSwitchService = (service: 'fortune' | 'mbti' | 'trip' | 'healing' | 'job' | 'compatibility') => {
    // Close all first
    setShowFortuneModal(false);
    setShowMbtiSajuModal(false);
    setShowTripModal(false);
    setShowHealingModal(false);
    setShowJobModal(false);
    setShowCompModal(false);

    // Open target
    if (service === 'fortune') handleFetchFortune(); // This fetches and opens
    else if (service === 'mbti') {
      if (session) setShowMbtiSajuModal(true);
      else openAnalysisModal('login');
    }
    else if (service === 'trip') openTripModal();
    else if (service === 'healing') openHealingModal();
    else if (service === 'job') openJobModal(); // Check access? Ideally yes, but modal might handle it or just open. Navbar checks access.
    else if (service === 'compatibility') openCompModal();
  };

  const handleStart = async () => {
    if (session) {
      handleFetchFortune();
    } else {
      openAnalysisModal('signup');
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 로딩 화면 표시 로직을 BrowserRouter 내부로 이동하여 /auth/callback 경로가 차단되지 않도록 함
  return (
    <BrowserRouter>
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
              <Navbar
                session={session}
                onLoginClick={() => openAnalysisModal('login')}
                onTarotClick={() => {
                  if (!session) {
                    openAnalysisModal('login');
                  } else if (coins >= SERVICE_COSTS.TAROT) {
                    openTarotModal();
                  } else {
                    setRequiredCoinsForPurchase(SERVICE_COSTS.TAROT);
                    setShowCoinPurchaseModal(true);
                  }
                }}
              />

              <Routes>
                <Route path="/" element={
                  <>
                    <HeroSection onStart={handleStart} user={session?.user} />
                    <FeatureGrids
                      onStart={handleStart}
                      onFortuneClick={handleFetchFortune}
                      onMbtiSajuClick={() => {
                        if (session) setShowMbtiSajuModal(true);
                        else {
                          setAnalysisModalMode('login');
                          setShowAnalysisModal(true);
                        }
                      }}

                      onTripClick={openTripModal}
                      onHealingClick={openHealingModal}
                      onJobClick={openJobModal}
                      onCompatibilityClick={openCompModal}
                      onTarotClick={() => {
                        if (!session) {
                          openAnalysisModal('login');
                        } else if (coins >= SERVICE_COSTS.TAROT) {
                          openTarotModal();
                        } else {
                          setRequiredCoinsForPurchase(SERVICE_COSTS.TAROT);
                          setShowCoinPurchaseModal(true);
                        }
                      }}
                      onChatbotClick={() => {
                        if (!session) {
                          openAnalysisModal('login');
                          return;
                        }
                        if (coins >= SERVICE_COSTS.AI_CHAT_10) {
                          window.location.href = '/chat';
                        } else {
                          setRequiredCoinsForPurchase(SERVICE_COSTS.AI_CHAT_10);
                          setShowCoinPurchaseModal(true);
                        }
                      }}
                    />

                    {/* Featured Analysis Section (Showcase) */}
                    <section className="py-24 bg-slate-50/50 relative">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                      <div className="section-container relative z-10">
                        <div className="text-center mb-16">
                          <h2 className="text-3xl font-bold text-slate-900 mb-4">MBTI와 사주의 새로운 만남</h2>
                          <p className="text-slate-500 font-medium">단순한 재미를 넘어, 깊이 있는 자아 분석을 제공합니다.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                          {/* Personality Matching -> MbtiSajuModal */}
                          <button
                            onClick={() => {
                              if (session) setShowMbtiSajuModal(true);
                              else {
                                setAnalysisModalMode('login');
                                setShowAnalysisModal(true);
                              }
                            }}
                            className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                          >
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-7 h-7 text-indigo-600"><path d="M9 18a4 4 0 0 1-2-3.82 4 4 0 0 1-1-2.18V7l3-4 4 4" /><path d="M15 18a4 4 0 0 0 2-3.82 4 4 0 0 0 1-2.18V7l-3-4-4 4" /><path d="M12 2c-1.8 0-3.6.48-5.11 1.34A6 6 0 0 0 12 18V2z" /><path d="M12 2a6 6 0 0 0 5.11 1.34A6 6 0 0 1 12 18V2z" /><path d="M12 18h0" /></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">심도 있는 성격 매칭</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">당신의 무의식과 타고난 운명이 어떻게 연결되어 있는지 과학적으로 분석합니다.</p>
                          </button>

                          {/* Career Consulting -> JobModal */}
                          <button
                            onClick={() => {
                              if (checkAccess(FEATURES.JOB)) openJobModal();
                              else setShowCoinPurchaseModal(true);
                            }}
                            className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform text-left group"
                          >
                            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase w-7 h-7 text-teal-600"><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M22 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2" /><path d="M12 15h0" /></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 group-hover:text-teal-600 transition-colors">커리어 컨설팅</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">나의 선천적 기운과 후천적 성향이 가장 잘 발휘될 수 있는 직업군을 제안합니다.</p>
                          </button>

                          {/* Relationship Solutions -> CompatibilityModal */}
                          <button
                            onClick={() => {
                              if (checkAccess(FEATURES.COMPATIBILITY)) openCompModal();
                              else setShowCoinPurchaseModal(true);
                            }}
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
                    onOpenMbtiSaju={() => {
                      if (checkAccess(FEATURES.MBTI_SAJU_ANALYSIS)) openMbtiSajuModal();
                      else setShowCoinPurchaseModal(true);
                    }}
                    onOpenHealing={() => {
                      if (checkAccess(FEATURES.HEALING)) openHealingModal();
                      else setShowCoinPurchaseModal(true);
                    }}
                    onOpenCompatibility={() => {
                      if (checkAccess(FEATURES.COMPATIBILITY)) openCompModal();
                      else setShowCoinPurchaseModal(true);
                    }}
                  />
                } />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/fortune" element={
                  <FortunePage
                    onFortuneClick={handleFetchFortune}
                    onMbtiSajuClick={() => {
                      if (session) setShowMbtiSajuModal(true);
                      else {
                        setAnalysisModalMode('login');
                        setShowAnalysisModal(true);
                      }
                    }}
                    onTripClick={openTripModal}
                    onHealingClick={openHealingModal}
                    onJobClick={openJobModal}
                    onCompatibilityClick={openCompModal}
                  />
                } />
                {/* AuthCallback is now handled at the top level of Routes to prevent deadlock during initialization */}
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

              {/* Conditionally render the new AnalysisModal */}
              <AnalysisModal
                isOpen={showAnalysisModal}
                onClose={closeAnalysisModal}
                mode={analysisModalMode}
                initialData={session?.user?.user_metadata}
              />
              <FortuneModal
                isOpen={showFortuneModal}
                onClose={closeFortuneModal}
                fortune={fortune}
                loading={isFortuneLoading}
                onNavigate={handleSwitchService}
                coins={coins}
                onUseCoin={async (serviceType) => {
                  if (!session?.user?.id) return false;
                  const result = await consumeCredits(serviceType);
                  return result;
                }}
                onOpenCoinPurchase={(requiredCoins) => {
                  setRequiredCoinsForPurchase(requiredCoins);
                  setShowCoinPurchaseModal(true);
                }}
              />
              <MbtiSajuModal
                isOpen={showMbtiSajuModal}
                onClose={closeMbtiSajuModal}
                onNavigate={handleSwitchService}
                onUseCoin={async (isRegenerate?: boolean) => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits(isRegenerate ? 'REGENERATE_MBTI_SAJU' : 'MBTI_SAJU');
                }}
              />

              <RecommendationModal isOpen={showRecModal} onClose={closeRecModal} initialTab={recModalTab} />
              <CompatibilityModal
                isOpen={showCompModal}
                onClose={closeCompModal}
                onNavigate={handleSwitchService}
                onUseCoin={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('COMPATIBILITY_TRIP');
                }}
              />

              <TripModal
                isOpen={showTripModal}
                onClose={closeTripModal}
                onNavigate={handleSwitchService}
                onUseCoin={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('COMPATIBILITY_TRIP');
                }}
              />
              <HealingModal
                isOpen={showHealingModal}
                onClose={closeHealingModal}
                onNavigate={handleSwitchService}
                onUseCoin={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('HEALING');
                }}
              />
              <JobModal
                isOpen={showJobModal}
                onClose={closeJobModal}
                onNavigate={handleSwitchService}
                onUseCoin={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('JOB');
                }}
              />
              <TarotModal
                isOpen={showTarotModal}
                onClose={closeTarotModal}
                tier={tier}
                onUpgradeRequired={() => {
                  setRequiredCoinsForPurchase(SERVICE_COSTS.TAROT);
                  setShowCoinPurchaseModal(true);
                }}
                onUseCoin={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('TAROT');
                }}
              />

              <CoinPurchaseModal
                isOpen={showCoinPurchaseModal}
                onClose={() => setShowCoinPurchaseModal(false)}
                userEmail={session?.user?.email}
                currentCoins={coins}
                {...(requiredCoinsForPurchase !== undefined && { requiredCoins: requiredCoinsForPurchase })}
                onSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                  await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                  setRequiredCoinsForPurchase(undefined);
                }}
              />

              {/* Onboarding & Conversion Elements */}
              {/* NEW ONBOARDING COMPONENTS */}
              <OnboardingModal
                isOpen={showOnboardingModal}
                onClose={handleCloseOnboarding}
                onCheckPlans={() => setShowCoinPurchaseModal(true)}
                userName={session?.user?.user_metadata?.full_name}
              />

              <PremiumBanner
                isVisible={showPremiumBanner}
                onClose={() => setShowPremiumBanner(false)}
                onCheckPlans={() => setShowCoinPurchaseModal(true)}
                currentCoins={coins}
              />
            </div>
          )
        } />
      </Routes>
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
