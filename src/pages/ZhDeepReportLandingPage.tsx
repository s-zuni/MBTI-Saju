import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, CreditCard, Lock } from 'lucide-react';
import {
  DEEP_REPORT_DISCOUNT_RATE,
} from '../config/deepReportConfig';
import ZhNavbar from '../components/ZhNavbar';
import ZhFooter from '../components/ZhFooter';
import ZhDeepReportModal from '../components/ZhDeepReportModal';

interface PreviewRow {
  year: number;
  ganji: string;
  partial: boolean;
  scores: { wealth: number; career: number; love: number; health: number };
  total: number;
}

const MBTI_LIST = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const CHAPTERS = [
  { no: '01', title: '序章 · 人生骨架與日主原象', desc: '八字原局、日元強弱本質與五行喜忌平衡' },
  { no: '02', title: '歲月印記 · 過往3年複盤', desc: '以流年復盤過去3年，驗證命運軌跡與性格鍛造' },
  { no: '03', title: '當下困惑 · 大師一對一解盤', desc: '針對您目前的職場、理財或感情難題給予破局時機' },
  { no: '04–06', title: '內在地圖 · 職場財富 · 姻緣貴人', desc: 'MBTI心理盲點、天賦適合行業、漏財防範與正緣時序' },
  { no: '07', title: '今年剩餘時段佈局', desc: '今年剩餘月份流月吉凶要點與新年關鍵佈局' },
  { no: '08', title: '未來3年宏觀流年地圖', desc: '36個月運勢地圖、轉折點與各年度戰略任務' },
  { no: '09', title: '終章 · 大師人生實踐手冊', desc: '從今天開始落實的 3 項開運實踐檢核清單' },
];

const FAQS = [
  {
    q: '台灣、香港或海外用戶該如何結帳？',
    a: '本站支援全球發行之 Visa、Mastercard、JCB 及銀聯信用卡。結帳時透過韓國國家級金融閘道 TossPayments 進行 3D 認證安全交易，款項依即時匯率換算（29,000 韓元約折合新台幣 NT$ 720 / 港幣 HK$ 175 / 美金 $22），無須額外手續費。',
  },
  {
    q: '這份報告與一般的免費算命或星座運勢有何不同？',
    a: '坊間運勢大多是千篇一律的籠統解說。MBTIJU 依據您精確的生辰八字（經度 120.0° 真太陽時校準），客觀推導日元強弱、十神配置與流年大運，並獨家交織 MBTI 16 型人格之心理防禦機制，為您產出長達 A4 20頁左右的超個人化專屬報告，絕無空泛套話。',
  },
  {
    q: '我不知道自己的具體出生時間（時辰），也能算嗎？',
    a: '可以的！八字中的年月日本命三柱已經包含了日主、五行強弱、大運以及近 80% 的人生性格與運勢結構。在申請時勾選「不知道出生時間」，大師與排盤演算法將以年月日本命盤為您精確推算。',
  },
  {
    q: '付費後何時會收到報告？以何種形式交付？',
    a: '您在預約申請時可自主選擇期望交付的日期（通常為訂購後 1~2 天內）。經由後台演算法生成並由專家複核後，將在約定時間以高解析度 A4 PDF 檔案完整發送至您填寫的電子信箱 (Email)，您可以隨時在手機、平板下載閱讀或列印珍藏。',
  },
  {
    q: '八字 × MBTI 融合版 與 正統純八字版 有何差別？',
    a: '兩者定價完全相同。正統八字版專注於傳統子平八字之格局與五行調候；而八字 × MBTI 融合版（最熱門首選）則在此基礎上，進一步剖析八字氣候如何碰撞您的 MBTI 心理機能（如 INFP 的逃避拖延、ENTJ 的強勢焦慮等），並給予極具現代感的職場與人際破局策略。',
  },
];

const ZhDeepReportLandingPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'mbti_saju' | 'saju'>('mbti_saju');

  // Inline Quick Preview State
  const [pvBirth, setPvBirth] = useState('');
  const [pvGender, setPvGender] = useState('female');
  const [pvMbti, setPvMbti] = useState('');
  const [pvLoading, setPvLoading] = useState(false);
  const [pvError, setPvError] = useState('');
  const [pvResult, setPvResult] = useState<PreviewRow[] | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleInlinePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pvBirth) {
      setPvError('請輸入出生年月日');
      return;
    }
    setPvError('');
    setPvLoading(true);

    try {
      const res = await fetch('/api/report-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthInfo: pvBirth,
          gender: pvGender,
          longitude: 120.0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '試算失敗，請確認生日格式。');
      }
      setPvResult(data.rows as PreviewRow[]);
    } catch (err: any) {
      setPvResult(null);
      setPvError(err.message || '試算發生錯誤，請稍後重試。');
    } finally {
      setPvLoading(false);
    }
  };

  const openApplyModal = (type: 'mbti_saju' | 'saju' = 'mbti_saju') => {
    setReportType(type);
    setModalOpen(true);
  };

  return (
    <div className="bg-white text-slate-900 min-h-screen font-sans selection:bg-violet-100 selection:text-violet-900">
      {/* Dedicated Chinese Navbar */}
      <ZhNavbar onOpenApply={() => openApplyModal('mbti_saju')} />

      {/* Hero Section */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1.15fr_0.85fr] gap-10 md:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100/80 text-violet-800 rounded-full text-xs font-black tracking-wider uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>3-Year Deep Life Blueprint · 繁體中文限定</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.2] text-slate-950">
              從今年剩餘月份<br />
              到未來三年，<br />
              一覽你的 <span className="text-violet-600 underline decoration-violet-300 underline-offset-8">人生運勢地圖</span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              韓國首爾弘大、清潭洞備受推崇的「八字 × MBTI」深度命理演算法。
              不講廉價的心靈雞湯，也不以凶煞恐嚇造謠。
              由大師透過真太陽時排盤，涵蓋事業、財富、姻緣與 36 個月流月吉凶，
              為您交付專屬之 <span className="text-slate-950 font-bold">A4 20頁超個人化 PDF 完整報告</span>。
            </p>

            {/* Price Box */}
            <div className="mt-7 p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-baseline gap-3 max-w-lg shadow-lg shadow-slate-900/10">
              <span className="text-xs text-slate-400 line-through">49,000 韓元</span>
              <span className="text-3xl font-black tracking-tight text-white">29,000 韓元</span>
              <span className="text-xs font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded border border-white/15">
                限時 {DEEP_REPORT_DISCOUNT_RATE}% OFF
              </span>
              <span className="text-xs text-slate-300 font-medium ml-auto">
                約 NT$ 720 / HK$ 175
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => openApplyModal('mbti_saju')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-black rounded-2xl shadow-lg shadow-violet-600/25 transition-all"
              >
                <span>預約專屬深度報告</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#free-preview-section"
                className="inline-flex items-center justify-center px-6 py-4 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
              >
                先看免費3年分數試算
              </a>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-violet-600" /> 支援台灣/香港/海外信用卡
              </span>
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> 免登入直接結帳
              </span>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="relative mx-auto w-full max-w-[340px] md:max-w-none">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 p-2">
              <img
                src="/assets/premium/report-cover.jpg"
                alt="MBTIJU 3年深度命理分析報告封面"
                className="w-full h-auto rounded-xl"
              />
            </div>
            <div className="absolute -bottom-3 -right-2 sm:-right-4 bg-slate-950 text-white rounded-2xl px-4 py-3 shadow-xl border border-slate-800">
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">A4 PDF Report</div>
              <div className="text-base font-black">高達 20 頁深度詳解</div>
            </div>
          </div>
        </div>
      </section>

      {/* Facts Strip */}
      <section className="border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
          {[
            ['A4 約 20 頁', '超個人化專屬排盤 PDF'],
            ['今年 ＋ 未來 3 年', '涵蓋當前剩餘時段至 3 年後'],
            ['36 個月流月地圖', '節氣月基準之吉凶起伏指南'],
            ['1~2 天約定交付', '後台排盤複核後發送至信箱'],
          ].map(([main, sub]) => (
            <div key={main} className="px-5 py-6 text-center">
              <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{main}</div>
              <div className="mt-1 text-xs text-slate-500">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Free Interactive Score Preview Widget */}
      <section id="free-preview-section" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" /> 無須註冊 · 30秒立即免費試算
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              免費搶先看：您的未來 3 年運勢評分表
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              輸入您的陽曆出生日期與性別，系統即刻透過真太陽時演算法，為您演算未來三年的綜合命理分數。
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg shadow-slate-200/50">
            <form onSubmit={handleInlinePreview} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  陽曆出生年月日 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={pvBirth}
                  max="9999-12-31"
                  onChange={(e) => setPvBirth(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  生理性別 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'female', label: '女性' },
                    { val: 'male', label: '男性' },
                  ].map((g) => (
                    <button
                      key={g.val}
                      type="button"
                      onClick={() => setPvGender(g.val)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        pvGender === g.val
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MBTI 類型 <span className="text-slate-400 font-normal">(選填)</span>
                </label>
                <select
                  value={pvMbti}
                  onChange={(e) => setPvMbti(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">略過 / 不清楚</option>
                  {MBTI_LIST.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 pt-2">
                <button
                  type="submit"
                  disabled={pvLoading}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-black text-sm rounded-xl transition-all shadow-md shadow-violet-600/20 disabled:opacity-50"
                >
                  {pvLoading ? '正在以真太陽時精算中...' : '免費取得未來3年分數預覽'}
                </button>
              </div>
            </form>

            {pvError && (
              <p className="mt-3 text-xs text-rose-600 text-center font-bold">{pvError}</p>
            )}

            {/* Results Display */}
            {pvResult && (
              <div className="mt-8 pt-6 border-t border-slate-100 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-black text-slate-900">
                    試算結果：未來三年運勢走勢圖
                  </div>
                  <span className="text-[11px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded">
                    演算完成
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pvResult.map((row) => (
                    <div key={row.year} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <div className="text-xs font-bold text-slate-800">
                        {row.year}年 ({row.ganji})
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {row.partial ? '今年剩餘' : '年度綜合'}
                      </div>
                      <div className="text-2xl font-black text-violet-600 my-2">
                        {row.total}分
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                        <span>財運 {row.scores.wealth}</span>
                        <span>事業 {row.scores.career}</span>
                        <span>感情 {row.scores.love}</span>
                        <span>健康 {row.scores.health}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upsell Blurred Hook */}
                <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-100 relative overflow-hidden text-center">
                  <div className="max-w-md mx-auto">
                    <div className="inline-flex items-center gap-1 text-xs font-black text-violet-700 mb-1">
                      <Lock className="w-3.5 h-3.5" /> 為什麼 {pvResult[1]?.year || '明年'} 的運勢會出現關鍵轉折？
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      分數背後的具體流月時機、貴人何時出現、如何防範破財漏洞，完整記載於 A4 20頁深度分析報告中。
                    </p>
                    <button
                      onClick={() => openApplyModal('mbti_saju')}
                      className="mt-4 px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition-all inline-flex items-center gap-1.5"
                    >
                      <span>解鎖完整 20 頁深度命盤分析 (約 NT$720)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Chapter Blueprint Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <div className="text-xs font-black tracking-widest text-violet-600 mb-2 uppercase">CONTENT STRUCTURE</div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
              從本質骨架，<br />
              到未來三年的連貫篇章
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              拒絕破碎零散的片段拼湊。整份報告如同一本為您量身打造的人生專屬長篇分析，
              由過去三年的印記開始，深入回應當前瓶頸，再展現未來三年的宏觀藍圖。
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CHAPTERS.map((ch) => (
              <div key={ch.no} className="p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-violet-300 hover:shadow-md transition-all">
                <div className="text-xs font-mono font-black text-violet-600 mb-2">CHAPTER {ch.no}</div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">{ch.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{ch.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-black tracking-widest text-violet-600 mb-2 uppercase">FAQ</div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">常見問題與說明</h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-start gap-2">
                  <span className="text-violet-600 font-mono font-black">Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Bottom Sticky Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden flex items-center justify-between shadow-xl">
        <div>
          <div className="text-[11px] text-slate-400 line-through">49,000 韓元</div>
          <div className="text-base font-black text-slate-900">29,000 韓元 <span className="text-[11px] font-bold text-violet-600">(約 NT$720)</span></div>
        </div>
        <button
          onClick={() => openApplyModal('mbti_saju')}
          className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black shadow-md shadow-violet-600/20 active:scale-95 transition-all"
        >
          立即預約報告
        </button>
      </div>

      {/* Chinese Application Modal */}
      <ZhDeepReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialReportType={reportType}
      />

      {/* Chinese Footer */}
      <ZhFooter />
    </div>
  );
};

export default ZhDeepReportLandingPage;

