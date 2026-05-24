import React from 'react';
import {
  ELEMENT_STYLES,
  GAN_INFO,
  ZHI_INFO,
  translateShiShen,
  getShiShenStyle,
  formatHiddenStems
} from '../../constants/saju';

const SajuGrid: React.FC<{ saju: any }> = ({ saju }) => {
  if (!saju || !saju.pillars) return null;

  const pillars = [
    { label: '생시', key: 'hour' },
    { label: '생일', key: 'day' },
    { label: '생월', key: 'month' },
    { label: '생년', key: 'year' },
  ];

  const renderCell = (char: string, type: 'gan' | 'zhi', shishen: string = '') => {
    const isUnknown = char === '?' || char === '모름';
    const info = type === 'gan' ? GAN_INFO[char] : ZHI_INFO[char];
    const style = info ? ELEMENT_STYLES[info.element] : ELEMENT_STYLES.default;
    
    return (
      <div className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${style}`}>
        <div className="flex items-center gap-1">
          <span className="text-xl md:text-2xl font-black">{char}</span>
          {!isUnknown && info && (
             <span className="text-[8px] md:text-[10px] font-bold opacity-60">
               {info.element === 'wood' ? '목' : 
                info.element === 'fire' ? '화' : 
                info.element === 'earth' ? '토' : 
                info.element === 'metal' ? '금' : '수'}
             </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
      <div className="grid grid-cols-5 border-b border-slate-100 bg-slate-50/50">
        <div className="p-3 border-r border-slate-100"></div>
        {pillars.map((p) => (
          <div key={p.key} className={`p-3 text-center border-r last:border-r-0 border-slate-100 text-[10px] md:text-xs font-bold text-slate-500 ${p.key === 'day' ? 'bg-slate-950 text-white' : ''}`}>
            {p.label}
          </div>
        ))}
      </div>

      {/* 천간 Row */}
      <div className="grid grid-cols-5 border-b border-slate-50">
        <div className="p-3 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">천간</div>
        {pillars.map((p) => (
          <div key={p.key} className="p-2 border-r last:border-r-0 border-slate-50 flex flex-col items-center justify-center">
            {renderCell(saju.pillars[p.key].gan, 'gan')}
          </div>
        ))}
      </div>

      {/* 십성 (천간) Row */}
      <div className="grid grid-cols-5 border-b border-slate-50">
        <div className="p-2 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">십성</div>
        {pillars.map((p) => {
          const raw = saju.pillars[p.key].ganShiShen;
          const ko = p.key === 'day' ? '비견' : translateShiShen(raw);
          const style = getShiShenStyle(ko);
          return (
            <div key={p.key} className={`p-2 border-r last:border-r-0 border-slate-50 text-center flex items-center justify-center ${p.key === 'day' ? 'bg-slate-50' : ''}`}>
               <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs font-black ${style}`}>
                 {ko}
               </span>
            </div>
          );
        })}
      </div>

      {/* 지지 Row */}
      <div className="grid grid-cols-5 border-b border-slate-50">
        <div className="p-3 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">지지</div>
        {pillars.map((p) => (
          <div key={p.key} className={`p-2 border-r last:border-r-0 border-slate-50 flex flex-col items-center justify-center ${p.key === 'day' ? 'bg-slate-50 shadow-inner' : ''}`}>
            {renderCell(saju.pillars[p.key].zhi, 'zhi')}
          </div>
        ))}
      </div>

      {/* 십성 (지지) Row */}
      <div className="grid grid-cols-5 border-b border-slate-50">
        <div className="p-2 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">십성</div>
        {pillars.map((p) => {
          const raw = saju.pillars[p.key].zhiShiShen;
          const ko = translateShiShen(raw);
          const style = getShiShenStyle(ko);
          return (
            <div key={p.key} className={`p-2 border-r last:border-r-0 border-slate-50 text-center flex items-center justify-center ${p.key === 'day' ? 'bg-slate-50' : ''}`}>
               <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-[11px] font-bold ${style}`}>
                 {ko}
               </span>
            </div>
          );
        })}
      </div>

      {/* 지장간 Row */}
      <div className="grid grid-cols-5 border-b border-slate-50">
        <div className="p-2 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">지장간</div>
        {pillars.map((p) => (
          <div key={p.key} className={`p-2 border-r last:border-r-0 border-slate-50 text-center text-[9px] md:text-[10px] font-medium text-slate-500 tracking-tighter ${p.key === 'day' ? 'bg-slate-50' : ''}`}>
            {formatHiddenStems(saju.pillars[p.key].hiddenStems)}
          </div>
        ))}
      </div>

      {/* 12운성 Row */}
      <div className="grid grid-cols-5 border-b border-slate-50">
        <div className="p-2 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">12운성</div>
        {pillars.map((p) => (
          <div key={p.key} className={`p-2 border-r last:border-r-0 border-slate-50 text-center text-[10px] md:text-xs font-bold text-slate-700 ${p.key === 'day' ? 'bg-slate-50' : ''}`}>
            {saju.pillars[p.key].twelveStages}
          </div>
        ))}
      </div>

      {/* 12신살 Row */}
      <div className="grid grid-cols-5">
        <div className="p-2 border-r border-slate-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 bg-slate-50/30">12신살</div>
        {pillars.map((p) => (
          <div key={p.key} className={`p-2 border-r last:border-r-0 border-slate-50 text-center text-[10px] md:text-xs font-bold text-slate-500 ${p.key === 'day' ? 'bg-slate-50' : ''}`}>
            {saju.pillars[p.key].twelveSpirits}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SajuGrid;
