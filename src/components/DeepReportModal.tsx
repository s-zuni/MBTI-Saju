import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Info, Clock } from 'lucide-react';
import { requestPayment } from '../payment';
import { isTossApp } from '../utils/envUtils';
import { AIT_DEEP_REPORT_PRODUCT_ID } from '../config/creditConfig';

interface DeepReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

const DeepReportModal: React.FC<DeepReportModalProps> = ({ isOpen, onClose, session }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    kakaoId: '',
    birthDate: '',
    birthTime: '',
    birthTimeLabel: '',
    mbti: '',
    reportType: 'mbti_saju', // 'saju' or 'mbti_saju'
    specialRequest: '',
    reservationDate: '',
    partnerInfo: {
      includePartner: false,
      name: '',
      birthDate: '',
      birthTime: '',
      birthTimeLabel: '',
      mbti: '',
      relationship: 'lover',
      relationshipCustom: '',
    }
  });
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  // 다음 4일 계산 (오늘 포함)
  const availableDates = React.useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return (new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0] as string);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      const fetchAvailability = async () => {
        try {
          const { data, error } = await supabase
            .from('deep_report_requests')
            .select('reservation_date')
            .in('status', ['paid', 'completed'])
            .in('reservation_date', availableDates);
          
          if (data && !error) {
            const counts = data.reduce((acc: any, curr: any) => {
              if (curr.reservation_date) {
                acc[curr.reservation_date] = (acc[curr.reservation_date] || 0) + 1;
              }
              return acc;
            }, {});
            
            const newAvail: Record<string, boolean> = {};
            let firstAvailDate = availableDates[0] as string;
            let found = false;
            
            availableDates.forEach(d => {
              const isFull = (counts[d] || 0) >= 10;
              newAvail[d] = !isFull;
              if (!isFull && !found) {
                firstAvailDate = d;
                found = true;
              }
            });
            setAvailability(newAvail);
            setFormData(prev => ({ ...prev, reservationDate: prev.reservationDate || firstAvailDate }));
          }
        } catch (e) {
          console.error("Failed to fetch availability", e);
        }
      };
      
      fetchAvailability();
    }
  }, [isOpen, availableDates]);

  useEffect(() => {
    if (isOpen && session?.user?.user_metadata) {
      const meta = session.user.user_metadata;
      setFormData(prev => ({
        ...prev,
        email: session.user.email || prev.email,
        birthDate: meta.birth_date || prev.birthDate,
        birthTime: meta.birth_time || prev.birthTime,
        mbti: meta.mbti || prev.mbti,
      }));
    }
  }, [isOpen, session]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePayment = async () => {
    // Guest checkout is allowed. If session is missing, we proceed as guest.
    // We will use a guest customer key for TOSS payments.
    
    setLoading(true);

    if (!formData.email.trim()) {
      setLoading(false);
      return alert('이메일을 입력해주세요.');
    }
    if (!formData.birthDate.trim()) {
      setLoading(false);
      return alert('생년월일(및 시간)을 입력해주세요.');
    }
    if (!formData.reservationDate) {
      setLoading(false);
      return alert('예약 일자를 선택해주세요.');
    }

    try {
      // 1. 심층 리포트 요청 데이터 생성
      const orderId = `DEEPREPORT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const amount = 29800;

      const { error: insertError } = await supabase.from('deep_report_requests').insert({
        order_id: orderId,
        user_id: session?.user?.id || null,
        email: formData.email,
        kakao_id: formData.kakaoId,
        birth_info: `${formData.birthDate} ${formData.birthTimeLabel || formData.birthTime}`,
        mbti: formData.mbti,
        report_type: formData.reportType === 'mbti_saju' ? 'MBTI 사주 심층 리포트' : '사주 전용 심층 리포트',
        special_requests: formData.specialRequest,
        amount: amount,
        status: 'pending_payment',
        reservation_date: formData.reservationDate,
        partner_info: formData.reportType === 'mbti_saju' ? {
          name: formData.partnerInfo.name,
          birth_info: `${formData.partnerInfo.birthDate} ${formData.partnerInfo.birthTime}`,
          mbti: formData.partnerInfo.mbti,
          relationship: formData.partnerInfo.relationship === 'custom' ? formData.partnerInfo.relationshipCustom : formData.partnerInfo.relationship
        } : null
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('리포트 신청 초기화에 실패했습니다. (DB 테이블이 생성되었는지 확인해주세요.)');
      }

      // 2. Toss 페이먼츠 호출
      // Guest인 경우 session.user.id 대신 고유 식별자 생성하여 사용
      const customerKey = session?.user?.id || `GUEST_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      
      const response = await requestPayment({
        name: formData.reportType === 'saju' ? '심층 결합 분석 리포트 (사주)' : '심층 결합 분석 리포트 (MBTI+사주)',
        amount: amount,
        orderId: orderId,
        customerKey: customerKey.replace(/[^a-zA-Z0-9_\-:]/g, '').substring(0, 50),
        customerEmail: formData.email,
        customerName: session?.user?.user_metadata?.full_name || '비회원 이용자',
        metadata: {
            productId: 'deep_report'
        },
        // Apps In Toss 전용 필드
        aitProductId: isTossApp() ? AIT_DEEP_REPORT_PRODUCT_ID : undefined,
        onAitGrant: isTossApp() ? async (oid: string, pid: string) => {
            console.log('[AIT Grant] 심층 리포트 지급 처리 시작:', oid, '상품:', pid);
            const { error } = await supabase
                .from('deep_report_requests')
                .update({ status: 'paid', payment_id: oid })
                .eq('order_id', oid);
            
            if (error) {
                console.error('[AIT Grant] DB 업데이트 실패:', error);
                return false;
            }
            return true;
        } : undefined
      });

      if (!response.success) {
        throw new Error(response.error_msg || '결제창 호출에 실패했습니다.');
      }
      
    } catch (err: any) {
        console.error('Payment Error:', err);
        alert(err.message || '결제 중 오류가 발생했습니다.');
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex justify-center items-center z-[1000] p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-[32px] overflow-hidden flex flex-col my-auto shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors z-10">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-8 md:p-10 pb-6 shrink-0 bg-[#0A0A0A] text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-3xl">auto_awesome</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-newsreader font-light tracking-tight mb-4">운명 심층 분석 리포트 신청</h2>
          <p className="text-slate-400 text-base md:text-lg font-manrope font-light leading-relaxed max-w-2xl">
            <strong className="text-white font-medium">1,000만 건 이상의 방대한 사주 데이터 및 최신의 MBTI 심리 모델 융합 통계</strong>를 바탕으로, 전문가가 직접 당신만의 특별한 <span className="text-white italic underline underline-offset-4 decoration-white/30 font-medium">A4 20장 내외</span> 분량의 정밀 리포트를 작성해 드립니다.
          </p>
        </div>

        <div className="px-8 md:px-10 py-8 overflow-y-auto custom-scrollbar">
          
          <div className="flex justify-center mb-8">
            <span className="px-4 py-2 bg-rose-500 text-white text-xs font-black rounded-full shadow-lg shadow-rose-500/20 animate-pulse tracking-widest uppercase">
              기간 한정 파격 할인 적용 중
            </span>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-2 mb-3">
                 <span className="material-symbols-outlined text-slate-900">calendar_month</span>
                 <h3 className="text-sm font-black text-slate-900">리포트 예약 일자 선택 <span className="text-rose-500">*</span></h3>
               </div>
               <p className="text-xs text-slate-600 mb-4 font-bold flex items-center gap-1">
                 <Info className="w-4 h-4" /> 하루 10명 한정으로 제공되는 프리미엄 수기 분석 서비스입니다.
               </p>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableDates.map(date => {
                    const isAvailable = availability[date] !== false;
                    const isSelected = formData.reservationDate === date;
                    const dateObj = new Date(date);
                    const formattedDisplay = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${['일','월','화','수','목','금','토'][dateObj.getDay()]})`;
                    
                    return (
                      <button
                        key={date}
                        disabled={!isAvailable}
                        onClick={() => setFormData({...formData, reservationDate: date})}
                        className={`py-3 px-2 rounded-xl border-2 text-center transition-all ${
                          !isAvailable 
                            ? 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed opacity-60' 
                            : isSelected
                              ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20'
                              : 'bg-white border-violet-200 text-slate-700 hover:border-violet-400'
                        }`}
                      >
                        <div className="font-black text-sm">{formattedDisplay}</div>
                        <div className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-violet-200' : !isAvailable ? 'text-slate-400' : 'text-violet-500'}`}>
                          {!isAvailable ? '예약 마감' : '예약 가능'}
                        </div>
                      </button>
                    );
                  })}
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-sm font-black text-slate-800">받으실 이메일 <span className="text-rose-500">*</span></label>
                 <input 
                   type="email" 
                   value={formData.email} 
                   onChange={e => setFormData({...formData, email: e.target.value})} 
                   className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium"
                   placeholder="example@email.com"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-black text-slate-800">카카오톡 아이디 <span className="text-slate-400 font-normal">(선택)</span></label>
                 <input 
                   type="text" 
                   value={formData.kakaoId} 
                   onChange={e => setFormData({...formData, kakaoId: e.target.value})} 
                   className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium"
                   placeholder="카카오톡 ID 검색용"
                 />
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-sm font-black text-slate-800">생년월일 및 태어난 시간 <span className="text-rose-500">*</span></label>
                 <div className="flex flex-col gap-2">
                    <input 
                      type="date" 
                      value={formData.birthDate} 
                      onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium"
                    />
                      <select 
                        value={formData.birthTime} 
                        onChange={e => {
                          const target = e.target as HTMLSelectElement;
                          const label = target.options[target.selectedIndex]?.text || '';
                          setFormData({...formData, birthTime: target.value, birthTimeLabel: label});
                        }} 
                        className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium"
                      >
                      <option value="">태어난 시간 선택</option>
                      <option value="00:00">자시 (23:30 ~ 01:30)</option>
                      <option value="02:00">축시 (01:30 ~ 03:30)</option>
                      <option value="04:00">인시 (03:30 ~ 05:30)</option>
                      <option value="06:00">묘시 (05:30 ~ 07:30)</option>
                      <option value="08:00">진시 (07:30 ~ 09:30)</option>
                      <option value="10:00">사시 (09:30 ~ 11:30)</option>
                      <option value="12:00">오시 (11:30 ~ 13:30)</option>
                      <option value="14:00">미시 (13:30 ~ 15:30)</option>
                      <option value="16:00">신시 (15:30 ~ 17:30)</option>
                      <option value="18:00">유시 (17:30 ~ 19:30)</option>
                      <option value="20:00">술시 (19:30 ~ 21:30)</option>
                      <option value="22:00">해시 (21:30 ~ 23:30)</option>
                      <option value="unknown">모름 / 입력안함</option>
                    </select>
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-black text-slate-800">본인의 MBTI <span className="text-slate-400 font-normal">(선택)</span></label>
                 <input 
                   type="text" 
                   value={formData.mbti} 
                   onChange={e => setFormData({...formData, mbti: e.target.value.toUpperCase()})} 
                   className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-medium uppercase"
                   placeholder="예: ENFP"
                   maxLength={4}
                 />
               </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
               <label className="text-sm font-black text-slate-800">리포트 분석 타입 선택 <span className="text-rose-500">*</span></label>
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setFormData({...formData, reportType: 'saju'})}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${formData.reportType === 'saju' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                  >
                     <p className="font-bold text-sm mb-1">사주 집중 분석</p>
                     <p className="text-xs opacity-70 font-medium">전통 사주명리를 깊게 풀이</p>
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, reportType: 'mbti_saju'})}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${formData.reportType === 'mbti_saju' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                  >
                     <p className="font-bold text-sm mb-1">MBTI & 사주 융합</p>
                     <p className="text-xs opacity-70 font-medium">다각도의 성향 교차 분석</p>
                  </button>
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between">
                 <label className="text-sm font-black text-slate-800">상대방 정보 포함 (궁합 분석)</label>
                 <button 
                   onClick={() => setFormData(prev => ({...prev, partnerInfo: {...prev.partnerInfo, includePartner: !prev.partnerInfo.includePartner}}))}
                   className={`w-12 h-6 rounded-full transition-all relative ${formData.partnerInfo.includePartner ? 'bg-violet-600' : 'bg-slate-200'}`}
                 >
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.partnerInfo.includePartner ? 'left-7' : 'left-1'}`} />
                 </button>
               </div>
               
               {formData.partnerInfo.includePartner && (
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">상대방 이름</label>
                        <input 
                          type="text" 
                          value={formData.partnerInfo.name}
                          onChange={e => setFormData(prev => ({...prev, partnerInfo: {...prev.partnerInfo, name: e.target.value}}))}
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="이름"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">관계</label>
                        <select 
                          value={formData.partnerInfo.relationship}
                          onChange={e => setFormData(prev => ({...prev, partnerInfo: {...prev.partnerInfo, relationship: e.target.value}}))}
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="lover">연인/배우자</option>
                          <option value="crush">짝사랑/썸</option>
                          <option value="family">가족</option>
                          <option value="friend">친구</option>
                          <option value="colleague">직장동료</option>
                          <option value="custom">기타(직접입력)</option>
                        </select>
                      </div>
                    </div>

                    {formData.partnerInfo.relationship === 'custom' && (
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          value={formData.partnerInfo.relationshipCustom}
                          onChange={e => setFormData(prev => ({...prev, partnerInfo: {...prev.partnerInfo, relationshipCustom: e.target.value}}))}
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="상세 관계를 입력해주세요"
                        />
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">상대방 생년월일</label>
                        <input 
                          type="date" 
                          value={formData.partnerInfo.birthDate}
                          onChange={e => setFormData(prev => ({...prev, partnerInfo: {...prev.partnerInfo, birthDate: e.target.value}}))}
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500">태어난 시간 (모름 가능)</label>
                        <select 
                          value={formData.partnerInfo.birthTime}
                          onChange={e => {
                            const target = e.target as HTMLSelectElement;
                            const label = target.options[target.selectedIndex]?.text || '';
                            setFormData(prev => ({
                              ...prev, 
                              partnerInfo: {
                                ...prev.partnerInfo, 
                                birthTime: target.value, 
                                birthTimeLabel: label
                              }
                            }));
                          }}
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="">태어난 시간 선택</option>
                          <option value="00:00">자시 (23:30 ~ 01:30)</option>
                          <option value="02:00">축시 (01:30 ~ 03:30)</option>
                          <option value="04:00">인시 (03:30 ~ 05:30)</option>
                          <option value="06:00">묘시 (05:30 ~ 07:30)</option>
                          <option value="08:00">진시 (07:30 ~ 09:30)</option>
                          <option value="10:00">사시 (09:30 ~ 11:30)</option>
                          <option value="12:00">오시 (11:30 ~ 13:30)</option>
                          <option value="14:00">미시 (13:30 ~ 15:30)</option>
                          <option value="16:00">신시 (15:30 ~ 17:30)</option>
                          <option value="18:00">유시 (17:30 ~ 19:30)</option>
                          <option value="20:00">술시 (19:30 ~ 21:30)</option>
                          <option value="22:00">해시 (21:30 ~ 23:30)</option>
                          <option value="unknown">모름 / 입력안함</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">상대방 MBTI (선택)</label>
                      <input 
                        type="text" 
                        value={formData.partnerInfo.mbti}
                        onChange={e => setFormData(prev => ({...prev, partnerInfo: {...prev.partnerInfo, mbti: e.target.value.toUpperCase()}}))}
                        className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 uppercase"
                        placeholder="예: INFJ"
                        maxLength={4}
                      />
                    </div>
                 </div>
               )}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
               <label className="text-sm font-black text-slate-800">특별 요청사항 <span className="text-slate-400 font-normal">(선택)</span></label>
               <textarea 
                 value={formData.specialRequest}
                 onChange={e => setFormData({...formData, specialRequest: e.target.value})}
                 className="w-full bg-white border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm h-32 resize-none leading-relaxed font-medium"
                 placeholder="상대방과의 궁합, 요즘 고민거리, 직업 흐름, 연애 흐름 등 분석에서 특별히 집중적으로 다루어졌으면 하는 부분을 자세히 적어주세요."
               />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0">
           <div className="flex justify-center mb-4">
             <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-black rounded-full border border-amber-200 animate-pulse flex items-center gap-1">
               <Clock className="w-3 h-3" /> 하루 10건 한정 판매! (현재 주문 폭주)
             </span>
           </div>
           <button 
             onClick={handlePayment} 
             disabled={loading}
             className="w-full py-5 bg-[#0A0A0A] text-white rounded-2xl font-manrope font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="material-symbols-outlined">auto_awesome</span>}
             29,800원 결제하고 리포트 신청하기
           </button>
           <p className="text-center text-xs text-slate-400 mt-4 font-bold flex items-center justify-center gap-1">
             <Info className="w-4 h-4" /> 주문 제작 상품이므로 작성 착수 후에는 환불이 불가능합니다.
           </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}} />
    </div>
  );
};

export default DeepReportModal;
