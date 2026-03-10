import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useModalStore } from '../hooks/useModalStore';

const Footer = () => {
  const { openModal } = useModalStore();

  return (
    <footer className="bg-white border-t border-slate-200 py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MBTIJU logo" className="w-7 h-7 object-contain rounded-full" />
            <span className="font-bold text-slate-500 tracking-tight text-lg">MBTIJU</span>
          </div>
          <div className="text-xs text-slate-500 leading-relaxed space-y-1 font-medium">
            <p>
              <span className="text-slate-400">상호명</span> 엠비티아이주
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-400">대표명</span> 이승준
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-400">사업자등록번호</span> 364-45-01374
            </p>
            <p><span className="text-slate-400">사업장주소</span> 서울특별시 동대문구 망우로109, 207호</p>
            <p><span className="text-slate-400">고객센터</span> <a href="tel:070-8095-3075" className="hover:text-slate-700 transition-colors">070-8095-3075</a></p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4 text-sm text-slate-500">
          <div className="flex gap-6 font-medium">
            <a href="/support" className="hover:text-indigo-600 transition-colors">고객센터</a>
            <a href="/terms" className="hover:text-indigo-600 transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-indigo-600 transition-colors">개인정보처리방침</a>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            © 2026 MBTIJU. All rights reserved.<br />
            당신의 성향과 운명을 잇는 특별한 여정.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;