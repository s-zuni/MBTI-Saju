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

const clean = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .replace(/\(1,000자 이상\)\s*/g, '')
    .replace(/\(500자 이상\)\s*/g, '')
    .replace(/\(전체 1,000자 이상\)\s*/g, '')
    .replace(/\(.*?이상\)\s*/g, '')
    .trim();
};

const renderStructured = (text: string | undefined, keywords: string[] = [], lightTheme = true) => {
  const content = clean(text);
  if (!content) return <p className="text-slate-400 text-sm italic">분석 데이터를 생성 중입니다...</p>;

  const paragraphs = content.split(/\n\n+/);
  return (
    <div className="w-full flex flex-col gap-4">
      {keywords && keywords.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {keywords.map((kw, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight ${lightTheme ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-white/10 text-amber-300 border border-white/10'}`}>
              # {kw}
            </span>
          ))}
        </div>
      )}
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        const firstLine = lines[0] || '';
        const isSubheading = firstLine.startsWith('▶');
        if (isSubheading) {
          const title = firstLine.replace('▶', '').trim();
          const body = lines.slice(1).join('\n').trim();
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1 h-3.5 rounded-full ${lightTheme ? 'bg-violet-500' : 'bg-amber-400'}`} />
                <p className={`text-[16px] font-black tracking-tight ${lightTheme ? 'text-slate-900' : 'text-white'}`}>{title}</p>
              </div>
              {body && <p className={`text-[15px] leading-[1.85] pl-4 ${lightTheme ? 'text-slate-600' : 'text-slate-300'}`}>{body}</p>}
            </div>
          );
        }
        return <p key={i} className={`text-[15px] leading-[1.85] ${lightTheme ? 'text-slate-600' : 'text-slate-300'}`}>{para}</p>;
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
    className={`pdf-page w-[210mm] h-[297mm] ${bg} p-[22mm] pb-[18mm] flex flex-col relative page-break-after-always overflow-hidden ${extraClass}`}
    style={{ boxSizing: 'border-box' }}
  >
    {children}
    {pageNumber && (
      <div className={`absolute bottom-[8mm] left-0 w-full px-[22mm] flex items-center gap-3 ${bg === 'bg-slate-950' ? 'text-slate-600' : 'text-slate-300'}`}>
        <div className="flex-1 h-px bg-current opacity-20" />
        <span className="text-[10px] font-black tracking-[0.3em] opacity-60 uppercase">페이지 {pageNumber} / {totalPages}</span>
        <div className="flex-1 h-px bg-current opacity-20" />
      </div>
    )}
  </div>
);

const SectionHeader = ({ num, title }: { num: string; title: string }) => (
  <div className="w-full mb-6 pb-4 border-b border-slate-200 flex items-end gap-4">
    <span className="text-4xl font-black text-slate-100 leading-none tracking-tighter">{num}</span>
    <div className="flex-1">
      <p className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{title}</p>
    </div>
    <div className="w-12 h-12 rounded-full border-2 border-slate-50 flex items-center justify-center text-[11px] font-black text-slate-100 italic">프리미엄</div>
  </div>
);

export const DeepReportPDFTemplate: React.FC<DeepReportPDFTemplateProps> = ({ sajuData, parsedContent, clientName }) => {
  const userSaju = sajuData?.userSaju;
  const lucky = sajuData?.luckyItems;
  const hasSpecial = !!(parsedContent.specialRequestAnalysis && parsedContent.specialRequestAnalysis.trim().length > 10);
  const TOTAL = hasSpecial ? 13 : 12;

  const GaugeBar = ({ el }: { el: string }) => {
    const val = Math.min(100, Math.max(0, userSaju?.elementRatio?.[el] || 0));
    return (
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-10 text-[10px] font-bold text-slate-500">{ELEMENT_LABELS[el]}</div>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${val}%`, backgroundColor: ELEMENT_COLORS[el] }} />
        </div>
        <div className="w-10 text-right text-[12px] font-black text-slate-800">{val}%</div>
      </div>
    );
  };

  return (
    <div id="pdf-capture-zone" className="font-sans text-slate-900 bg-white" style={{ width: '210mm' }}>
      
      {/* 1. Cover */}
      <PageWrapper bg="bg-slate-950" extraClass="justify-center items-center text-white" pageNumber={1} totalPages={TOTAL}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/20 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-12 h-px bg-amber-400 mb-10 opacity-50" />
          <p className="text-[12px] font-black tracking-[0.6em] text-amber-400 uppercase mb-4">심층 분석 리포트</p>
          <h1 className="text-6xl font-black text-white mb-8 tracking-tighter leading-tight italic">심층 전략 분석<br /><span className="text-4xl text-amber-500">DEEP STRATEGY</span></h1>
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-10" />
          <p className="text-sm font-bold text-slate-400 mb-2">특별히 준비된</p>
          <p className="text-4xl font-black text-white tracking-tight">{clientName} 님</p>
          <p className="mt-4 px-4 py-1.5 rounded-full border border-slate-800 text-[10px] font-black tracking-widest text-slate-500 uppercase bg-slate-900/50">
            {sajuData?.reportType || '사주 명리학 심층 분석'}
          </p>
        </div>
      </PageWrapper>

      {/* 2. 선천적 기질 + 행운 요소 */}
      <PageWrapper pageNumber={2} totalPages={TOTAL}>
        <SectionHeader num="01" title="선천적 기질 및 행운의 요소" />
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-8 bg-slate-50 rounded-2xl p-6 border border-slate-200">
             <div className="flex items-center gap-2 mb-4 text-violet-600">
               <div className="w-1 h-4 bg-current rounded-full" />
               <p className="text-xs font-black uppercase tracking-widest">사주 원국</p>
             </div>
             <div className="grid grid-cols-4 gap-2">
               {['year', 'month', 'day', 'hour'].map((k: any) => {
                 const p = userSaju?.pillars?.[k];
                 return p ? (
                   <div key={k} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col items-center shadow-sm">
                     <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase">{k}</p>
                     <p className="text-2xl font-black text-slate-900 leading-none">{p.gan}</p>
                     <div className="w-full h-px bg-slate-50 my-2" />
                     <p className="text-2xl font-black text-slate-900 leading-none">{p.zhi}</p>
                   </div>
                 ) : null;
               })}
             </div>
          </div>
          <div className="col-span-4 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex-1">
              <p className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-tighter">오행 에너지 분포</p>
              {['wood', 'fire', 'earth', 'metal', 'water'].map(el => <GaugeBar key={el} el={el} />)}
            </div>
          </div>
        </div>

        {/* Lucky Items Box */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-amber-400 rounded-lg text-white">✨</div>
            <p className="text-lg font-black text-amber-900 tracking-tight">나의 행운 요소 분석</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '행운의 색', val: lucky?.color || '분석 중', icon: '🎨' },
              { label: '행운의 숫자', val: lucky?.number || '분석 중', icon: '🔢' },
              { label: '도움되는 방향', val: lucky?.direction || '분석 중', icon: '🧭' },
              { label: '추천 습관', val: lucky?.habit || '분석 중', icon: '✅' },
            ].map((item, i) => (
              <div key={i} className="bg-white/80 p-3 rounded-xl border border-amber-100">
                <p className="text-[9px] font-black text-amber-400 uppercase mb-1 tracking-tighter">{item.label}</p>
                <p className="text-[11px] font-bold text-amber-900 leading-tight">{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {renderStructured(parsedContent.congenitalSummary, sajuData?.congenitalKeywords)}
        </div>
      </PageWrapper>

      {/* Repeating pattern for other pages with keyword highlights */}
      {[
        { num: '02', title: '재물적 성취 및 직업 전략', content: parsedContent.wealthAnalysis, kw: sajuData?.wealthKeywords },
        { num: '03', title: '사회적 관계 및 대인 역학', content: parsedContent.relationshipAnalysis, kw: sajuData?.relationshipKeywords },
        { num: '04', title: '생체 리듬 및 건강 최적화', content: parsedContent.healthAnalysis, kw: sajuData?.healthKeywords },
        { num: '05', title: '향후 10년의 대운 흐름', content: parsedContent.macroDecadeTrend, kw: sajuData?.macroDecadeKeywords, dark: true },
        { num: '06', title: '추후 3개년 연도별 상세 흐름', content: parsedContent.yearlyLuckDetail, kw: sajuData?.yearlyLuckKeywords },
        { num: '07', title: '리스크 관리 및 방어 전략', content: parsedContent.riskAnalysis, kw: sajuData?.riskKeywords, alert: true },
        { num: '08', title: '삶의 근본적 과업과 사명', content: parsedContent.coreLifeMission, kw: sajuData?.coreLifeKeywords, dark: true },
      ].map((page, idx) => (
        <PageWrapper key={idx} pageNumber={idx + 3} totalPages={TOTAL} bg={page.dark ? 'bg-slate-950' : 'bg-white'} extraClass={page.dark ? 'text-white' : ''}>
          <div className={`w-full mb-6 pb-4 border-b flex items-end gap-4 ${page.dark ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={`text-4xl font-black leading-none tracking-tighter ${page.dark ? 'text-slate-800' : 'text-slate-100'}`}>{page.num}</span>
            <div className="flex-1">
              <p className={`text-2xl font-black leading-tight tracking-tight ${page.dark ? 'text-white' : 'text-slate-900'}`}>{page.title}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-8 border flex-1 overflow-hidden ${page.dark ? 'bg-slate-900/50 border-slate-800' : page.alert ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
             {renderStructured(page.content, page.kw, !page.dark)}
          </div>
        </PageWrapper>
      ))}

      {/* Special Request */}
      {hasSpecial && (
        <PageWrapper pageNumber={TOTAL - 2} totalPages={TOTAL}>
          <SectionHeader num="09" title="특별 요청 사항 분석" />
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex-1 overflow-hidden">
            {renderStructured(parsedContent.specialRequestAnalysis, sajuData?.specialRequestKeywords)}
          </div>
        </PageWrapper>
      )}

      {/* Quarterly */}
      <PageWrapper pageNumber={TOTAL - 1} totalPages={TOTAL}>
        <SectionHeader num={hasSpecial ? '10' : '09'} title="분기별 핵심 행동 지침" />
        <div className="grid grid-cols-2 gap-4 flex-1">
          {(sajuData?.quarterlyLuck || []).map((q: any, i: number) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg mb-4 self-start italic">{q.period}</div>
              <p className="text-sm font-bold text-slate-800 mb-4 leading-relaxed flex-1">{q.summary}</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">핵심 지침</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed italic">" {q.point} "</p>
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>

      {/* Final Directive - Master Plan Layout */}
      <PageWrapper bg="bg-slate-950" extraClass="text-white" pageNumber={TOTAL} totalPages={TOTAL}>
        <div className="w-full mb-8 pb-4 border-b border-amber-500/30 flex items-end justify-between">
          <div>
            <p className="text-3xl font-black text-amber-400 tracking-tighter italic">마스터 핵심 지침</p>
          </div>
          <div className="w-16 h-16 border-2 border-amber-500/20 rounded-full flex items-center justify-center">
             <div className="w-12 h-12 border border-amber-500/40 rounded-full flex items-center justify-center text-[11px] font-black text-amber-400">인증</div>
          </div>
        </div>
        
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex-1 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          {renderStructured(parsedContent.strategicDirective, sajuData?.strategicKeywords, false)}
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="h-px w-24 bg-slate-800 mb-4" />
          <p className="text-[10px] font-black tracking-[0.5em] text-slate-700 uppercase">인증된 프리미엄 분석 리포트</p>
          <p className="text-[8px] text-slate-800 mt-2">© 2024 MBTI-SAJU SYNERGY. 모든 권리 보유.</p>
        </div>
      </PageWrapper>

    </div>
  );
};
