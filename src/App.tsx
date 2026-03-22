import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
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
import { useAuth } from './hooks/useAuth';
import { useModalStore } from './hooks/useModalStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';

// Lazy load modals for better initial performance
const AnalysisModal = lazy(() => import('./components/AnalysisModal'));
const FortuneModal = lazy(() => import('./components/FortuneModal'));
const MbtiSajuModal = lazy(() => import('./components/MbtiSajuModal'));
const RecommendationModal = lazy(() => import('./components/RecommendationModal'));
const CompatibilityModal = lazy(() => import('./components/CompatibilityModal'));
const TripModal = lazy(() => import('./components/TripModal'));
const NamingModal = lazy(() => import('./components/NamingModal'));
const JobModal = lazy(() => import('./components/JobModal'));
const TarotModal = lazy(() => import('./components/Tarot/TarotModal'));
const CreditPurchaseModal = lazy(() => import('./components/CreditPurchaseModal'));
const AdminInquiries = lazy(() => import('./pages/admin/AdminInquiries'));
const OnboardingModal = lazy(() => import('./components/OnboardingModal'));

function App() {
  const [showSplash, setShowSplash] = useState(false); // Disable splash screen by default for faster access
  const { session, loading: isAuthLoading } = useAuth();
  
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // 15초 로딩 타임아웃 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAuthLoading && !session) {
      timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000);
    } else {
      setLoadingTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [isAuthLoading, session]);

  // Apply inactivity logout
  useInactivityLogout(session);

  const { modals, openModal, closeModal, closeAllModals } = useModalStore();

  const [fortune, setFortune] = useState<{
    today: { fortune: string; lucky: { color: string; number: string; direction: string } };
    tomorrow: { fortune: string; lucky: { color: string; number: string; direction: string } };
  } | null>(null);
  const [isFortuneLoading, setIsFortuneLoading] = useState(false);

  const { tier } = useSubscription(session);
  const { credits, refreshCredits, purchaseCredits, useCredits: consumeCredits } = useCredits(session);
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

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

  const handleCloseOnboarding = () => {
    if (session?.user) {
      localStorage.setItem(`hasSeenOnboarding_${session.user.id}`, 'true');
    }
    closeModal('onboarding');
  };
  const handleFetchFortune = async () => {
    const cost = SERVICE_COSTS.FORTUNE_TODAY;
    if (credits < cost) {
      openModal('creditPurchase', undefined, { requiredCredits: cost });
      return;
    }

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
        body: JSON.stringify({ birthDate, mbti: session.user.user_metadata.mbti })
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
            <Route path="users" element={<UserManagement />} />
            <Route path="payments" element={<PaymentManagement />} />
            <Route path="refunds" element={<RefundManagement />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="plans" element={<PlanManagement />} />
          </Route>

          {/* 나머지 모든 경로는 로딩 상태에 따라 분기 */}
          <Route path="*" element={
            <div className="selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden pb-20 md:pb-0">
              <Navbar />

              {isAuthLoading && !session ? (
                <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in p-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-500 font-bold tracking-tight">당신의 운명을 불러오는 중...</p>
                  
                  {loadingTimeout && (
                    <div className="mt-8 p-6 bg-rose-50 rounded-2xl border border-rose-100 max-w-sm animate-slide-up">
                      <p className="text-rose-600 font-bold mb-2">로딩 시간이 평소보다 길어지고 있습니다.</p>
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed text-left">
                        모바일 환경(카카오톡, 인스타 등)에서는 소셜 로그인 처리가 지연될 수 있습니다. 
                        문제가 지속되면 새로고침을 하거나 다시 시도해주세요.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.location.reload()}
                          className="flex-1 py-2.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
                        >
                          새로고침
                        </button>
                        <button 
                          onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/';
                          }}
                          className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors"
                        >
                          다시 로그인
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
                      onOpenNaming={() => openModal('naming')}
                      onOpenCompatibility={() => openModal('compatibility')}
                      credits={credits}
                      refreshCredits={refreshCredits}
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
                      onNamingClick={() => openModal('naming')}
                      onJobClick={() => openModal('job')}
                      onCompatibilityClick={() => openModal('compatibility')}
                    />
                  } />
                  <Route path="/store" element={
                    <PricingPage
                      currentCredits={credits}
                      onPurchaseSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                        await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                      }}
                    />
                  } />
                  <Route path="/pricing" element={
                    <PricingPage
                      currentCredits={credits}
                      onPurchaseSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                        await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                      }}
                    />
                  } />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/fail" element={<PaymentFail />} />
                  <Route path="/usage-history" element={<UsageHistoryPage />} />
                  <Route path="/room" element={<ChatPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/relationship" element={<RelationshipPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                </Routes>
              )}

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
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
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
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async (isRegenerate?: boolean) => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits(isRegenerate ? 'REGENERATE_MBTI_SAJU' : 'MBTI_SAJU');
                }}
                credits={credits}
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
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
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
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('COMPATIBILITY_TRIP');
                }}
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
              />
              <JobModal
                isOpen={modals?.job?.isOpen || false}
                onClose={() => closeModal('job')}
                onNavigate={(service) => {
                  closeAllModals();
                  if (service === 'fortune') handleFetchFortune();
                  else openModal((service === 'mbti' ? 'mbtiSaju' : service) as any);
                }}
                onUseCredit={async () => {
                  if (!session?.user?.id) return false;
                  return await consumeCredits('JOB');
                }}
                credits={credits}
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


              <PremiumBanner
                isVisible={showPremiumBanner}
                onClose={() => setShowPremiumBanner(false)}
                onCheckPlans={() => openModal('creditPurchase')}
                currentCredits={credits}
              />
            </div>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const AuthCallback = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasExchanged = React.useRef(false);
  const navigate = useNavigate();

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
      // Prevent double execution
      if (hasExchanged.current) return;

      try {
        // 1. Handle PKCE code exchange if present
        if (code) {
          hasExchanged.current = true;
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          
          // Wait briefly for persistence to settle on mobile
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
        } 
        // 2. No code? Check if session already exists or wait for implicit flow
        else {
          // If hash contains access_token, we know implicit flow is happening
          const isImplicitFlow = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
          
          if (isImplicitFlow) {
            // Supabase handles the hash parsing automatically. We just need to wait for onAuthStateChange.
            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
              if (event === 'SIGNED_IN' || session) {
                authListener.subscription.unsubscribe();
                navigate('/', { replace: true });
              }
            });
            
            // Failsafe timeout just in case it doesn't fire
            setTimeout(() => {
              authListener.subscription.unsubscribe();
              navigate('/', { replace: true });
            }, 3000);
            
            return;
          }

          // Otherwise, just check if a session exists
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
          
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        // If the error is specific to PKCE storage, try to check current session
        const isVerifierError = err.message?.includes('verifier not found') || 
                               err.message?.includes('Auth session missing') ||
                               err.message?.includes('code_verifier');
                               
        if (isVerifierError) {
          // Fallback: If verifier is lost (common in Safari ITP), try fetching session directly.
          // This often succeeds if the user is actually logged in, or if it fails, just redirect.
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            navigate('/', { replace: true });
            return;
          }
          
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
              authListener.subscription.unsubscribe();
              navigate('/', { replace: true });
            }
          });
          
          setTimeout(() => {
            authListener.subscription.unsubscribe();
            navigate('/', { replace: true });
          }, 2000);
          return;
        }
        
        console.error('Auth processing error:', err);
        setErrorMsg(err.message || '인증 처리 중 오류가 발생했습니다.');
      } finally {
        // Ultimate Failsafe: No matter what happens, do not leave the user stranded
        // on the "Verifying authentication info..." screen forever.
        // Wait 5 seconds to ensure redirects complete, otherwise force them back to home.
        setTimeout(() => {
          // If we are still on the callback page and haven't displayed an error message
          // (which means we're stuck in the loading state UI), then forcefully go home.
          if (window.location.pathname === '/auth/callback' && !errorMsg) {
             console.warn('AuthCallback timeout reached, forcefully redirecting to home.');
             navigate('/', { replace: true });
          }
        }, 5000);
      }
    };

    processAuth();
  }, [navigate, errorMsg]);

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
        <p className="text-slate-600 font-medium">인증 정보를 확인 중입니다...</p>
      </div>
    </div>
  );
};

export default App;
