import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, Search, Sparkles, ChevronDown, ChevronUp, Copy, X, Download, Mail, MessageCircle } from 'lucide-react';
import { generateReactPDF } from '../../utils/pdfGenerator';
import { DeepReportReactPDF } from '../../components/pdf/DeepReportReactPDF';
import { calculateSaju } from '../../utils/sajuUtils';

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
    birth_info?: string;
    mbti?: string;
    relationship?: string;
  };
  generated_data?: any;
  generated_at?: string;
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

  const handleDownloadPDF = async () => {
    if (!reportModal.sajuData) {
      alert('분석 데이터가 아직 완전히 구조화되지 않았거나 생성 중입니다. 잠시만 기다려주세요.');
      return;
    }
    setIsExporting(true);

    try {
      const filename = `프리미엄_심층리포트_${reportModal.currentReq?.profiles?.name || '내담자'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      const component = (
        <DeepReportReactPDF 
          sajuData={reportModal.sajuData} 
          parsedContent={reportModal.sajuData} 
          clientName={reportModal.currentReq?.profiles?.name || '내담자'} 
        />
      );

      await generateReactPDF(component, filename);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert(`PDF 생성 중 오류가 발생했습니다: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = () => {
    const req = reportModal.currentReq;
    if (!req || !req.email) return alert('이메일 정보가 없습니다.');
    
    const subject = encodeURIComponent(`[MBTI-Saju] ${req.profiles?.name || '내담자'}님의 프리미엄 심층 리포트가 완성되었습니다.`);
    const body = encodeURIComponent(`안녕하세요, ${req.profiles?.name || '내담자'}님.\n\n요청하신 프리미엄 심층 리포트가 완성되어 전달드립니다.\n(이곳에 다운로드한 PDF 파일을 첨부해 주세요)\n\n감사합니다.`);
    
    window.location.href = `mailto:${req.email}?subject=${subject}&body=${body}`;
    
    if (window.confirm('상태를 [발송완료]로 변경하시겠습니까?')) {
      handleUpdateStatus(req.id, 'completed');
    }
  };

  const handleSendKakao = () => {
    const req = reportModal.currentReq;
    if (!req || !req.kakao_id) return alert('카카오톡 ID 정보가 없습니다.');
    
    alert(`카카오톡 ID: ${req.kakao_id} 고객에게 발송을 위한 연동 준비 중입니다.`);
    if (window.confirm('상태를 [발송완료]로 변경하시겠습니까?')) {
      handleUpdateStatus(req.id, 'completed');
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

    let initialSaju = null;
    try {
      const parts = req.birth_info.split(' ');
      const bDate = parts[0] || '';
      const bTime = parts[1] || '12:00';
      initialSaju = calculateSaju(bDate, bTime);
    } catch (e) {
      console.error('Initial saju calculation failed:', e);
    }

    setReportModal({ 
      isOpen: true, 
      content: '', 
      title: `${req.profiles?.name || '내담자'}님의 리포트 생성 중...`, 
      currentReq: req,
      sajuData: {
        userSaju: initialSaju,
        reportType: req.report_type,
        mbti: req.mbti,
        clientName: req.profiles?.name,
        birthInfo: req.birth_info,
      }
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
          
          // --- SIMPLE & ROBUST JSON PARSING ---
          // Since the AI outputs PURE JSON, we just try to parse it.
          // We need to handle the streaming nature (partial JSON).
          let cleanText = generatedText.trim();
          
          // Remove any potential markdown wrappers if AI ignores instructions
          if (cleanText.startsWith('```')) {
             cleanText = cleanText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
          }

          const tryParse = (txt: string) => {
            try { return JSON.parse(txt); } catch { return null; }
          };
          const tryRepair = (txt: string) => {
            try {
              let r = txt.trim();
              
              // Remove trailing commas before closing braces/brackets
              r = r.replace(/,\s*([}\]])/g, '$1');
              
              const ob = (r.match(/{/g)||[]).length, cb = (r.match(/}/g)||[]).length;
              if (ob > cb) r += '}'.repeat(ob - cb);
              const oa = (r.match(/\[/g)||[]).length, ca = (r.match(/\]/g)||[]).length;
              if (oa > ca) r += ']'.repeat(oa - ca);
              
              return JSON.parse(r);
            } catch { return null; }
          };
          const parsed = tryParse(cleanText) || tryRepair(cleanText);
          if (parsed) {
            updateModalSajuData(parsed);
            updateModalContent(Object.values(parsed).filter(v => typeof v === 'string' && v.length > 50).join('\n\n'));
          }
        }
        // After stream ends: ensure everything is enriched
        setReportModal(prev => {
          if (!prev.sajuData) return prev;
          return {
            ...prev,
            sajuData: {
              ...prev.sajuData,
              reportType: req.report_type,
              mbti: req.mbti,
              clientName: req.profiles?.name,
              birthInfo: req.birth_info,
            }
          };
        });
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

  const displayContent = reportModal.sajuData ? 
    (reportModal.content || `🔮 [분석 데이터 구조화 완료]\n- 재물운: ${reportModal.sajuData.wealthAnalysis?.substring(0, 50) || '분석 중...'}...\n- 애정운: ${reportModal.sajuData.relationshipAnalysis?.substring(0, 50) || '분석 중...'}...\n\n(PDF 생성 버튼을 클릭하면 고품질 프리미엄 리포트로 다운로드됩니다.)`)
    : "리포트 생성이 진행중입니다. 완료 후 다운로드가 가능합니다. (구조화된 데이터 우선 처리 중)";

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
                             onClick={() => {
                               if (req.generated_data) {
                                 // Ensure userSaju exists even in legacy data
                                 let data = req.generated_data;
                                 if (!data.userSaju && req.birth_info) {
                                   try {
                                     const parts = req.birth_info.split(' ');
                                     const bDate = parts[0] || '';
                                     const bTime = parts[1] || '12:00';
                                     data.userSaju = calculateSaju(bDate, bTime);
                                   } catch (e) { console.error(e); }
                                 }

                                 setReportModal({
                                   isOpen: true,
                                   content: Object.values(data).filter(v => typeof v === 'string' && v.length > 50).join('\n\n'),
                                   title: `${req.profiles?.name || '내담자'}님의 심층 리포트`,
                                   currentReq: req,
                                   sajuData: data
                                 });
                               } else {
                                 generateAIReport(req);
                               }
                             }}
                             disabled={generatingId !== null}
                             className={`flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-sm ${
                                generatingId === req.id 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                  : req.generated_data 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                    : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-violet-200 hover:shadow-lg'
                             }`}
                           >
                             {generatingId === req.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                             {req.generated_data ? '리포트 보기' : '리포트 생성'}
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
                                             <span className="font-black text-slate-800">{req.partner_info.name} ({req.partner_info.relationship})</span>
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
