import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ChevronLeft, Coins, Lock, Sparkles, TrendingUp, Briefcase, DollarSign } from 'lucide-react';
import html2canvas from 'html2canvas';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { goldSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';

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

const GoldPage: React.FC<{ session?: any }> = ({ session: propSession }) => {
    const { session: hookSession, loading: isAuthLoading } = useAuth();
    const session = propSession || hookSession;
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal } = useModalStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const resultCardRef = useRef<HTMLDivElement>(null);

    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<GoldType>((searchParams.get('type') as GoldType) || 'wealth');

    // Form states
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('female');
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

    useEffect(() => {
        if (session?.user?.user_metadata) {
            const metadata = session.user.user_metadata;
            if (metadata.birth_date) setBirthDate(metadata.birth_date);
            if (metadata.birth_time) setBirthTime(metadata.birth_time);
            if (metadata.gender === 'male' || metadata.gender === 'female') setGender(metadata.gender);
        }
    }, [session]);

    const getServiceKey = (tab: GoldType) => {
        switch (tab) {
            case 'wealth': return 'GOLD_WEALTH';
            case 'business': return 'GOLD_BUSINESS';
            case 'job': return 'GOLD_JOB';
            case 'jobchange': return 'GOLD_JOBCHANGE';
        }
    };

    const { object: result, submit, isLoading } = useObject({
        api: `/api/gold?type=${activeTab}`,
        schema: goldSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    const handleTabChange = (tab: GoldType) => {
        setActiveTab(tab);
        setSearchParams({ type: tab });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!birthDate) {
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
        const cost = SERVICE_COSTS[serviceKey];
        if (credits !== undefined && credits < cost) {
            openModal('creditPurchase', undefined, { requiredCredits: cost });
            return;
        }

        try {
            setError(null);
            const sajuData = calculateSaju(birthDate, birthTime);
            submit({
                type: activeTab,
                birthDate,
                birthTime,
                gender,
                mbti: session?.user?.user_metadata?.mbti || 'ENFP',
                name: session?.user?.user_metadata?.full_name || '이용자',
                sajuData,
                businessField,
                desiredCompany,
                desiredRole,
                currentJob,
                desiredJob
            });
            await consumeCredits(serviceKey);
        } catch (e: any) {
            setError(e.message);
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

    if (isAuthLoading) return null;
    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">로그인이 필요합니다</h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">재물 사주 분석 서비스를 이용하시려면 로그인이 필요합니다.</p>
                <button
                    onClick={() => {
                        navigate('/');
                        setTimeout(() => openModal('analysis', 'login'), 100);
                    }}
                    className="px-8 py-4.5 bg-slate-900 text-white rounded-full font-bold shadow hover:bg-amber-600 transition-colors"
                >
                    로그인하고 시작하기
                </button>
            </div>
        );
    }

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
                        <Coins className="w-4 h-4 text-amber-500" />
                        보유: {credits}크레딧
                    </div>
                </div>

                {/* Pill Tabs (토스 스타일) */}
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
                        {!result && !isLoading ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">성별</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setGender('female')} 
                                                className={`py-3.5 rounded-xl text-xs font-bold transition-colors ${gender === 'female' ? 'bg-slate-900 text-white shadow' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'}`}
                                            >
                                                여성
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setGender('male')} 
                                                className={`py-3.5 rounded-xl text-xs font-bold transition-colors ${gender === 'male' ? 'bg-slate-900 text-white shadow' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'}`}
                                            >
                                                남성
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">태어난 시간 (선택)</label>
                                        <select 
                                            value={birthTime} 
                                            onChange={(e) => setBirthTime(e.target.value)} 
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-200 outline-none transition-all cursor-pointer"
                                        >
                                            {BIRTH_TIME_SLOTS.map((slot) => (
                                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">생년월일</label>
                                    <input 
                                        type="date" 
                                        value={birthDate} 
                                        onChange={(e) => setBirthDate(e.target.value)} 
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-200 outline-none transition-all" 
                                    />
                                </div>

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
                                    className="w-full py-4.5 bg-slate-900 hover:bg-amber-600 text-white rounded-2xl font-black text-sm shadow hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    재물 사주 분석하기 ({cost} 크레딧)
                                </button>
                                <p className="text-center text-[10px] text-slate-400 font-bold">상담 결과는 마이페이지에 저장됩니다.</p>
                            </form>
                        ) : (
                            <div className="space-y-8" ref={resultCardRef}>
                                {/* 로딩 중 표시 */}
                                {isLoading && !result && (
                                    <div className="flex flex-col justify-center items-center py-20 px-6 text-center">
                                        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                        <p className="text-slate-900 font-black text-base animate-pulse">우주의 기운을 모아 재물그릇을 계산하고 있습니다...</p>
                                    </div>
                                )}

                                {/* 결과 표시 */}
                                {result && (
                                    <div className="space-y-8 animate-fade-in">
                                        {/* 종합 점수 */}
                                        <div className="flex flex-col items-center py-6 border-b border-slate-100">
                                            <div className="relative w-36 h-36 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="72" cy="72" r="64" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                                                    <circle cx="72" cy="72" r="64" stroke="#f59e0b" strokeWidth="8" fill="transparent" 
                                                        strokeDasharray={402}
                                                        strokeDashoffset={402 - (402 * (result.score || 0)) / 100}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-1000"
                                                    />
                                                </svg>
                                                <div className="absolute flex flex-col items-center">
                                                    <span className="text-3xl font-black text-slate-900">{result.score || 0}</span>
                                                    <span className="text-[10px] font-bold text-amber-500 tracking-wider">재물지수</span>
                                                </div>
                                            </div>
                                            <h2 className="text-lg font-black text-slate-900 mt-6 tracking-tight text-center leading-snug px-4">
                                                {result.verdict}
                                            </h2>
                                        </div>

                                        {/* 총평 ~ MBTI 조언 영역 분기 */}
                                        {result.mbtiSajuWealthReport ? (
                                            renderWealthReport(result.mbtiSajuWealthReport)
                                        ) : (
                                            <>
                                                {/* 총평 */}
                                                <div className="space-y-2">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">총평 및 재물 형세</h3>
                                                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium bg-slate-50/50 p-5 rounded-2xl border border-slate-100 break-keep">{result.overview}</p>
                                                </div>

                                                {/* 사주 명리 분석 */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">사주 명리학 분석</h3>
                                                    <div className="space-y-3">
                                                        <div className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50/30 transition-colors">
                                                            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                                                <DollarSign className="w-4 h-4 text-amber-500" /> 일간과 재성의 밸런스
                                                            </h4>
                                                            <p className="text-slate-600 text-xs leading-relaxed break-keep font-medium">{result.sajuAnalysis?.dayMasterWealth}</p>
                                                        </div>
                                                        <div className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50/30 transition-colors">
                                                            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                                                <Briefcase className="w-4 h-4 text-indigo-500" /> 재물 원국 구조 (격국)
                                                            </h4>
                                                            <p className="text-slate-600 text-xs leading-relaxed break-keep font-medium">{result.sajuAnalysis?.wealthStructure}</p>
                                                        </div>
                                                        <div className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50/30 transition-colors">
                                                            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                                                <Sparkles className="w-4 h-4 text-sky-500" /> 오행 균형과 재물 공급력
                                                            </h4>
                                                            <p className="text-slate-600 text-xs leading-relaxed break-keep font-medium">{result.sajuAnalysis?.elementBalance}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 시기 및 흐름 */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">재물 대운 / 세운 흐름</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-left">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">올해 (2026년)</span>
                                                            <p className="text-slate-600 text-xs leading-normal mt-1.5 font-medium break-keep">{result.timingAnalysis?.currentYear}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-left">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">내년 (2027년)</span>
                                                            <p className="text-slate-600 text-xs leading-normal mt-1.5 font-medium break-keep">{result.timingAnalysis?.nextYear}</p>
                                                        </div>
                                                        <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-2xl text-left col-span-2">
                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">재물 피크 시기</span>
                                                            <p className="text-slate-700 text-xs leading-normal mt-1.5 font-medium break-keep">{result.timingAnalysis?.peakPeriod}</p>
                                                        </div>
                                                        <div className="p-4 bg-rose-50/30 border border-rose-100 rounded-2xl text-left col-span-2">
                                                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">주의가 필요한 위험기</span>
                                                            <p className="text-slate-700 text-xs leading-normal mt-1.5 font-medium break-keep">{result.timingAnalysis?.cautionPeriod}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 맞춤 적합도 분석 (창업/취직/이직 시에만 제공) */}
                                                {(result.fieldAnalysis || result.comparison) && (
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">유형별 맞춤 분석</h3>
                                                        {result.fieldAnalysis && (
                                                            <div className="p-5 border border-slate-100 rounded-2xl">
                                                                <h4 className="text-xs font-bold text-slate-800 mb-2">분야 적합도 판정</h4>
                                                                <p className="text-slate-600 text-xs leading-relaxed break-keep font-medium">{result.fieldAnalysis}</p>
                                                            </div>
                                                        )}
                                                        {result.comparison && (
                                                            <div className="p-5 border border-amber-100 bg-amber-50/10 rounded-2xl">
                                                                <h4 className="text-xs font-bold text-amber-700 mb-2">현 직장 vs 이직 처 비교</h4>
                                                                <p className="text-slate-700 text-xs leading-relaxed break-keep font-medium">{result.comparison}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* MBTI 조언 */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">MBTI 기반 행동 처방전</h3>
                                                    <div className="p-5 bg-slate-900 text-slate-100 rounded-[24px] space-y-4 text-left">
                                                        <div>
                                                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">강점 발휘</span>
                                                            <p className="text-slate-200 text-xs leading-relaxed mt-1 font-medium break-keep">{result.mbtiAdvice?.strength}</p>
                                                        </div>
                                                        <div className="h-[1px] bg-slate-800"></div>
                                                        <div>
                                                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">약점 제어</span>
                                                            <p className="text-slate-200 text-xs leading-relaxed mt-1 font-medium break-keep">{result.mbtiAdvice?.weakness}</p>
                                                        </div>
                                                        <div className="h-[1px] bg-slate-800"></div>
                                                        <div>
                                                            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">실천 계획</span>
                                                            <p className="text-slate-200 text-xs leading-relaxed mt-1 font-medium break-keep">{result.mbtiAdvice?.actionPlan}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* 행운의 요소 */}
                                        {result.luckyElements && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">재물운 부스터</h3>
                                                <div className="flex gap-2 justify-center">
                                                    {result.luckyElements.filter((el): el is string => !!el).map((el: string, idx: number) => (
                                                        <span key={idx} className="flex-1 px-3 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs font-black text-slate-700">
                                                            {el}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 하단 제어 */}
                                        <div className="flex gap-3 pt-6 border-t border-slate-100">
                                            <button 
                                                onClick={handleSaveImage}
                                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Download className="w-4 h-4" /> 이미지 저장
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setError(null);
                                                    navigate(0); // reload to reset
                                                }}
                                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                다시 분석하기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoldPage;
