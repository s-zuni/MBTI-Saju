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
      {/* Stitch MCP Inspired Minimalist Corporate Logo */}
      <rect x="20" y="20" width="40" height="40" rx="8" fill="#2E5A44" />
      <rect x="40" y="40" width="40" height="40" rx="8" fill="#FACC15" />
      <path d="M20 60 L60 20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};

export default Logo;
