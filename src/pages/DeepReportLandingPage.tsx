import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Star, Quote, ShieldCheck, Zap, Users, BarChart3, Clock } from 'lucide-react';


interface DeepReportLandingPageProps {
  onOpenDeepReport: (reportType?: string) => void;
}

const DeepReportLandingPage: React.FC<DeepReportLandingPageProps> = ({ onOpenDeepReport }) => {


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const reviews = [
    {
      name: "김*현",
      tag: "30대 직장인",
      content: "그동안 봤던 사주랑은 차원이 달라요. 20페이지가 넘는 분량에 제 성격부터 미래 3년 운세까지 정말 디테일하게 분석되어 있어서 놀랐습니다. 특히 MBTI랑 결합된 분석이 정말 정확해요.",
      rating: 5,
      date: "2026.05.18"
    },
    {
      name: "이*우",
      tag: "사업가",
      content: "사업 방향성을 잡는 데 큰 도움이 되었습니다. 1,000만 건의 데이터를 기반으로 했다더니 통계적으로 납득이 가는 분석들이 많더라고요. 3년치 운세가 다 들어있어서 돈이 아깝지 않습니다.",
      rating: 5,
      date: "2026.05.17"
    },
    {
      name: "박*아",
      tag: "취준생",
      content: "단순히 '좋다 나쁘다'가 아니라, 구체적으로 어떤 시기에 무엇을 조심해야 할지 알려줘서 좋았어요. 리포트 디자인도 너무 고급스러워서 소장 가치가 있습니다.",
      rating: 5,
      date: "2026.05.15"
    }
  ];

  return (
    <div className="premium-bg font-manrope min-h-screen overflow-x-hidden selection:bg-silver-200 selection:text-black">
      {/* Navigation */}
      {/* Navigation removed - handled by global Navbar */}


      {/* Hero Section */}
      <section id="hero" className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full mb-8 animate-fade-up">
            <span className="material-symbols-outlined text-sm text-silver-400">auto_awesome</span>
            <span className="text-label-caps text-silver-300">정밀 운명 분석 솔루션</span>
          </div>
          
          <h1 className="text-display-lg mb-8 animate-fade-up [animation-delay:200ms]">
            당신의 운명을 바꾸는<br />
            <span className="italic">1,000만 건의</span> 데이터 분석
          </h1>
          
          <p className="text-body-lg text-slate-400 max-w-2xl mx-auto mb-12 animate-fade-up [animation-delay:400ms]">
            국내 최대 규모의 사주-성향 데이터를 기반으로 분석합니다.<br />
            당신의 미래 3년을 완벽하게 설계하는 프리미엄 심층 리포트를 만나보세요.
          </p>

          <div className="mt-16 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left animate-fade-up [animation-delay:600ms] px-4">
            {/* Card 1: 4-Year Saju Deep Report */}
            <div className="premium-glass-card p-8 rounded-[32px] border border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col justify-between hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-2xl">
                Best Seller
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">4년 사주 심층 리포트</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  선천적 기질과 핵심 오행 분석, 향후 4개년 월별 운세 흐름 및 MBTI 심리학 결합 정밀 로드맵 (A4 20장 분량)
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-violet-400 font-bold">✓</span> 사주원국 & 오행 에너지 정밀 해독
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-violet-400 font-bold">✓</span> 향후 4년 세부 세운 및 월별 흐름
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-violet-400 font-bold">✓</span> MBTI 심리학 모델 융합 성향 분석
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-violet-400 font-bold">✓</span> 귀인 활용법 & 1:1 맞춤형 개운 처방
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-slate-500 line-through text-xs">₩39,900</span>
                  <span className="text-2xl font-black text-white">₩29,900</span>
                  <span className="px-2 py-0.5 bg-violet-900/60 text-violet-300 text-[9px] font-black rounded border border-violet-700">25% 특가</span>
                </div>
                <button 
                  onClick={() => onOpenDeepReport('saju')}
                  className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-slate-100 transition-all text-center flex items-center justify-center gap-2 text-sm active:scale-95"
                >
                  4년 심층 리포트 신청 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Saju Counseling Report */}
            <div className="premium-glass-card p-8 rounded-[32px] border border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col justify-between hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-2xl animate-pulse">
                New
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">1:1 사주 고민 상담 리포트</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  당신의 고민에 대해 전문 사주 상담가가 사주 원국과 올해 대운세를 면밀히 해독하여 개인 맞춤형 명리학적 답변을 전달합니다.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-rose-400 font-bold">✓</span> 사주 원국 및 만세력 집중 분석
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-rose-400 font-bold">✓</span> 올해 대운세 분석 및 길흉 흐름
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-rose-400 font-bold">✓</span> 개인적인 고민(직업/애정 등) 집중 분석
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                    <span className="text-rose-400 font-bold">✓</span> 명리학적 해안 및 구체적 개운 방책
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-slate-500 line-through text-xs">₩19,900</span>
                  <span className="text-2xl font-black text-white">₩9,900</span>
                  <span className="px-2 py-0.5 bg-rose-950 text-rose-300 text-[9px] font-black rounded border border-rose-800">50% 특가</span>
                </div>
                <button 
                  onClick={() => onOpenDeepReport('saju_counsel')}
                  className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all text-center flex items-center justify-center gap-2 text-sm active:scale-95"
                >
                  고민 상담 리포트 신청 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/4 right-0 translate-x-1/3 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>
      </section>

      {/* Featured Images / Mockups */}
      <section id="features" className="py-20 px-6 bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-headline-xl mb-4 italic text-white">프리미엄 리포트 경험</h2>
            <p className="text-slate-500">실제 제공되는 리포트의 고급스러운 디자인을 확인하세요.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { src: "/assets/premium/sample1.png", title: "사주 원국 분석", desc: "당신의 선천적 기질과 구성 요소" },
              { src: "/assets/premium/sample2.png", title: "대운 흐름 그래프", desc: "인생의 큰 흐름과 행운의 시기" },
              { src: "/assets/premium/sample3.png", title: "3개년 월별 분석", desc: "앞으로 3년, 월별 핵심 전략" }
            ].map((item, i) => (
              <div key={i} className="group premium-glass-card rounded-[32px] overflow-hidden border border-white/5 transition-all hover:border-white/20">
                <div className="aspect-[3/4] overflow-hidden">
                  <img 
                    src={item.src} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-8">
                  <div className="text-label-caps text-silver-400 mb-2">{item.title}</div>
                  <div className="text-body-md text-slate-300">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Value Proposition */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
            <div className="text-label-caps text-silver-400 mb-6">왜 MBTIJU 프리미엄인가?</div>
              <h2 className="text-headline-xl mb-10 text-white">
                단순한 운세가 아닌,<br />
                <span className="italic">데이터로 입증된</span> 인생 가이드
              </h2>
              
              <div className="space-y-12">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-silver-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2 text-white">1,000만 건 이상의 데이터 분석</h3>
                    <p className="text-slate-400 text-body-md">막연한 추측이 아닙니다. 방대한 데이터를 기반으로 한 통계적 분석으로 가장 높은 확률의 운명을 예측합니다.</p>
                  </div>
                </div>
                
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-silver-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2 text-white">1회 사주 비용으로 3년 운세를 한 번에</h3>
                    <p className="text-slate-400 text-body-md">여러 번 볼 필요 없습니다. 단 1회 분석 비용만으로 향후 3년 동안의 모든 대운과 세운을 월별로 꼼꼼히 분석해 드립니다. 가장 경제적이고 확실한 미래 설계입니다.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-silver-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2 text-white">MBTI 심리학 결합</h3>
                    <p className="text-slate-400 text-body-md">동양의 사주와 서양의 심리학을 결합하여, 당신의 성향에 최적화된 행동 지침과 전략을 제시합니다.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="premium-glass-card p-1 rounded-[40px] silver-glow">
                <img 
                  src="/assets/premium/sample1.png" 
                  alt="Premium Report" 
                  className="rounded-[39px] w-full shadow-2xl"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-32 px-6 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-headline-xl italic text-white">50,000명 이상의 내담자가 신뢰하는 분석</h2>
            <p className="text-slate-500 mt-4">이미 수많은 사용자들이 심층 리포트를 통해 자신의 인생을 설계하고 있습니다.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review, i) => (
              <div key={i} className="premium-glass-card p-10 rounded-[32px] border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(review.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-silver-300 text-silver-300" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-white/10 mb-4" />
                  <p className="text-body-md text-slate-300 italic leading-relaxed mb-8">
                    "{review.content}"
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-bold text-white">
                    {review.name[0]}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{review.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-500 text-xs">{review.tag}</span>
                      <span className="text-white/20 text-[10px]">•</span>
                      <span className="text-slate-500 text-xs">{review.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="py-40 px-6 relative text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-display-lg mb-12 text-white">
            지금 바로 당신의<br />
            <span className="italic italic-glow">새로운 운명</span>을 확인하세요
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-3xl mx-auto px-4">
            <button 
              onClick={() => onOpenDeepReport('saju')}
              className="w-full sm:w-auto px-10 py-6 bg-white text-black rounded-full text-label-caps overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center gap-4 text-base"
            >
              <span>4년 심층 리포트 신청</span>
              <span className="text-sm font-black text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">₩29,900</span>
            </button>
            <button 
              onClick={() => onOpenDeepReport('saju_counsel')}
              className="w-full sm:w-auto px-10 py-6 bg-rose-600 text-white rounded-full text-label-caps overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center gap-4 text-base"
            >
              <span>고민 상담 리포트 신청</span>
              <span className="text-sm font-black text-rose-200 bg-rose-950 px-2.5 py-1 rounded-full">₩9,900</span>
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-slate-500 text-xs font-bold">커피 값으로 평생 간직할 인생 지도를 만나보세요.</p>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center gap-10 opacity-40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">안전한 보안 결제</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">전문가 정밀 분석</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">100% 만족 보장</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="font-newsreader text-xl font-light text-white">MBTIJU</div>
          <div className="flex gap-8 text-slate-500 text-xs font-medium">
            <a href="/" className="hover:text-white transition-colors">개인정보처리방침</a>
            <a href="/" className="hover:text-white transition-colors">이용약관</a>
            <a href="/" className="hover:text-white transition-colors">고객센터</a>
          </div>
          <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            © 2026 MBTIJU. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

      {/* CSS for custom classes and animations (if not already in index.css) */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .italic-glow {
          text-shadow: 0 0 30px rgba(255,255,255,0.3);
        }
        .text-silver-300 { color: #E2E2E2; }
        .text-silver-400 { color: #A3A3A3; }
        .bg-silver-100 { background-color: #F5F5F5; }
      `}</style>
    </div>
  );
};

export default DeepReportLandingPage;
