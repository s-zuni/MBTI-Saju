import React from 'react';
import {
  Loader2,
  Sparkles,
  Brain,
  ScrollText,
  Zap,
  Download,
  Calendar,
  Layers,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Heart,
  Coins,
  XCircle,
  Palette,
  Gift,
  MapPin,
  Coffee,
  Sun,
  Moon,
  Award,
  Gem,
  CheckCircle2,
} from 'lucide-react';
import { SERVICE_COSTS } from '../../config/creditConfig';
import { stripMarkdown } from '../../utils/textUtils';
import FunnelBottomCta from '../FunnelBottomCta';

interface ElementColor {
  bg: string;
  text: string;
  bar: string;
}

const ELEMENT_COLORS: Record<string, ElementColor> = {
  '목(木)': { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  '화(火)': { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  '토(土)': { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  '금(金)': { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-500' },
  '수(水)': { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
};
const DEFAULT_COLOR: ElementColor = { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-500' };

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

  const displayMbti = analysis.mbti && analysis.mbti !== '미입력' ? `${analysis.mbti} · ` : '';

  const safeElements = Array.isArray(analysis.fiveElements?.elements)
    ? analysis.fiveElements.elements.filter((el: any) => el && typeof el === 'object')
    : [];
  const maxElementCount = safeElements.length > 0
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
    <div className="space-y-6 animate-fade-up text-left">
      {/* 실시간 작성 진행 배너 (결제 직후 오해 방지) */}
      {isStreaming && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <Loader2 className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold leading-snug">
                결제가 완료되어 전체 풀이를 실시간으로 작성하고 있습니다
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                작성된 항목부터 아래에 바로 표시됩니다 ({Math.max(1, completedSections)} / 9 항목 진행 중)
              </p>
            </div>
          </div>
        </div>
      )}

      {!isStreaming && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>전체 사주 풀이가 완료되었습니다. 하단에서 PDF 저장도 가능합니다.</span>
        </div>
      )}

      {/* 헤더: 한지 톤 에디토리얼 명칭 */}
      {analysis.fusionNickname && (
        <div className="mb-6 py-7 px-6 bg-[#FAF7F0] border border-[#E6DFD1] rounded-2xl text-center space-y-2">
          <p className="text-xs font-semibold text-stone-500">
            {displayMbti}사주 명리 종합 풀이
          </p>
          <h3
            className="text-2xl sm:text-3xl font-bold text-[#1A1917] leading-snug"
            style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
          >
            {stripMarkdown(analysis.fusionNickname)}
          </h3>
        </div>
      )}

      {analysis.reportTitle && (
        <div className="text-center mb-6 py-4 border-y border-slate-100 italic">
          <h3 className="text-xl font-bold text-slate-800">"{stripMarkdown(analysis.reportTitle)}"</h3>
        </div>
      )}

      <div className="space-y-10">
        {/* [1순위] 사주 본성 분석 (JSON 스키마 순서대로 앞쪽부터 즉시 표시) */}
        {analysis.nature && (analysis.nature.dayPillarSummary || analysis.nature.dayMasterAnalysis) && (
          <section className="report-section">
            <h4 className="report-section-title">
              <ScrollText className="w-5 h-5" /> 선천적 기질 — 사주가 말하는 본성
            </h4>
            <div className="report-card">
              {analysis.nature.dayPillarSummary && (
                <p className="text-slate-950 font-bold mb-4 text-sm leading-relaxed">
                  {stripMarkdown(analysis.nature.dayPillarSummary)}
                </p>
              )}
              <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                {analysis.nature.dayMasterAnalysis && (
                  <div className="flex gap-2">
                    <span className="text-violet-600 font-black shrink-0">일간</span>
                    <p>{stripMarkdown(analysis.nature.dayMasterAnalysis)}</p>
                  </div>
                )}
                {analysis.nature.dayBranchAnalysis && (
                  <div className="flex gap-2">
                    <span className="text-violet-600 font-black shrink-0">일지</span>
                    <p>{stripMarkdown(analysis.nature.dayBranchAnalysis)}</p>
                  </div>
                )}
                {analysis.nature.monthBranchAnalysis && (
                  <div className="flex gap-2">
                    <span className="text-violet-600 font-black shrink-0">월지</span>
                    <p>{stripMarkdown(analysis.nature.monthBranchAnalysis)}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* [2순위] 오행 에너지 구성 */}
        {safeElements.length > 0 && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Layers className="w-5 h-5" /> 오행 에너지 구성
            </h4>
            <div className="space-y-3">
              {safeElements.map((el: any, idx: number) => {
                const color = getElementColor(el.element);
                const count = typeof el.count === 'number' ? el.count : 0;
                const pct = Math.round((count / maxElementCount) * 100);
                return (
                  <div key={idx} className={`report-card !p-4 ${color.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-black text-sm ${color.text}`}>{el.element || ''}</span>
                      <span className={`text-lg font-black ${color.text}`}>{count}</span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                      <div className={`${color.bar} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    {el.interpretation && (
                      <p className="text-xs text-slate-600 leading-relaxed">{stripMarkdown(el.interpretation)}</p>
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
              <Brain className="w-5 h-5" />{' '}
              {analysis.mbti && analysis.mbti !== '미입력'
                ? `${analysis.mbti} 기질과 사주의 작용`
                : '행동 기질과 내면 에너지'}
            </h4>
            <div className="report-card bg-[#FAF7F0] border-[#E6DFD1] text-slate-900">
              {analysis.persona.mbtiNickname && (
                <h5 className="font-black text-slate-950 mb-4 text-lg">{stripMarkdown(analysis.persona.mbtiNickname)}</h5>
              )}
              <div className="space-y-4 text-slate-700 text-sm">
                {analysis.persona.dominantFunction && (
                  <div>
                    <strong className="block mb-1 text-violet-700 text-xs font-bold">겉으로 드러나는 핵심 에너지</strong>
                    <p className="leading-relaxed">{stripMarkdown(analysis.persona.dominantFunction)}</p>
                  </div>
                )}
                {analysis.persona.auxiliaryFunction && (
                  <div>
                    <strong className="block mb-1 text-violet-700 text-xs font-bold">관계와 일상 속 상호작용</strong>
                    <p className="leading-relaxed">{stripMarkdown(analysis.persona.auxiliaryFunction)}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* [4순위] 심층 융합 진단 */}
        {analysis.deepIntegration && (analysis.deepIntegration.sajuBaseAnalysis || analysis.deepIntegration.mbtiIntegration) && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Sparkles className="w-5 h-5 text-violet-600" /> 사주 명식과 성향의 연결고리
            </h4>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {analysis.deepIntegration.sajuBaseAnalysis && (
                <div className="report-card border-l-4 border-violet-500 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-black text-slate-900 text-xs">타고난 사주 바탕</h5>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {stripMarkdown(analysis.deepIntegration.sajuBaseAnalysis)}
                  </p>
                </div>
              )}

              {analysis.deepIntegration.mbtiIntegration && (
                <div className="report-card border-l-4 border-indigo-500 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-black text-slate-900 text-xs">현실 성향과 행동 패턴</h5>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {stripMarkdown(analysis.deepIntegration.mbtiIntegration)}
                  </p>
                </div>
              )}
            </div>

            {safeSynergyPoints.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-500 mb-2">눈여겨볼 시너지 포인트</h5>
                <div className="grid md:grid-cols-3 gap-3">
                  {safeSynergyPoints.map((point: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-100 p-4 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-400"></div>
                      <h6 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1">
                        <span className="text-violet-600 font-extrabold text-[11px]">{idx + 1}.</span>
                        {stripMarkdown(point.subtitle || '')}
                      </h6>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {stripMarkdown(point.content || '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 구 버전 호환용 */}
        {(!analysis.deepIntegration || (!analysis.deepIntegration.sajuBaseAnalysis && !analysis.deepIntegration.mbtiIntegration)) &&
          safeIntegrationPoints.length > 0 && (
            <section className="report-section">
              <h4 className="report-section-title">
                <Sparkles className="w-5 h-5 text-violet-600" /> 심층 융합 진단
              </h4>
              <div className="space-y-4">
                {safeIntegrationPoints.map((p: any, i: number) => (
                  <div key={i} className="report-card border-l-4 border-violet-500 !pl-5">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <h5 className="font-black text-slate-900 text-sm leading-snug">{stripMarkdown(p.subtitle || '')}</h5>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pl-8">
                      {stripMarkdown(p.content || '')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* [5순위] 성격의 빛과 그림자 */}
        {lightAndShadow && (lightAndShadow.light || lightAndShadow.shadow || lightAndShadow.solution) && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Award className="w-5 h-5 text-amber-500" /> 성향의 강점과 내면의 그림자
            </h4>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {lightAndShadow.light && (
                <div className="report-card bg-amber-50/40 border-amber-100/60 relative overflow-hidden">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <h5 className="font-bold text-slate-800 text-xs">타고난 성향의 강점</h5>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {stripMarkdown(lightAndShadow.light)}
                  </p>
                </div>
              )}

              {lightAndShadow.shadow && (
                <div className="report-card bg-slate-50 border-slate-200/60 relative overflow-hidden">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Moon className="w-4 h-4 text-slate-500" />
                    <h5 className="font-bold text-slate-800 text-xs">스트레스 시 드러나는 이면</h5>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {stripMarkdown(lightAndShadow.shadow)}
                  </p>
                </div>
              )}
            </div>

            {lightAndShadow.solution && (
              <div className="report-card bg-emerald-50 border-emerald-100 !p-4 flex gap-3 items-start">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h6 className="font-bold text-slate-800 text-xs mb-1">균형 잡기 조언</h6>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {stripMarkdown(lightAndShadow.solution)}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* [6순위] 럭키 부스터 */}
        {luckyBooster && (luckyBooster.luckyColor || luckyBooster.luckyItem || luckyBooster.luckyPlace || luckyBooster.dailyRoutine) && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Gem className="w-5 h-5 text-rose-500" /> 기운을 북돋우는 일상 포인트
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="report-card text-center !p-4">
                <span className="mx-auto mb-2 bg-rose-50 text-rose-500 p-2.5 rounded-full flex items-center justify-center w-10 h-10">
                  <Palette className="w-5 h-5" />
                </span>
                <h5 className="font-bold text-slate-700 text-xs mb-1">어울리는 색상</h5>
                <p className="text-[11px] text-slate-500 leading-normal font-bold">
                  {stripMarkdown(luckyBooster.luckyColor || '')}
                </p>
              </div>

              <div className="report-card text-center !p-4">
                <span className="mx-auto mb-2 bg-amber-50 text-amber-600 p-2.5 rounded-full flex items-center justify-center w-10 h-10">
                  <Gift className="w-5 h-5" />
                </span>
                <h5 className="font-bold text-slate-700 text-xs mb-1">행운의 소품</h5>
                <p className="text-[11px] text-slate-500 leading-normal font-bold">
                  {stripMarkdown(luckyBooster.luckyItem || '')}
                </p>
              </div>

              <div className="report-card text-center !p-4">
                <span className="mx-auto mb-2 bg-indigo-50 text-indigo-500 p-2.5 rounded-full flex items-center justify-center w-10 h-10">
                  <MapPin className="w-5 h-5" />
                </span>
                <h5 className="font-bold text-slate-700 text-xs mb-1">힘이 나는 장소</h5>
                <p className="text-[11px] text-slate-500 leading-normal font-bold">
                  {stripMarkdown(luckyBooster.luckyPlace || '')}
                </p>
              </div>

              <div className="report-card text-center !p-4">
                <span className="mx-auto mb-2 bg-emerald-50 text-emerald-600 p-2.5 rounded-full flex items-center justify-center w-10 h-10">
                  <Coffee className="w-5 h-5" />
                </span>
                <h5 className="font-bold text-slate-700 text-xs mb-1">추천 루틴</h5>
                <p className="text-[11px] text-slate-500 leading-normal font-bold">
                  {stripMarkdown(luckyBooster.dailyRoutine || '')}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* [7순위] 2026년 운세 흐름 */}
        {analysis.yearlyFortune && (analysis.yearlyFortune.theme || analysis.yearlyFortune.overview) && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Calendar className="w-5 h-5" /> 2026년 운세 흐름
            </h4>
            <div className="report-card bg-slate-900 text-white">
              {analysis.yearlyFortune.theme && (
                <h5 className="text-xl font-black mb-4 italic text-amber-200">
                  "{stripMarkdown(analysis.yearlyFortune.theme)}"
                </h5>
              )}
              {analysis.yearlyFortune.overview && (
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {stripMarkdown(analysis.yearlyFortune.overview)}
                </p>
              )}
              {Array.isArray(analysis.yearlyFortune.keywords) && analysis.yearlyFortune.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {analysis.yearlyFortune.keywords
                    .filter((k: any): k is string => typeof k === 'string' && k.trim().length > 0)
                    .map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-white/10 text-amber-100 rounded-full text-xs font-bold border border-white/20">
                        #{kw}
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
            <h4 className="report-section-title">
              <TrendingUp className="w-5 h-5" /> 월별 에너지 가이드
            </h4>
            <div className="grid gap-3">
              {safeMonths.map((m: any, i: number) => (
                <div key={i} className="report-card !p-4 flex gap-4 items-start">
                  <div className="shrink-0 w-12 text-center">
                    <span className="text-xs font-black text-violet-700 bg-violet-50 px-2 py-1 rounded-lg block">
                      {m.period || `${i + 1}월`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {m.energy && <p className="text-xs font-bold text-slate-500 mb-1">{stripMarkdown(m.energy)}</p>}
                    {m.guide && <p className="text-sm text-slate-700 leading-relaxed">{stripMarkdown(m.guide)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* [8순위] 분야별 심층 전략 */}
        {analysis.fieldStrategies && typeof analysis.fieldStrategies === 'object' && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Zap className="w-5 h-5" /> 분야별 현실 전략
            </h4>
            <div className="space-y-4">
              {(['career', 'love', 'wealth'] as const).map((field) => {
                const data = (analysis.fieldStrategies as any)[field];
                if (!data || typeof data !== 'object') return null;
                const fieldConfig = {
                  career: { icon: Briefcase, label: '커리어·직업', color: 'border-blue-400', iconColor: 'text-blue-500' },
                  love: { icon: Heart, label: '연애·관계', color: 'border-rose-400', iconColor: 'text-rose-500' },
                  wealth: { icon: Coins, label: '재물·투자', color: 'border-amber-400', iconColor: 'text-amber-500' },
                };
                const cfg = fieldConfig[field];
                const IconComponent = cfg.icon;
                return (
                  <div key={field} className={`report-card border-l-4 ${cfg.color} !pl-5`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-lg bg-slate-50 border border-slate-100/50 flex items-center justify-center ${cfg.iconColor}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400">{cfg.label}</p>
                        {data.subtitle && <h5 className="font-black text-slate-950 text-sm">{stripMarkdown(data.subtitle)}</h5>}
                      </div>
                    </div>
                    {data.analysis && (
                      <p className="text-slate-700 text-sm mb-3 leading-relaxed whitespace-pre-wrap">{stripMarkdown(data.analysis)}</p>
                    )}
                    {data.advice && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[11px] font-bold text-violet-700 mb-1">핵심 전략</p>
                        <p className="text-slate-800 text-xs font-bold leading-relaxed">{stripMarkdown(data.advice)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* [9순위] 경계 및 주의 패턴 */}
        {(safeWatchOut.length > 0 || safeAvoid.length > 0 || analysis.solution) && (
          <section className="report-section">
            <h4 className="report-section-title">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> 주의해야 할 흐름
            </h4>
            <div className="space-y-3">
              {safeWatchOut.map((w: any, i: number) => (
                <div key={i} className="report-card bg-amber-50 border-amber-100 !p-4">
                  <h5 className="font-black text-amber-800 text-sm mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    {stripMarkdown(w.title || '')}
                  </h5>
                  <p className="text-amber-700 text-xs leading-relaxed">{stripMarkdown(w.description || '')}</p>
                </div>
              ))}
              {safeAvoid.map((w: any, i: number) => (
                <div key={i} className="report-card bg-red-50 border-red-100 !p-4">
                  <h5 className="font-black text-red-800 text-sm mb-1 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    {stripMarkdown(w.title || '')}
                  </h5>
                  <p className="text-red-700 text-xs leading-relaxed whitespace-pre-wrap">{stripMarkdown(w.description || '')}</p>
                </div>
              ))}
            </div>
            {analysis.solution && (
              <div className="mt-4 report-card bg-emerald-50 border-emerald-100 !p-5">
                <p className="text-xs font-bold text-emerald-700 mb-2">종합 솔루션</p>
                <p className="text-emerald-900 text-sm font-bold leading-relaxed">{stripMarkdown(analysis.solution)}</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 스트리밍 진행 중 하단 안내 */}
      {isStreaming ? (
        <div className="mt-8 py-6 px-4 rounded-2xl bg-[#FAF7F0] border border-[#E6DFD1] flex items-center justify-center gap-3 text-stone-700 text-xs sm:text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-900 shrink-0" />
          <span>이어지는 풀이 항목을 계속 작성하고 있습니다...</span>
        </div>
      ) : (
        <>
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center">
            <button
              onClick={onDownloadReport}
              disabled={isDownloading}
              className="flex items-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-full font-black shadow-xl hover:bg-slate-800 transition-colors"
            >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              리포트 PDF 다운로드
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} disabled={isRegenerating} className="mt-4 text-slate-400 text-xs font-bold underline">
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
