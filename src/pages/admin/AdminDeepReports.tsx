import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, Search, Sparkles, ChevronDown, ChevronUp, Copy, Bot, X, Download, Mail, MessageCircle } from 'lucide-react';
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

const AdminDeepReports: React.FC = () => {
  const [requests, setRequests] = useState<DeepReportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [reportModal, setReportModal] = useState<{isOpen: boolean, content: string, title: string, currentReq?: DeepReportRequest}>({isOpen: false, content: '', title: ''});

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

      if (error) {
        console.error('Detailed fetch error:', error);
        throw error;
      }
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      alert(`신청 내역을 불러오는 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
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

  const handleDownloadPDF = async () => {
    if (!reportModal.content) return;
    setIsExporting(true);

    try {
      const element = document.createElement('div');
      element.className = 'pdf-export-container';
      element.style.padding = '80px 60px';
      element.style.width = '800px';
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#1e293b';
      element.style.fontFamily = 'Inter, sans-serif';
      
      const header = `
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="font-size: 32px; font-weight: 900; margin: 0; color: #0f172a;">심층 분석 리포트</h1>
            <p style="font-size: 14px; font-weight: 700; color: #64748b; margin: 5px 0 0 0;">PREMIUM DESTINY ANALYSIS REPORT</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 12px; font-weight: 800; color: #8b5cf6; margin: 0;">운명과 심리의 융합 솔루션</p>
            <p style="font-size: 10px; font-weight: 500; color: #94a3b8; margin: 2px 0 0 0;">${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;

      const infoBox = `
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 13px; font-weight: 800; color: #64748b; width: 100px;">성명</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${reportModal.currentReq?.profiles?.name || '내담자'}님</td>
              <td style="padding: 8px 0; font-size: 13px; font-weight: 800; color: #64748b; width: 100px;">주문번호</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${reportModal.currentReq?.order_id?.substring(0, 12)}...</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 13px; font-weight: 800; color: #64748b;">분석 타입</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${reportModal.currentReq?.report_type}</td>
              <td style="padding: 8px 0; font-size: 13px; font-weight: 800; color: #64748b;">예약 일자</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${reportModal.currentReq?.reservation_date}</td>
            </tr>
          </table>
        </div>
      `;

      // Simple Markdown-ish to HTML conversion for PDF
      let htmlContent = reportModal.content
        .replace(/^# (.*$)/gm, '<h1 style="font-size: 28px; font-weight: 900; margin-top: 40px; margin-bottom: 20px; color: #0f172a; border-left: 6px solid #8b5cf6; padding-left: 15px;">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 style="font-size: 22px; font-weight: 800; margin-top: 30px; margin-bottom: 15px; color: #1e293b; background-color: #f1f5f9; padding: 10px 15px; border-radius: 8px;">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 style="font-size: 18px; font-weight: 800; margin-top: 25px; margin-bottom: 10px; color: #334155; display: flex; align-items: center;"><span style="color: #8b5cf6; margin-right: 8px;">▶</span> $1</h3>')
        .replace(/^\* (.*$)/gm, '<li style="margin-bottom: 8px; font-size: 15px; line-height: 1.6; color: #334155; list-style: none; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #8b5cf6;">•</span> $1</li>')
        .replace(/- (.*$)/gm, '<li style="margin-bottom: 8px; font-size: 15px; line-height: 1.6; color: #334155; list-style: none; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #cbd5e1;">-</span> $1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800; color: #0f172a;">$1</strong>')
        .replace(/\n\n/g, '</div><div style="margin-bottom: 15px; line-height: 1.8; font-size: 15px; color: #334155;">')
        .replace(/\n/g, '<br/>');

      element.innerHTML = `${header}${infoBox}<div style="line-height: 1.8; font-size: 15px; color: #334155;">${htmlContent}</div>`;
      document.body.appendChild(element);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= 295; // A4 height approx

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= 295;
      }
      
      pdf.save(`심층분석리포트_${reportModal.currentReq?.profiles?.name || '내담자'}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(element);
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
    alert(`${email} 주소로 리포트 발송을 위한 연동 준비 중입니다. (추후 API 연결 필요)`);
    if (confirm('상태를 [발송완료]로 변경하시겠습니까?')) {
      handleUpdateStatus(reportModal.currentReq!.id, 'completed');
    }
  };

  const handleSendKakao = () => {
    const kakaoId = reportModal.currentReq?.kakao_id;
    if (!kakaoId) return alert('카카오톡 ID 정보가 없습니다.');
    alert(`카카오톡 ID: ${kakaoId} 고객에게 발송을 위한 연동 준비 중입니다. (알리고/비즈엠 등 API 연결 필요)`);
    if (confirm('상태를 [발송완료]로 변경하시겠습니까?')) {
      handleUpdateStatus(reportModal.currentReq!.id, 'completed');
    }
  };

  const generateAIReport = async (req: DeepReportRequest) => {
    setGeneratingId(req.id);
    let generatedText = '';
    setReportModal({ isOpen: true, content: '', title: `${req.profiles?.name || '내담자'}님의 리포트 생성 중...`, currentReq: req });

    try {
      const response = await fetch('/api/generate-deep-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: req.profiles?.name,
          mbti: req.mbti,
          birthInfo: req.birth_info,
          reportType: req.report_type,
          specialRequest: req.special_requests,
          partnerInfo: req.partner_info
        })
      });

      if (!response.ok) {
        throw new Error('API 응답 에러');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        setReportModal(prev => ({ ...prev, title: `${req.profiles?.name || '내담자'}님의 심층 리포트 (완료 시 복사 가능)` }));
        
        const setModalContent = (content: string) => {
          setReportModal(prev => ({ ...prev, content }));
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          generatedText += chunk;
          setModalContent(generatedText);
        }
      }
    } catch (error) {
      console.error(error);
      alert('리포트 생성 중 오류가 발생했습니다. (잠시 후 다시 시도해주세요)');
      setReportModal({isOpen: false, content: '', title: ''});
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">심층 리포트 관리</h1>
          <p className="text-slate-500 font-medium">관리자용 결합 심층 리포트 신청 목록입니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center bg-white px-4 py-2 border border-slate-200 rounded-xl max-w-sm focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-violet-500 transition-all">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="이메일, 이름, 주문번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-slate-900 bg-transparent border-none outline-none text-sm font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">신청 내역이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-500">
                <tr>
                  <th className="px-6 py-4">주문/신청일</th>
                  <th className="px-6 py-4">예약일</th>
                  <th className="px-6 py-4">신청자 (이름/이메일)</th>
                  <th className="px-6 py-4">분석 타입</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{new Date(req.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400 mt-1 cursor-pointer hover:text-slate-600" onClick={() => copyToClipboard(req.order_id)}>
                          주문번호: {req.order_id.substring(req.order_id.length - 8)} <Copy className="w-3 h-3 inline-block ml-1" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="font-black text-violet-700 bg-violet-50 px-2 py-1 rounded-md">{req.reservation_date || '미정'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{req.profiles?.name || '이름없음'}</div>
                        <div className="text-sm text-slate-500">{req.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${req.report_type.includes('MBTI') ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-700'}`}>
                           {req.report_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={req.status}
                          onChange={(e) => handleUpdateStatus(req.id, e.target.value)}
                          className={`text-xs font-bold rounded px-2 py-1 outline-none cursor-pointer border ${req.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                        >
                          <option value="paid">결제완료 (발송대기)</option>
                          <option value="completed">리포트 발송완료</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                             className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                           >
                             상세보기
                             {expandedId === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>
                           <button 
                             onClick={() => generateAIReport(req)}
                             disabled={generatingId !== null}
                             className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                generatingId === req.id 
                                  ? 'bg-violet-100 text-violet-500 cursor-not-allowed' 
                                  : 'bg-violet-600 text-white hover:bg-violet-700'
                             }`}
                           >
                             {generatingId === req.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Bot className="w-3 h-3" />}
                             보고서 초안 생성
                           </button>
                        </div>
                      </td>
                    </tr>
                    
                    {expandedId === req.id && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={6} className="px-8 py-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                               <h4 className="font-black text-lg mb-4 text-slate-900 border-b pb-2 flex items-center gap-2">
                                 작성 요청 상세 정보
                                 {req.partner_info && <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">궁합 분석 포함</span>}
                               </h4>
                               <div className="grid md:grid-cols-2 gap-y-4 gap-x-8">
                                  <div className="space-y-4">
                                     <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-violet-500 pl-2">내담자 본인</h5>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                           <p className="text-xs font-bold text-slate-400 mb-1">생년월일 및 시간</p>
                                           <p className="font-bold text-slate-800">{req.birth_info}</p>
                                        </div>
                                        <div>
                                           <p className="text-xs font-bold text-slate-400 mb-1">MBTI</p>
                                           <p className="font-bold text-slate-800 uppercase">{req.mbti || '미입력'}</p>
                                        </div>
                                     </div>
                                  </div>

                                  {req.partner_info && (
                                    <div className="space-y-4">
                                       <h5 className="text-[11px] font-black text-rose-400 uppercase tracking-widest border-l-2 border-rose-500 pl-2">상대방 정보 (궁합)</h5>
                                       <div className="grid grid-cols-2 gap-4">
                                          <div>
                                             <p className="text-xs font-bold text-slate-400 mb-1">이름 / 관계</p>
                                             <p className="font-bold text-slate-800">{req.partner_info.name} ({req.partner_info.relationship})</p>
                                          </div>
                                          <div>
                                             <p className="text-xs font-bold text-slate-400 mb-1">생년월일 / MBTI</p>
                                             <p className="font-bold text-slate-800">{req.partner_info.birth_info} / {req.partner_info.mbti || '-'}</p>
                                          </div>
                                       </div>
                                    </div>
                                  )}

                                  <div className="md:col-span-2 mt-2 bg-slate-50 p-4 rounded-lg">
                                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-slate-300 pl-2 mb-3">특별 요청사항 / 고객 요구사항</p>
                                     <p className="font-medium text-slate-800 whitespace-pre-line text-sm leading-relaxed">{req.special_requests || '특별한 요청사항이 없습니다.'}</p>
                                  </div>

                                  <div className="md:col-span-2 flex gap-4 pt-4 border-t border-slate-100">
                                     <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-400 mb-1">이메일 연락처</p>
                                        <p className="font-medium text-slate-800 flex items-center gap-2">
                                           {req.email} <button onClick={() => copyToClipboard(req.email)}><Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
                                        </p>
                                     </div>
                                     <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-400 mb-1">카카오톡 ID</p>
                                        <p className="font-medium text-slate-800 flex items-center gap-2">
                                           {req.kakao_id || '미입력'} 
                                           {req.kakao_id && <button onClick={() => copyToClipboard(req.kakao_id)}><Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>}
                                        </p>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                 </div>
                 <div>
                    <h3 className="font-black text-xl text-slate-900">{reportModal.title}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">※ AI가 약 10페이지 분량의 심층 분석 내용을 생성합니다.</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={handleDownloadPDF}
                  disabled={generatingId !== null || isExporting}
                  className={`px-4 py-2 font-bold rounded-xl flex items-center gap-2 transition-all ${
                      generatingId || isExporting
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-lg'
                  }`}
                 >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                   PDF 다운로드
                 </button>
                 <button 
                  onClick={() => copyToClipboard(reportModal.content)}
                  disabled={generatingId !== null}
                  className={`px-4 py-2 font-bold rounded-xl flex items-center gap-2 transition-all ${
                      generatingId 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                 >
                   <Copy className="w-4 h-4" /> 복사
                 </button>
                 <div className="w-px h-10 bg-slate-200 mx-1"></div>
                 <button onClick={() => setReportModal({isOpen: false, content: '', title: ''})} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* Sidebar for sending */}
               <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col gap-6">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">리포트 발송 도구</h4>
                    <div className="space-y-3">
                       <button 
                         onClick={handleSendEmail}
                         className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-violet-500 hover:shadow-md transition-all group"
                       >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                             <Mail className="w-5 h-5 text-slate-600 group-hover:text-violet-600" />
                          </div>
                          <span className="text-xs font-black text-slate-700">이메일 발송</span>
                       </button>

                       <button 
                         onClick={handleSendKakao}
                         className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-yellow-500 hover:shadow-md transition-all group"
                       >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-yellow-50 transition-colors">
                             <MessageCircle className="w-5 h-5 text-slate-600 group-hover:text-yellow-600" />
                          </div>
                          <span className="text-xs font-black text-slate-700">카카오톡 발송</span>
                       </button>
                    </div>
                  </div>

                  <div className="mt-auto">
                     <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                        ※ 발송 버튼 클릭 시 연동된 외부 API(SendGrid, Aligo 등)를 통해 고객에게 자동 전달됩니다.
                     </p>
                  </div>
               </div>

               {/* Main Content Area */}
               <div className="flex-1 p-8 overflow-y-auto bg-slate-100/50 relative custom-scrollbar">
                  {generatingId && (
                     <div className="absolute top-6 right-6 bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse z-10">
                        <Loader2 className="w-4 h-4 animate-spin"/> 리포트 심층 생성 중...
                     </div>
                  )}
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm min-h-full max-w-4xl mx-auto printable-content">
                     <pre className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed text-slate-700">
                        {reportModal.content || '프리미엄 AI 모델이 약 10페이지 분량의 심층 리포트를 정성스럽게 작성 중입니다. (생성 완료까지 최대 2~3분이 소요될 수 있습니다)'}
                     </pre>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}} />
    </div>
  );
};

export default AdminDeepReports;
