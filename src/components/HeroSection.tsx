import React from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';

interface HeroSectionProps {
  onStart: () => void;
  user?: User | null | undefined;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart, user }) => {
  const navigate = useNavigate();

  return (
    <div className="pt-20 pb-8 px-6 bg-white relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 rounded-bl-full opacity-30 pointer-events-none -mr-8 -mt-8"></div>
      <div className="relative z-10 md:max-w-xl">
        <h1 className="text-[28px] font-bold text-slate-900 leading-[1.3] mb-4 tracking-tight">
          {user ? (
            <>
              <span className="text-violet-600">{user.user_metadata?.full_name || '회원'}</span>님,<br />
              오늘 당신의 매력을 확인하세요
            </>
          ) : (
            <>
              나를 찾는<br />
              가장 투명한 거울
            </>
          )}
        </h1>

        <p className="text-[17px] text-slate-500 font-medium leading-[1.4] mb-8">
          MBTI 심리학과 사주 명리학의 만남.<br />
          오늘 너의 기분과 행운의 OOTD까지 챙겨줄게! ✨
        </p>

        <div className="flex">
          <Button 
            size="large"
            color="primary"
            variant="fill"
            onClick={() => {
              if (user) {
                navigate('/fortune');
              } else {
                onStart();
              }
            }}
          >
            운명 확인하기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;