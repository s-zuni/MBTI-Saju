import React, { useState } from 'react';
import { Sparkles, Menu } from 'lucide-react';

const Navbar = ({
  openSignupModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            MBTIJU
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600">
            홈
          </a>
          <a href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600">
            유형 도감
          </a>
          <a href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600">
            커뮤니티
          </a>
          <a href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600">
            스토어
          </a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={openSignupModal}
            className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-full shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
          >
            무료 분석 시작
          </button>
        </div>
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 p-4 flex flex-col gap-4 shadow-lg">
          <a href="/" className="text-base font-medium text-gray-600 py-2">
            홈
          </a>
          <button
            onClick={openSignupModal}
            className="w-full py-3 text-indigo-600 font-bold bg-indigo-50 rounded-xl"
          >
            무료 분석 시작하기
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;