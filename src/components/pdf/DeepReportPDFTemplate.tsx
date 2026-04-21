import React from 'react';

// A4 Dimensions: 210mm x 297mm
// At 96 DPI, this is roughly 794px x 1123px.
// Tailwind uses rem/px natively, so we'll use exact pixel/mm values via arbitrary variants.
// We use fixed heights to prevent scrolling or page breaks in the middle of elements.

interface DeepReportPDFTemplateProps {
  sajuData: any; 
  parsedContent: {
    wealthAnalysis?: string;
    relationshipAnalysis?: string;
    healthAnalysis?: string;
    timelineRoadmap?: string;
    congenitalSummary?: string;
  };
  clientName: string;
}

const ELEMENT_LABELS: Record<string, string> = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)',
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: '#0d9488', // Teal
  fire: '#e11d48', // Rose
  earth: '#854d0e', // Yellow-dark
  metal: '#475569', // Slate
  water: '#2563eb', // Blue
};

// 페이지 래퍼 컴포넌트: 정확한 A4 규격 적용
const PageWrapper = ({ children, bg = "bg-white", extraClass = "" }: { children: React.ReactNode, bg?: string, extraClass?: string }) => (
  <div 
    className={`pdf-page w-[210mm] h-[297mm] ${bg} p-[20mm] flex flex-col relative page-break-after-always overflow-hidden ${extraClass}`}
    style={{ boxSizing: 'border-box' }}
  >
    {children}
  </div>
);

