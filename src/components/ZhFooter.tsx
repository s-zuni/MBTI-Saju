import React from 'react';

const ZhFooter: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-slate-900 text-xs">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-black text-base tracking-tight">MBTIJU</span>
              <span className="text-[10px] text-slate-500 font-mono">GLOBAL EDITION</span>
            </div>
            <p className="text-slate-400 text-xs">
              韓國正統八字命理學 × 現代 MBTI 心理學融合分析平台
            </p>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="/terms" className="hover:text-white transition-colors">服務條款 (Terms)</a>
            <span className="text-slate-700">|</span>
            <a href="/privacy" className="hover:text-white transition-colors">個人資料隱私權 (Privacy)</a>
            <span className="text-slate-700">|</span>
            <a href="/" className="hover:text-white transition-colors">韓文原版官網</a>
          </div>
        </div>

        <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
          <p>
            客服與報告查詢聯絡：support@mbtiju.com ｜ 服務提供方：MBTIJU Team
          </p>
          <p>
            ※ 本服務結合正統東方天文萬年曆演算與現代心理統計模型，旨在提供客觀之人生戰略規劃與自我探索指引。報告內容僅供決策參考，不涉及特定醫療或投資保證。
          </p>
          <p className="text-slate-600 pt-2">
            © {new Date().getFullYear()} MBTIJU. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ZhFooter;

