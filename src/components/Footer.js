import React from 'react';
import { Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-400" />
          <span className="font-bold text-gray-400">MBTIJU</span>
        </div>
        <div className="text-sm text-gray-400">© 2025 MBTIJU Corp. All rights reserved.</div>
      </div>
    </footer>
  );
};

export default Footer;