import React, { useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  DEEP_REPORT_ORIGINAL_PRICE,
  DEEP_REPORT_SALE_PRICE,
  DEEP_REPORT_DISCOUNT_RATE,
  formatWon,
} from '../config/deepReportConfig';

interface DeepReportLandingPageProps {
  onOpenDeepReport: (reportType?: string) => void;
}

// 실제 생성된 리포트(가상 인물 '서연', 1998.05.12 · ENFP)의 PDF 페이지 캡처
const SAMPLE_CAPTION = '가상 인물 "서연"(1998.05.12 · ENFP)의 샘플 리포트입니다.';

const CHAPTERS: { no: string; title: string; desc: string }[] = [
  { no: '01', title: '프롤로그 · 나라는 사람의 뼈대', desc: '사주 원국, 일간 강약과 오행 균형' },
  { no: '02', title: '지나온 길', desc: '지난 3년을 사주로 되짚는 확인 질문' },
  { no: '03', title: '지금의 고민, 마스터의 답', desc: '남겨주신 고민에 대한 맞춤 해답' },
  { no: '04–06', title: '내면 · 일과 돈 · 인연', desc: '기질과 MBTI, 맞는 일, 귀인과 연애 패턴' },
  { no: '07', title: '올해 남은 기간', desc: '남은 달별 흐름과 새해 준비' },
  { no: '08', title: '앞으로 3년의 이야기', desc: '36개월 운의 지도와 연도별 이야기' },
  { no: '09', title: '에필로그 · 마스터플랜', desc: '오늘부터 시작할 실천 체크리스트' },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: '어떤 내용이 담기나요?',
    a: '사주 원국과 오행 분석, 지난 3년 되짚기, 남겨주신 고민에 대한 답, 올해 남은 기간, 내년부터 3개년의 연도별 흐름(월별 좋은 달·조심할 달 포함), 그리고 오늘부터 할 실천 과제를 A4 20장 내외의 PDF로 제공합니다. MBTI 융합 상품은 사주와 MBTI를 교차한 성향 분석이 함께 들어갑니다.',
  },
  {
    q: '점수와 시기는 어떻게 정해지나요?',
    a: '생년월일시를 만세력(한국 기준 진태양시 보정)으로 계산해 일간 강약, 유리한 오행, 십성, 합·충, 대운·세운·월운을 산출하고, 이를 바탕으로 분야별 점수와 월별 흐름을 정합니다. 같은 생년월일시라면 언제 다시 계산해도 점수는 같습니다.',
  },
  {
    q: '결제 전에 미리 볼 수 있나요?',
    a: '네. 신청 화면에서 생년월일과 성별을 입력하면 올해 남은 기간과 내년부터 3개년의 분야별 점수표(재물·커리어·인연·건강)를 무료로 확인할 수 있습니다.',
  },
  {
    q: '리포트는 언제 받을 수 있나요?',
    a: '신청 시 예약 일자를 선택하시며, 전문가 점검을 거쳐 오늘 신청 시 빠르면 다음 날, 늦어도 이틀 뒤에 입력하신 이메일로 PDF가 전달됩니다.',
  },
  {
    q: '사주 전용과 MBTI 융합은 무엇이 다른가요?',
    a: '가격은 같습니다. 사주 전용은 전통 명리학 관점에 집중하고, MBTI 융합은 사주의 십성·오행 분포와 MBTI 4축의 일치·상반을 함께 풀이합니다. MBTI와 사주의 대응은 학문적 공식이 아닌 참고용 해석 틀입니다.',
  },
];

const Shot: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    width={992}
    height={1403}
    className={`w-full h-auto rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] ${className}`}
  />
);

