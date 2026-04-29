import { ArrowRight, FileText, Sparkles, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface HeroSectionProps {
  onStart: () => void;
  user?: User | null | undefined;
  onOpenDeepReport?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart, user, onOpenDeepReport }) => {
  const navigate = useNavigate();

  const handleCTA = () => {
    navigate('/premium');
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 pt-24 pb-10 md:pt-32 md:pb-16">
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-violet-400/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-5 relative z-10">
        {/* Badge */}
        <div className="flex justify-center mb-5 md:mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-200 tracking-wide">프리미엄 전문가 +1,000만 ↑ 데이터 분석 / 20장 내외</span>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-center text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-4 md:mb-6 leading-[1.15] text-white animate-fade-up">
          {user ? (
            <>
              <span className="text-violet-300">{user.user_metadata?.full_name || '회원'}</span>님의<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-amber-300">운명 심층 리포트</span>
            </>
          ) : (
            <>
              당신만의<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-amber-300">운명 심층 리포트</span>
            </>
          )}
        </h1>

        <p className="text-center text-sm md:text-lg text-slate-400 max-w-xl mx-auto mb-6 md:mb-8 font-medium leading-relaxed animate-fade-up [animation-delay:200ms]">
          MBTI 심리학과 사주 명리학의 만남.<br className="md:hidden" />
          1,000만 건 데이터 기반 전문가 수기 분석
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-7 md:mb-10 animate-fade-up [animation-delay:300ms]">
          {[
            { icon: FileText, label: '20페이지 분량' },
            { icon: Users, label: '전문가 직접 분석' },
            { icon: Zap, label: '맞춤 전략 제공' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <item.icon className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[11px] font-bold text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-3 animate-fade-up [animation-delay:400ms]">
          <button
            onClick={handleCTA}
            className="group relative w-full max-w-sm px-10 py-5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-2xl font-black text-lg shadow-[0_20px_50px_-12px_rgba(124,58,237,0.5)] hover:shadow-[0_25px_60px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-1 active:scale-[0.98] transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center justify-center gap-2">
              심층 리포트 신청하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 bg-rose-500 text-white text-sm font-black rounded-full shadow-lg shadow-rose-500/30 animate-bounce">
              기간한정 특별 할인가 적용 중!
            </span>
            <span className="px-3 py-1.5 bg-amber-500/20 text-amber-500 text-xs font-bold rounded-full border border-amber-500/20 animate-pulse">
              하루 10건 제약!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;