import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const HeroSection = ({ onStart }) => {
  return (
    <div className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-teal-50 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-600 mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          AI 기반 차세대 운명 분석 플랫폼
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1] animate-fade-up">
          나를 알아가는<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">가장 명쾌한 시간</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-fade-up [animation-delay:200ms]">
          MBTI의 심리학과 사주의 지혜를 결합하여 당신의 가능성을 발견하세요.<br className="hidden md:block" />
          복잡한 분석은 AI에게 맡기고, 당신은 해답만 확인하면 됩니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up [animation-delay:400ms]">
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-full font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
          >
            내 운명 지금 확인하기
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all"
          >
            서비스 원리 알아보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;