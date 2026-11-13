import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Sparkles, CreditCard, Lock } from 'lucide-react';
import { requestPayment } from '../payment';
import {
  DEEP_REPORT_SALE_PRICE,
  DEEP_REPORT_DISCOUNT_RATE,
} from '../config/deepReportConfig';

interface ZhDeepReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportType?: 'mbti_saju' | 'saju';
}

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

const SIJIN_OPTIONS = [
  { value: '', label: '請選擇出生時辰（或直接填寫具體時間）' },
  { value: '자시 (23:30 ~ 01:30)', label: '子時 (23:30 ~ 01:30)' },
  { value: '축시 (01:30 ~ 03:30)', label: '丑時 (01:30 ~ 03:30)' },
  { value: '인시 (03:30 ~ 05:30)', label: '寅時 (03:30 ~ 05:30)' },
  { value: '묘시 (05:30 ~ 07:30)', label: '卯時 (05:30 ~ 07:30)' },
  { value: '진시 (07:30 ~ 09:30)', label: '辰時 (07:30 ~ 09:30)' },
  { value: '사시 (09:30 ~ 11:30)', label: '巳時 (09:30 ~ 11:30)' },
  { value: '오시 (11:30 ~ 13:30)', label: '午時 (11:30 ~ 13:30)' },
  { value: '미시 (13:30 ~ 15:30)', label: '未時 (13:30 ~ 15:30)' },
  { value: '신시 (15:30 ~ 17:30)', label: '申時 (15:30 ~ 17:30)' },
  { value: '유시 (17:30 ~ 19:30)', label: '酉時 (17:30 ~ 19:30)' },
  { value: '술시 (19:30 ~ 21:30)', label: '戌時 (19:30 ~ 21:30)' },
  { value: '해시 (21:30 ~ 23:30)', label: '亥時 (21:30 ~ 23:30)' },
  { value: '모름', label: '不知道出生時間（以年月日本命盤排盤）' },
];

