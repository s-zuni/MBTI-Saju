import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronLeft, CreditCard } from 'lucide-react';
import html2canvas from 'html2canvas';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { jamidusuSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import FunnelBottomCta from '../components/FunnelBottomCta';
import ReportErrorBoundary from '../components/common/ReportErrorBoundary';
import StreamingStatusBanner from '../components/common/StreamingStatusBanner';
import { safeCalculateSaju } from '../utils/sajuUtils';
import { stripMarkdown } from '../utils/textUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const BIRTH_TIME_SLOTS = [
    { value: 'unknown', label: '모름' },
    { value: '23:00-01:00', label: '자시 (23:00~01:00)' },
    { value: '01:00-03:00', label: '축시 (01:00~03:00)' },
    { value: '03:00-05:00', label: '인시 (03:00~05:00)' },
    { value: '05:00-07:00', label: '묘시 (05:00~07:00)' },
    { value: '07:00-09:00', label: '진시 (07:00~09:00)' },
    { value: '09:00-11:00', label: '사시 (09:00~11:00)' },
    { value: '11:00-13:00', label: '오시 (11:00~13:00)' },
    { value: '13:00-15:00', label: '미시 (13:00~15:00)' },
    { value: '15:00-17:00', label: '신시 (15:00~17:00)' },
    { value: '17:00-19:00', label: '유시 (17:00~19:00)' },
    { value: '19:00-21:00', label: '술시 (19:00~21:00)' },
    { value: '21:00-23:00', label: '해시 (21:00~23:00)' },
];

