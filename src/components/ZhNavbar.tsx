import React from 'react';
import { Sparkles, Globe } from 'lucide-react';

interface ZhNavbarProps {
  onOpenApply: () => void;
}

const ZhNavbar: React.FC<ZhNavbarProps> = ({ onOpenApply }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-100 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="/zh" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 font-sans">MBTIJU</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-50 text-violet-600 rounded border border-violet-100">繁中版</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">韓國八字 × MBTI 深度命理</span>
          </div>
        </a>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/"
            title="切換至韓文官網 (한국어)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] sm:text-xs">한국어</span>
          </a>

          <button
            onClick={onOpenApply}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>預約深度報告</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default ZhNavbar;

