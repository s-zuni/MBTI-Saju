import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Sparkles, Download, ChevronLeft, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { loveSajuSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import FunnelBottomCta from '../components/FunnelBottomCta';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const MBTI_LIST = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

const BIRTH_TIME_SLOTS = [
    { value: '', label: '시간 모름' },
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

type LoveSajuType = 'couple' | 'married' | 'marriage' | 'reunion' | 'crush';

// Custom SVG Radar Chart component to avoid external dependencies with streaming NaN safety
const RadarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const validData = (data || []).filter(d => d && typeof d.label === 'string');
    if (validData.length === 0) return null;

    const size = 200;
    const center = size / 2;
    const r = size * 0.35;
    const numPoints = validData.length;

    // Generate points for the polygon with strict NaN guards
    const points = validData.map((d, i) => {
        const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
        const rawVal = typeof d.value === 'number' && !isNaN(d.value) ? d.value : Number(d.value);
        const safeVal = !isNaN(rawVal) ? Math.min(Math.max(rawVal, 0), 100) : 50;
        const valRatio = safeVal / 100;
        
        let x = center + r * valRatio * Math.cos(angle);
        let y = center + r * valRatio * Math.sin(angle);
        if (isNaN(x)) x = center;
        if (isNaN(y)) y = center;

        return { x, y, label: d.label || '', val: Math.round(safeVal), angle };
    });

    const polygonPointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

    // Concentric grid circles (e.g. at 25%, 50%, 75%, 100%)
    const gridCircles = [0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
        const gridPoints = Array.from({ length: numPoints }).map((_, i) => {
            const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
            const x = center + r * ratio * Math.cos(angle);
            const y = center + r * ratio * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');

        return (
            <polygon 
                key={idx} 
                points={gridPoints} 
                fill="none" 
                stroke="#e2e8f0" 
                strokeWidth="1" 
                strokeDasharray={ratio < 1 ? "2,2" : "0"}
            />
        );
    });

    // Axis lines from center to outer points
    const axisLines = Array.from({ length: numPoints }).map((_, i) => {
        const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return (
            <line 
                key={i} 
                x1={center} 
                y1={center} 
                x2={x} 
                y2={y} 
                stroke="#e2e8f0" 
                strokeWidth="1" 
            />
        );
    });

    // Render text labels around the chart
    const labelElements = points.map((p, i) => {
        const labelR = r * 1.25;
        const labelX = center + labelR * Math.cos(p.angle);
        const labelY = center + labelR * Math.sin(p.angle);
        let textAnchor: "inherit" | "end" | "middle" | "start" = 'middle';
        if (Math.cos(p.angle) > 0.1) textAnchor = 'start';
        else if (Math.cos(p.angle) < -0.1) textAnchor = 'end';

        return (
            <g key={i}>
                <text 
                    x={labelX} 
                    y={labelY} 
                    textAnchor={textAnchor}
                    className="text-[10px] font-black fill-slate-500"
                >
                    {p.label}
                </text>
                <text 
                    x={labelX} 
                    y={labelY + 11} 
                    textAnchor={textAnchor}
                    className="text-[9px] font-bold fill-rose-500"
                >
                    {p.val}점
                </text>
            </g>
        );
    });

    return (
        <div className="flex justify-center my-4">
            <svg width={size + 60} height={size + 30} className="overflow-visible">
                {/* Background Grids */}
                {gridCircles}
                {axisLines}

                {/* Data Polygon */}
                <polygon 
                    points={polygonPointsStr} 
                    fill="rgba(244, 63, 94, 0.15)" 
                    stroke="#f43f5e" 
                    strokeWidth="2.5"
                />

                {/* Data Dots */}
                {points.map((p, i) => (
                    <circle 
                        key={i} 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        className="fill-rose-500 stroke-white stroke-2" 
                    />
                ))}

                {/* Labels */}
                {labelElements}
            </svg>
        </div>
    );
};

const RelationshipPage: React.FC<{ session?: any }> = () => {
    const { profile, updateProfile } = useGuestProfile();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const resultCardRef = useRef<HTMLDivElement>(null);

    const [error, setError] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [pendingAutoPayload, setPendingAutoPayload] = useState<any>(null);
    const ticketCheckedRef = useRef(false);
    const [activeTab, setActiveTab] = useState<LoveSajuType>((searchParams.get('type') as LoveSajuType) || 'couple');

    // Target form states
    const [targetName, setTargetName] = useState('');
    const [targetMbti, setTargetMbti] = useState('');
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [targetGender, setTargetGender] = useState<'male' | 'female'>('male');

    // Reunion specific
    const [separationDate, setSeparationDate] = useState('');
    const [separationReason, setSeparationReason] = useState('');

    useEffect(() => {
        const type = searchParams.get('type') as LoveSajuType;
        if (type && ['couple', 'married', 'marriage', 'reunion', 'crush'].includes(type)) {
            setActiveTab(type);
        }
    }, [searchParams]);

    const getServiceKey = (tab: LoveSajuType) => {
        switch (tab) {
            case 'couple': return 'LOVE_COUPLE' as const;
            case 'married': return 'LOVE_MARRIED' as const;
            case 'marriage': return 'LOVE_MARRIAGE' as const;
            case 'reunion': return 'LOVE_REUNION' as const;
            case 'crush': return 'LOVE_CRUSH' as const;
        }
    };

    const getTabLabel = (tab: LoveSajuType) => {
        switch (tab) {
            case 'couple': return '연인 궁합';
            case 'married': return '부부 궁합';
            case 'marriage': return '결혼 궁합';
            case 'reunion': return '재회 사주';
            case 'crush': return '짝사랑 사주';
        }
    };

    const receiptTokenRef = useRef<string | null>(null);

    const { object: result, submit, isLoading } = useObject({
        api: `/api/love-saju?type=${activeTab}`,
        schema: loveSajuSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: ({ object, error: validationError }) => {
            if (!object) {
                console.error('[RelationshipPage] Result validation failed:', validationError);
                setError('궁합 분석 결과를 생성하지 못했습니다. 다시 시도해 주세요.');
            }
        },
        onError: (err) => {
            console.error('[RelationshipPage] Analysis failed:', err);
            setError('분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket([
            'LOVE_COUPLE',
            'LOVE_MARRIED',
            'LOVE_MARRIAGE',
            'LOVE_REUNION',
            'LOVE_CRUSH',
        ]);
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            const p = ticket.payload;
            if (p.type && ['couple', 'married', 'marriage', 'reunion', 'crush'].includes(p.type)) {
                setActiveTab(p.type);
            }
            if (p.targetName) setTargetName(p.targetName);
            if (p.targetMbti) setTargetMbti(p.targetMbti);
            if (p.targetBirthDate) setTargetBirthDate(p.targetBirthDate);
            if (p.targetBirthTime) setTargetBirthTime(p.targetBirthTime);
            if (p.targetGender) setTargetGender(p.targetGender);
            if (p.separationDate) setSeparationDate(p.separationDate);
            if (p.separationReason) setSeparationReason(p.separationReason);
            setPendingAutoPayload(p);
        }
    }, []);

    useEffect(() => {
        if (pendingAutoPayload && (!pendingAutoPayload.type || activeTab === pendingAutoPayload.type)) {
            const payloadToRun = pendingAutoPayload;
            setPendingAutoPayload(null);
            submit(payloadToRun);
        }
    }, [pendingAutoPayload, activeTab, submit]);

    const handleTabChange = (tab: LoveSajuType) => {
        setActiveTab(tab);
        setSearchParams({ type: tab });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.birthDate) {
            alert('본인 생년월일을 입력해주세요.');
            return;
        }
        if (!profile.mbti) {
            alert('본인 MBTI를 선택해주세요.');
            return;
        }

        if (!targetName.trim()) {
            alert('상대방 이름을 입력해주세요.');
            return;
        }

        if (!targetMbti) {
            alert('상대방 MBTI를 입력해주세요.');
            return;
        }

        if (!targetBirthDate) {
            alert('상대방 생년월일을 입력해주세요.');
            return;
        }

        if (activeTab === 'reunion' && (!separationDate || !separationReason.trim())) {
            alert('이별 시기와 이별 사유를 상세히 입력해 주세요.');
            return;
        }

        const serviceKey = getServiceKey(activeTab);
        setIsPaying(true);
        try {
            setError(null);
            const sajuData = calculateSaju(profile.birthDate, profile.birthTime);
            const targetSajuData = calculateSaju(targetBirthDate, targetBirthTime);
            const res = await startServicePayment({
                serviceType: serviceKey,
                serviceName: `연애 · 궁합 사주 (${getTabLabel(activeTab)})`,
                returnPath: `/relationship?type=${activeTab}`,
                payload: {
                    type: activeTab,
                    birthDate: profile.birthDate,
                    birthTime: profile.birthTime,
                    gender: profile.gender,
                    mbti: profile.mbti,
                    name: profile.name || '이용자',
                    sajuData,
                    targetName,
                    targetMbti,
                    targetBirthDate,
                    targetBirthTime,
                    targetGender,
                    targetSajuData,
                    separationDate,
                    separationReason,
                },
                customerName: profile.name || '비회원',
            });
            if (!res.success && res.error_msg) {
                setError(res.error_msg);
            }
        } catch (err: any) {
            setError(err?.message || '결제 요청 중 오류가 발생했습니다.');
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
            link.download = `연애사주_${activeTab}_${new Date().getTime()}.png`;
            link.href = image;
            link.click();
        } catch (err) {
            alert('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    const userName = profile.name || '이용자';
    const myMbti = profile.mbti || 'INFJ';
    const partnerMbti = targetMbti || 'ESTP';
    const targetDisplayName = targetName.trim() || userName;

    const cost = SERVICE_COSTS[getServiceKey(activeTab)];

    return (
        <div className="min-h-screen bg-slate-50/50 pb-32 pt-20">
            <div className="max-w-xl mx-auto px-4">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <button 
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-white rounded-full transition-colors border border-slate-100 bg-white/50"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 text-slate-700 rounded-full text-xs font-black shadow-sm">
                        <CreditCard className="w-4 h-4 text-rose-500" />
                        건당 {cost.toLocaleString()}원 · 비회원 이용
                    </div>
                </div>

                {/* Pill Tabs */}
                <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
                    {(['couple', 'married', 'marriage', 'reunion', 'crush'] as LoveSajuType[]).map((tab) => {
                        const labels = {
                            couple: '연인 궁합',
                            married: '부부 궁합',
                            marriage: '결혼 궁합',
                            reunion: '재회 사주',
                            crush: '짝사랑 사주'
                        };
                        return (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                disabled={isLoading}
                                className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === tab 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'
                                }`}
                            >
                                {labels[tab]}
                            </button>
                        );
                    })}
                </div>

                <div>
                    {!result && !isLoading ? (
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 text-center bg-gradient-to-br from-rose-50/30 to-slate-50/50">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-2xl shadow-sm mb-4 border border-rose-100">
                                    <Heart className="w-6 h-6 text-rose-500 fill-rose-500/10" />
                                </div>
                                <h1 className="text-xl font-black text-slate-900 mb-1.5">
                                    {activeTab === 'couple' && '연인 궁합'}
                                    {activeTab === 'married' && '부부 궁합'}
                                    {activeTab === 'marriage' && '결혼 궁합'}
                                    {activeTab === 'reunion' && '재회 사주'}
                                    {activeTab === 'crush' && '짝사랑 사주'}
                                </h1>
                                <p className="text-slate-400 text-xs font-medium">50년 경력의 명리학자가 분석하는 두 사람의 명리학적 인연 관계</p>
                            </div>

                            <div className="p-8">
                                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                                    {/* 본인 인적사항 입력 */}
                                    <GuestProfileCard
                                        profile={profile}
                                        onChange={updateProfile}
                                        showName
                                        title="나의 사주 · MBTI 정보"
                                    />

                                    <div className="h-[1px] bg-slate-100 my-2"></div>

                                    {/* 상대방 인적사항 입력 */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-rose-400" />
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">상대방 정보 입력</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">상대방 이름</label>
                                                <input
                                                    type="text"
                                                    value={targetName}
                                                    onChange={(e) => setTargetName(e.target.value)}
                                                    placeholder="이름 입력"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold placeholder-slate-300 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                                                    maxLength={10}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">상대방 성별</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setTargetGender('female')} 
                                                        className={`py-3.5 rounded-xl text-xs font-bold transition-colors ${targetGender === 'female' ? 'bg-slate-900 text-white shadow' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'}`}
                                                    >
                                                        여성
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setTargetGender('male')} 
                                                        className={`py-3.5 rounded-xl text-xs font-bold transition-colors ${targetGender === 'male' ? 'bg-slate-900 text-white shadow' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'}`}
                                                    >
                                                        남성
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">상대방 MBTI</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {MBTI_LIST.map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setTargetMbti(m)}
                                                        className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                                                            targetMbti === m
                                                                ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-100'
                                                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-rose-50/50 hover:text-rose-600'
                                                        }`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">상대방 생년월일</label>
                                                <input
                                                    type="date"
                                                    value={targetBirthDate}
                                                    onChange={(e) => setTargetBirthDate(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">태어난 시간 (선택)</label>
                                                <select
                                                    value={targetBirthTime}
                                                    onChange={(e) => setTargetBirthTime(e.target.value)}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-200 outline-none transition-all cursor-pointer"
                                                >
                                                    {BIRTH_TIME_SLOTS.map((slot) => (
                                                        <option key={slot.value} value={slot.value}>{slot.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* 재회 사주 전용 필드 */}
                                        {activeTab === 'reunion' && (
                                            <div className="space-y-4 p-5 bg-rose-50/20 border border-rose-100 rounded-2xl animate-fade-in mt-4">
                                                <h3 className="text-xs font-black text-rose-600 flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" /> 재회 전용 필수 정보
                                                </h3>
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-bold text-slate-500">이별 시기</label>
                                                    <input
                                                        type="month"
                                                        value={separationDate}
                                                        onChange={(e) => setSeparationDate(e.target.value)}
                                                        className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-bold text-slate-500">이별 사유</label>
                                                    <textarea
                                                        value={separationReason}
                                                        onChange={(e) => setSeparationReason(e.target.value)}
                                                        placeholder="성격 차이, 연락 소홀 등 구체적인 원인을 적어 주시면 훨씬 정확한 대운 분석이 이루어집니다."
                                                        className="w-full h-20 px-5 py-3 bg-white border border-slate-100 rounded-xl text-xs font-medium placeholder-slate-300 focus:ring-2 focus:ring-rose-200 outline-none resize-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-4 text-xs font-bold flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isPaying}
                                        className="w-full py-4.5 bg-slate-900 hover:bg-rose-600 text-white rounded-2xl font-black text-sm shadow hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Heart className="w-4 h-4 fill-current" />
                                        {isPaying ? '결제 창 여는 중...' : `궁합 분석 시작하기 (${cost.toLocaleString()}원 결제)`}
                                    </button>
                                    <p className="text-center text-[10px] text-slate-400 font-bold">결제 직후 현재 화면에서 바로 분석 결과를 확인하실 수 있습니다.</p>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 로딩 중 표시 */}
                            {isLoading && !result && (
                                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-12 flex flex-col justify-center items-center py-20 px-6 text-center">
                                    <div className="w-12 h-12 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                    <p className="text-slate-900 font-black text-base animate-pulse">명리학 학자의 혜안으로 인연의 끈을 대조하고 있습니다...</p>
                                </div>
                            )}

                            {/* 결과 표시 (Figma 연애 궁합 디자인 반영) */}
                            {result && (
                                <div className="space-y-4">
                                    <div 
                                        className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8 animate-fade-in text-left"
                                        ref={resultCardRef}
                                    >
                                        {/* 헤더 메인 타이틀 */}
                                        <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] text-center tracking-tight">
                                            {targetDisplayName}님과의 궁합
                                        </h2>

                                        {/* 궁합점수 게이지 */}
                                        <div className="flex flex-col items-center">
                                            <div className="relative w-36 h-36 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                                                    <circle 
                                                        cx="72" 
                                                        cy="72" 
                                                        r="60" 
                                                        stroke="#ffe4e6" 
                                                        strokeWidth="10" 
                                                        fill="transparent" 
                                                    />
                                                    <circle 
                                                        cx="72" 
                                                        cy="72" 
                                                        r="60" 
                                                        stroke="#f43f5e" 
                                                        strokeWidth="10" 
                                                        fill="transparent" 
                                                        strokeDasharray={377}
                                                        strokeDashoffset={377 - (377 * Math.min(100, Math.max(0, result.overallScore || 0))) / 100}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute flex flex-col items-center justify-center">
                                                    <span className="text-[32px] font-bold text-[#0f172a] leading-none">{result.overallScore || 0}</span>
                                                    <span className="text-[10px] font-bold text-[#f43f5e] mt-1.5 tracking-tight">궁합점수</span>
                                                </div>
                                            </div>
                                            {(result.verdict || result.analysisType) && (
                                                <p className="text-[18px] font-bold text-[#0f172a] text-center mt-5 tracking-tight px-4 break-keep">
                                                    {result.verdict || result.analysisType}
                                                </p>
                                            )}

                                            {/* 해시태그 키워드 */}
                                            {result.keywords && result.keywords.length > 0 && (
                                                <div className="flex justify-center gap-1.5 flex-wrap mt-4">
                                                    {result.keywords.filter((k): k is string => !!k).map((k: string, idx: number) => (
                                                        <span key={idx} className="px-3 py-1 bg-[#FFF1F2] border border-[#FFE4E6] rounded-full text-[10px] font-bold text-[#E11D48] shadow-sm">
                                                            #{k.replace(/^#/, '').trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* 인연 총평 */}
                                        {result.summary && (
                                            <div className="space-y-2 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">인연 총평</h3>
                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                    {result.summary}
                                                </p>
                                            </div>
                                        )}

                                        {/* 궁합 밸런스 (레이더 차트) */}
                                        {result.dimensions && result.dimensions.length > 0 && (
                                            <div className="space-y-3 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">궁합 밸런스</h3>
                                                <RadarChart data={result.dimensions as { label: string; value: number }[]} />
                                            </div>
                                        )}

                                        {/* 명리학 궁합 정밀 분석 */}
                                        {result.sajuCompatibility && (
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">명리학 궁합 정밀 분석</h3>
                                                <div className="space-y-4">
                                                    {result.sajuCompatibility.dayMasterRelation && (
                                                        <div className="space-y-1">
                                                            <h4 className="text-[16px] font-bold text-[#e11d48]">일간 합충 (日干 合沖)</h4>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                {result.sajuCompatibility.dayMasterRelation}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.sajuCompatibility.fiveElementHarmony && (
                                                        <div className="space-y-1">
                                                            <h4 className="text-[16px] font-bold text-[#e11d48]">오행 조화 (五行 調和)</h4>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                {result.sajuCompatibility.fiveElementHarmony}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.sajuCompatibility.specialStars && (
                                                        <div className="space-y-1">
                                                            <h4 className="text-[16px] font-bold text-[#e11d48]">특수 신살 및 기운 (神煞)</h4>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                {result.sajuCompatibility.specialStars}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.sajuCompatibility.hiddenConflicts && (
                                                        <div className="space-y-1">
                                                            <h4 className="text-[16px] font-bold text-[#e11d48]">내재된 잠재 갈등</h4>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                {result.sajuCompatibility.hiddenConflicts}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 인연의 시간적 변화 흐름 */}
                                        {result.timingForecast && (
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">인연의 시간적 변화 흐름</h3>
                                                <div className="space-y-4">
                                                    {((result.timingForecast as any)?.sixMonths || (result.timingForecast as any)?.threeMonths) && (
                                                        <div className="flex gap-3 items-start">
                                                            <div className="w-16 shrink-0 text-center py-1 px-2 rounded-md bg-[#FFF1F2] text-[#f43f5e] text-[10px] font-bold border border-[#FFE4E6]">
                                                                6개월 후
                                                            </div>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep flex-1">
                                                                {(result.timingForecast as any)?.sixMonths || (result.timingForecast as any)?.threeMonths}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.timingForecast.oneYear && (
                                                        <div className="flex gap-3 items-start">
                                                            <div className="w-16 shrink-0 text-center py-1 px-2 rounded-md bg-[#FFF1F2] text-[#f43f5e] text-[10px] font-bold border border-[#FFE4E6]">
                                                                1년 후
                                                            </div>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep flex-1">
                                                                {result.timingForecast.oneYear}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.timingForecast.threeYears && (
                                                        <div className="flex gap-3 items-start">
                                                            <div className="w-16 shrink-0 text-center py-1 px-2 rounded-md bg-[#FFF1F2] text-[#f43f5e] text-[10px] font-bold border border-[#FFE4E6]">
                                                                3년 후
                                                            </div>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep flex-1">
                                                                {result.timingForecast.threeYears}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* MBTI 관계 소통 매뉴얼 */}
                                        {result.mbtiStrategy && (
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">MBTI 관계 소통 매뉴얼</h3>
                                                <div className="space-y-3.5">
                                                    {result.mbtiStrategy.myApproach && (
                                                        <div className="space-y-1">
                                                            <h4 className="text-[14px] sm:text-[16px] font-bold text-[#e11d48]">
                                                                나의 관계 지향적 접근법 {myMbti ? `(${myMbti})` : ''}
                                                            </h4>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                {result.mbtiStrategy.myApproach}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {result.mbtiStrategy.partnerApproach && (
                                                        <>
                                                            <div className="border-b border-slate-200" />
                                                            <div className="space-y-1">
                                                                <h4 className="text-[14px] sm:text-[16px] font-bold text-[#e11d48]">
                                                                    상대를 끌어당기는 공략법 {partnerMbti ? `(${partnerMbti})` : ''}
                                                                </h4>
                                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                    {result.mbtiStrategy.partnerApproach}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {result.mbtiStrategy.conflictResolution && (
                                                        <>
                                                            <div className="border-b border-slate-200" />
                                                            <div className="space-y-1">
                                                                <h4 className="text-[14px] sm:text-[16px] font-bold text-[#e11d48]">
                                                                    갈등 임계점 해소법
                                                                </h4>
                                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                    {result.mbtiStrategy.conflictResolution}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 유형별 특화 섹션 */}
                                        {result.specialSection && (
                                            <div className="space-y-2 pt-2 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">
                                                    {activeTab === 'couple' && '러브 데이트 처방'}
                                                    {activeTab === 'married' && '장기 인생 & 자녀운 분석'}
                                                    {activeTab === 'marriage' && '성공적 결혼의 열쇠'}
                                                    {activeTab === 'reunion' && '재회 실현 가능성 진단'}
                                                    {activeTab === 'crush' && '마음 포착 솔루션'}
                                                </h3>
                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal bg-rose-50/20 border border-rose-100 p-4 rounded-2xl break-keep">
                                                    {result.specialSection}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 하단 제어 버튼 */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button 
                                            onClick={handleSaveImage}
                                            className="py-4 bg-slate-100 hover:bg-slate-200 text-[#0f172a] rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99]"
                                        >
                                            <Download className="w-4 h-4" /> 이미지 저장
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setError(null);
                                                navigate(0); // reload to reset
                                            }}
                                            className="py-4 bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99]"
                                        >
                                            다시 분석하기
                                        </button>
                                    </div>

                                    <FunnelBottomCta from={`relationship_${activeTab}_result`} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelationshipPage;
