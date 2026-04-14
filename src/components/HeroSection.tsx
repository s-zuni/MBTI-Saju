import React from 'react';
import { ArrowRight } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface HeroSectionProps {
  onStart: () => void;
  user?: User | null | undefined;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart, user }) => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[500px] sm:min-h-[550px] flex items-start justify-center overflow-hidden bg-[#faf8fe] pt-32 pb-20 md:pt-40 md:pb-24">
      {/* Aura Ethereal Background Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-pink-200/40 to-transparent rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tl from-indigo-200/30 to-transparent rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-pink-100/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center text-slate-800">

        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight mb-6 md:mb-10 leading-[1.05] animate-fade-up break-keep font-display">
          {user ? (
            <>
              <span className="text-indigo-600/90">{user.user_metadata?.full_name || '회원'}</span>님,<br />
              오늘 <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500/80 to-indigo-600/80">당신의 매력</span>을 확인하세요
            </>
          ) : (
            <>
              나를 찾는<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500/80 to-indigo-600/80">가장 투명한</span> 거울
            </>
          )}
        </h1>

        <p className="text-lg md:text-2xl text-slate-500/80 max-w-2xl mx-auto mb-10 md:mb-14 font-medium leading-relaxed animate-fade-up [animation-delay:200ms]">
          MBTI 심리학과 사주 명리학의 만남.<br className="hidden md:block" />
          오늘 너의 기분과 행운의 OOTD까지 챙겨줄게! ✨
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up [animation-delay:400ms] pb-8 md:pb-0">
          <button
            onClick={() => {
              if (user) {
                navigate('/fortune');
              } else {
                onStart();
              }
            }}
            className="group relative w-full sm:w-auto px-12 md:px-14 py-5 md:py-6 bg-slate-900 text-white rounded-full font-black text-xl md:text-2xl shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.4)] hover:-translate-y-2 active:scale-95 active:bg-slate-800 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center justify-center gap-3">
              운명 확인하기
              <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;