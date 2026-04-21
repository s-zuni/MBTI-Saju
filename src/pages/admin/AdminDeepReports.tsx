import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, Search, Sparkles, ChevronDown, ChevronUp, Copy, Bot, X } from 'lucide-react';

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
  profiles?: {
    full_name: string;
  };
}

const AdminDeepReports: React.FC = () => {
  const [requests, setRequests] = useState<DeepReportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{isOpen: boolean, content: string, title: string}>({isOpen: false, content: '', title: ''});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deep_report_requests')
        .select(`
          *,
          profiles:user_id (id, full_name, role)
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
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다.');
  };

  const generateAIReport = async (req: DeepReportRequest) => {
    setGeneratingId(req.id);
    let generatedText = '';
    setReportModal({ isOpen: true, content: '', title: `${req.profiles?.full_name || '내담자'}님의 리포트 생성 중...` });

    try {
      const response = await fetch('/api/generate-deep-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: req.profiles?.full_name,
          mbti: req.mbti,
          birthInfo: req.birth_info,
          reportType: req.report_type,
          specialRequest: req.special_requests
        })
      });

      if (!response.ok) {
        throw new Error('API 응답 에러');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        setReportModal(prev => ({ ...prev, title: `${req.profiles?.full_name || '내담자'}님의 심층 리포트 (완료 시 복사 가능)` }));
        
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
    (req.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
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
                        <div className="font-bold text-slate-900">{req.profiles?.full_name || '이름없음'}</div>
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
                               <h4 className="font-black text-lg mb-4 text-slate-900 border-b pb-2">작성 요청 상세 정보</h4>
                               <div className="grid md:grid-cols-2 gap-y-4 gap-x-8">
                                  <div>
                                     <p className="text-xs font-bold text-slate-400 mb-1">생년월일 및 시간</p>
                                     <p className="font-bold text-slate-800">{req.birth_info}</p>
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-slate-400 mb-1">MBTI</p>
                                     <p className="font-bold text-slate-800 uppercase">{req.mbti || '미입력'}</p>
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-slate-400 mb-1">이메일</p>
                                     <p className="font-medium text-slate-800 flex items-center gap-2">
                                        {req.email} <button onClick={() => copyToClipboard(req.email)}><Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
                                     </p>
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-slate-400 mb-1">카카오톡 ID</p>
                                     <p className="font-medium text-slate-800 flex items-center gap-2">
                                        {req.kakao_id || '미입력'} 
                                        {req.kakao_id && <button onClick={() => copyToClipboard(req.kakao_id)}><Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>}
                                     </p>
                                  </div>
                                  <div className="md:col-span-2 mt-2 bg-slate-50 p-4 rounded-lg">
                                     <p className="text-xs font-bold border-b border-slate-200 pb-2 mb-2 text-slate-500">특별 요청사항 / 추가 내용</p>
                                     <p className="font-medium text-slate-800 whitespace-pre-line text-sm leading-relaxed">{req.special_requests || '특별한 요청사항이 없습니다.'}</p>
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
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                 </div>
                 <h3 className="font-black text-xl text-slate-900">{reportModal.title}</h3>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={() => copyToClipboard(reportModal.content)}
                  disabled={generatingId !== null}
                  className={`px-4 py-2 font-bold rounded-xl flex items-center gap-2 transition-all ${
                      generatingId 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg'
                  }`}
                 >
                   <Copy className="w-4 h-4" /> 리포트 전체 복사
                 </button>
                 <button onClick={() => setReportModal({isOpen: false, content: '', title: ''})} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 relative custom-scrollbar">
               {generatingId && (
                  <div className="absolute top-6 right-6 bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse">
                     <Loader2 className="w-4 h-4 animate-spin"/> 리스트럭처링 중...
                  </div>
               )}
               <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-full">
                  <pre className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed text-slate-700">
                     {reportModal.content || '전문가 AI 모델이 입력된 정보를 바탕으로 심층 리포트를 작성 중입니다. (분량이 많아 생성에 1~2분 정도 소요될 수 있습니다)'}
                  </pre>
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
