import React from 'react';
import { ArrowRight } from 'lucide-react';

const HeroSection = ({ onStart }) => {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-blue-50 to-transparent rounded-[100%] blur-3xl -z-10 opacity-60 pointer-events-none"></div>
      <div className="max-w-4xl mx-auto text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 shadow-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">AI 기반 운명 분석</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          나를 알아가는<br className="md:hidden" /> 가장 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">명쾌한 시간</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          MBTI의 심리학과 사주의 지혜를 결합하여 당신의 가능성을 발견하세요.<br className="hidden md:block" />
          복잡한 분석은 AI에게 맡기고, 당신은 해답만 확인하면 됩니다.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            내 운명 분석하기 <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;