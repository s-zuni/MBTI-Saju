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
      {/* Outer celestial orbit (Saju representation) */}
      <circle 
        cx="50" 
        cy="50" 
        r="38" 
        stroke="currentColor" 
        strokeWidth="3.5" 
        className="opacity-20" 
      />
      <circle 
        cx="50" 
        cy="50" 
        r="28" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeDasharray="4 4" 
        className="opacity-40" 
      />
      
      {/* Intersecting vertical and horizontal quadrant axes (MBTI dimension grids) */}
      <line 
        x1="50" 
        y1="18" 
        x2="50" 
        y2="82" 
        stroke="currentColor" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        className="opacity-60" 
      />
      <line 
        x1="18" 
        y1="50" 
        x2="82" 
        y2="50" 
        stroke="currentColor" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        className="opacity-60" 
      />
      
      {/* Central Diamond Star (Symbolizing Saju's core cosmic energy and insight) */}
      <path 
        d="M50 34 L56 50 L50 66 L44 50 Z" 
        fill="currentColor" 
      />
      
      {/* Inner core node */}
      <circle 
        cx="50" 
        cy="50" 
        r="3.5" 
        fill="#ffffff" 
      />
      
      {/* Four orbital dots for the four pillars of destiny */}
      <circle cx="30" cy="30" r="3" fill="currentColor" className="opacity-80" />
      <circle cx="70" cy="30" r="3" fill="currentColor" className="opacity-80" />
      <circle cx="30" cy="70" r="3" fill="currentColor" className="opacity-80" />
      <circle cx="70" cy="70" r="3" fill="currentColor" className="opacity-80" />
    </svg>
  );
};

export default Logo;
