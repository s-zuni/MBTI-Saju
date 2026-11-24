import React from 'react';
import { Loader2, Download, CheckCircle2 } from 'lucide-react';
import { SERVICE_COSTS } from '../../config/creditConfig';
import { stripMarkdown } from '../../utils/textUtils';
import FunnelBottomCta from '../FunnelBottomCta';

interface ElementColor {
  bg: string;
  text: string;
  bar: string;
}

const ELEMENT_COLORS: Record<string, ElementColor> = {
  '목(木)': { bg: 'bg-emerald-50/60', text: 'text-emerald-800', bar: 'bg-emerald-600' },
  '화(火)': { bg: 'bg-rose-50/60', text: 'text-rose-800', bar: 'bg-rose-600' },
  '토(土)': { bg: 'bg-amber-50/60', text: 'text-amber-800', bar: 'bg-amber-600' },
  '금(金)': { bg: 'bg-slate-100/80', text: 'text-slate-800', bar: 'bg-slate-600' },
  '수(水)': { bg: 'bg-sky-50/60', text: 'text-sky-800', bar: 'bg-sky-600' },
};
const DEFAULT_COLOR: ElementColor = { bg: 'bg-stone-50', text: 'text-stone-800', bar: 'bg-stone-600' };

const getElementColor = (element: unknown): ElementColor => {
  if (typeof element !== 'string' || !element) return DEFAULT_COLOR;
  const key = Object.keys(ELEMENT_COLORS).find((k) => element.includes(k[0] || ''));
  if (key && ELEMENT_COLORS[key]) {
    return ELEMENT_COLORS[key];
  }
  return DEFAULT_COLOR;
};

interface FullSajuReportContentProps {
  analysis: any;
  isStreaming?: boolean;
  isDownloading?: boolean;
  isRegenerating?: boolean;
  onDownloadReport: () => void;
  onRegenerate?: () => void;
  onOpenDeepReport?: (() => void) | undefined;
  fromContext?: string;
}

