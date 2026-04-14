import React from 'react';
import { ArrowRight } from 'lucide-react';
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
    <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-white">
      {/* Soft Background Decor */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-100/50 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-50/50 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center text-slate-900">

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 md:mb-8 leading-[1.1] animate-fade-up break-keep drop-shadow-sm">
          {user ? (
            <>
              <span className="text-indigo-600">{user.user_metadata?.full_name || '회원'}</span>님,<br />
              오늘 <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-500">당신의 매력</span>을 확인하세요
            </>
          ) : (
            <>
              나를 찾는<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-500">가장 깨끗한</span> 거울
            </>
          )}
        </h1>

        <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 md:mb-12 font-medium leading-relaxed animate-fade-up [animation-delay:200ms]">
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
            className="group relative w-full sm:w-auto px-10 md:px-12 py-4 md:py-5 bg-slate-900 text-white rounded-full font-black text-lg md:text-xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(15,23,42,0.4)] hover:-translate-y-1.5 active:scale-95 active:bg-slate-800 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-2">
              운명 확인하기
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;