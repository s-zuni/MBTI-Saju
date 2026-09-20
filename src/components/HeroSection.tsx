import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface HeroSectionProps {
  onStart: () => void;
  user?: User | null | undefined;
  onOpenDeepReport?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart, user, onOpenDeepReport }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-slate-100 pt-28 pb-14 md:pt-36 md:pb-20">
      <div className="max-w-4xl mx-auto px-5 text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 rounded-full">
            <span className="w-2 h-2 rounded-full bg-violet-600"></span>
            <span className="text-xs font-semibold text-slate-700">1,000만 건 이상 데이터 분석 · 전문가 수기 점검</span>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-slate-950">
          {user ? (
            <>
              <span>{user.user_metadata?.full_name || '회원'}</span>님의<br />
              <span className="text-violet-600">과학적 정밀 운명 분석</span>
            </>
          ) : (
            <>
              1,000만 데이터 기반<br />
              <span className="text-violet-600">과학적 정밀 운명 분석</span>
            </>
          )}
        </h1>

        <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
          신비로운 예측이 아닌 1,000만 건 데이터 알고리즘 분석과 전문가의 엄격한 수기 점검으로 당신의 성향과 미래 흐름을 정밀하게 제시합니다.
        </p>

        {/* Feature list */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <span>1,000만 데이터 분석</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <span>전문가 수기 점검</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <span>MBTI × 사주 교차 진단</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="w-full sm:w-auto px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
          >
            1대1 심층 운명 상담하기 (/chat)
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => navigate('/premium')}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-950 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            4년 심층 리포트 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;