const DeepReportLandingPage: React.FC<DeepReportLandingPageProps> = ({ onOpenDeepReport }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const price = formatWon(DEEP_REPORT_SALE_PRICE);
  const original = formatWon(DEEP_REPORT_ORIGINAL_PRICE);

  return (
    <div className="bg-white text-slate-950 min-h-screen overflow-x-hidden">
      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-6 border-b border-slate-100">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1.15fr_1fr] gap-12 md:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FFB7B2]" />
              <span className="text-xs font-bold tracking-widest text-violet-600">3-YEAR DEEP REPORT</span>
            </div>
            <h1 className="text-[2rem] md:text-5xl font-black tracking-tight leading-[1.2]">
              올해 남은 달부터<br />
              3년 뒤까지,<br />
              <span className="text-violet-600">내 운의 지도</span>를 한 권에
            </h1>
            <p className="mt-6 text-sm md:text-base text-slate-600 leading-relaxed max-w-lg">
              만세력으로 계산한 사주 데이터에 지난 3년의 확인, 지금의 고민, 36개월의 월별 흐름을 엮은
              A4 20장 내외의 개인 맞춤 리포트입니다. 막연한 운세 대신 &lsquo;언제, 무엇을 할지&rsquo;까지 알려드립니다.
            </p>

            <div className="mt-8 flex items-baseline gap-3 flex-wrap">
              <span className="text-sm text-slate-400 line-through">{original}</span>
              <span className="text-3xl md:text-4xl font-black tracking-tight">{price}</span>
              <span className="text-xs font-black text-white bg-violet-600 px-2 py-1 rounded-md">{DEEP_REPORT_DISCOUNT_RATE}% 할인</span>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onOpenDeepReport('mbti_saju')}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-slate-950 text-white text-sm font-black rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                리포트 신청하기 <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenDeepReport('mbti_saju')}
                className="inline-flex items-center justify-center px-7 py-4 text-sm font-bold text-slate-900 border border-slate-300 rounded-2xl hover:border-slate-900 transition-colors"
              >
                무료 점수표 먼저 보기
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">신청 화면에서 생년월일만 입력하면 3개년 점수표를 바로 확인할 수 있어요.</p>
          </div>

          <div className="relative max-w-[320px] md:max-w-none mx-auto w-full">
            <Shot src="/assets/premium/report-cover.jpg" alt="3개년 심층 사주 리포트 표지" />
            <div className="absolute -bottom-3 -right-2 md:-right-4 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">PDF · A4</div>
              <div className="text-sm font-black">20장 내외</div>
            </div>
          </div>
        </div>
      </section>

      {/* Facts strip */}
      <section className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
          {[
            ['A4 20장 내외', '개인 맞춤 PDF 리포트'],
            ['올해 + 3개년', '올해 남은 기간부터 3년 뒤까지'],
            ['36개월', '절기월 기준 월별 운의 지도'],
            ['1~2일', '예약 일자 선택, 이메일 전달'],
          ].map(([big, small]) => (
            <div key={big} className="px-6 py-7 text-center">
              <div className="text-lg md:text-xl font-black tracking-tight">{big}</div>
              <div className="mt-1 text-xs text-slate-500">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 구성: 이야기 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <div className="text-xs font-bold tracking-widest text-violet-600 mb-3">STORY</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
              나의 뼈대에서 시작해,<br />다가올 3년의 이야기까지
            </h2>
            <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
              항목을 나열하지 않고 하나의 이야기로 읽히도록 구성했습니다. 지난 3년을 먼저 확인한 뒤,
              지금의 고민에 답하고, 올해의 남은 시간을 지나 앞으로 3년으로 이어집니다.
            </p>
          </div>

          <ol className="mt-12 grid md:grid-cols-2 gap-x-12 border-t border-slate-950">
            {CHAPTERS.map(c => (
              <li key={c.no} className="flex gap-5 py-5 border-b border-slate-100">
                <span className="w-12 shrink-0 text-sm font-black text-violet-600 tabular-nums">{c.no}</span>
                <div>
                  <div className="text-base font-bold">{c.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 샘플 갤러리 */}
      <section className="py-20 md:py-28 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-bold tracking-widest text-violet-600 mb-3">SAMPLE</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">실제 리포트는 이렇게 생겼어요</h2>
            <p className="mt-4 text-sm text-slate-500">{SAMPLE_CAPTION}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              ['/assets/premium/report-summary.jpg', '한눈에 보기', '총평과 연도별 점수 비교'],
              ['/assets/premium/report-natal.jpg', '사주 원국', '명식 표와 오행 분포'],
              ['/assets/premium/report-map.jpg', '36개월 운의 지도', '월별 점수를 색으로 한눈에'],
              ['/assets/premium/report-year.jpg', '연도별 이야기', '일·돈·인연·건강 타이밍'],
            ].map(([src, title, desc]) => (
              <figure key={src}>
                <Shot src={src as string} alt={`샘플 리포트 · ${title}`} />
                <figcaption className="mt-3">
                  <div className="text-sm font-bold">{title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 계산 방식 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-bold tracking-widest text-violet-600 mb-3">METHOD</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">점수와 시기는 계산으로 정합니다</h2>
            <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
              운의 흐름에 해당하는 숫자와 날짜는 글솜씨가 아니라 계산값입니다. 해석과 조언만 문장으로 풀어드립니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['만세력 정밀 계산', '진태양시 보정과 절기 기준으로 사주 원국, 대운·세운·월운을 산출합니다. 월별 시기는 절입일 기준입니다.'],
              ['강약·용신 판정', '일간의 강약을 가늠해 나에게 힘이 되는 오행과 부담이 되는 오행을 가르고, 점수에 반영합니다.'],
              ['합·충까지 반영', '원국과 대운·세운이 만나 생기는 합, 충, 형, 삼합 등을 위치별로 따져 재물·커리어·인연·건강 점수를 냅니다.'],
            ].map(([t, d], i) => (
              <div key={t} className="p-7 rounded-2xl border border-slate-200">
                <div className="text-xs font-black text-violet-600 tabular-nums mb-4">0{i + 1}</div>
                <h3 className="text-lg font-bold mb-2">{t}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 가격 / CTA */}
      <section className="py-20 md:py-28 px-6 bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-bold tracking-widest text-[#FFB7B2] mb-4">PRICE</div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            지금 신청하면 {DEEP_REPORT_DISCOUNT_RATE}% 할인
          </h2>
          <div className="mt-8 flex items-baseline justify-center gap-3">
            <span className="text-base text-slate-500 line-through">{original}</span>
            <span className="text-4xl md:text-5xl font-black tracking-tight">{price}</span>
          </div>

          <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-left max-w-xl mx-auto">
            {[
              'A4 20장 내외 PDF 리포트',
              '올해 남은 기간 + 내년부터 3개년',
              '36개월 월별 운의 지도',
              '남겨주신 고민에 대한 맞춤 답',
              '지난 3년 되짚기와 실천 체크리스트',
              '상대방 정보를 넣으면 3년 겹침 분석',
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-slate-200">
                <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" /> {t}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onOpenDeepReport('mbti_saju')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-950 text-sm font-black rounded-2xl hover:bg-slate-100 active:scale-[0.98] transition-all"
            >
              MBTI 융합 리포트 신청 <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenDeepReport('saju')}
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-white border border-slate-600 rounded-2xl hover:border-white transition-colors"
            >
              사주 전용 리포트 신청
            </button>
          </div>
          <p className="mt-5 text-xs text-slate-500">두 상품의 가격은 같습니다 · 결제 전 무료 점수표 확인 가능</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-10">자주 묻는 질문</h2>
          <div className="border-t border-slate-950">
            {FAQS.map(f => (
              <details key={f.q} className="group border-b border-slate-200 py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-base font-bold">
                  {f.q}
                  <span className="text-violet-600 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-xs text-slate-400 leading-relaxed">
            본 리포트는 생년월일시와 MBTI 데이터를 기반으로 한 참고용 자료이며, 재물·건강·법률 등에 관한 최종 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>
        </div>
      </section>
    </div>
  );
};

export default DeepReportLandingPage;
