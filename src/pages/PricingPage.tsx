import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Zap, AlertCircle, CreditCard, Compass, Heart, TrendingUp, Sun, Layers, Briefcase } from 'lucide-react';
import { SERVICE_COSTS } from '../config/creditConfig';

interface PricingPageProps {
    onPurchaseSuccess?: (planId: string, pricePaid: number, credits: number, paymentId: string) => void;
    currentCredits?: number;
    session?: any;
}

const PAY_PER_SERVICE_ITEMS = [
    {
        group: '사주 · 자미두수 정밀 분석',
        price: SERVICE_COSTS.MBTI_SAJU,
        badge: '건당 990원',
        accent: 'border-violet-300 bg-violet-50/40 text-violet-700',
        btnStyle: 'bg-slate-950 hover:bg-violet-600 text-white',
        services: [
            { title: 'MBTI × 사주 통합 리포트', desc: '타고난 사주 오행과 MBTI 심리를 결합한 정밀 분석', path: '/?openService=mbtiSaju', icon: Sparkles },
            { title: '자미두수 12궁 명반 해설', desc: '재물·연애·직업궁 12궁 운명을 4대 화기로 정밀 해석', path: '/myluck?type=jamidusu', icon: Compass },
            { title: 'MBTI × 사주 심층 궁합', desc: '나와 상대방의 사주·MBTI 케미와 관계 전략 진단', path: '/?openService=compatibility', icon: Heart },
            { title: '연애 · 재회 · 결혼 사주', desc: '연인/부부/재회/짝사랑 맞춤 인연 풀이', path: '/relationship?type=couple', icon: Heart },
            { title: '재물 · 창업 · 취직 · 이직 사주', desc: '돈의 흐름과 커리어 타이밍을 짚어주는 재물 명리', path: '/gold?type=wealth', icon: TrendingUp },
        ],
    },
    {
        group: '운세 · 타로 · 테마 서비스',
        price: SERVICE_COSTS.FORTUNE_TODAY,
        badge: '건당 490원',
        accent: 'border-amber-300 bg-amber-50/40 text-amber-700',
        btnStyle: 'bg-slate-900 hover:bg-amber-600 text-white',
        services: [
            { title: '오늘 · 내일의 운세', desc: '일간 기반의 오늘/내일 운세와 행운 컬러·숫자', path: '/myluck?type=today', icon: Sun },
            { title: '신비한 셔플 타로', desc: '고민에 맞춰 뽑는 3장 스프레드 1:1 카드 리딩', path: '/myluck?type=tarot', icon: Layers },
            { title: '운명의 여행지 · 힐링 추천', desc: '내 사주와 성향에 기운을 보태는 맞춤 여행지', path: '/myluck?type=trip', icon: Compass },
            { title: 'KBO 프로야구 운세 궁합', desc: '내 사주로 보는 올해 응원 팀·선수 케미 분석', path: '/myluck?type=kbo', icon: Zap },
            { title: 'AI 사주 · 타로 실시간 채팅 (5회권)', desc: '궁금한 질문을 5번 연속 물어보는 실전 챗 상담', path: '/saju', icon: Briefcase },
        ],
    },
];

const PricingPage: React.FC<PricingPageProps> = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 pt-14 md:pt-20 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 text-white">
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-amber-300 text-xs font-black mb-4">
                        <CreditCard className="w-4 h-4" />
                        회원가입 ZERO · 필요한 만큼만 건별 결제
                    </div>
                    <h1 className="text-3xl font-black mb-3">서비스 이용 요금 안내</h1>
                    <p className="text-slate-300 text-sm md:text-base">
                        번거로운 가입이나 크레딧 충전 없이, 원하는 서비스에서 바로 입력하고 990원 / 490원으로 즉시 결과를 확인하세요.
                    </p>
                </div>
            </div>

            {/* Price Groups */}
            <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
                {PAY_PER_SERVICE_ITEMS.map((group) => (
                    <div key={group.group} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{group.group}</h2>
                                <p className="text-xs text-slate-500 mt-1">회원가입 없이 브라우저에서 입력 후 즉시 결제 · 결과 생성</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-sm font-black border ${group.accent}`}>
                                {group.price.toLocaleString()}원 / 1회
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {group.services.map((svc) => {
                                const Icon = svc.icon;
                                return (
                                    <button
                                        key={svc.title}
                                        type="button"
                                        onClick={() => navigate(svc.path)}
                                        className="text-left p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all flex items-start justify-between gap-3 group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-700 group-hover:text-violet-600">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-black text-sm text-slate-900">{svc.title}</div>
                                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">{svc.desc}</div>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black ${group.btnStyle}`}>
                                            {group.price.toLocaleString()}원 &rarr;
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Flow Section */}
            <div className="max-w-4xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-500" />
                        이용 방법 (3단계 완료)
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold mb-3">1</div>
                            <h4 className="font-bold text-slate-800 mb-1 text-sm">정보 입력 (가입 없음)</h4>
                            <p className="text-xs text-slate-500">생년월일·MBTI를 서비스 화면에서 바로 입력</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold mb-3">2</div>
                            <h4 className="font-bold text-slate-800 mb-1 text-sm">단건 간편 결제</h4>
                            <p className="text-xs text-slate-500">사주·자미두수 990원 / 나머지 490원 건별 결제</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl">
                            <div className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold mb-3">3</div>
                            <h4 className="font-bold text-slate-800 mb-1 text-sm">즉시 결과 생성</h4>
                            <p className="text-xs text-slate-500">결제 직후 원래 화면으로 돌아와 바로 분석 확인</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Policy Section */}
            <div className="max-w-4xl mx-auto px-4 pb-16">
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-slate-950" />
                        결제 및 환불 안내
                    </h3>
                    <div className="space-y-3 text-sm text-slate-600 leading-relaxed font-medium">
                        <p>• <strong>단건 과금 방식</strong>: 별도의 구독이나 크레딧 선충전 없이, 선택한 서비스 1회 이용 요금만 결제됩니다.</p>
                        <p>• <strong>오류 시 환불</strong>: 시스템 오류로 인해 분석 결과가 전혀 생성되지 않은 경우 고객센터 문의를 통해 동일 결제수단으로 환불 처리해 드립니다.</p>
                        <p>• <strong>입력 정보 보관</strong>: 비회원으로 입력하신 생년월일·MBTI 정보는 현재 브라우저에만 임시 저장되어 다른 서비스 이용 시 자동으로 불러와집니다.</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <p>이용 중 불편한 점이 있으시다면 언제든 고객센터로 문의해주세요.</p>
                        <button onClick={() => navigate('/support')} className="text-slate-950 font-bold hover:underline">고객센터 바로가기 &rarr;</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
