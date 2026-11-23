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
        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-slate-950">
          {user ? (
            <>
              <span>{user.user_metadata?.full_name || '회원'}</span>님의<br />
              <span className="text-violet-600">과학적 정밀 운명 분석</span>
            </>
          ) : (
            <>
              만세력 정밀 연산 기반<br />
              <span className="text-violet-600">과학적 정밀 운명 분석</span>
            </>
          )}
        </h1>

        <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
          신비로운 예측이 아닌 만세력 정밀 알고리즘과 MBTI 성향 모델의 교차 분석, 전문가의 수기 점검으로 당신의 성향과 미래 흐름을 정밀하게 제시합니다.
        </p>

        {/* Feature list */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <span>만세력 정밀 연산</span>
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
            onClick={() => navigate('/premium')}
            className="w-full sm:w-auto px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
          >
            3년 심층 사주 리포트 받아보기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;