export const DeepReportPDFTemplate: React.FC<DeepReportPDFTemplateProps> = ({ sajuData, parsedContent, clientName }) => {
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const pointColor = '#7c3aed'; // Violet

  const renderGaugeBar = (element: string, value: number) => {
    const widthPercentage = Math.min(100, Math.max(0, value));
    return (
      <div key={element} className="flex items-center gap-4 mb-3">
        <div className="w-16 text-sm font-black text-slate-700">{ELEMENT_LABELS[element]}</div>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="h-full rounded-full" 
            style={{ width: `${widthPercentage}%`, backgroundColor: ELEMENT_COLORS[element] || '#0f172a' }}
          ></div>
        </div>
        <div className="w-12 text-right text-sm font-black text-slate-900">{widthPercentage}%</div>
      </div>
    );
  };

  const renderSajuBlock = (saju: any) => {
    if (!saju || !saju.pillars) return null;
    return (
      <div className="grid grid-cols-4 gap-2 mb-6">
        {['hour', 'day', 'month', 'year'].map((key) => {
          const p = saju.pillars[key];
          return (
            <div key={key} className="border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center p-3">
              <div className="text-[10px] font-bold text-slate-400 mb-2">{key === 'hour' ? '시주' : key === 'day' ? '일주' : key === 'month' ? '월주' : '년주'}</div>
              <div className="text-xl font-black text-slate-900 mb-1">{p.gan}</div>
              <div className="text-[10px] font-bold text-slate-500 mb-3">{ELEMENT_LABELS[p.ganElement]}</div>
              <div className="w-full border-t border-slate-200 my-1"></div>
              <div className="text-xl font-black text-slate-900 mt-2">{p.zhi}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">{ELEMENT_LABELS[p.zhiElement]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="pdf-capture-zone" className="font-sans" style={{ width: '210mm' }}>
      {/* 1. Cover Page */}
      <PageWrapper bg="bg-slate-950" extraClass="text-slate-50 justify-center items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 blur-[120px] rounded-full"></div>
        
        <div className="border border-slate-800/60 p-[30mm] w-full h-full flex flex-col justify-center items-center text-center backdrop-blur-sm z-10 relative">
          <div className="w-16 h-1 bg-amber-500 mb-10"></div>
          <p className="text-[10px] font-black tracking-[0.5em] text-amber-500 uppercase mb-6">Premium Deep Analysis</p>
          <h1 className="text-6xl font-black tracking-tight text-white mb-20 leading-tight" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            프리미엄<br/>심층 리포트
          </h1>
          
          <div className="mt-20">
            <p className="text-sm font-semibold text-slate-400 mb-2">Exclusively prepared for</p>
            <p className="text-3xl font-black text-white">{clientName} 님</p>
          </div>

          <div className="absolute bottom-[30mm] text-[10px] font-black tracking-widest text-slate-500">
            {dateStr} • MBTI-SAJU SYNERGY
          </div>
        </div>
      </PageWrapper>

      {/* 2. Table of Contents */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-4xl font-black text-slate-900 border-b-[3px] border-slate-900 pb-6 mb-12">목차<br/><span className="text-lg font-bold text-slate-400 tracking-widest uppercase">Table of Contents</span></h2>
          
          <div className="flex flex-col gap-8 mt-10">
            {[
              { num: '01', title: '선천적 기질 요약 (오행 & MBTI)' },
              { num: '02', title: '재물 및 직업 분석' },
              { num: '03', title: '대인관계 및 연애 분석' },
              { num: '04', title: '건강 및 개선점' },
              { num: '05', title: '인생 타임라인 및 분기별 행동 지침' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-6 border-b border-slate-100 pb-6">
                <span className="text-4xl font-black text-violet-200">{item.num}</span>
                <span className="text-xl font-bold text-slate-800">{item.title}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-auto border-t border-slate-200 pt-6">
             <p className="text-[10px] font-bold text-slate-400">본 리포트는 명리학과 심리학적 분석을 통합한 독점적 솔루션입니다.</p>
          </div>
        </div>
      </PageWrapper>

      {/* 3. Congenital Traits (Data Block) */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">01. 선천적 기질 요약</h2>
          
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8">
            <h3 className="text-sm font-black text-violet-600 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-violet-600 rounded-full"></div> 내담자 사주 원국표
            </h3>
            {renderSajuBlock(sajuData?.userSaju)}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8 shadow-sm">
            <h3 className="text-sm font-black text-violet-600 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-violet-600 rounded-full"></div> 오행(五行) 에너지 분포도
            </h3>
            <div className="flex flex-col gap-2">
              {['wood', 'fire', 'earth', 'metal', 'water'].map(el => 
                renderGaugeBar(el, sajuData?.userSaju?.elementRatio?.[el] || 0)
              )}
            </div>
          </div>

          <div className="flex-1 mt-4">
             <h3 className="text-lg font-black text-slate-900 mb-4 border-b-2 border-violet-200 inline-block pb-1">핵심 기질 분석</h3>
             <p className="text-slate-700 text-[15px] leading-relaxed text-justify break-keep">
               {parsedContent.congenitalSummary || "분석 데이터를 불러오는 중입니다..."}
             </p>
          </div>
        </div>
      </PageWrapper>

      {/* 4. Wealth & Career */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">02. 재물 및 직업 분석</h2>
          <div className="bg-violet-50/50 rounded-3xl p-8 border border-violet-100 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-6 border border-violet-100">💰</div>
            <p className="text-slate-800 text-[16px] leading-[2.2] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.wealthAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 5. Relationship */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">03. 대인관계 및 연애 분석</h2>
          <div className="bg-rose-50/50 rounded-3xl p-8 border border-rose-100 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-6 border border-rose-100">💖</div>
            <p className="text-slate-800 text-[16px] leading-[2.2] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.relationshipAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 6. Health & Improvement */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">04. 건강 및 개선점</h2>
          <div className="bg-teal-50/50 rounded-3xl p-8 border border-teal-100 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-6 border border-teal-100">🍃</div>
            <p className="text-slate-800 text-[16px] leading-[2.2] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.healthAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 7. Roadmap & Quarters */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">05. 인생 타임라인 및 행동 지침</h2>
          
          <div className="mb-10">
             <h3 className="text-lg font-black text-violet-700 mb-6">향후 1년 분기별 핵심 운세</h3>
             <div className="grid grid-cols-2 gap-4">
                {sajuData?.quarterlyLuck?.map((q: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                     <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-black rounded-lg mb-3">{q.period}</div>
                     <p className="text-sm font-bold text-slate-800 mb-3 leading-relaxed">{q.summary}</p>
                     <p className="text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100"><span className="text-violet-600 mr-1">T.</span> {q.point}</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="flex-1 mt-auto bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-6">🎯</div>
            <h3 className="text-lg font-black text-white mb-4">최종 행동 지침 (Action Roadmap)</h3>
            <p className="text-slate-300 text-[15px] leading-relaxed text-justify break-keep">
               {parsedContent.timelineRoadmap || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>
      
    </div>
  );
};
