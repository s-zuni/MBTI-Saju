import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, Search, Sparkles, ChevronDown, ChevronUp, Copy, X, Download, Mail, MessageCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DeepReportRequest {
  id: string;
  order_id: string;
  user_id: string;
  email: string;
  kakao_id: string;
  birth_info: string;
  mbti: string;
  report_type: string;
  special_requests: string;
  amount: number;
  status: string;
  reservation_date: string;
  created_at: string;
  partner_info?: {
    name: string;
    birth_info: string;
    mbti: string;
    relationship: string;
  };
  profiles?: {
    name: string;
  };
}

const ELEMENT_COLORS: Record<string, string> = {
  wood: '#334155', // slate-700
  fire: '#334155', 
  earth: '#334155', 
  metal: '#334155', 
  water: '#334155', 
};

// 포인트 컬러 (Violet)
const POINT_COLOR = '#7c3aed'; 
const POINT_COLOR_LIGHT = '#f5f3ff';


const ELEMENT_LABELS: Record<string, string> = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)',
};

const AdminDeepReports: React.FC = () => {
  const [requests, setRequests] = useState<DeepReportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean, 
    content: string, 
    title: string, 
    currentReq?: DeepReportRequest,
    sajuData?: any
  }>({isOpen: false, content: '', title: ''});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deep_report_requests')
        .select(`
          *,
          profiles:user_id (id, name, role)
        `)
        .neq('status', 'pending_payment')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      alert(`신청 내역을 불러오는 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('deep_report_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      alert('상태가 업데이트되었습니다.');
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text || '');
    alert('클립보드에 복사되었습니다.');
  };

  const renderSajuTableHtml = (saju: any, title: string = "사주 원국 (四柱 元局)") => {
    if (!saju || !saju.pillars) return '';

    const cols = [
      { key: 'hour', label: '시주(時柱)' },
      { key: 'day', label: '일주(日柱)' },
      { key: 'month', label: '월주(月柱)' },
      { key: 'year', label: '년주(年柱)' },
    ];

    const getPillar = (key: string) => saju.pillars[key];

    return `
      <div style="margin-bottom: 40px;">
        <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 15px; border-left: 5px solid ${POINT_COLOR}; padding-left: 12px;">${title}</h4>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #1e293b; table-layout: fixed; text-align: center; background-color: #ffffff;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
              ${cols.map(c => `<th style="padding: 12px; border-right: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #64748b;">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- Gan -->
            <tr>
              ${cols.map(c => {
                const p = getPillar(c.key);
                return `<td style="padding: 15px 5px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9;">
                  <div style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1;">${p.gan}</div>
                  <div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 5px;">${ELEMENT_LABELS[p.ganElement] || ''}</div>
                </td>`;
              }).join('')}
            </tr>
            <!-- Gan ShiShen -->
            <tr style="background-color: #fafafa;">
              ${cols.map(c => `<td style="padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 800; color: #475569;">${getPillar(c.key).ganShiShen}</td>`).join('')}
            </tr>
            <!-- Zhi -->
            <tr>
              ${cols.map(c => {
                const p = getPillar(c.key);
                return `<td style="padding: 15px 5px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9;">
                  <div style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1;">${p.zhi}</div>
                  <div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 5px;">${ELEMENT_LABELS[p.zhiElement] || ''}</div>
                </td>`;
              }).join('')}
            </tr>
            <!-- Zhi ShiShen -->
            <tr style="background-color: #fafafa;">
              ${cols.map(c => `<td style="padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 800; color: #475569;">${getPillar(c.key).zhiShiShen}</td>`).join('')}
            </tr>
            <!-- Hidden Stems -->
            <tr>
              ${cols.map(c => `<td style="padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 600; color: #94a3b8;">${getPillar(c.key).hiddenStems.join(', ')}</td>`).join('')}
            </tr>
            <!-- Unseong / Sinsal -->
            <tr style="background-color: #f8fafc;">
               ${cols.map(c => `
                 <td style="padding: 10px; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 12px; font-weight: 800; color: ${POINT_COLOR};">${getPillar(c.key).twelveStages}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 2px;">${getPillar(c.key).twelveSpirits}</div>
                 </td>
               `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  const renderElementBarsHtml = (ratio: any) => {
    if (!ratio) return '';
    const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
    
    return `
      <div style="margin-bottom: 40px; background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0;">
        <h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 20px; display: flex; align-items: center;">
          <span style="width: 4px; height: 16px; background-color: #1e293b; margin-right: 10px;"></span>
          오행 분포도 (五行 比例)
        </h4>
        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${elements.map(e => {
            const val = ratio[e] || 0;
            return `
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 60px; font-size: 13px; font-weight: 800; color: #475569;">${ELEMENT_LABELS[e]}</div>
                <div style="flex: 1; height: 8px; background-color: #f1f5f9; border-radius: 4px; overflow: hidden; position: relative;">
                  <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${val}%; background-color: #1e293b; transition: width 1s ease;"></div>
                </div>
                <div style="width: 40px; text-align: right; font-size: 13px; font-weight: 900; color: #0f172a;">${val}%</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderQuarterlyGridHtml = (luck: any[]) => {
    if (!luck || !Array.isArray(luck)) return '';
    
    return `
      <div style="margin-top: 40px; page-break-before: always;">
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 30px; color: #1e293b; border-bottom: 4px solid ${POINT_COLOR}; padding-bottom: 10px;">📉 향후 1년 분기별 핵심 운세 흐름</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          ${luck.map(q => `
            <div style="border: 1px solid #e2e8f0; padding: 20px; background-color: #ffffff; border-radius: 12px; border-top: 4px solid ${POINT_COLOR};">
              <h4 style="font-size: 16px; font-weight: 900; color: ${POINT_COLOR}; margin-bottom: 12px;">${q.period}</h4>
              <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px; line-height: 1.6;">[핵심 요약]<br/>${q.summary}</p>
              <div style="font-size: 13px; font-weight: 600; color: #64748b; background-color: ${POINT_COLOR_LIGHT}; padding: 10px; border-radius: 8px;">
                💡 <strong>조언:</strong> ${q.point}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };


  const handleDownloadPDF = async () => {
    if (!reportModal.content) return;
    setIsExporting(true);

    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '0';
      document.body.appendChild(container);

      // Helper to add a page
      const createPage = () => {
        const page = document.createElement('div');
        page.style.width = '800px';
        page.style.minHeight = '1120px'; // A4 Aspect ratio approx
        page.style.padding = '80px 70px';
        page.style.boxSizing = 'border-box';
        page.style.backgroundColor = '#ffffff';
        page.style.position = 'relative';
        page.style.color = '#1e293b';
        page.style.fontFamily = "'Pretendard', 'Inter', sans-serif";
        return page;
      };

      // 1. Cover Page
      const coverPage = createPage();
      coverPage.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 1px solid #1e293b; padding: 60px; margin: 20px;">
          <div style="width: 80px; height: 4px; background-color: ${POINT_COLOR}; margin-bottom: 40px;"></div>
          <p style="font-size: 14px; font-weight: 800; color: #64748b; letter-spacing: 0.5em; margin-bottom: 25px; text-transform: uppercase;">Premium Professional Report</p>
          <h1 style="font-size: 52px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.1; letter-spacing: -0.02em;">심층 분석 리포트</h1>
          <div style="margin: 80px 0; font-size: 22px; font-weight: 700; color: #334155;">
            <span style="color: #94a3b8; font-weight: 500;">Client.</span> ${reportModal.currentReq?.profiles?.name || '관리자'}님
          </div>
          <div style="margin-top: auto; color: #1e293b; font-size: 13px; font-weight: 700; letter-spacing: 0.1em;">
            ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
            <span style="color: ${POINT_COLOR};">MBTI-SAJU SYNERGY SOLUTIONS</span>
          </div>
        </div>
      `;
      container.appendChild(coverPage);

      // 2. Data Page (Tables & Bars)
      const dataPage = createPage();
      const headerHtml = `
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h2 style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a;">핵심 역학 분석 데이터</h2>
          </div>
        </div>
      `;
      dataPage.innerHTML = `
        ${headerHtml}
        ${renderSajuTableHtml(reportModal.sajuData?.userSaju, `${reportModal.currentReq?.profiles?.name || '본인'}의 사주 원국`)}
        ${renderElementBarsHtml(reportModal.sajuData?.userSaju?.elementRatio)}
        ${reportModal.sajuData?.partnerSaju ? renderSajuTableHtml(reportModal.sajuData.partnerSaju, `상대방(${reportModal.currentReq?.partner_info?.name})의 사주 원국`) : ''}
        ${reportModal.sajuData?.quarterlyLuck ? renderQuarterlyGridHtml(reportModal.sajuData.quarterlyLuck) : ''}
      `;
      container.appendChild(dataPage);

      // 3. Content Pages (AI Text)
      // Process markdown-ish content
      let cleanContent = reportModal.content.replace(/\[SAJU_DATA_JSON:[\s\S]*?\]/g, '').trim();
      let htmlContent = cleanContent
        .replace(/^# (.*$)/gm, `<h1 style="font-size: 32px; font-weight: 900; margin-top: 60px; margin-bottom: 30px; color: #0f172a; border-bottom: 5px solid ${POINT_COLOR}; padding-bottom: 10px;">$1</h1>`)
        .replace(/^## (.*$)/gm, `<h2 style="font-size: 24px; font-weight: 800; margin-top: 50px; margin-bottom: 25px; color: #1e293b; background-color: #fafbfc; padding: 15px 20px; border-radius: 8px; border-left: 8px solid ${POINT_COLOR}; border: 1px solid #e2e8f0; border-left-width: 8px;">$1</h2>`)
        .replace(/^### (.*$)/gm, `<h3 style="font-size: 20px; font-weight: 800; margin-top: 35px; margin-bottom: 15px; color: #334155; display: flex; align-items: center;"><span style="color: ${POINT_COLOR}; margin-right: 12px;">■</span> $1</h3>`)
        .replace(/^\* (.*$)/gm, `<li style="margin-bottom: 12px; font-size: 16px; line-height: 1.8; color: #334155; list-style: none; padding-left: 25px; position: relative;"><span style="position: absolute; left: 0; color: ${POINT_COLOR}; font-weight: 900;">-</span> $1</li>`)
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 900; color: #0f172a; border-bottom: 1px solid #1e293b;">$1</strong>')
        .replace(/\n\n/g, '</div><div style="margin-bottom: 20px; line-height: 2.0; font-size: 16px; color: #334155; text-align: justify;">')
        .replace(/\n/g, '<br/>');


      const contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = `<div style="line-height: 2.0; font-size: 16px; color: #334155;">${htmlContent}</div>`;
      
      const contentPage = createPage();
      contentPage.innerHTML = `${contentWrapper.innerHTML}`;
      container.appendChild(contentPage);

      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

      let heightLeft = imgHeight;
      let position = 0;

      // Add pages sequentially
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`프리미엄_심층리포트_${reportModal.currentReq?.profiles?.name || '내담자'}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = () => {
    const email = reportModal.currentReq?.email;
    if (!email) return alert('이메일 정보가 없습니다.');
    alert(`${email} 주소로 리포트 발송을 위한 연동 준비 중입니다.`);
    if (window.confirm('상태를 [발송완료]로 변경하시겠습니까?')) {
      handleUpdateStatus(reportModal.currentReq!.id, 'completed');
    }
  };

  const handleSendKakao = () => {
    const kakaoId = reportModal.currentReq?.kakao_id;
    if (!kakaoId) return alert('카카오톡 ID 정보가 없습니다.');
    alert(`카카오톡 ID: ${kakaoId} 고객에게 발송을 위한 연동 준비 중입니다.`);
    if (window.confirm('상태를 [발송완료]로 변경하시겠습니까?')) {
      handleUpdateStatus(reportModal.currentReq!.id, 'completed');
    }
  };

  const generateAIReport = async (req: DeepReportRequest) => {
    setGeneratingId(req.id);
    let generatedText = '';
    
    // To satisfy ESLint no-loop-func, we declare these updaters here
    const updateModalContent = (content: string) => {
      setReportModal(prev => ({ ...prev, content }));
    };

    const updateModalSajuData = (sajuData: any) => {
      setReportModal(prev => ({ ...prev, sajuData }));
    };

    const setModalTitle = (title: string) => {
      setReportModal(prev => ({ ...prev, title }));
    };

    setReportModal({ 
      isOpen: true, 
      content: '', 
      title: `${req.profiles?.name || '내담자'}님의 리포트 생성 중...`, 
      currentReq: req,
      sajuData: null
    });

    try {
      const response = await fetch('/api/generate-deep-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: req.profiles?.name,
          mbti: req.mbti,
          birthInfo: req.birth_info,
          report_type: req.report_type,
          specialRequest: req.special_requests,
          partnerInfo: req.partner_info
        })
      });

      if (!response.ok) throw new Error('API 응답 에러');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        setModalTitle(`${req.profiles?.name || '내담자'}님의 심층 리포트`);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          generatedText += chunk;
          
          // Check for JSON block
          if (generatedText.includes('[SAJU_DATA_JSON: ') && generatedText.includes(']')) {
             const startIdx = generatedText.indexOf('[SAJU_DATA_JSON: ') + 17;
             const endIdx = generatedText.indexOf(']', startIdx);
             if (endIdx > startIdx) {
                try {
                   const jsonStr = generatedText.substring(startIdx, endIdx);
                   const sajuData = JSON.parse(jsonStr);
                   updateModalSajuData(sajuData);
                } catch (e) { /* partial json */ }
             }
          }

          updateModalContent(generatedText);
        }
      }
    } catch (error) {
      console.error(error);
      alert('리포트 생성 중 오류가 발생했습니다.');
      setReportModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayContent = reportModal.content.replace(/\[SAJU_DATA_JSON:[\s\S]*?\]/g, '').trim();

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">심층 리포트 관리</h1>
          <p className="text-slate-500 font-semibold">프리미엄 결합 리포트 신청 및 제작 관리 시스템</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden mb-10">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center bg-white px-5 py-3 border-2 border-slate-100 rounded-2xl max-w-md shadow-inner focus-within:border-violet-500 transition-all">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="이름, 이메일, 주문번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-slate-900 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-300"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-24 text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-400 font-bold">검색 결과가 없거나 신청 내역이 비어있습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-5">주문정보</th>
                  <th className="px-8 py-5">신청 내역</th>
                  <th className="px-8 py-5">분석 타입</th>
                  <th className="px-8 py-5 text-center">처리 상태</th>
                  <th className="px-8 py-5 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr className={`hover:bg-violet-50/30 transition-all ${expandedId === req.id ? 'bg-violet-50/20' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-base">{new Date(req.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400 mt-1 cursor-pointer font-bold tracking-tighter" onClick={() => copyToClipboard(req.order_id)}>
                           ID: {req.order_id.substring(0, 12)}...
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500">
                              {(req.profiles?.name || 'U')[0]}
                           </div>
                           <div>
                              <div className="font-bold text-slate-900 text-base">{req.profiles?.name || '내담자'}</div>
                              <div className="text-xs text-slate-500 font-medium">{req.email}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${req.report_type.includes('MBTI') ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-700'}`}>
                              {req.report_type}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400 pl-1">📅 {req.reservation_date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <select
                          value={req.status}
                          onChange={(e) => handleUpdateStatus(req.id, e.target.value)}
                          className={`text-xs font-black rounded-xl px-4 py-2 outline-none cursor-pointer border-2 transition-all ${req.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100 hover:border-green-300' : 'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300'}`}
                        >
                          <option value="paid">결제완료 (제작중)</option>
                          <option value="completed">발송완료</option>
                        </select>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex gap-2 justify-end">
                           <button 
                             onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                             className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                           >
                             {expandedId === req.id ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                           </button>
                           <button 
                             onClick={() => generateAIReport(req)}
                             disabled={generatingId !== null}
                             className={`flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                                generatingId === req.id 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                  : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-violet-200 hover:shadow-lg'
                             }`}
                           >
                             {generatingId === req.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                             리포트 생성
                           </button>
                        </div>
                      </td>
                    </tr>
                    
                    {expandedId === req.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={5} className="px-12 py-10">
                            <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl shadow-slate-200/20">
                               <h4 className="font-black text-xl mb-6 text-slate-900 border-b-2 border-slate-50 pb-4 flex items-center justify-between">
                                 <span>신청 상세 데이터</span>
                                 {req.partner_info && <span className="bg-rose-50 text-rose-600 text-[11px] px-3 py-1 rounded-full font-black">궁합 옵션 포함</span>}
                               </h4>
                               
                               <div className="grid md:grid-cols-2 gap-10">
                                  <div className="space-y-6">
                                     <h5 className="text-xs font-black text-violet-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-violet-500 rounded-full"></div> 내담자 본인 데이터
                                     </h5>
                                     <div className="bg-slate-50/50 p-6 rounded-2xl space-y-4">
                                        <div className="flex justify-between items-center">
                                           <span className="text-xs font-bold text-slate-400">생년월일시</span>
                                           <span className="font-black text-slate-800">{req.birth_info}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                           <span className="text-xs font-bold text-slate-400">MBTI 성향</span>
                                           <span className="font-black text-violet-600 uppercase bg-violet-50 px-2 py-0.5 rounded-lg">{req.mbti || '-'}</span>
                                        </div>
                                     </div>
                                  </div>

                                  {req.partner_info && (
                                    <div className="space-y-6">
                                       <h5 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                          <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div> 상대방 데이터 (궁합)
                                       </h5>
                                       <div className="bg-rose-50/20 p-6 rounded-2xl space-y-4">
                                          <div className="flex justify-between items-center">
                                             <span className="text-xs font-bold text-slate-400">이름 / 관계</span>
                                             <span className="font-black text-slate-800">{req.partner_info.name} (${req.partner_info.relationship})</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                             <span className="text-xs font-bold text-slate-400">생년월일 / MBTI</span>
                                             <span className="font-black text-slate-800">{req.partner_info.birth_info} / {req.partner_info.mbti || '-'}</span>
                                          </div>
                                       </div>
                                    </div>
                                  )}

                                  <div className="md:col-span-2">
                                     <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">고객 특별 요청사항</h5>
                                     <div className="bg-slate-900 text-slate-100 p-8 rounded-3xl font-medium leading-relaxed text-sm shadow-xl whitespace-pre-line">
                                        {req.special_requests || '별도의 요청사항이 없습니다.'}
                                     </div>
                                  </div>

                                  <div className="md:col-span-2 flex items-center justify-between pt-6 border-t border-slate-100 px-2">
                                     <div className="flex gap-8">
                                        <div>
                                           <p className="text-[10px] font-black text-slate-300 uppercase mb-1">이메일</p>
                                           <p className="font-bold text-slate-700">{req.email}</p>
                                        </div>
                                        <div>
                                           <p className="text-[10px] font-black text-slate-300 uppercase mb-1">카카오ID</p>
                                           <p className="font-bold text-slate-700">{req.kakao_id || '-'}</p>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reportModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-10">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                    <Sparkles className="w-7 h-7 text-white" />
                 </div>
                 <div>
                    <h3 className="font-black text-2xl text-slate-900">{reportModal.title}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                       {generatingId ? 'AI 정밀 분석 작성 중...' : '작성 완료 - 데이터 검토 및 PDF 추출이 가능합니다.'}
                    </p>
                 </div>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={handleDownloadPDF}
                  disabled={generatingId !== null || isExporting}
                  className={`px-8 py-4 font-black rounded-2xl flex items-center gap-3 transition-all transform active:scale-95 ${
                      generatingId || isExporting
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-2xl hover:shadow-violet-300'
                  }`}
                 >
                   {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                   PREMIUM PDF 다운로드
                 </button>
                 <button onClick={() => setReportModal(prev => ({...prev, isOpen: false}))} className="p-4 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
                    <X className="w-8 h-8" />
                 </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50">
               <div className="w-full lg:w-80 bg-white border-r border-slate-100 p-8 flex flex-col gap-8">
                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">리포트 관리 액션</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                       <button onClick={handleSendEmail} className="w-full py-5 bg-white border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-violet-500 hover:bg-violet-50/30 transition-all group">
                          <Mail className="w-6 h-6 text-slate-400 group-hover:text-violet-600 transition-colors" />
                          <span className="text-[11px] font-black text-slate-700">이메일 발송</span>
                       </button>
                       <button onClick={handleSendKakao} className="w-full py-5 bg-white border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-yellow-500 hover:bg-yellow-50/30 transition-all group">
                          <MessageCircle className="w-6 h-6 text-slate-400 group-hover:text-yellow-600 transition-colors" />
                          <span className="text-[11px] font-black text-slate-700">카카오톡 발송</span>
                       </button>
                       <button onClick={() => copyToClipboard(displayContent)} className="w-full py-5 bg-white border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-slate-900 hover:bg-slate-50 transition-all group">
                          <Copy className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors" />
                          <span className="text-[11px] font-black text-slate-700">텍스트 복사</span>
                       </button>
                    </div>
                  </section>

                  <div className="mt-auto bg-slate-900 rounded-[32px] p-8 text-white">
                     <h5 className="font-black text-sm mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" /> AI 분석 현황
                     </h5>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        현재 리포트는 명리학 원칙과 심리학 데이터를 기반으로 순차적으로 생성되고 있습니다. 시각화 데이터는 PDF 생성 시 자동으로 병합됩니다.
                     </p>
                  </div>
               </div>

               <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                  <div className="bg-white p-12 md:p-20 rounded-[40px] border border-slate-100 shadow-sm min-h-full max-w-5xl mx-auto">
                     {generatingId && !displayContent && (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                           <Loader2 className="w-16 h-16 animate-spin text-violet-200 mb-6" />
                           <p className="text-slate-400 font-bold text-lg animate-pulse">분석 알고리즘 가동 중... 잠시만 기다려주세요.</p>
                        </div>
                     )}
                     <div className="prose prose-slate max-w-none prose-headings:font-black prose-p:leading-relaxed prose-p:text-slate-600">
                        <pre className="whitespace-pre-wrap font-sans text-sm md:text-lg leading-[2] text-slate-700">
                           {displayContent}
                        </pre>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};

export default AdminDeepReports;