// 프로필에는 "14:30" 형태로 저장되므로 시진 구간("13:00-15:00")으로 변환한다.
const toBirthTimeSlot = (time?: string | null): string => {
    if (!time) return '';
    if (BIRTH_TIME_SLOTS.some((slot) => slot.value === time)) return time;
    const hour = Number(time.trim().split('-')[0]?.split(':')[0]);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return '';
    if (hour === 23 || hour === 0) return '23:00-01:00';
    const start = hour % 2 === 1 ? hour : hour - 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(start)}:00-${pad((start + 2) % 24)}:00`;
};

const JamidusuPage: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { profile, updateProfile } = useGuestProfile();
    const navigate = useNavigate();
    const resultCardRef = useRef<HTMLDivElement>(null);
    const ticketCheckedRef = useRef(false);
    const receiptTokenRef = useRef<string | null>(null);
    const lastPayloadRef = useRef<any>(null);
    const [hasStarted, setHasStarted] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [targetBirthDate, setTargetBirthDate] = useState(profile.birthDate || '');
    const [targetBirthTime, setTargetBirthTime] = useState(profile.birthTime ? toBirthTimeSlot(profile.birthTime) : '');
    const [targetGender, setTargetGender] = useState<'male' | 'female'>(profile.gender || 'female');
    const [isPaying, setIsPaying] = useState(false);

    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: jamidusuSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: ({ object, error: validationError }) => {
            if (!object) {
                console.error('[JamidusuPage] Result validation failed:', validationError);
                setError('분석 결과를 생성하지 못했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
            } else {
                setError(null);
            }
        },
        onError: (err) => {
            console.error('[JamidusuPage] Analysis failed:', err);
            setError('분석 중 일시적인 오류가 발생했습니다. 아래 [다시 시도하기]를 눌러 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket('JAMIDUSU');
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            lastPayloadRef.current = ticket.payload;
            setHasStarted(true);
            if (ticket.payload.birthDate) setTargetBirthDate(ticket.payload.birthDate);
            if (ticket.payload.birthTime !== undefined) setTargetBirthTime(ticket.payload.birthTime);
            if (ticket.payload.gender) setTargetGender(ticket.payload.gender);
            submit(ticket.payload);
        }
    }, [submit]);

    const handleRetry = () => {
        if (!lastPayloadRef.current) return;
        setError(null);
        submit(lastPayloadRef.current);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetBirthDate) {
            setError('생년월일을 입력해주세요.');
            return;
        }

        const cleanBirthTime = targetBirthTime === 'unknown' ? '' : targetBirthTime;
        const sajuData = safeCalculateSaju(targetBirthDate, cleanBirthTime);
        if (!sajuData) {
            setError('유효한 생년월일(1900~2050년)을 입력해주세요.');
            return;
        }

        updateProfile({
            birthDate: targetBirthDate,
            birthTime: cleanBirthTime,
            gender: targetGender,
        });

        setIsPaying(true);
        try {
            setError(null);
            const res = await startServicePayment({
                serviceType: 'JAMIDUSU',
                serviceName: '자미두수 수호별 찾기',
                returnPath: '/myluck?type=jamidusu',
                payload: {
                    type: 'jamidusu',
                    gender: targetGender,
                    birthDate: targetBirthDate,
                    birthTime: cleanBirthTime,
                    mbti: profile.mbti || '미입력',
                    sajuData,
                },
                customerName: profile.name,
            });
            if (!res.success && res.error_msg) {
                setError(res.error_msg);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsPaying(false);
        }
    };

    const handleSaveImage = async () => {
        if (!resultCardRef.current || !result) return;
        try {
            const canvas = await html2canvas(resultCardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `나의_수호별_${new Date().getTime()}.png`;
            link.href = image;
            link.click();
        } catch (err) {
            alert('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className={isEmbedded ? "pb-12" : "min-h-screen bg-slate-50 pb-32 pt-20"}>
            <div className="max-w-xl mx-auto px-4">
                {!isEmbedded && (
                    <div className="flex items-center justify-between mb-8 px-2">
                        <button 
                            onClick={() => navigate('/fortune')}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                            <CreditCard className="w-4 h-4" />
                            {SERVICE_COSTS.JAMIDUSU.toLocaleString()}원
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-8 border-b border-stone-200 text-center bg-[#FAF7F0]">
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2"
                            style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
                        >
                            자미두수 명반 · 수호별 풀이
                        </h1>
                        <p className="text-stone-600 text-sm">고대 동양 별자리 명반으로 보는 본성·관록·재백·부처궁</p>
                    </div>

                    <div className="p-6 sm:p-8">
                        {!result && !isLoading && !hasStarted ? (
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-800">성별</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setTargetGender('female')} 
                                            className={`py-4 rounded-xl text-base transition-colors ${targetGender === 'female' ? 'bg-indigo-700 text-white font-bold shadow' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            여성
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setTargetGender('male')} 
                                            className={`py-4 rounded-xl text-base transition-colors ${targetGender === 'male' ? 'bg-indigo-700 text-white font-bold shadow' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            남성
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-800">생년월일</label>
                                    <input 
                                        type="date" 
                                        value={targetBirthDate} 
                                        onChange={(e) => { setTargetBirthDate(e.target.value); setError(null); }} 
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-800">태어난 시간 (선택사항)</label>
                                    <select 
                                        value={targetBirthTime} 
                                        onChange={(e) => setTargetBirthTime(e.target.value)} 
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">시간을 선택해주세요 (모르면 선택 안함)</option>
                                        {BIRTH_TIME_SLOTS.map((slot) => (
                                            <option key={slot.value} value={slot.value}>{slot.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isPaying}
                                    className="w-full py-5 bg-slate-900 text-white rounded-xl font-bold text-lg shadow hover:bg-indigo-800 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
                                >
                                    <span>{isPaying ? '결제 창 여는 중...' : `결과 확인하기 (${SERVICE_COSTS.JAMIDUSU.toLocaleString()}원 결제)`}</span>
                                    <span className="text-xs text-stone-300 font-normal">회원가입 없이 1회 단품 결제 · 즉시 분석</span>
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <StreamingStatusBanner
                                    isStreaming={isLoading}
                                    hasData={!!result}
                                    error={!result ? error : null}
                                    onRetry={handleRetry}
                                    streamingTitle="결제가 완료되어 자미두수 12궁을 실시간으로 풀이하고 있습니다"
                                    streamingSubtitle="완성되는 궁부터 아래에 바로 표시됩니다."
                                    completedText="자미두수 명반 풀이가 완료되었습니다."
                                />

                                {result && (
                                    <ReportErrorBoundary onRetry={handleRetry}>
                                        <div className="space-y-8">
                                            <div 
                                                ref={resultCardRef} 
                                                className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-8 text-left"
                                            >
                                                <div className="text-center pb-6 border-b border-stone-200 space-y-2">
                                                    <p className="text-sm font-bold text-indigo-800">나의 메인 수호별</p>
                                                    <h2
                                                        className="text-2xl sm:text-3xl font-bold text-slate-950 leading-snug break-keep"
                                                        style={{ fontFamily: "'NanumMyungjo', 'Noto Serif KR', serif" }}
                                                    >
                                                        {stripMarkdown(result.main_character || '명반을 읽는 중...')}
                                                    </h2>
                                                </div>

                                                <div className="space-y-6">
                                                    {result.destiny_palace && (
                                                        <div className="bg-stone-50/70 border border-stone-200/80 p-6 rounded-2xl space-y-2">
                                                            <h3 className="text-lg sm:text-xl font-bold text-slate-950">타고난 본성 (명궁 · 命宮)</h3>
                                                            <p className="text-slate-800 text-[15px] sm:text-base leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.destiny_palace)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {result.career_palace && (
                                                        <div className="bg-stone-50/70 border border-stone-200/80 p-6 rounded-2xl space-y-2">
                                                            <h3 className="text-lg sm:text-xl font-bold text-slate-950">나의 재능과 성공 (관록궁 · 官祿宮)</h3>
                                                            <p className="text-slate-800 text-[15px] sm:text-base leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.career_palace)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    
                                                    {result.wealth_style && (
                                                        <div className="bg-stone-50/70 border border-stone-200/80 p-6 rounded-2xl space-y-2">
                                                            <h3 className="text-lg sm:text-xl font-bold text-slate-950">재물운 (재백궁 · 財帛宮)</h3>
                                                            <p className="text-slate-800 text-[15px] sm:text-base leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.wealth_style)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {result.love_style && (
                                                        <div className="bg-stone-50/70 border border-stone-200/80 p-6 rounded-2xl space-y-2">
                                                            <h3 className="text-lg sm:text-xl font-bold text-slate-950">연애 스타일 (부처궁 · 夫妻宮)</h3>
                                                            <p className="text-slate-800 text-[15px] sm:text-base leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.love_style)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {Array.isArray(result.lucky_items) && result.lucky_items.length > 0 && (
                                                        <div className="bg-[#FAF7F0] border border-[#E6DFD1] p-6 rounded-2xl space-y-4">
                                                            <h3 className="text-lg sm:text-xl font-bold text-slate-950">나를 돕는 길성 및 보완 요소</h3>
                                                            <ul className="space-y-4">
                                                                {result.lucky_items.map((item: any, idx: number) => (
                                                                    <li key={idx} className="space-y-1">
                                                                        <p className="font-bold text-base text-slate-950">
                                                                            {idx + 1}. {stripMarkdown(item?.name || '')}
                                                                        </p>
                                                                        {item?.meaning && (
                                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.85] break-keep">
                                                                                {stripMarkdown(item.meaning)}
                                                                            </p>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {result.summary && (
                                                        <div className="pt-6 border-t border-stone-200 space-y-2">
                                                            <h3 className="text-lg sm:text-xl font-bold text-slate-950">명반 종합 총평 및 조언</h3>
                                                            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.9] whitespace-pre-wrap break-keep">
                                                                {stripMarkdown(result.summary)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {!isLoading && (
                                                <>
                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <button 
                                                            onClick={handleSaveImage} 
                                                            className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-indigo-900 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <Download className="w-5 h-5" /> 결과 이미지 저장
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setError(null);
                                                                setHasStarted(false);
                                                            }} 
                                                            className="flex-1 py-4 bg-stone-100 text-slate-800 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
                                                        >
                                                            다른 생년월일로 다시 보기
                                                        </button>
                                                    </div>

                                                    <FunnelBottomCta from="jamidusu_result" />
                                                </>
                                            )}
                                        </div>
                                    </ReportErrorBoundary>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JamidusuPage;
