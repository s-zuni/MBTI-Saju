import React, { useState, useEffect } from 'react';
import { X, Sparkles, Coins, Gift, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { requestPayment } from '../utils/paymentHandlers';
import { EVENT_CREDIT_PACKAGE } from '../config/creditConfig';

interface DeepReportEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: any;
}

const DeepReportEventModal: React.FC<DeepReportEventModalProps> = ({ isOpen, onClose, session }) => {
    const [loading, setLoading] = useState(false);
    const [alreadyClaimed, setAlreadyClaimed] = useState(false);
    const [checking, setChecking] = useState(true);

    // 이벤트 참여 여부 확인
    useEffect(() => {
        if (!isOpen || !session?.user?.id) {
            setChecking(false);
            return;
        }

        const checkClaim = async () => {
            setChecking(true);
            try {
                const { data, error } = await supabase
                    .from('event_claims')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .eq('event_type', EVENT_CREDIT_PACKAGE.eventType)
                    .maybeSingle();

                if (data && !error) {
                    setAlreadyClaimed(true);
                }
            } catch (e) {
                console.error('Event claim check error:', e);
            } finally {
                setChecking(false);
            }
        };

        checkClaim();
    }, [isOpen, session?.user?.id]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // 이미 참여했거나, 체크 중이면 표시하지 않음
    if (checking) return null;
    if (alreadyClaimed) {
        onClose();
        return null;
    }

    const handleEventPurchase = async () => {
        if (!session?.user?.id) {
            // Guest logic: Redirect to signup with event flag
            alert('이벤트 참여를 위해 먼저 간단한 회원가입이 필요합니다. 가입 후 자동으로 이벤트 페이지로 돌아옵니다.');
            window.location.href = '/?login=true&event_trigger=true';
            return;
        }

        setLoading(true);
        try {
            const orderId = `EVT500_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const customerKey = session.user.id.replace(/[^a-zA-Z0-9_\-:]/g, '').substring(0, 50);

            const response = await requestPayment({
                name: '🎁 심층 리포트 특별 이벤트 — 500크레딧',
                amount: EVENT_CREDIT_PACKAGE.price,
                orderId: orderId,
                customerKey: customerKey,
                customerEmail: session.user.email,
                customerName: session.user.user_metadata?.full_name || '이용자',
                metadata: {
                    productId: EVENT_CREDIT_PACKAGE.id,
                    eventType: EVENT_CREDIT_PACKAGE.eventType,
                },
            });

            if (!response.success && response.error_msg) {
                alert(`결제 오류: ${response.error_msg}`);
            }
            // Toss Payments 리다이렉트 방식이므로 성공 처리는 PaymentSuccess에서 수행
        } catch (err: any) {
            console.error('Event purchase error:', err);
            alert(err.message || '결제 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const discountPercent = Math.round((1 - EVENT_CREDIT_PACKAGE.price / EVENT_CREDIT_PACKAGE.originalPrice) * 100);

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>

                {/* Header with celebration */}
                <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 pt-8 text-white text-center overflow-hidden">
                    {/* Floating particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-3 left-6 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</div>
                        <div className="absolute top-5 right-8 text-xl animate-bounce" style={{ animationDelay: '0.5s' }}>✨</div>
                        <div className="absolute bottom-4 left-10 text-lg animate-bounce" style={{ animationDelay: '0.8s' }}>🎊</div>
                        <div className="absolute bottom-6 right-6 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>💎</div>
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Gift className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black mb-2">축하합니다! 🎁</h3>
                        <p className="text-violet-200 text-sm font-medium leading-relaxed">
                            심층 리포트 구매 고객님께만<br />드리는 <strong className="text-white">단 한 번의 특별 기회</strong>
                        </p>
                    </div>
                </div>

                {/* Offer details */}
                <div className="p-6 space-y-5">
                    {/* Price section */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Coins className="w-6 h-6 text-amber-500" />
                            <span className="text-2xl font-black text-slate-900">500 크레딧</span>
                        </div>

                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-slate-400 line-through text-sm font-bold">₩{EVENT_CREDIT_PACKAGE.originalPrice.toLocaleString()}</span>
                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">{discountPercent}% OFF</span>
                        </div>

                        <div className="text-3xl font-black text-violet-600">₩{EVENT_CREDIT_PACKAGE.price.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">크레딧당 단 {Math.round(EVENT_CREDIT_PACKAGE.price / EVENT_CREDIT_PACKAGE.credits)}원!</p>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2">
                        {[
                            '모든 운세 서비스 무제한 이용',
                            'AI 심층 상담 25회분 (100크레딧 가치)',
                            'MBTI & 사주 분석, 타로 등 전 서비스 이용',
                        ].map((text, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-xs font-medium text-slate-600">{text}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleEventPurchase}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-black text-base shadow-lg shadow-violet-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                {!session ? '가입하고 500크레딧 받기' : '9,900원에 500크레딧 받기'}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors"
                    >
                        다음에 할게요
                    </button>

                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                        ※ 본 이벤트는 1인 1회에 한해 적용됩니다.<br />
                        크레딧 유효기간: 결제일로부터 1년
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeepReportEventModal;
