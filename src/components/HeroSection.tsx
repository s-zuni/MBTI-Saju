import React from 'react';
import { Sparkles, ArrowRight, Sun, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { track } from '../utils/analytics';

interface HeroSectionProps {
  onStart: () => void;
  user?: any;
  onOpenDeepReport?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart }) => {
  const navigate = useNavigate();

  const handleScrollToFreePreview = () => {
    track('hero_free_preview_click');
    const el = document.getElementById('free-preview');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onStart();
    }
  };

  return (
    <section className="relative pt-24 pb-8 md:pt-32 md:pb-12 overflow-hidden bg-gradient-to-b from-[#f3efff] via-[#faf8fe] to-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[40%] bg-indigo-200/20 rounded-full blur-[80px]" />
      </div>

      <div className="section-container relative z-10 text-center">
        {/* Top Tagline */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-violet-200 shadow-sm mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4 text-violet-600 fill-violet-600" />
          <span className="text-xs font-extrabold text-violet-950 tracking-tight">
            회원가입 없이 30초 무료 만세력 · 오늘의 운세 0원
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.18] mb-5 animate-fade-up">
          타고난 사주 원국과 MBTI로 읽는 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600">
            나만의 운명 분석 리포트
          </span>
        </h1>

        {/* Sub Description */}
        <p
          className="text-sm sm:text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          생년월일과 MBTI만 입력하면 <strong>정통 만세력 4주 8자 원국표와 핵심 기질 프리뷰</strong>를 즉시 무료로 확인할 수 있습니다.
        </p>

        {/* Funnel Stage 0: 무료분석 유도 CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          <button
            type="button"
            onClick={handleScrollToFreePreview}
            className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full font-black text-sm sm:text-base shadow-xl shadow-violet-200 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>30초 무료 사주 · 만세력 분석하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              track('hero_today_fortune_free_click');
              navigate('/myluck?type=today');
            }}
            className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-emerald-50 text-slate-900 border-2 border-emerald-200 rounded-full font-black text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Sun className="w-4 h-4 text-emerald-600" />
            <span>오늘의 운세 무료 보기</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
              0원
            </span>
          </button>
        </div>

        <div className="mt-4 animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <button
            type="button"
            onClick={() => navigate('/premium')}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-violet-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-violet-500" />
            <span>전문가 수기 검수 · 3년 심층 사주 리포트(A4 20장) 바로가기 &rarr;</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
