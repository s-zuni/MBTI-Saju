import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Heart, FileText, MessageSquare,
    ChevronDown, ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useModalStore } from '../hooks/useModalStore';
import { useCredits } from '../hooks/useCredits';
import { SERVICE_COSTS } from '../config/creditConfig';

type ActiveTab = 'saju' | 'fortune';

/* ─────────────────────────────────────────────────────────────────
   컴포넌트
───────────────────────────────────────────────────────────────── */
const FeatureGrids: React.FC = () => {
    const navigate      = useNavigate();
    const location      = useLocation();
    const { session }   = useAuth();
    const { openModal } = useModalStore();
    const { credits }   = useCredits(session);

    /* 아코디언 데이터 — navigate 클로저 활용 */
    const sajuAccordionItems = useMemo(() => [
        {
            id: 'wealth',
            icon: TrendingUp,
            label: '재물 사주',
            desc: '내 재물운과 사업 운세를 확인하세요',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-500',
            badge: 'HOT',
            badgeClass: 'bg-rose-50 text-rose-500',
            subItems: [
                { label: '내 재물운 보기',    ready: true, action: () => navigate('/gold?type=wealth') },
                { label: '창업 및 사업 사주', ready: true, action: () => navigate('/gold?type=business') },
                { label: '취직 사주',         ready: true, action: () => navigate('/gold?type=job') },
                { label: '이직 사주',         ready: true, action: () => navigate('/gold?type=jobchange') },
            ],
        },
        {
            id: 'love',
            icon: Heart,
            label: '연애 사주',
            desc: '사랑과 인연의 흐름을 사주로 풀어드려요',
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-500',
            badge: '인기',
            badgeClass: 'bg-violet-50 text-violet-500',
            subItems: [
                { label: '연인 궁합',   ready: true,  action: () => navigate('/relationship?type=couple') },
                { label: '부부 궁합',   ready: true,  action: () => navigate('/relationship?type=married') },
                { label: '결혼 궁합',   ready: true,  action: () => navigate('/relationship?type=marriage') },
                { label: '재회 사주',   ready: true,  action: () => navigate('/relationship?type=reunion') },
                { label: '짝사랑 사주', ready: true,  action: () => navigate('/relationship?type=crush') },
            ],
        },
    ], [navigate]);

    /* 운세 아이템 */
    const fortuneItems = [
        {
            img: '/assets/icons/3d_fortune.png',
            label: '오늘 / 내일의 운세',
            sub: '매일 갱신되는 나의 행운',
            bgColor: 'bg-amber-50',
            badge: '매일 갱신',
            wide: true,
            action: () => navigate('/today-fortune'),
        },
        {
            img: '/assets/icons/3d_tarot.png',
            label: '타로',
            sub: '카드로 보는 미래',
            bgColor: 'bg-violet-50',
            wide: false,
            action: () => { if (!session) openModal('analysis', 'login'); else navigate('/today-tarot'); },
        },
        {
            img: '/assets/icons/3d_trip.png',
            label: '여행',
            sub: '행운 여행지',
            bgColor: 'bg-sky-50',
            wide: false,
            action: () => navigate('/trip'),
        },
        {
            img: '/assets/icons/3d_healing.png',
            label: '자미두수',
            sub: '운명 분석',
            bgColor: 'bg-indigo-50',
            wide: false,
            action: () => navigate('/jamidusu'),
        },
        {
            img: '/assets/icons/3d_kbo.png',
            label: 'KBO 팬궁합',
            sub: '사주×야구',
            bgColor: 'bg-blue-50',
            wide: false,
            action: () => { if (!session) openModal('analysis', 'login'); else navigate('/kbo'); },
        },
    ];

    /* 탭 상태 — URL 파라미터 동기화 */
    const getTab = (s: string): ActiveTab =>
        new URLSearchParams(s).get('tab') === 'fortune' ? 'fortune' : 'saju';

    const [activeTab,     setActiveTab]     = useState<ActiveTab>(getTab(location.search));
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    useEffect(() => {
        setActiveTab(getTab(location.search));
        setOpenAccordion(null);
    }, [location.search]);

    const switchTab = (tab: ActiveTab) => {
        setActiveTab(tab);
        setOpenAccordion(null);
        navigate(`/?tab=${tab}`, { replace: true });
    };

    const handleChatClick = () => {
        if (!session) { openModal('analysis', 'login'); return; }
        credits >= SERVICE_COSTS.AI_CHAT_5
            ? navigate('/chat')
            : openModal('creditPurchase', undefined, { requiredCredits: SERVICE_COSTS.AI_CHAT_5 });
    };

    /* ── 공용 카드 그림자 ── */
    const cardShadow = { boxShadow: '0 1px 8px rgba(15,23,42,0.05), 0 0 1px rgba(15,23,42,0.04)' };

    /* ─────────────────────────────────────────────────────────── */
    return (
        <section className="bg-white">
            <div className="max-w-lg mx-auto px-4 pt-6 pb-8">

                {/* ── 섹션 헤더 ── */}
                <div className="mb-5">
                    <h2 className="text-[19px] font-black text-slate-900 tracking-tight leading-snug">
                        나의 운세 서비스
                    </h2>
                    <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                        사주와 운세로 당신의 운명을 탐색해보세요
                    </p>
                </div>

                {/* ── Pill 탭 스위처 (토스 스타일) ── */}
                <div className="flex gap-2 mb-5">
                    {([['saju', '사주'], ['fortune', '운세 보기']] as [ActiveTab, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => switchTab(key)}
                            className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-200 ${
                                activeTab === key
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════
                    [사주] 탭
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'saju' && (
                    <div className="space-y-3 animate-fade-in">

                        {/* 아코디언 카드 */}
                        {sajuAccordionItems.map((item) => {
                            const isOpen = openAccordion === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                                    style={cardShadow}
                                >
                                    {/* 헤더 */}
                                    <button
                                        onClick={() => setOpenAccordion(isOpen ? null : item.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50"
                                    >
                                        {/* 아이콘 */}
                                        <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                                            <item.icon className={`w-[18px] h-[18px] ${item.iconColor}`} strokeWidth={2.2} />
                                        </div>

                                        {/* 텍스트 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[15px] font-bold text-slate-900">{item.label}</span>
                                                <span className={`text-[10px] font-black px-1.5 py-[2px] rounded-md leading-none ${item.badgeClass}`}>
                                                    {item.badge}
                                                </span>
                                            </div>
                                            <p className="text-[12px] text-slate-400 font-medium mt-0.5 truncate">{item.desc}</p>
                                        </div>

                                        {/* 토글 화살표 */}
                                        <ChevronDown
                                            className={`w-[18px] h-[18px] text-slate-300 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-slate-500' : ''}`}
                                            strokeWidth={2.5}
                                        />
                                    </button>

                                    {/* 서브 메뉴 */}
                                    {isOpen && (
                                        <div className="border-t border-slate-100 bg-slate-50/40">
                                            {item.subItems.map((sub, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={sub.action}
                                                    className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors active:bg-white/80 ${
                                                        idx < item.subItems.length - 1
                                                            ? 'border-b border-slate-100/60'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-semibold text-slate-700">
                                                            {sub.label}
                                                        </span>
                                                        {sub.ready ? (
                                                            <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-[2px] rounded-md font-black leading-none">
                                                                바로 보기
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-[2px] rounded-md font-black leading-none">
                                                                준비 중
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ChevronRight
                                                        className="w-[15px] h-[15px] text-slate-300 flex-shrink-0"
                                                        strokeWidth={2.5}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* ── 대운세 리포트 CTA (딥 인디고 프리미엄) ── */}
                        <button
                            onClick={() => navigate('/premium')}
                            className="w-full rounded-2xl p-5 text-left group active:scale-[0.99] transition-transform"
                            style={{
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)',
                                boxShadow: '0 8px 28px rgba(55,48,163,0.25)',
                            }}
                        >
                            <div className="flex items-center gap-4">
                                {/* 아이콘 */}
                                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                    <FileText className="w-[18px] h-[18px] text-white" strokeWidth={2} />
                                </div>

                                {/* 텍스트 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">
                                            PREMIUM
                                        </span>
                                        <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-[2px] rounded font-black leading-none">
                                            50% OFF
                                        </span>
                                    </div>
                                    <h3 className="text-[15px] font-black text-white leading-snug">
                                        나의 대운세 리포트 받으러 가기
                                    </h3>
                                    <p className="text-[12px] text-indigo-300/80 mt-1 font-medium">
                                        A4 5~20장 분량 · 전문가 직접 분석
                                    </p>
                                </div>

                                <ChevronRight
                                    className="w-4 h-4 text-indigo-300/70 group-hover:translate-x-0.5 transition-transform flex-shrink-0"
                                    strokeWidth={2.5}
                                />
                            </div>
                        </button>

                        {/* ── 운명 심층 상담 CTA (클린 화이트) ── */}
                        <button
                            onClick={handleChatClick}
                            className="w-full bg-white rounded-2xl p-5 text-left group active:scale-[0.99] transition-transform border border-slate-100"
                            style={cardShadow}
                        >
                            <div className="flex items-center gap-4">
                                {/* 아이콘 */}
                                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-[18px] h-[18px] text-violet-500" strokeWidth={2} />
                                </div>

                                {/* 텍스트 */}
                                <div className="flex-1 min-w-0">
                                    <div className="mb-1">
                                        <span className="text-[10px] text-violet-400 font-black uppercase tracking-widest">
                                            AI 상담
                                        </span>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-slate-900">운명 심층 상담</h3>
                                    <p className="text-[12px] text-slate-400 mt-0.5 font-medium">
                                        AI 사주 전문가와 1:1 대화
                                    </p>
                                </div>

                                <ChevronRight
                                    className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                                    strokeWidth={2.5}
                                />
                            </div>
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    [운세 보기] 탭
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'fortune' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                            {fortuneItems.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={item.action}
                                    className={`group bg-white rounded-2xl border border-slate-100 overflow-hidden active:scale-[0.98] transition-all ${
                                        item.wide ? 'col-span-2' : ''
                                    }`}
                                    style={cardShadow}
                                >
                                    {item.wide ? (
                                        /* 넓은 카드 — 수평 레이아웃 */
                                        <div className="flex items-center gap-4 px-4 py-3.5">
                                            <div className={`w-[52px] h-[52px] rounded-2xl ${item.bgColor} flex items-center justify-center p-2.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                                <img
                                                    src={item.img}
                                                    alt={item.label}
                                                    className="w-full h-full object-contain drop-shadow"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-[15px] font-bold text-slate-900 leading-snug">{item.label}</p>
                                                <p className="text-[12px] text-slate-400 font-medium mt-0.5">{item.sub}</p>
                                            </div>
                                            {item.badge && (
                                                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg font-black flex-shrink-0 whitespace-nowrap">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        /* 좁은 카드 — 수직 레이아웃 */
                                        <div className="flex flex-col items-center gap-3 px-3 py-4 text-center">
                                            <div className={`w-[52px] h-[52px] rounded-2xl ${item.bgColor} flex items-center justify-center p-2.5 group-hover:scale-105 transition-transform duration-300`}>
                                                <img
                                                    src={item.img}
                                                    alt={item.label}
                                                    className="w-full h-full object-contain drop-shadow"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-slate-900 leading-snug">{item.label}</p>
                                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.sub}</p>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </section>
    );
};

export default FeatureGrids;
