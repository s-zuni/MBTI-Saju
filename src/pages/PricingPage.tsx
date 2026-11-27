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
            { title: '말랑 사주 메이트 궁합 (신규)', desc: '내 사주·MBTI와 찰떡인 9종 오리지널 캐릭터 & 피해야 할 상극 캐릭터 리포트', path: '/mate', icon: Sparkles },
        ],
    },
    {
        group: '무료 운세 · 만세력 프리뷰',
        price: SERVICE_COSTS.FORTUNE_TODAY,
        badge: '0원 (무료)',
        accent: 'border-emerald-300 bg-emerald-50/50 text-emerald-700',
        btnStyle: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        services: [
            { title: '오늘의 운세 (무료)', desc: '일간 기반의 오늘 운세와 데일리 미션·행운 컬러·숫자 무료 확인', path: '/myluck?type=today', icon: Sun },
            { title: '정통 만세력 4주 8자 & 사주 프리뷰', desc: '생년월일시·MBTI 기반 만세력 원국표 및 오행 분포 무료 분석', path: '/#free-preview', icon: Sparkles },
        ],
    },
    {
        group: '내일 운세 · 타로 · 테마 서비스',
        price: SERVICE_COSTS.FORTUNE_TOMORROW,
        badge: '건당 490원',
        accent: 'border-amber-300 bg-amber-50/40 text-amber-700',
        btnStyle: 'bg-slate-900 hover:bg-amber-600 text-white',
        services: [
            { title: '내일의 운세 미리보기', desc: '내일 하루의 행운 흐름과 핵심 미션·행운 코디 예보', path: '/myluck?type=today', icon: Sun },
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
                        회원가입 없이 · 필요한 만큼만 건별 결제
                    </div>
                    <h1 className="text-3xl font-black mb-3">서비스 이용 요금 안내</h1>
                    <p className="text-slate-300 text-sm md:text-base">
                        번거로운 회원가입 없이, 원하는 서비스에서 바로 입력하고 990원 / 490원으로 즉시 결과를 확인하세요.
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
                                {group.price === 0 ? '무료 (0원)' : `${group.price.toLocaleString()}원 / 1회`}
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
                                            {group.price === 0 ? '무료' : `${group.price.toLocaleString()}원`} &rarr;
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
                        결제 · 청약철회 제한 및 환불 안내
                    </h3>
                    <div className="space-y-3 text-sm text-slate-600 leading-relaxed font-medium">
                        <p>• <strong>단건 과금 방식</strong>: 별도의 구독이나 크레딧 선충전 없이, 선택한 서비스 1회 이용 요금(사주·자미두수 990원 / 운세·타로·여행·KBO·AI채팅 5회권 490원)만 결제됩니다.</p>
                        <p>• <strong>즉시 개시 디지털 콘텐츠 청약철회 제한</strong>: 결제 완료와 동시에 입력 정보에 맞춘 AI 결과 생성이 개시되므로 전자상거래법 제17조 제2항 제5호·제6호에 따라 단순 변심, 결과 불만족, 입력 정보 오기재, 브라우저 데이터 삭제로 인한 유실 시 환불이 불가합니다.</p>
                        <p>• <strong>서버 장애 미생성 시 환불</strong>: 이용자 귀책이 아닌 회사 서버·결제 시스템 장애로 결과가 전혀 생성되지 않은 경우에 한해 결제일로부터 7일 이내 주문번호(`orderId`)와 오류 화면을 고객센터로 접수하시면 확인 후 동일 결제수단으로 환불해 드립니다.</p>
                        <p>• <strong>기존 유료 크레딧 경과 안내</strong>: 정책 변경 전 유료 충전 후 미사용 크레딧 잔액이 남은 회원은 결제일로부터 1년 이내 고객센터를 통해 환불을 신청할 수 있습니다. (무상·이벤트 크레딧 제외)</p>
                        <p>• <strong>입력 정보 보관 책임</strong>: 비회원 입력 정보 및 결과는 현재 브라우저(`localStorage`)에만 임시 저장되므로 필요한 결과는 직접 저장(PDF/이미지)해 두시기 바랍니다.</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/terms')} className="text-slate-600 font-bold hover:underline">이용약관 전문 보기</button>
                            <button onClick={() => navigate('/privacy')} className="text-slate-600 font-bold hover:underline">개인정보처리방침</button>
                        </div>
                        <button onClick={() => navigate('/support')} className="text-slate-950 font-bold hover:underline">고객센터 바로가기 &rarr;</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