const ZhDeepReportModal: React.FC<ZhDeepReportModalProps> = ({ isOpen, onClose, initialReportType = 'mbti_saju' }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactId: '',
    birthDate: '',
    birthTime: '',
    birthTimeLabel: '',
    unknownTime: false,
    mbti: '',
    gender: 'female',
    reportType: initialReportType,
    specialRequest: '',
    reservationDate: '',
    partnerInfo: {
      includePartner: false,
      name: '',
      birthDate: '',
      birthTime: '',
      mbti: '',
      relationship: '戀人/伴侶',
    },
  });

  // 未來 4 天可選之預約交付日期
  const availableDates = React.useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1); // 隔日開始
      return (new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0] as string);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (availableDates[0]) {
        setFormData(prev => ({ ...prev, reservationDate: prev.reservationDate || availableDates[0]! }));
      }
    }
  }, [isOpen, availableDates]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 免費預覽未來三年分數 (大中華標準經度 120.0°)
  const handlePreview = async () => {
    setPreviewError('');
    if (!formData.birthDate) {
      setPreviewError('請先輸入國曆出生年月日。');
      return;
    }
    if (!formData.gender) {
      setPreviewError('請先選擇性別。');
      return;
    }

    setPreviewLoading(true);
    try {
      const birthTimeStr = formData.unknownTime ? '' : (formData.birthTimeLabel || formData.birthTime);
      const res = await fetch('/api/report-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthInfo: `${formData.birthDate} ${birthTimeStr}`.trim(),
          gender: formData.gender,
          longitude: 120.0, // 台灣/香港/華語標準真太陽時
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '預覽分數獲取失敗，請確認生日格式。');
      }
      setPreview(data.rows as PreviewRow[]);
    } catch (e: any) {
      setPreview(null);
      setPreviewError(e.message || '預覽分數獲取失敗，請稍後重試。');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setLoading(false);
      return alert('請填寫有效的接收報告電子郵箱 (Email)。');
    }
    if (!formData.birthDate.trim()) {
      setLoading(false);
      return alert('請填寫出生年月日 (國曆)。');
    }
    if (!formData.gender) {
      setLoading(false);
      return alert('請選擇性別（八字大運順逆排盤必須項）。');
    }
    if (!formData.reservationDate) {
      setLoading(false);
      return alert('請選擇報告交付約定日期。');
    }

    try {
      const orderId = `DEEPREPORT_ZH_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const birthTimeStr = formData.unknownTime ? '모름' : (formData.birthTimeLabel || formData.birthTime);
      const isMbti = formData.reportType === 'mbti_saju';
      const dbReportType = isMbti ? 'MBTI 사주 심층 리포트' : '사주 전용 심층 리포트';

      const specialReqCombined = [
        formData.specialRequest ? `[客戶提問] ${formData.specialRequest}` : '',
        formData.contactId ? `[通訊聯絡] ${formData.contactId}` : '',
        `[地區與語言] 繁體中文版 (台灣/香港/海外) · 經度 120.0° 真太陽時`,
      ].filter(Boolean).join('\n');

      // 1. 登記申請記錄至 Supabase DB
      const { error: insertError } = await supabase.from('deep_report_requests').insert({
        order_id: orderId,
        user_id: null, // 海外免登入客端
        email: formData.email,
        kakao_id: formData.contactId || 'GLOBAL_USER',
        birth_info: `${formData.birthDate} ${birthTimeStr}`.trim(),
        mbti: formData.mbti || null,
        gender: formData.gender,
        report_type: dbReportType,
        special_requests: specialReqCombined,
        amount: DEEP_REPORT_SALE_PRICE,
        status: 'pending_payment',
        reservation_date: formData.reservationDate,
        partner_info: formData.partnerInfo.includePartner ? {
          name: formData.partnerInfo.name,
          birth_info: `${formData.partnerInfo.birthDate} ${formData.partnerInfo.birthTime}`.trim(),
          mbti: formData.partnerInfo.mbti,
          relationship: formData.partnerInfo.relationship,
        } : null,
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`訂單建立失敗: ${insertError.message || '資料庫連線錯誤'}`);
      }

      // 2. 喚起 TossPayments 海外刷卡結帳
      const customerKey = `GUEST_ZH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const orderTitle = isMbti
        ? '韓國 MBTIJU 3年深度命理分析報告 (八字×MBTI繁中版)'
        : '韓國 MBTIJU 3年深度命理分析報告 (正統八字專屬繁中版)';

      const response = await requestPayment({
        name: orderTitle,
        amount: DEEP_REPORT_SALE_PRICE,
        orderId: orderId,
        customerKey: customerKey,
        customerEmail: formData.email,
        customerName: formData.name || '海外尊榮客戶',
        metadata: {
          productId: 'deep_report',
          locale: 'zh-TW',
        },
      });

      if (!response.success) {
        throw new Error(response.error_msg || '結帳流程啟動失敗，請稍後重試。');
      }
    } catch (err: any) {
      console.error('Payment Error:', err);
      alert(err.message || '結帳處理發生錯誤，請稍後重試。');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-[1000] p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden flex flex-col my-auto shadow-2xl border border-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-10"
          aria-label="關閉視窗"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> 韓國八字 × MBTI 3年深度報告申請
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            預約您的專屬人生運勢地圖
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            結合真太陽時八字命盤與 MBTI 性格模型，由專家進行排盤剖析，生成專屬於您的 <span className="text-amber-300 font-bold underline underline-offset-2">A4 20頁超個人化 PDF 完整報告</span>，並依約定日期交付至您的信箱。
          </p>
        </div>

        {/* Modal Body Form */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Price & Currency Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-700 bg-violet-200/60 px-2 py-0.5 rounded">
                  限時 {DEEP_REPORT_DISCOUNT_RATE}% OFF
                </span>
                <span className="text-xs text-slate-400 line-through">
                  49,000 韓元
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  29,000 韓元
                </span>
                <span className="text-xs font-bold text-violet-600">
                  (約折合 NT$ 720 / HK$ 175 / $22 USD)
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 sm:text-right">
              <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                <CreditCard className="w-3.5 h-3.5 text-violet-600" /> 支援海外信用卡
              </span>
              <p>台灣/香港/全球 Visa, Master 刷卡</p>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            {/* 1. Report Type Selection */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                1. 選擇報告分析類型 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    type: 'mbti_saju' as const,
                    title: '八字 × MBTI 融合深度報告',
                    sub: '正統八字大運＋MBTI心理盲點交叉解析 (推薦)',
                  },
                  {
                    type: 'saju' as const,
                    title: '正統八字專屬深度報告',
                    sub: '純粹專注於傳統子平八字五行與格局解析',
                  },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, reportType: item.type }))}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      formData.reportType === item.type
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm">{item.title}</div>
                    <div className={`text-[11px] mt-1 ${formData.reportType === item.type ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Basic Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  接收報告 Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  中文姓名或稱呼 <span className="text-slate-400 font-normal">(選填)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例：陳小姐 / Alex"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                />
              </div>
            </div>

            {/* 3. Birth Date & Time & Gender */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                2. 八字排盤生辰八字資訊
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    國曆/陽曆 出生日期 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    max="9999-12-31"
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    生理性別 <span className="text-rose-500">*</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(大運順逆計算必備)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'female', label: '女性' },
                      { val: 'male', label: '男性' },
                    ].map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, gender: g.val }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          formData.gender === g.val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Birth Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  出生時辰
                </label>
                <div className="space-y-2">
                  <select
                    disabled={formData.unknownTime}
                    value={formData.birthTimeLabel}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthTimeLabel: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {SIJIN_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.unknownTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, unknownTime: e.target.checked }))}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>不清楚具體出生時間（將依據年月日本命盤進行精密分析）</span>
                  </label>
                </div>
              </div>

              {/* MBTI Select */}
              {formData.reportType === 'mbti_saju' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    您的 MBTI 性格類型 <span className="text-slate-400 font-normal">(選填，若不知道可略過)</span>
                  </label>
                  <select
                    value={formData.mbti}
                    onChange={(e) => setFormData(prev => ({ ...prev, mbti: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">不知道 / 請大師依八字推導建議</option>
                    {MBTI_LIST.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Free Instant Preview Button */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" /> 先睹為快：免費試算未來3年分數
                </span>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {previewLoading ? '計算中...' : '立即免費試算'}
                </button>
              </div>

              {previewError && (
                <p className="text-xs text-rose-600 mt-2">{previewError}</p>
              )}

              {preview && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <div className="text-[11px] font-bold text-slate-500">
                    根據您的八字真太陽時（經度 120.0°）計算之各年運勢分數：
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {preview.map((row) => (
                      <div key={row.year} className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                        <div className="text-xs font-bold text-slate-900">{row.year}年 ({row.ganji})</div>
                        <div className="text-xs text-slate-400">{row.partial ? '今年剩餘' : '年度綜合'}</div>
                        <div className="text-lg font-black text-violet-600 mt-1">{row.total}分</div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                          <span>財 {row.scores.wealth}</span>
                          <span>事 {row.scores.career}</span>
                          <span>愛 {row.scores.love}</span>
                          <span>健 {row.scores.health}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Delivery Date Selection */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                3. 約定交付日期選擇 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableDates.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, reservationDate: d }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      formData.reservationDate === d
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                ※ 報告將經由排盤計算與專家複核後，於該約定日期前發送至您的信箱。
              </p>
            </div>

            {/* 5. Special Question or Concerns */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                目前最關心之人生課題或具體提問 <span className="text-slate-400 font-normal">(選填)</span>
              </label>
              <textarea
                value={formData.specialRequest}
                onChange={(e) => setFormData(prev => ({ ...prev, specialRequest: e.target.value }))}
                placeholder="例如：預計明年是否適合轉職或創業？目前的戀情何時會有結果？最近三年該如何穩健理財？"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              />
            </div>

            {/* 6. LINE / WeChat ID (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                LINE ID 或 WeChat ID <span className="text-slate-400 font-normal">(選填，備用聯絡或加急通知)</span>
              </label>
              <input
                type="text"
                value={formData.contactId}
                onChange={(e) => setFormData(prev => ({ ...prev, contactId: e.target.value }))}
                placeholder="例如：line_id_1234"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Checkout CTA Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 bg-slate-950 hover:bg-slate-800 active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-slate-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在啟動海外安全結帳...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>前往海外信用卡安全結帳 (29,000 韓元 / 約 NT$720)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              由 TossPayments 國際安全加密閘道受理 · 支援 Visa / Mastercard / JCB / 銀聯
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZhDeepReportModal;

