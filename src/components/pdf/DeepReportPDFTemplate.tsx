import React from 'react';

// A4 Dimensions: 210mm x 297mm
// At 96 DPI, this is roughly 794px x 1123px.
// Tailwind uses rem/px natively, so we'll use exact pixel/mm values via arbitrary variants.
// We use fixed heights to prevent scrolling or page breaks in the middle of elements.

interface DeepReportPDFTemplateProps {
  sajuData: any; 
  parsedContent: {
    congenitalSummary?: string;
    wealthAnalysis?: string;
    relationshipAnalysis?: string;
    healthAnalysis?: string;
    macroDecadeTrend?: string;
    monthlyLuckDetail?: string;
    riskAnalysis?: string;
    coreLifeMission?: string;
    strategicDirective?: string;
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
              { num: '01', title: '선천적 기질 및 사주 원국 분석' },
              { num: '02', title: '재물적 성취 및 자산 운용 전략' },
              { num: '03', title: '사회적 관계 및 네트워크 역학' },
              { num: '04', title: '생체 리듬 및 건강 최적화 전략' },
              { num: '05', title: '거시적 흐름: 향후 10년의 대운 분석' },
              { num: '06', title: '미시적 흐름: 당해년도 12개월 상세 운세' },
              { num: '07', title: '리스크 관리: 최악의 시나리오 및 방어' },
              { num: '08', title: '우주적 미션: 삶의 근본적 과업' },
              { num: '09', title: '분기별 핵심 행동 지침(Action Plan)' },
              { num: '10', title: '최종 전략 제언 및 결론' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-6 border-b border-slate-100 pb-5">
                <span className="text-3xl font-black text-violet-200">{item.num}</span>
                <span className="text-lg font-bold text-slate-800">{item.title}</span>
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
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">02. 재물적 성취 및 직업 전략</h2>
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-8 border border-slate-100">💰</div>
            <p className="text-slate-800 text-[15px] leading-[2.1] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.wealthAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 5. Relationship */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">03. 사회적 관계 및 대인 역학</h2>
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-8 border border-slate-100">🤝</div>
            <p className="text-slate-800 text-[15px] leading-[2.1] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.relationshipAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 6. Health & Resilience */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">04. 생체 리듬 및 건강 최적화</h2>
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-8 border border-slate-100">⚕️</div>
            <p className="text-slate-800 text-[15px] leading-[2.1] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.healthAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 7. Macro Decade Trend */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">05. 거시적 흐름: 향후 10년의 대운</h2>
          <div className="bg-violet-950 text-white rounded-3xl p-10 flex-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full"></div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-8">🔭</div>
            <p className="text-slate-200 text-[15px] leading-[2.1] text-justify break-keep relative z-10">
               {parsedContent.macroDecadeTrend || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 8. Monthly Luck Detail */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">06. 미시적 흐름: 당해년도 12개월</h2>
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-8 border border-slate-100">📅</div>
            <p className="text-slate-800 text-[15px] leading-[2.1] text-justify break-keep tracking-[-0.01em]">
               {parsedContent.monthlyLuckDetail || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 9. Risk Analysis */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">07. 리스크 관리: 최악의 시나리오</h2>
          <div className="bg-rose-50 rounded-3xl p-10 border border-rose-100 flex-1">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-8 border border-rose-200">⚠️</div>
            <p className="text-slate-900 text-[15px] leading-[2.1] text-justify break-keep">
               {parsedContent.riskAnalysis || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 10. Core Life Mission */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">08. 우주적 미션: 근본적 과업</h2>
          <div className="bg-slate-900 text-white rounded-3xl p-10 flex-1">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-8">✨</div>
            <p className="text-slate-300 text-[15px] leading-[2.1] text-justify break-keep">
               {parsedContent.coreLifeMission || "분석 결과를 대기 중입니다."}
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 11. Quarterly Action Plan */}
      <PageWrapper>
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-4 mb-8">09. 분기별 핵심 행동 지침</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-8 flex-1">
            {sajuData?.quarterlyLuck?.map((q: any, i: number) => (
              <div key={i} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                 <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-black rounded-lg mb-4 self-start">{q.period}</div>
                 <p className="text-base font-bold text-slate-800 mb-4 leading-relaxed">{q.summary}</p>
                 <div className="mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 mb-2 tracking-widest uppercase">Action Point</p>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">{q.point}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>

      {/* 12. Final Directive */}
      <PageWrapper bg="bg-slate-950" extraClass="text-white">
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black text-amber-500 border-b-2 border-amber-500/30 pb-4 mb-10 text-center">10. 최종 전략 제언 및 결론</h2>
          <div className="flex-1 border border-slate-800 rounded-3xl p-10 backdrop-blur-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
             <p className="text-slate-300 text-[16px] leading-[2.3] text-justify break-keep tracking-wide">
                {parsedContent.strategicDirective || "분석 결과를 대기 중입니다."}
             </p>
          </div>
          <div className="mt-12 text-center">
            <p className="text-[10px] font-black tracking-[0.4em] text-slate-600 uppercase">End of Premium Deep Analysis</p>
          </div>
        </div>
      </PageWrapper>
      
    </div>
  );
};
