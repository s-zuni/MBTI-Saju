import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ChevronLeft, CreditCard, TrendingUp } from 'lucide-react';
import html2canvas from 'html2canvas';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { goldSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import FunnelBottomCta from '../components/FunnelBottomCta';
import { buildServiceRequestHeaders, consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

type GoldType = 'wealth' | 'business' | 'job' | 'jobchange';

const renderWealthReport = (reportText: string) => {
    const parseReport = (text: string) => {
        if (!text) return [];
        const sections = text.split(/(?=###\s+\d+\.)/g);
        return sections.map(section => {
            const trimmed = section.trim();
            if (!trimmed) return null;
            const lines = trimmed.split('\n');
            const firstLine = lines[0];
            if (!firstLine) return null;
            const header = firstLine.replace(/###\s+\d+\.\s*/, '').trim();
            const content = lines.slice(1).join('\n').trim();
            return { header, content };
        }).filter((s): s is { header: string; content: string } => !!s && !!s.header && !!s.content);
    };

    const renderFormattedText = (rawText: string) => {
        return rawText
            .replace(/\*\*(.*?)\*\//g, '<strong>$1</strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .split('\n')
            .map((line, index) => {
                const isBullet = line.trim().startsWith('-');
                const content = isBullet ? line.trim().substring(1).trim() : line;
                
                if (isBullet) {
                    return (
                        <li key={index} className="list-none flex items-start gap-2 text-slate-700 text-xs sm:text-sm leading-relaxed mb-1.5 break-keep">
                            <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span dangerouslySetInnerHTML={{ __html: content }} />
                        </li>
                    );
                }
                return (
                    <p key={index} className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3.5 break-keep" dangerouslySetInnerHTML={{ __html: content }} />
                );
            });
    };

    const parsedSections = parseReport(reportText);

    if (parsedSections.length === 0) {
        return (
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center text-slate-400 text-xs font-bold">
                보고서를 분석하는 중입니다...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center py-4 border-b border-dashed border-amber-200">
                <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">
                    50년 명리 대가의 처방전
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">재물 운명 심층 팩폭 보고서</h3>
            </div>
            
            <div className="relative p-6 sm:p-8 bg-gradient-to-br from-amber-50/20 via-white to-orange-50/10 border-2 border-amber-200/50 rounded-[28px] shadow-sm space-y-6">
                <div className="absolute top-4 right-4 text-amber-500/10 font-serif text-6xl select-none font-bold">財</div>
                <div className="absolute bottom-4 left-4 text-amber-500/10 font-serif text-6xl select-none font-bold">運</div>

                {parsedSections.map((section, idx) => (
                    <div key={idx} className="relative space-y-2 z-10">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5.5 h-5.5 bg-amber-500 text-white rounded-lg text-[10px] font-black">
                                {idx + 1}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-950 tracking-tight">
                                {section.header}
                            </h4>
                        </div>
                        <div className="pl-6 border-l border-amber-200">
                            {renderFormattedText(section.content)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GoldPage: React.FC<{ session?: any }> = () => {
    const { profile, updateProfile } = useGuestProfile();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const resultCardRef = useRef<HTMLDivElement>(null);

    const [error, setError] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [pendingAutoPayload, setPendingAutoPayload] = useState<any>(null);
    const ticketCheckedRef = useRef(false);
    const [activeTab, setActiveTab] = useState<GoldType>((searchParams.get('type') as GoldType) || 'wealth');

    // Service-specific form states
    const [businessField, setBusinessField] = useState('');
    const [desiredCompany, setDesiredCompany] = useState('');
    const [desiredRole, setDesiredRole] = useState('');
    const [currentJob, setCurrentJob] = useState('');
    const [desiredJob, setDesiredJob] = useState('');

    useEffect(() => {
        const type = searchParams.get('type') as GoldType;
        if (type && ['wealth', 'business', 'job', 'jobchange'].includes(type)) {
            setActiveTab(type);
        }
    }, [searchParams]);

    const getServiceKey = (tab: GoldType) => {
        switch (tab) {
            case 'wealth': return 'GOLD_WEALTH' as const;
            case 'business': return 'GOLD_BUSINESS' as const;
            case 'job': return 'GOLD_JOB' as const;
            case 'jobchange': return 'GOLD_JOBCHANGE' as const;
        }
    };

    const getTabLabel = (tab: GoldType) => {
        switch (tab) {
            case 'wealth': return '재물운';
            case 'business': return '창업/사업';
            case 'job': return '취직운';
            case 'jobchange': return '이직운';
        }
    };

    const receiptTokenRef = useRef<string | null>(null);

    const { object: result, submit, isLoading } = useObject({
        api: `/api/gold?type=${activeTab}`,
        schema: goldSchema,
        headers: () => buildServiceRequestHeaders(receiptTokenRef.current),
        onFinish: ({ object, error: validationError }) => {
            if (!object) {
                console.error('[GoldPage] Result validation failed:', validationError);
                setError('재물 사주 분석 결과를 생성하지 못했습니다. 다시 시도해 주세요.');
            }
        },
        onError: (err) => {
            console.error('[GoldPage] Analysis failed:', err);
            setError('분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    });

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket(['GOLD_WEALTH', 'GOLD_BUSINESS', 'GOLD_JOB', 'GOLD_JOBCHANGE']);
        if (ticket?.payload) {
            receiptTokenRef.current = ticket.receiptToken || null;
            const p = ticket.payload;
            if (p.type && ['wealth', 'business', 'job', 'jobchange'].includes(p.type)) {
                setActiveTab(p.type);
            }
            if (p.businessField) setBusinessField(p.businessField);
            if (p.desiredCompany) setDesiredCompany(p.desiredCompany);
            if (p.desiredRole) setDesiredRole(p.desiredRole);
            if (p.currentJob) setCurrentJob(p.currentJob);
            if (p.desiredJob) setDesiredJob(p.desiredJob);
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

    const handleTabChange = (tab: GoldType) => {
        setActiveTab(tab);
        setSearchParams({ type: tab });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.birthDate) {
            alert('생년월일을 입력해주세요.');
            return;
        }

        if (activeTab === 'business' && !businessField.trim()) {
            alert('희망 창업/사업 분야를 입력해주세요.');
            return;
        }
        if (activeTab === 'job' && (!desiredCompany.trim() || !desiredRole.trim())) {
            alert('희망 회사와 직무를 입력해주세요.');
            return;
        }
        if (activeTab === 'jobchange' && (!currentJob.trim() || !desiredJob.trim())) {
            alert('현재 직무와 이직 희망 분야를 입력해주세요.');
            return;
        }

        const serviceKey = getServiceKey(activeTab);
        setIsPaying(true);
        try {
            setError(null);
            const sajuData = calculateSaju(profile.birthDate, profile.birthTime);
            const res = await startServicePayment({
                serviceType: serviceKey,
                serviceName: `재물 · 직장 사주 (${getTabLabel(activeTab)})`,
                returnPath: `/gold?type=${activeTab}`,
                payload: {
                    type: activeTab,
                    birthDate: profile.birthDate,
                    birthTime: profile.birthTime,
                    gender: profile.gender,
                    mbti: profile.mbti || 'ENFP',
                    name: profile.name || '이용자',
                    sajuData,
                    businessField,
                    desiredCompany,
                    desiredRole,
                    currentJob,
                    desiredJob,
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
            link.download = `재물사주_${activeTab}_${new Date().getTime()}.png`;
            link.href = image;
            link.click();
        } catch (err) {
            alert('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    const userName = profile.name || '이용자';
    const userMbti = profile.mbti || 'ESTJ';

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
                        <CreditCard className="w-4 h-4 text-amber-500" />
                        건당 {cost.toLocaleString()}원 · 비회원 이용
                    </div>
                </div>

                {/* Pill Tabs */}
                <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl mb-6">
                    {(['wealth', 'business', 'job', 'jobchange'] as GoldType[]).map((tab) => {
                        const labels = {
                            wealth: '재물운',
                            business: '창업/사업',
                            job: '취직',
                            jobchange: '이직'
                        };
                        return (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                disabled={isLoading}
                                className={`flex-1 py-3 px-1 rounded-xl text-xs font-bold transition-all ${
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
                            <div className="p-8 border-b border-slate-100 text-center bg-gradient-to-br from-amber-50/30 to-slate-50/50">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-2xl shadow-sm mb-4 border border-amber-100">
                                    <TrendingUp className="w-6 h-6 text-amber-500" />
                                </div>
                                <h1 className="text-xl font-black text-slate-900 mb-1.5">
                                    {activeTab === 'wealth' && '내 재물운 보기'}
                                    {activeTab === 'business' && '창업 및 사업 사주'}
                                    {activeTab === 'job' && '취직 사주'}
                                    {activeTab === 'jobchange' && '이직 사주'}
                                </h1>
                                <p className="text-slate-400 text-xs font-medium">50년 경력의 명리학자가 분석하는 차원이 다른 솔루션</p>
                            </div>

                            <div className="p-8">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <GuestProfileCard
                                        profile={profile}
                                        onChange={updateProfile}
                                        showName
                                        title="나의 사주 · MBTI 정보"
                                    />

                                    {/* 서비스 유형별 입력 폼 */}
                                    {activeTab === 'business' && (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">희망 창업/사업 분야</label>
                                            <textarea
                                                value={businessField}
                                                onChange={(e) => setBusinessField(e.target.value)}
                                                placeholder="예: 카페 창업, 온라인 쇼핑몰, IT 솔루션 개발 등 구체적으로 적어주세요."
                                                className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium placeholder-slate-300 focus:ring-2 focus:ring-amber-200 outline-none resize-none transition-all"
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'job' && (
                                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">희망 회사</label>
                                                <input
                                                    type="text"
                                                    value={desiredCompany}
                                                    onChange={(e) => setDesiredCompany(e.target.value)}
                                                    placeholder="예: 네이버, 삼성전자"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold placeholder-slate-300 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">희망 역할/직무</label>
                                                <input
                                                    type="text"
                                                    value={desiredRole}
                                                    onChange={(e) => setDesiredRole(e.target.value)}
                                                    placeholder="예: 프론트엔드 개발자"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold placeholder-slate-300 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'jobchange' && (
                                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">현재 직장/업무</label>
                                                <input
                                                    type="text"
                                                    value={currentJob}
                                                    onChange={(e) => setCurrentJob(e.target.value)}
                                                    placeholder="예: 기획팀 대리"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold placeholder-slate-300 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">이직 희망 직장/직무</label>
                                                <input
                                                    type="text"
                                                    value={desiredJob}
                                                    onChange={(e) => setDesiredJob(e.target.value)}
                                                    placeholder="예: 외국계 전략기획"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold placeholder-slate-300 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-4 text-xs font-bold">
                                            {error}
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isPaying}
                                        className="w-full py-4.5 bg-slate-900 hover:bg-amber-600 text-white rounded-2xl font-black text-sm shadow hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        {isPaying ? '결제 창 여는 중...' : `재물 사주 분석하기 (${cost.toLocaleString()}원 결제)`}
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
                                    <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                    <p className="text-slate-900 font-black text-base animate-pulse">우주의 기운을 모아 재물그릇을 계산하고 있습니다...</p>
                                </div>
                            )}

                            {/* 결과 표시 (Figma 디자인 완벽 반영) */}
                            {result && (
                                <div className="space-y-4">
                                    <div 
                                        className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8 animate-fade-in text-left"
                                        ref={resultCardRef}
                                    >
                                        {/* 헤더 타이틀 */}
                                        <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] text-center tracking-tight">
                                            {userName}님의 {activeTab === 'business' ? '창업·사업 사주' : activeTab === 'job' ? '취직 사주' : activeTab === 'jobchange' ? '이직 사주' : '재물 사주'} 분석
                                        </h2>

                                        {/* 재물지수 게이지 */}
                                        <div className="flex flex-col items-center">
                                            <div className="relative w-36 h-36 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                                                    <circle 
                                                        cx="72" 
                                                        cy="72" 
                                                        r="60" 
                                                        stroke="#fef3c7" 
                                                        strokeWidth="10" 
                                                        fill="transparent" 
                                                    />
                                                    <circle 
                                                        cx="72" 
                                                        cy="72" 
                                                        r="60" 
                                                        stroke="#f59e0b" 
                                                        strokeWidth="10" 
                                                        fill="transparent" 
                                                        strokeDasharray={377}
                                                        strokeDashoffset={377 - (377 * Math.min(100, Math.max(0, result.score || 0))) / 100}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute flex flex-col items-center justify-center">
                                                    <span className="text-[32px] font-bold text-[#0f172a] leading-none">{result.score || 0}</span>
                                                    <span className="text-[10px] font-bold text-[#f59e0b] mt-1.5 tracking-tight">재물지수</span>
                                                </div>
                                            </div>
                                            {(result.wealthType || result.verdict) && (
                                                <p className="text-[18px] font-bold text-[#0f172a] text-center mt-5 tracking-tight px-4 break-keep">
                                                    {result.wealthType || result.verdict}
                                                </p>
                                            )}
                                        </div>

                                        {/* 총평 및 재물 형세 */}
                                        {result.overview && (
                                            <div className="space-y-2 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">총평 및 재물 형세</h3>
                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                    {result.overview}
                                                </p>
                                            </div>
                                        )}

                                        {/* 사주 명리학 분석 */}
                                        {result.sajuAnalysis && (
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">사주 명리학 분석</h3>
                                                <div className="space-y-4">
                                                    {result.sajuAnalysis.dayMasterWealth && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
                                                                <h4 className="text-[16px] font-bold text-[#1e293b]">일간과 재성의 밸런스</h4>
                                                            </div>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep pl-4.5">
                                                                {result.sajuAnalysis.dayMasterWealth}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.sajuAnalysis.wealthStructure && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shrink-0" />
                                                                <h4 className="text-[16px] font-bold text-[#1e293b]">재물 원국 구조 (격국)</h4>
                                                            </div>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep pl-4.5">
                                                                {result.sajuAnalysis.wealthStructure}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {result.sajuAnalysis.elementBalance && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
                                                                <h4 className="text-[16px] font-bold text-[#1e293b]">오행 균형과 재물 공급력</h4>
                                                            </div>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep pl-4.5">
                                                                {result.sajuAnalysis.elementBalance}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 재물 대운 / 세운 흐름 */}
                                        {result.timingAnalysis && (
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">재물 대운 / 세운 흐름</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="text-[16px] font-bold text-[#003d91] whitespace-nowrap">올해 (2026년)</h4>
                                                            <div className="flex-1 h-[1px] bg-slate-300 mx-2 hidden sm:block"></div>
                                                        </div>
                                                        <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                            {result.timingAnalysis.currentYear}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-[16px] font-bold text-[#1500ff]">내년 (2027년)</h4>
                                                        <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                            {result.timingAnalysis.nextYear}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                                    <div className="space-y-1">
                                                        <h4 className="text-[16px] font-bold text-[#d97706]">재물 피크 시기</h4>
                                                        <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                            {result.timingAnalysis.peakPeriod}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-[16px] font-bold text-[#e11d48]">주의가 필요한 위험기</h4>
                                                        <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                            {result.timingAnalysis.cautionPeriod}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* MBTI 기반 행동 처방전 */}
                                        {result.mbtiAdvice && (
                                            <div className="space-y-4 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">MBTI 기반 행동 처방전</h3>
                                                <div className="space-y-3.5">
                                                    {result.mbtiAdvice.strength && (
                                                        <div className="space-y-1">
                                                            <h4 className="text-[16px] font-bold text-[#f59e0b]">
                                                                강점 발휘 {userMbti ? `(${userMbti})` : ''}
                                                            </h4>
                                                            <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                {result.mbtiAdvice.strength}
                                                            </p>
                                                        </div>
                                                    )}
                                                    
                                                    {result.mbtiAdvice.weakness && (
                                                        <>
                                                            <div className="border-b border-slate-200" />
                                                            <div className="space-y-1">
                                                                <h4 className="text-[16px] font-bold text-[#38bdf8]">약점 제어</h4>
                                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                    {result.mbtiAdvice.weakness}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {result.mbtiAdvice.actionPlan && (
                                                        <>
                                                            <div className="border-b border-slate-200" />
                                                            <div className="space-y-1">
                                                                <h4 className="text-[16px] font-bold text-[#a78bfa]">실천 계획</h4>
                                                                <p className="text-[12px] sm:text-[13px] text-black leading-relaxed font-normal break-keep">
                                                                    {result.mbtiAdvice.actionPlan}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 재물운 부스터 (행운의 요소) */}
                                        {result.luckyElements && result.luckyElements.length > 0 && (
                                            <div className="space-y-3 text-left">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">재물운 부스터 (행운의 요소)</h3>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {result.luckyElements.filter((el): el is string => !!el).map((el: string, idx: number) => (
                                                        <div 
                                                            key={idx} 
                                                            className="bg-[#f8fafc] border border-slate-200 rounded-xl py-3 px-2 text-center text-[11px] font-bold text-[#475569] flex items-center justify-center break-keep shadow-sm"
                                                        >
                                                            {el}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 맞춤 적합도 분석 (창업/취직/이직 시에만 제공) */}
                                        {(result.fieldAnalysis || result.comparison) && (
                                            <div className="space-y-4 text-left pt-2">
                                                <h3 className="text-[20px] font-bold text-black tracking-tight">유형별 맞춤 분석</h3>
                                                {result.fieldAnalysis && (
                                                    <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                                                        <h4 className="text-sm font-bold text-slate-800 mb-1.5">분야 적합도 판정</h4>
                                                        <p className="text-[12px] text-black leading-relaxed break-keep font-normal">{result.fieldAnalysis}</p>
                                                    </div>
                                                )}
                                                {result.comparison && (
                                                    <div className="p-4 border border-amber-200 bg-amber-50/20 rounded-2xl">
                                                        <h4 className="text-sm font-bold text-amber-800 mb-1.5">현 직장 vs 이직 처 비교</h4>
                                                        <p className="text-[12px] text-slate-800 leading-relaxed break-keep font-normal">{result.comparison}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 심층 보고서 */}
                                        {result.mbtiSajuWealthReport && (
                                            <div className="mt-8 text-left">
                                                {renderWealthReport(result.mbtiSajuWealthReport)}
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

                                    <FunnelBottomCta from={`gold_${activeTab}_result`} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoldPage;
