import React from 'react';
import { Sparkles } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-slate-300" />
          <span className="font-bold text-slate-400 tracking-tight">MBTIJU</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <a href="/terms" className="hover:text-slate-600 transition-colors">이용약관</a>
          <a href="/privacy" className="hover:text-slate-600 transition-colors">개인정보처리방침</a>
          <span>© 2025 MBTIJU Corp.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;