import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import mysticalBg from '../assets/mystical_hero_bg.png';

interface HeroSectionProps {
  onStart: () => void;
  user?: User | null | undefined;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart, user }) => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={mysticalBg}
          alt="Mystical Background"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-50"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center text-white">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 backdrop-blur-md border border-amber-400/50 rounded-full text-base font-bold text-white mb-8 animate-bounce shadow-lg shadow-orange-500/20">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>🎁 오픈 기념! 신규 가입 시 100코인 지급</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight animate-fade-up drop-shadow-xl">
          {user ? (
            <>
              <span className="text-indigo-200">{user.user_metadata?.full_name || '회원'}</span>님,<br />
              운명의 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-indigo-200">별자리</span>를 찾으세요
            </>
          ) : (
            <>
              나를 읽는<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-indigo-200">가장 신비로운</span> 거울
            </>
          )}
        </h1>

        <p className="text-lg md:text-xl text-indigo-100/90 max-w-2xl mx-auto mb-10 font-light leading-relaxed animate-fade-up [animation-delay:200ms] drop-shadow-md">
          고대 명리학의 지혜와 현대 MBTI 심리학이 만나<br className="hidden md:block" />
          당신의 본질과 숨겨진 가능성을 꿰뚫어 봅니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up [animation-delay:400ms]">
          <button
            onClick={() => {
              if (user) {
                navigate('/mypage');
              } else {
                onStart();
              }
            }}
            className="group relative px-10 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:-translate-y-1 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-2">
              무료 분석 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;