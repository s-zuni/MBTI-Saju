import React from 'react';

interface DeepReportPDFTemplateProps {
  sajuData: any;
  parsedContent: any;
  clientName: string;
}

const ELEMENT_LABELS: Record<string, string> = {
  wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)',
};
const ELEMENT_COLORS: Record<string, string> = {
  wood: '#0d9488', fire: '#e11d48', earth: '#b45309', metal: '#475569', water: '#2563eb',
};

const getElementColorClass = (char: string | undefined): string => {
  if (!char) return 'text-slate-900';
  const wood = ['甲', '乙', '寅', '卯'];
  const fire = ['丙', '丁', '巳', '午'];
  const earth = ['戊', '己', '辰', '戌', '丑', '未'];
  const metal = ['庚', '辛', '申', '酉'];
  const water = ['壬', '癸', '亥', '子'];

  if (wood.includes(char)) return 'text-emerald-600';
  if (fire.includes(char)) return 'text-rose-600';
  if (earth.includes(char)) return 'text-amber-700';
  if (metal.includes(char)) return 'text-slate-500';
  if (water.includes(char)) return 'text-blue-600';
  return 'text-slate-900';
};

const renderText = (text: string | undefined, lightTheme = true) => {
  if (!text) return <p className="text-slate-400 text-sm italic">데이터를 불러오는 중입니다...</p>;
  
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        
        // Bullet points
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex gap-2 items-start pl-1">
              <span className={`mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full ${lightTheme ? 'bg-violet-400' : 'bg-amber-400'}`} />
              <span className={`text-[16px] leading-[1.8] ${lightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
                {trimmed.slice(2)}
              </span>
            </div>
          );
        }

        return (
          <p key={idx} className={`text-[16px] leading-[1.8] ${lightTheme ? 'text-slate-600' : 'text-slate-300'}`}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

const PageWrapper = ({
  children, bg = 'bg-white', extraClass = '', pageNumber, totalPages
}: {
  children: React.ReactNode; bg?: string; extraClass?: string; pageNumber?: number; totalPages?: number;
}) => (
  <div
    className={`pdf-page w-[210mm] min-h-[297mm] ${bg} p-[22mm] pb-[18mm] flex flex-col relative page-break-after-always overflow-hidden ${extraClass}`}
    style={{ boxSizing: 'border-box' }}
  >
    {children}
    {pageNumber && (
      <div className={`absolute bottom-[10mm] left-0 w-full px-[22mm] flex items-center gap-4 ${bg.includes('slate-950') ? 'text-slate-700' : 'text-slate-300'}`}>
        <div className="flex-1 h-px bg-current opacity-20" />
        <span className="text-[10px] font-black tracking-[0.4em] opacity-60 uppercase">PAGE {pageNumber} / {totalPages}</span>
        <div className="flex-1 h-px bg-current opacity-20" />
      </div>
    )}
  </div>
);

const SectionHeader = ({ num, title, dark = false }: { num: string; title: string; dark?: boolean }) => (
  <div className={`w-full mb-10 pb-5 border-b flex items-end gap-5 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
    <span className={`text-6xl font-black leading-none tracking-tighter ${dark ? 'text-slate-800' : 'text-slate-100'}`}>{num}</span>
    <div className="flex-1">
      <p className={`text-[24px] font-black leading-tight tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
    </div>
    <div className={`px-4 py-1.5 rounded-full border-2 text-[10px] font-black italic tracking-widest ${dark ? 'border-amber-500/20 text-amber-500/60' : 'border-slate-100 text-slate-300'}`}>PREMIUM STRATEGY</div>
  </div>
);

export const DeepReportPDFTemplate: React.FC<DeepReportPDFTemplateProps> = ({ sajuData, parsedContent, clientName }) => {
  const userSaju = sajuData?.userSaju;
  const TOTAL_PAGES = 8; // 표지(1) + 기질(2) + 재물(3) + 인연(4) + 로드맵(5,6,7) + 플랜(8)

  return (
    <div id="pdf-capture-zone" className="font-sans text-slate-900 bg-white" style={{ width: '210mm' }}>
      
      {/* 1. Cover Page */}
      <PageWrapper bg="bg-slate-950" extraClass="justify-center items-center text-white" pageNumber={1} totalPages={TOTAL_PAGES}>
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full -ml-48 -mb-48" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="w-16 h-px bg-amber-500 mb-12" />
          <p className="text-[14px] font-black tracking-[0.8em] text-amber-500 uppercase mb-6">LIFE STRATEGY REPORT</p>
          <h1 className="text-5xl font-black text-white mb-6 tracking-tighter leading-tight break-keep">
            {parsedContent.cover?.mainTitle || `${clientName} 님의 심층 라이프 컨설팅`}
          </h1>
          <p className="text-xl font-medium text-slate-400 mb-16 tracking-tight">
            {parsedContent.cover?.subTitle || '운명의 흐름과 성향의 조화'}
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <div className="h-px w-32 bg-slate-800" />
            <p className="text-3xl font-black text-white tracking-tight">{clientName} 님</p>
            <p className="px-6 py-2 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-black tracking-[0.3em] text-slate-500 uppercase">
              프리미엄 심층 보고서
            </p>
          </div>
        </div>
      </PageWrapper>

      {/* 2. 01 선천적 기질 */}
      <PageWrapper pageNumber={2} totalPages={TOTAL_PAGES}>
        <SectionHeader num="01" title={parsedContent.coreIdentity?.title || "선천적 기질 및 운명적 본질"} />
        
        <div className="flex flex-col gap-8">
          {/* Saju Data Box */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-black text-slate-800 flex items-center">
                  <span className="w-1.5 h-6 bg-violet-600 mr-3 rounded-full" />
                  사주 원국 정밀 대조 (四柱原局)
                </h4>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Master Analysis</div>
             </div>

             <div className="grid grid-cols-4 gap-2 mb-8">
                {['시주', '일주', '월주', '년주'].map((h, i) => (
                  <div key={i} className="text-center py-2 bg-slate-800 text-white text-[11px] font-black rounded-t-xl">{h}</div>
                ))}
                {[
                  { label: '천간', key: 'gan', isMain: true },
                  { label: '지지', key: 'zhi', isMain: true },
                  { label: '십성', key: 'zhiShiShen', isMain: false },
                  { label: '12운성', key: 'twelveStages', isMain: false, color: 'text-violet-600' }
                ].map((row, rIdx) => (
                  <React.Fragment key={rIdx}>
                    {[userSaju?.pillars?.hour, userSaju?.pillars?.day, userSaju?.pillars?.month, userSaju?.pillars?.year].map((p, pIdx) => (
                      <div key={`${rIdx}-${pIdx}`} className={`text-center p-3 border-x border-b bg-white ${rIdx === 3 ? 'rounded-b-xl' : ''}`}>
                        <div className="text-[9px] text-slate-400 mb-1">{row.label}</div>
                        <div className={`${row.isMain ? 'text-2xl font-black' : 'text-[11px] font-black'} ${row.isMain ? getElementColorClass(p?.[row.key as keyof typeof p] as string) : (row.color || 'text-slate-600')}`}>
                          {p?.[row.key as keyof typeof p] || '-'}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
             </div>

             <div className="grid grid-cols-5 gap-4">
               {['wood', 'fire', 'earth', 'metal', 'water'].map(el => {
                 const val = userSaju?.elementRatio?.[el] || 0;
                 return (
                   <div key={el} className="flex flex-col items-center">
                     <span className="text-[11px] font-black text-slate-500 mb-2">{ELEMENT_LABELS[el]}</span>
                     <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                       <div className="h-full" style={{ width: `${val}%`, backgroundColor: ELEMENT_COLORS[el] }} />
                     </div>
                     <span className="text-[12px] font-black text-slate-800">{val}%</span>
                   </div>
                 );
               })}
             </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white">
              <h5 className="text-xl font-black text-slate-900 mb-4 tracking-tight flex items-center">
                <span className="text-violet-500 mr-2">◆</span> 기질적 조화와 시너지
              </h5>
              {renderText(parsedContent.coreIdentity?.mbtiSajuSynergy)}
            </div>
            <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100">
              <h5 className="text-lg font-black text-rose-900 mb-3 tracking-tight flex items-center">
                <span className="text-rose-500 mr-2">⚠</span> 내면의 위험 요소와 극복 방안
              </h5>
              {renderText(parsedContent.coreIdentity?.hiddenRisk)}
            </div>
          </div>
        </div>
      </PageWrapper>

      {/* 3. 02 재물 및 직업 */}
      <PageWrapper pageNumber={3} totalPages={TOTAL_PAGES}>
        <SectionHeader num="02" title={parsedContent.wealthAndCareer?.title || "재물 그릇과 사회적 성취"} />
        <div className="flex flex-col gap-10">
          <div>
            <h5 className="text-xl font-black text-slate-900 mb-4 tracking-tight">
              <span className="text-indigo-500 mr-2">▶</span> 최적의 직업적 환경과 포지셔닝
            </h5>
            <div className="pl-5 border-l-2 border-indigo-100">
              {renderText(parsedContent.wealthAndCareer?.careerDirection)}
            </div>
          </div>
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
            <h5 className="text-xl font-black text-slate-900 mb-6 tracking-tight">
              <span className="text-amber-600 mr-2">▶</span> 재물 축적 방식 및 자산 관리 전략
            </h5>
            {renderText(parsedContent.wealthAndCareer?.wealthFlow)}
          </div>
        </div>
      </PageWrapper>

      {/* 4. 03 인연의 지형도 */}
      <PageWrapper pageNumber={4} totalPages={TOTAL_PAGES}>
        <SectionHeader num="03" title={parsedContent.relationshipAndHealth?.title || "인연의 지형도와 삶의 균형"} />
        <div className="flex flex-col gap-10">
          <div className="bg-blue-50/30 p-8 rounded-3xl border border-blue-100/50">
            <h5 className="text-xl font-black text-slate-900 mb-6 tracking-tight">
              <span className="text-blue-600 mr-2">▶</span> 대인관계 역학 및 귀인 활용법
            </h5>
            {renderText(parsedContent.relationshipAndHealth?.socialNetwork)}
          </div>
          <div>
            <h5 className="text-xl font-black text-slate-900 mb-4 tracking-tight">
              <span className="text-rose-500 mr-2">▶</span> 감정의 패턴과 최적의 파트너십
            </h5>
            <div className="pl-5 border-l-2 border-rose-100">
              {renderText(parsedContent.relationshipAndHealth?.romanceAndHealth)}
            </div>
          </div>
        </div>
      </PageWrapper>

      {/* 5,6,7. Future Roadmap */}
      {parsedContent.futureRoadmap && Object.entries(parsedContent.futureRoadmap).map(([year, yearData]: [string, any], idx: number) => {
        if (year === 'title') return null;
        return (
          <PageWrapper key={year} pageNumber={5 + idx} totalPages={TOTAL_PAGES} bg={idx === 0 ? "bg-slate-900" : "bg-white"} extraClass={idx === 0 ? "text-white" : ""}>
            <div className={`w-full mb-8 pb-4 border-b flex justify-between items-end ${idx === 0 ? 'border-slate-700' : 'border-slate-200'}`}>
               <h2 className="text-4xl font-black tracking-tighter italic">{year}년 미래 로드맵</h2>
               <p className={`text-sm font-bold ${idx === 0 ? 'text-amber-400' : 'text-violet-600'}`}>{yearData.yearlyTheme}</p>
            </div>
            
            <div className="flex flex-col gap-8">
              <div className={`p-6 rounded-2xl ${idx === 0 ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'}`}>
                <h5 className="text-lg font-black mb-3">연간 총평 및 거시적 흐름</h5>
                {renderText(yearData.overallSummary, idx !== 0)}
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                 <div className="flex flex-col gap-2">
                   <p className={`text-xs font-black uppercase tracking-widest ${idx === 0 ? 'text-slate-500' : 'text-slate-400'}`}>직업 및 재물 운용</p>
                   <div className={`p-5 rounded-xl ${idx === 0 ? 'bg-indigo-950/30' : 'bg-indigo-50'}`}>
                     {renderText(yearData.careerAndWealthDetails, idx !== 0)}
                   </div>
                 </div>
                 <div className="flex flex-col gap-2">
                   <p className={`text-xs font-black uppercase tracking-widest ${idx === 0 ? 'text-slate-500' : 'text-slate-400'}`}>관계 및 애정 흐름</p>
                   <div className={`p-5 rounded-xl ${idx === 0 ? 'bg-rose-950/30' : 'bg-rose-50'}`}>
                     {renderText(yearData.relationshipDetails, idx !== 0)}
                   </div>
                 </div>
                 <div className="flex flex-col gap-2">
                   <p className={`text-xs font-black uppercase tracking-widest ${idx === 0 ? 'text-slate-500' : 'text-slate-400'}`}>건강 관리 및 개운 전략</p>
                   <div className={`p-5 rounded-xl ${idx === 0 ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
                     {renderText(yearData.healthAndCaution, idx !== 0)}
                   </div>
                 </div>
              </div>
            </div>
          </PageWrapper>
        );
      })}

      {/* 8. 04 마스터 마스터플랜 */}
      <PageWrapper pageNumber={8} totalPages={TOTAL_PAGES} bg="bg-slate-950" extraClass="text-white">
        <SectionHeader num="04" title={parsedContent.finalAdvice?.title || "운명을 바꾸는 마스터 마스터플랜"} dark />
        
        <div className="flex flex-col gap-10 flex-1">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <h5 className="text-xl font-black text-amber-400 italic">핵심 지침 01. 즉각적 실행 과제</h5>
                <div className="text-slate-300">
                  {renderText(parsedContent.finalAdvice?.advice1, false)}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h5 className="text-xl font-black text-amber-400 italic">핵심 지침 02. 운의 흐름 강화 전략</h5>
                <div className="text-slate-300">
                  {renderText(parsedContent.finalAdvice?.advice2, false)}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h5 className="text-xl font-black text-amber-400 italic">핵심 지침 03. 관계적 한계 돌파</h5>
                <div className="text-slate-300">
                  {renderText(parsedContent.finalAdvice?.advice3, false)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center mt-auto">
            <div className="h-px w-24 bg-slate-800 mb-6" />
            <p className="text-[11px] font-black tracking-[0.6em] text-slate-600 uppercase mb-2">Authenticated VIP Report</p>
            <p className="text-[10px] text-slate-800 tracking-tight italic">본 보고서는 AI 분석 모델과 명리학적 데이터를 기반으로 검증되었습니다.</p>
          </div>
        </div>
      </PageWrapper>

    </div>
  );
};
