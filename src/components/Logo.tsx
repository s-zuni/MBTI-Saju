import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "text-slate-900", size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dynamic Monogram M (MBTI) & J (Saju) */}
      <path 
        d="M22 66 V24 L50 49 L78 24 V56 C78 68, 66 76, 53 76" 
        stroke="currentColor" 
        strokeWidth="13" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Floating celestial star/energy node (representing destiny/saju) */}
      <circle 
        cx="50" 
        cy="27" 
        r="7.5" 
        fill="var(--primary-pink, #FFB7B2)" 
      />
    </svg>
  );
};

export default Logo;
