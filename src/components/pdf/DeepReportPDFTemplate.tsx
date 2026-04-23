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
    .replace(/\(상세 분석\)\s*/g, '')
    .replace(/\(분량\)\s*/g, '')
    .trim();
};

// 단일 라인을 분석하여 적절한 JSX를 반환하는 헬퍼
const renderLine = (line: string, idx: number, lightTheme: boolean) => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 불렛포인트 라인
  if (trimmed.startsWith('- ')) {
    const bulletText = trimmed.slice(2);
    return (
      <div key={idx} className="flex gap-2 items-start">
        <span className={`mt-[5px] flex-shrink-0 w-1.5 h-1.5 rounded-full ${lightTheme ? 'bg-violet-400' : 'bg-amber-400'}`} />
        <span className={`text-[16px] leading-[1.9] ${lightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
          {bulletText}
        </span>
      </div>
    );
  }

  // 길조/흉조/주의사항 라인 (특수 강조)
  if (trimmed.startsWith('길조:') || trimmed.startsWith('- 길조:')) {
    const content = trimmed.replace(/^-?\s*길조:\s*/, '');
    return (
      <div key={idx} className="flex gap-2 items-start">
        <span className="mt-[5px] flex-shrink-0 text-[11px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded leading-none">길조</span>
        <span className={`text-[16px] leading-[1.9] ${lightTheme ? 'text-slate-700' : 'text-slate-200'}`}>{content}</span>
      </div>
    );
  }

  if (trimmed.startsWith('흉조:') || trimmed.startsWith('- 흉조:') || trimmed.startsWith('흉조/주의:') || trimmed.startsWith('- 흉조/주의:')) {
    const content = trimmed.replace(/^-?\s*(흉조\/주의|흉조):\s*/, '');
    return (
      <div key={idx} className="flex gap-2 items-start">
        <span className="mt-[5px] flex-shrink-0 text-[11px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded leading-none">주의</span>
        <span className={`text-[16px] leading-[1.9] ${lightTheme ? 'text-slate-700' : 'text-slate-200'}`}>{content}</span>
      </div>
    );
  }

  if (trimmed.startsWith('주의사항:') || trimmed.startsWith('- 주의사항:')) {
    const content = trimmed.replace(/^-?\s*주의사항:\s*/, '');
    return (
      <div key={idx} className="flex gap-2 items-start">
        <span className="mt-[5px] flex-shrink-0 text-[11px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded leading-none">주의</span>
        <span className={`text-[16px] leading-[1.9] ${lightTheme ? 'text-slate-700' : 'text-slate-200'}`}>{content}</span>
      </div>
    );
  }

  if (trimmed.startsWith('방어 전략:') || trimmed.startsWith('- 방어 전략:')) {
    const content = trimmed.replace(/^-?\s*방어 전략:\s*/, '');
    return (
      <div key={idx} className="flex gap-2 items-start">
        <span className="mt-[5px] flex-shrink-0 text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">전략</span>
        <span className={`text-[16px] leading-[1.9] ${lightTheme ? 'text-slate-700' : 'text-slate-200'}`}>{content}</span>
      </div>
    );
  }

  // 일반 텍스트
  return (
    <p key={idx} className={`text-[16px] leading-[1.9] ${lightTheme ? 'text-slate-600' : 'text-slate-300'}`}>
      {trimmed}
    </p>
  );
};

const renderStructured = (text: string | undefined, keywords: string[] = [], lightTheme = true) => {
  const content = clean(text);
  if (!content) return <p className="text-slate-400 text-sm italic">분석 데이터를 생성 중입니다...</p>;

  // ▶ 소주제를 기준으로 분할
  const sections = content.split(/(?=▶)/);

  return (
    <div className="w-full flex flex-col gap-6">
      {keywords && keywords.length > 0 && (
        <div className="flex gap-2 mb-1 flex-wrap">
          {keywords.map((kw, i) => (
            <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-black tracking-tight ${lightTheme ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-white/10 text-amber-300 border border-white/10'}`}>
              # {kw}
            </span>
          ))}
        </div>
      )}
      {sections.map((section, sIdx) => {
        if (!section.trim()) return null;
        const lines = section.split('\n');
        const firstLine = lines[0] || '';

        if (firstLine.startsWith('▶')) {
          const title = firstLine.replace('▶', '').trim();
          const bodyLines = lines.slice(1).filter(l => l !== undefined);

          return (
            <div key={sIdx} className="flex flex-col gap-2">
              {/* 소주제 헤더 */}
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-1 h-4 rounded-full flex-shrink-0 ${lightTheme ? 'bg-violet-500' : 'bg-amber-400'}`} />
                <p className={`text-[18px] font-black tracking-tight leading-tight ${lightTheme ? 'text-slate-900' : 'text-white'}`}>{title}</p>
              </div>
              {/* 소주제 내용 */}
              <div className={`flex flex-col gap-1.5 pl-3 ${lightTheme ? 'border-l-2 border-violet-100' : 'border-l-2 border-amber-500/30'}`}>
                {bodyLines.map((line, lIdx) => {
                  if (!line.trim()) return <div key={lIdx} className="h-1" />;
                  return renderLine(line, lIdx, lightTheme);
                })}
              </div>
            </div>
          );
        }

        // ▶ 없는 섹션은 일반 텍스트
        return (
          <div key={sIdx} className="flex flex-col gap-1.5">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-1" />;
              return renderLine(line, lIdx, lightTheme);
            })}
          </div>
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
    className={`pdf-page w-[210mm] min-h-[297mm] ${bg} p-[20mm] pb-[16mm] flex flex-col relative page-break-after-always overflow-hidden ${extraClass}`}
    style={{ boxSizing: 'border-box' }}
  >
    {children}
    {pageNumber && (
      <div className={`absolute bottom-[8mm] left-0 w-full px-[20mm] flex items-center gap-3 ${bg === 'bg-slate-950' ? 'text-slate-600' : 'text-slate-300'}`}>
        <div className="flex-1 h-px bg-current opacity-20" />
        <span className="text-[10px] font-black tracking-[0.3em] opacity-60 uppercase">페이지 {pageNumber} / {totalPages}</span>
        <div className="flex-1 h-px bg-current opacity-20" />
      </div>
    )}
  </div>
);

const SectionHeader = ({ num, title, dark = false }: { num: string; title: string; dark?: boolean }) => (
  <div className={`w-full mb-8 pb-4 border-b flex items-end gap-4 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
    <span className={`text-5xl font-black leading-none tracking-tighter ${dark ? 'text-slate-800' : 'text-slate-100'}`}>{num}</span>
    <div className="flex-1">
      <p className={`text-[22px] font-black leading-tight tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
    </div>
    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-[10px] font-black italic ${dark ? 'border-slate-700 text-slate-600' : 'border-slate-100 text-slate-200'}`}>프리미엄</div>
  </div>
);

export const DeepReportPDFTemplate: React.FC<DeepReportPDFTemplateProps> = ({ sajuData, parsedContent, clientName }) => {
  const userSaju = sajuData?.userSaju;
  const lucky = sajuData?.luckyItems;
  const hasSpecial = !!(parsedContent.specialRequestAnalysis && parsedContent.specialRequestAnalysis.trim().length > 10);
  // 페이지 순서: 1(표지) + 2(01선천기질) + 3(02재물) + 4(03관계) + 5(04건강) + 6(05대운흐름) + 7(분기별) + 8(06파트너) + 9(07리스크) + 10(08사명) + [11(특별)] + 12(마스터)
  const TOTAL = hasSpecial ? 12 : 11;

  const GaugeBar = ({ el }: { el: string }) => {
    const val = Math.min(100, Math.max(0, userSaju?.elementRatio?.[el] || 0));
    return (
      <div className="flex items-center gap-2 mb-2">
        <div className="w-12 text-[11px] font-bold text-slate-500">{ELEMENT_LABELS[el]}</div>
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${val}%`, backgroundColor: ELEMENT_COLORS[el] }} />
        </div>
        <div className="w-10 text-right text-[13px] font-black text-slate-800">{val}%</div>
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
          <h1 className="text-6xl font-black text-white mb-8 tracking-tighter leading-tight italic">심층 전략 분석<br /><span className="text-4xl text-amber-500">프리미엄 에디션</span></h1>
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-10" />
          <p className="text-sm font-bold text-slate-400 mb-2">특별히 준비된</p>
          <p className="text-4xl font-black text-white tracking-tight">{clientName} 님</p>
          <p className="mt-4 px-4 py-1.5 rounded-full border border-slate-800 text-[10px] font-black tracking-widest text-slate-500 uppercase bg-slate-900/50">
            {sajuData?.reportType || '사주 명리학 심층 분석'}
          </p>
        </div>
      </PageWrapper>

      {/* 2. 01 선천적 기질 + 행운 요소 */}
      <PageWrapper pageNumber={2} totalPages={TOTAL}>
        <SectionHeader num="01" title="선천적 기질 및 행운의 요소" />
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-8 bg-slate-50 rounded-2xl p-6 border border-slate-200">
             <div className="flex items-center gap-2 mb-4 text-violet-600">
               <div className="w-1 h-4 bg-current rounded-full" />
               <p className="text-xs font-black uppercase tracking-widest">사주 원국</p>
             </div>
             <div className="grid grid-cols-4 gap-2">
               {(['year', 'month', 'day', 'hour'] as const).map((k) => {
                 const p = userSaju?.pillars?.[k];
                 const labels: Record<string, string> = { year: '생년', month: '생월', day: '생일', hour: '생시' };
                 return p ? (
                   <div key={k} className={`border rounded-xl p-3 flex flex-col items-center shadow-sm ${k === 'day' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'}`}>
                     <p className={`text-[9px] font-bold mb-2 uppercase ${k === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>{labels[k]}</p>
                     <p className={`text-2xl font-black leading-none ${k === 'day' ? 'text-white' : 'text-slate-900'}`}>{p.gan}</p>
                     <div className={`w-full h-px my-2 ${k === 'day' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                     <p className={`text-2xl font-black leading-none ${k === 'day' ? 'text-white' : 'text-slate-900'}`}>{p.zhi}</p>
                   </div>
                 ) : null;
               })}
             </div>
          </div>
          <div className="col-span-4 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex-1">
              <p className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-tighter">오행 에너지 분포</p>
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
                <p className="text-[12px] font-bold text-amber-900 leading-snug">{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {renderStructured(parsedContent.congenitalSummary, sajuData?.congenitalKeywords)}
        </div>
      </PageWrapper>

      {/* 3. 02 재물 및 직업 전략 */}
      <PageWrapper pageNumber={3} totalPages={TOTAL}>
        <SectionHeader num="02" title="재물적 성취 및 직업 전략" />
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(parsedContent.wealthAnalysis, sajuData?.wealthKeywords)}
        </div>
      </PageWrapper>

      {/* 4. 03 사회적 관계 및 대인 역학 */}
      <PageWrapper pageNumber={4} totalPages={TOTAL}>
        <SectionHeader num="03" title="사회적 관계 및 대인 역학" />
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(parsedContent.relationshipAnalysis, sajuData?.relationshipKeywords)}
        </div>
      </PageWrapper>

      {/* 5. 04 생체 리듬 및 건강 최적화 */}
      <PageWrapper pageNumber={5} totalPages={TOTAL}>
        <SectionHeader num="04" title="생체 리듬 및 건강 최적화" />
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(parsedContent.healthAnalysis, sajuData?.healthKeywords)}
        </div>
      </PageWrapper>

      {/* 6. 05 향후 10년의 대운 흐름 (dark) */}
      <PageWrapper pageNumber={6} totalPages={TOTAL} bg="bg-slate-950" extraClass="text-white">
        <SectionHeader num="05" title="향후 10년의 대운 흐름" dark />
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(parsedContent.macroDecadeTrend, sajuData?.macroDecadeKeywords, false)}
        </div>
      </PageWrapper>

      {/* 7. 분기별 핵심 행동 지침 — '05 대운' 바로 다음 */}
      <PageWrapper pageNumber={7} totalPages={TOTAL}>
        <SectionHeader num="06" title="분기별 핵심 행동 지침" />
        <div className="grid grid-cols-2 gap-4 flex-1">
          {(sajuData?.quarterlyLuck || []).map((q: any, i: number) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg mb-4 self-start italic">{q.period}</div>
              <p className="text-[15px] font-bold text-slate-800 mb-4 leading-relaxed flex-1">{q.summary}</p>
              <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                <p className="text-[10px] font-black text-violet-400 mb-2 uppercase tracking-widest">핵심 행동 지침</p>
                <p className="text-[14px] font-bold text-violet-800 leading-relaxed">{q.point}</p>
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>

      {/* 8. 06 파트너 유형 분석 (구 추후 3개년) */}
      <PageWrapper pageNumber={8} totalPages={TOTAL}>
        <SectionHeader num="07" title="맞춤 파트너 및 피해야 할 유형 분석" />
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(
            parsedContent.partnerAnalysis || parsedContent.yearlyLuckDetail,
            sajuData?.partnerKeywords || sajuData?.yearlyLuckKeywords
          )}
        </div>
      </PageWrapper>

      {/* 9. 07 리스크 관리 및 방어 전략 (alert) */}
      <PageWrapper pageNumber={9} totalPages={TOTAL}>
        <SectionHeader num="08" title="리스크 관리 및 방어 전략" />
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(parsedContent.riskAnalysis, sajuData?.riskKeywords)}
        </div>
      </PageWrapper>

      {/* 10. 08 삶의 근본적 과업과 사명 (dark) */}
      <PageWrapper pageNumber={10} totalPages={TOTAL} bg="bg-slate-950" extraClass="text-white">
        <SectionHeader num="09" title="삶의 근본적 과업과 사명" dark />
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex-1 overflow-hidden">
          {renderStructured(parsedContent.coreLifeMission, sajuData?.coreLifeKeywords, false)}
        </div>
      </PageWrapper>

      {/* Special Request (조건부) */}
      {hasSpecial && (
        <PageWrapper pageNumber={11} totalPages={TOTAL}>
          <SectionHeader num="10" title="특별 요청 사항 분석" />
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex-1 overflow-hidden">
            {renderStructured(parsedContent.specialRequestAnalysis, sajuData?.specialRequestKeywords)}
          </div>
        </PageWrapper>
      )}

      {/* Final: 마스터 핵심 지침 */}
      <PageWrapper bg="bg-slate-950" extraClass="text-white" pageNumber={TOTAL} totalPages={TOTAL}>
        <div className="w-full mb-8 pb-4 border-b border-amber-500/30 flex items-end justify-between">
          <div>
            <p className="text-[28px] font-black text-amber-400 tracking-tighter italic">마스터 핵심 지침</p>
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
          <p className="text-[8px] text-slate-800 mt-2">© 2025 MBTI-사주 시너지. 모든 권리 보유.</p>
        </div>
      </PageWrapper>

    </div>
  );
};