const FullSajuReportContent: React.FC<FullSajuReportContentProps> = ({
  analysis,
  isStreaming = false,
  isDownloading = false,
  isRegenerating = false,
  onDownloadReport,
  onRegenerate,
  onOpenDeepReport,
  fromContext = 'mbti_saju_full_report',
}) => {
  if (!analysis || typeof analysis !== 'object') return null;

  const currentYear = new Date().getFullYear();
  const displayMbti = analysis.mbti && analysis.mbti !== '미입력' ? `${analysis.mbti} · ` : '';

  const safeElements = Array.isArray(analysis.fiveElements?.elements)
    ? analysis.fiveElements.elements.filter((el: any) => el && typeof el === 'object')
    : [];
  const maxElementCount =
    safeElements.length > 0
      ? Math.max(...safeElements.map((e: any) => (typeof e?.count === 'number' ? e.count : 0)), 1)
      : 1;

  const safeSynergyPoints = Array.isArray(analysis.deepIntegration?.synergyPoints)
    ? analysis.deepIntegration.synergyPoints.filter((p: any) => p && typeof p === 'object')
    : [];

  const safeIntegrationPoints = Array.isArray(analysis.deepIntegration?.integrationPoints)
    ? analysis.deepIntegration.integrationPoints.filter((p: any) => p && typeof p === 'object')
    : [];

  const safeMonths = Array.isArray(analysis.monthlyFortune?.months)
    ? analysis.monthlyFortune.months.filter((m: any) => m && typeof m === 'object')
    : [];

  const safeWatchOut = Array.isArray(analysis.warnings?.watchOut)
    ? analysis.warnings.watchOut.filter((w: any) => w && typeof w === 'object')
    : [];

  const safeAvoid = Array.isArray(analysis.warnings?.avoid)
    ? analysis.warnings.avoid.filter((w: any) => w && typeof w === 'object')
    : [];

  const lightAndShadow = analysis.lifeGuideline?.lightAndShadow;
  const luckyBooster = analysis.lifeGuideline?.luckyBooster;

  const completedSections = [
    Boolean(analysis.fusionNickname || analysis.reportTitle),
    Boolean(analysis.nature?.dayPillarSummary),
    safeElements.length > 0,
    Boolean(analysis.persona?.mbtiNickname),
    Boolean(analysis.deepIntegration?.sajuBaseAnalysis || analysis.deepIntegration?.mbtiIntegration),
    Boolean(lightAndShadow?.light),
    Boolean(analysis.yearlyFortune?.theme),
    safeMonths.length > 0,
    Boolean(analysis.fieldStrategies?.career || analysis.warnings || analysis.solution),
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-fade-up text-left">
      {/* 실시간 작성 진행 배너 (결제 직후 오해 방지) */}
      {isStreaming && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
          <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug">
              결제가 완료되어 전체 풀이를 실시간으로 작성하고 있습니다
            </p>
            <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
              작성된 항목부터 아래에 바로 표시됩니다 ({Math.max(1, completedSections)} / 9 항목 진행 중)
            </p>
          </div>
        </div>
      )}

      {!isStreaming && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>전체 사주 풀이가 완료되었습니다. 하단에서 PDF 저장도 가능합니다.</span>
        </div>
      )}

      {/* 헤더: 한지 톤 에디토리얼 명칭 */}
      {analysis.fusionNickname && (
        <div className="py-8 px-6 sm:px-8 bg-[#FAF7F0] border border-[#E6DFD1] rounded-2xl text-center space-y-2.5">
          <p className="text-sm font-semibold text-stone-600">
            {displayMbti}사주 명리 종합 풀이
          </p>
          <h3
            className="text-2xl sm:text-3xl font-bold text-[#1A1917] leading-snug break-keep"
            style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
          >
            {stripMarkdown(analysis.fusionNickname)}
          </h3>
        </div>
      )}

      {analysis.reportTitle && (
        <div className="py-5 border-y border-stone-200 text-center">
          <h3
            className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug break-keep"
            style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
          >
            {stripMarkdown(analysis.reportTitle)}
          </h3>
        </div>
      )}

      <div className="space-y-12">
        {/* [1순위] 선천적 기질 */}
        {analysis.nature && (analysis.nature.dayPillarSummary || analysis.nature.dayMasterAnalysis) && (
          <section className="report-section">
            <h4 className="report-section-title">선천적 기질 — 사주가 말하는 본성</h4>
            <div className="report-card space-y-6">
              {analysis.nature.dayPillarSummary && (
                <p className="text-base sm:text-[17px] font-bold text-slate-950 leading-[1.85] whitespace-pre-wrap break-keep pb-5 border-b border-stone-200">
                  {stripMarkdown(analysis.nature.dayPillarSummary)}
                </p>
              )}
              <div className="space-y-6">
                {analysis.nature.dayMasterAnalysis && (
                  <div className="space-y-1.5">
                    <h5 className="text-lg font-bold text-slate-900">일간 — 타고난 핵심 자아</h5>
                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                      {stripMarkdown(analysis.nature.dayMasterAnalysis)}
                    </p>
                  </div>
                )}
                {analysis.nature.dayBranchAnalysis && (
                  <div className="space-y-1.5 pt-4 border-t border-stone-100">
                    <h5 className="text-lg font-bold text-slate-900">일지 — 속마음과 생활 기질</h5>
                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                      {stripMarkdown(analysis.nature.dayBranchAnalysis)}
                    </p>
                  </div>
                )}
                {analysis.nature.monthBranchAnalysis && (
                  <div className="space-y-1.5 pt-4 border-t border-stone-100">
                    <h5 className="text-lg font-bold text-slate-900">월지 — 사회적 무대와 환경</h5>
                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                      {stripMarkdown(analysis.nature.monthBranchAnalysis)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* [2순위] 오행 에너지 구성 */}
        {safeElements.length > 0 && (
          <section className="report-section">
            <h4 className="report-section-title">오행 에너지 구성</h4>
            {analysis.fiveElements?.summary && (
              <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep mb-5 px-1">
                {stripMarkdown(analysis.fiveElements.summary)}
              </p>
            )}
            <div className="space-y-3.5">
              {safeElements.map((el: any, idx: number) => {
                const color = getElementColor(el.element);
                const count = typeof el.count === 'number' ? el.count : 0;
                const pct = Math.round((count / maxElementCount) * 100);
                return (
                  <div key={idx} className={`report-card !p-5 sm:!p-6 ${color.bg}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`font-bold text-base sm:text-lg ${color.text}`}>{el.element || ''}</span>
                      <span className={`text-lg font-bold ${color.text}`}>{count}</span>
                    </div>
                    <div className="w-full bg-white/80 rounded-full h-2 mb-3">
                      <div className={`${color.bar} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    {el.interpretation && (
                      <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] whitespace-pre-wrap break-keep">
                        {stripMarkdown(el.interpretation)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* [3순위] 성향 상호작용 */}
        {analysis.persona && (analysis.persona.mbtiNickname || analysis.persona.dominantFunction) && (
          <section className="report-section">
            <h4 className="report-section-title">
              {analysis.mbti && analysis.mbti !== '미입력'
                ? `${analysis.mbti} 기질과 사주의 작용`
                : '행동 기질과 내면 에너지'}
            </h4>
            <div className="report-card bg-[#FAF7F0] border-[#E6DFD1] space-y-5">
              {analysis.persona.mbtiNickname && (
                <h5 className="font-bold text-slate-950 text-lg sm:text-xl leading-snug pb-3 border-b border-[#E6DFD1]">
                  {stripMarkdown(analysis.persona.mbtiNickname)}
                </h5>
              )}
              {analysis.persona.dominantFunction && (
                <div className="space-y-1.5">
                  <h6 className="text-base sm:text-lg font-bold text-slate-900">겉으로 드러나는 핵심 에너지</h6>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(analysis.persona.dominantFunction)}
                  </p>
                </div>
              )}
              {analysis.persona.auxiliaryFunction && (
                <div className="space-y-1.5 pt-4 border-t border-[#E6DFD1]/80">
                  <h6 className="text-base sm:text-lg font-bold text-slate-900">관계와 일상 속 상호작용</h6>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(analysis.persona.auxiliaryFunction)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* [4순위] 심층 융합 진단 (1단 흐름) */}
        {analysis.deepIntegration && (analysis.deepIntegration.sajuBaseAnalysis || analysis.deepIntegration.mbtiIntegration) && (
          <section className="report-section">
            <h4 className="report-section-title">사주 명식과 성향의 연결고리</h4>

            <div className="space-y-5">
              {analysis.deepIntegration.sajuBaseAnalysis && (
                <div className="report-card border-l-4 border-l-slate-800 bg-stone-50/50 space-y-2.5">
                  <h5 className="font-bold text-slate-950 text-lg sm:text-xl">타고난 사주 바탕</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(analysis.deepIntegration.sajuBaseAnalysis)}
                  </p>
                </div>
              )}

              {analysis.deepIntegration.mbtiIntegration && (
                <div className="report-card border-l-4 border-l-indigo-800 bg-stone-50/50 space-y-2.5">
                  <h5 className="font-bold text-slate-950 text-lg sm:text-xl">현실 성향과 행동 패턴</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(analysis.deepIntegration.mbtiIntegration)}
                  </p>
                </div>
              )}

              {safeSynergyPoints.length > 0 && (
                <div className="report-card space-y-5">
                  <h5 className="font-bold text-slate-950 text-lg sm:text-xl pb-3 border-b border-stone-200">
                    눈여겨볼 시너지 포인트
                  </h5>
                  <div className="space-y-5">
                    {safeSynergyPoints.map((point: any, idx: number) => (
                      <div key={idx} className={idx > 0 ? 'pt-5 border-t border-stone-100 space-y-1.5' : 'space-y-1.5'}>
                        <h6 className="font-bold text-slate-900 text-base sm:text-lg leading-snug">
                          {idx + 1}. {stripMarkdown(point.subtitle || '')}
                        </h6>
                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                          {stripMarkdown(point.content || '')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 구 버전 호환용 */}
        {(!analysis.deepIntegration || (!analysis.deepIntegration.sajuBaseAnalysis && !analysis.deepIntegration.mbtiIntegration)) &&
          safeIntegrationPoints.length > 0 && (
            <section className="report-section">
              <h4 className="report-section-title">심층 융합 진단</h4>
              <div className="space-y-4">
                {safeIntegrationPoints.map((p: any, i: number) => (
                  <div key={i} className="report-card border-l-4 border-l-slate-800 space-y-2">
                    <h5 className="font-bold text-slate-950 text-lg leading-snug">
                      {i + 1}. {stripMarkdown(p.subtitle || '')}
                    </h5>
                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                      {stripMarkdown(p.content || '')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* [5순위] 성향의 강점과 내면의 그림자 (1단 흐름) */}
        {lightAndShadow && (lightAndShadow.light || lightAndShadow.shadow || lightAndShadow.solution) && (
          <section className="report-section">
            <h4 className="report-section-title">성향의 강점과 내면의 그림자</h4>

            <div className="space-y-5">
              {lightAndShadow.light && (
                <div className="report-card bg-amber-50/40 border-amber-200/70 space-y-2.5">
                  <h5 className="font-bold text-slate-950 text-lg sm:text-xl">타고난 성향의 강점</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(lightAndShadow.light)}
                  </p>
                </div>
              )}

              {lightAndShadow.shadow && (
                <div className="report-card bg-stone-50 border-stone-200 space-y-2.5">
                  <h5 className="font-bold text-slate-950 text-lg sm:text-xl">스트레스 시 드러나는 이면</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(lightAndShadow.shadow)}
                  </p>
                </div>
              )}

              {lightAndShadow.solution && (
                <div className="report-card bg-emerald-50/60 border-emerald-200 space-y-2.5">
                  <h5 className="font-bold text-emerald-950 text-lg sm:text-xl">균형 잡기 처방과 조언</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(lightAndShadow.solution)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* [6순위] 일상 보완 포인트 (그리드 제거, 정갈한 정의 목록) */}
        {luckyBooster && (luckyBooster.luckyColor || luckyBooster.luckyItem || luckyBooster.luckyPlace || luckyBooster.dailyRoutine) && (
          <section className="report-section">
            <h4 className="report-section-title">기운을 북돋우는 일상 포인트</h4>
            <div className="report-card !p-6 sm:!p-7 divide-y divide-stone-200">
              {luckyBooster.luckyColor && (
                <div className="py-3.5 first:pt-0 space-y-1">
                  <h5 className="text-base font-bold text-slate-900">어울리는 색상</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                    {stripMarkdown(luckyBooster.luckyColor)}
                  </p>
                </div>
              )}
              {luckyBooster.luckyItem && (
                <div className="py-3.5 space-y-1">
                  <h5 className="text-base font-bold text-slate-900">추천 소품</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                    {stripMarkdown(luckyBooster.luckyItem)}
                  </p>
                </div>
              )}
              {luckyBooster.luckyPlace && (
                <div className="py-3.5 space-y-1">
                  <h5 className="text-base font-bold text-slate-900">힘이 나는 장소</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                    {stripMarkdown(luckyBooster.luckyPlace)}
                  </p>
                </div>
              )}
              {luckyBooster.dailyRoutine && (
                <div className="py-3.5 last:pb-0 space-y-1">
                  <h5 className="text-base font-bold text-slate-900">추천 루틴</h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                    {stripMarkdown(luckyBooster.dailyRoutine)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* [7순위] 올해 운세 흐름 */}
        {analysis.yearlyFortune && (analysis.yearlyFortune.theme || analysis.yearlyFortune.overview) && (
          <section className="report-section">
            <h4 className="report-section-title">{currentYear}년 운세 흐름</h4>
            <div className="report-card bg-slate-900 border-slate-800 text-white space-y-5">
              {analysis.yearlyFortune.theme && (
                <h5
                  className="text-xl sm:text-2xl font-bold text-amber-200 leading-snug break-keep"
                  style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
                >
                  {stripMarkdown(analysis.yearlyFortune.theme)}
                </h5>
              )}
              {analysis.yearlyFortune.overview && (
                <p className="text-slate-100 text-[15px] sm:text-base leading-[1.95] whitespace-pre-wrap break-keep">
                  {stripMarkdown(analysis.yearlyFortune.overview)}
                </p>
              )}
              {Array.isArray(analysis.yearlyFortune.keywords) && analysis.yearlyFortune.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {analysis.yearlyFortune.keywords
                    .filter((k: any): k is string => typeof k === 'string' && k.trim().length > 0)
                    .map((kw: string, i: number) => (
                      <span key={i} className="px-3.5 py-1.5 bg-white/10 text-amber-100 rounded-full text-sm font-semibold border border-white/15">
                        #{kw.replace(/^#/, '').trim()}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 월별 운세 */}
        {safeMonths.length > 0 && (
          <section className="report-section">
            <h4 className="report-section-title">{currentYear}년 시기별 흐름 가이드</h4>
            <div className="space-y-4">
              {safeMonths.map((m: any, i: number) => (
                <div key={i} className="report-card !p-6 space-y-2.5">
                  <div className="flex flex-wrap items-baseline gap-2.5 pb-2 border-b border-stone-100">
                    <span className="text-base sm:text-lg font-bold text-indigo-900">
                      {m.period || `${i + 1}분기`}
                    </span>
                    {m.energy && (
                      <span className="text-sm sm:text-[15px] font-semibold text-stone-600">
                        {stripMarkdown(m.energy)}
                      </span>
                    )}
                  </div>
                  {m.guide && (
                    <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                      {stripMarkdown(m.guide)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* [8순위] 분야별 현실 전략 */}
        {analysis.fieldStrategies && typeof analysis.fieldStrategies === 'object' && (
          <section className="report-section">
            <h4 className="report-section-title">분야별 현실 전략</h4>
            <div className="space-y-5">
              {(['career', 'love', 'wealth'] as const).map((field) => {
                const data = (analysis.fieldStrategies as any)[field];
                if (!data || typeof data !== 'object') return null;
                const fieldConfig = {
                  career: { label: '커리어·직업', border: 'border-l-blue-600' },
                  love: { label: '연애·관계', border: 'border-l-rose-600' },
                  wealth: { label: '재물·투자', border: 'border-l-amber-600' },
                };
                const cfg = fieldConfig[field];
                return (
                  <div key={field} className={`report-card border-l-4 ${cfg.border} space-y-4`}>
                    <div className="space-y-1 pb-3 border-b border-stone-100">
                      <p className="text-sm font-bold text-stone-500">{cfg.label}</p>
                      {data.subtitle && (
                        <h5 className="font-bold text-slate-950 text-lg sm:text-xl leading-snug">
                          {stripMarkdown(data.subtitle)}
                        </h5>
                      )}
                    </div>
                    {data.analysis && (
                      <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                        {stripMarkdown(data.analysis)}
                      </p>
                    )}
                    {data.advice && (
                      <div className="bg-[#FAF7F0] border border-[#E6DFD1] rounded-xl p-5 space-y-1.5">
                        <p className="text-sm sm:text-base font-bold text-slate-900">현실 처방과 조언</p>
                        <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                          {stripMarkdown(data.advice)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* [9순위] 주의해야 할 흐름 & 종합 솔루션 */}
        {(safeWatchOut.length > 0 || safeAvoid.length > 0 || analysis.solution) && (
          <section className="report-section">
            <h4 className="report-section-title">주의해야 할 흐름</h4>
            <div className="space-y-4">
              {safeWatchOut.map((w: any, i: number) => (
                <div key={i} className="report-card bg-amber-50/70 border-amber-200 !p-6 space-y-2">
                  <p className="text-sm font-bold text-amber-800">경계할 흐름</p>
                  <h5 className="font-bold text-slate-950 text-lg leading-snug">
                    {stripMarkdown(w.title || '')}
                  </h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(w.description || '')}
                  </p>
                </div>
              ))}
              {safeAvoid.map((w: any, i: number) => (
                <div key={i} className="report-card bg-rose-50/70 border-rose-200 !p-6 space-y-2">
                  <p className="text-sm font-bold text-rose-800">피해야 할 선택</p>
                  <h5 className="font-bold text-slate-950 text-lg leading-snug">
                    {stripMarkdown(w.title || '')}
                  </h5>
                  <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                    {stripMarkdown(w.description || '')}
                  </p>
                </div>
              ))}
            </div>
            {analysis.solution && (
              <div className="mt-6 report-card bg-[#FAF7F0] border-[#D8CFBE] !p-6 sm:!p-8 space-y-3">
                <h5 className="text-lg sm:text-xl font-bold text-slate-950">종합 솔루션 및 당부</h5>
                <p className="text-[15px] sm:text-base text-slate-800 leading-[1.95] whitespace-pre-wrap break-keep">
                  {stripMarkdown(analysis.solution)}
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 스트리밍 진행 중 하단 안내 */}
      {isStreaming ? (
        <div className="mt-8 py-6 px-4 rounded-2xl bg-[#FAF7F0] border border-[#E6DFD1] flex items-center justify-center gap-3 text-stone-800 text-sm sm:text-base font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-900 shrink-0" />
          <span>이어지는 풀이 항목을 계속 작성하고 있습니다...</span>
        </div>
      ) : (
        <>
          <div className="mt-10 pt-8 border-t border-stone-200 flex flex-col items-center">
            <button
              onClick={onDownloadReport}
              disabled={isDownloading}
              className="flex items-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-full font-bold text-base shadow-lg hover:bg-slate-800 transition-colors"
            >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              리포트 PDF 다운로드
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} disabled={isRegenerating} className="mt-4 text-stone-500 text-sm font-semibold underline underline-offset-4">
                {isRegenerating ? '결제 창 여는 중...' : `정밀 데이터 재생성 (${SERVICE_COSTS.REGENERATE_MBTI_SAJU.toLocaleString()}원)`}
              </button>
            )}
          </div>

          <FunnelBottomCta from={fromContext} onOpenDeepReport={onOpenDeepReport} />
        </>
      )}
    </div>
  );
};

export default FullSajuReportContent;
