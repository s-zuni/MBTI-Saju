import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Receipt, ShoppingCart, Clock, RefreshCw } from 'lucide-react';

import RefundRequestModal from '../components/RefundRequestModal';
import { SERVICE_NAMES, REFUND_PERIOD_DAYS } from '../config/creditConfig';
import type { CreditPurchase, CreditUsage } from '../hooks/useCredits';

interface UsageHistoryPageProps {
    onRequestRefund?: (purchaseId: string) => Promise<{ success: boolean; error?: string }>;
    currentCredits?: number;
}

const UsageHistoryPage: React.FC<UsageHistoryPageProps> = ({ onRequestRefund, currentCredits = 0 }) => {
    const [activeTab, setActiveTab] = useState<'purchases' | 'usages'>('purchases');
    const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
    const [usages, setUsages] = useState<CreditUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refundTarget, setRefundTarget] = useState<CreditPurchase | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            // 크레딧 구매 내역과 사용 내역을 병렬로 조회
            // 'purchased_at' 컬럼명이 맞는지 확인 필요 (보통 created_at일 수도 있음)
            const [purchaseRes, usageRes] = await Promise.all([
                supabase
                    .from('credit_purchases')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false }), // purchased_at 대신 created_at 시도 (안전빵)
                supabase
                    .from('credit_usages')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('used_at', { ascending: false }),
            ]);

            // purchased_at이 없는 경우 created_at을 대체값으로 사용하도록 매핑
            if (purchaseRes.data) {
                const mappedPurchases = purchaseRes.data.map((p: any) => ({
                    ...p,
                    purchased_at: p.purchased_at || p.created_at
                }));
                setPurchases(mappedPurchases as CreditPurchase[]);
            }
            if (usageRes.data) setUsages(usageRes.data as CreditUsage[]);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">사용 가능</span>;
            case 'pending_refund':
                return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">환불 대기</span>;
            case 'refunded':
                return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">환불 완료</span>;
            default:
                return null;
        }
    };

    const canRefund = (purchase: CreditPurchase): boolean => {
        if (purchase.status !== 'active') return false;
        if (purchase.remaining_credits !== purchase.purchased_credits) return false;
        const purchasedAt = new Date(purchase.purchased_at);
        const now = new Date();
        const daysSince = Math.floor((now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= REFUND_PERIOD_DAYS;
    };

    const getRefundDisabledReason = (purchase: CreditPurchase): string | null => {
        if (purchase.status === 'pending_refund') return '환불 심사 중입니다.';
        if (purchase.status === 'refunded') return '이미 환불된 구매건입니다.';
        if (purchase.remaining_credits !== purchase.purchased_credits) return '사용된 크레딧이 있어 환불 불가';
        const purchasedAt = new Date(purchase.purchased_at);
        const now = new Date();
        const daysSince = Math.floor((now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > REFUND_PERIOD_DAYS) return `구매 후 ${REFUND_PERIOD_DAYS}일 초과`;
        return null;
    };

    const getServiceName = (serviceType: string): string => {
        const upper = serviceType.toUpperCase() as keyof typeof SERVICE_NAMES;
        return SERVICE_NAMES[upper] || serviceType;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const handleRefundConfirm = async () => {
        if (!refundTarget || !onRequestRefund) return;
        const result = await onRequestRefund(refundTarget.id);
        if (result.success) {
            alert('환불 요청이 접수되었습니다. 관리자 승인 후 처리됩니다.');
            setRefundTarget(null);
            fetchData();
        } else {
            alert(result.error || '환불 요청에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-14 md:pt-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 pt-14 md:pt-20 animate-fade-in">


            {/* Header */}
            <div className="hidden md:block bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Receipt className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900">크레딧 사용 내역</h1>
                            </div>
                            <p className="text-slate-500 pl-11">구매 및 사용 내역을 확인하세요</p>
                        </div>
                        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-5 py-2.5 rounded-full font-bold">
                            보유: {currentCredits} 크레딧
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-4xl mx-auto px-4 mt-6">
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('purchases')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'purchases'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        구매 내역
                    </button>
                    <button
                        onClick={() => setActiveTab('usages')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'usages'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        사용 내역
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {activeTab === 'purchases' ? (
                    <div className="space-y-3">
                        {purchases.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">구매 내역이 없습니다.</p>
                            </div>
                        ) : (
                            purchases.map((purchase) => {
                                const disabledReason = getRefundDisabledReason(purchase);
                                const refundable = canRefund(purchase);

                                return (
                                    <div key={purchase.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-900">
                                                        {purchase.purchased_credits} 크레딧
                                                    </span>
                                                    {getStatusBadge(purchase.status)}
                                                </div>
                                                <p className="text-xs text-slate-400">{formatDate(purchase.purchased_at)}</p>
                                            </div>
                                            <span className="text-lg font-bold text-slate-900">
                                                ₩{purchase.price_paid.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Usage Progress */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>사용 현황</span>
                                                <span>{purchase.purchased_credits - purchase.remaining_credits}/{purchase.purchased_credits} 사용</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${purchase.status === 'refunded' ? 'bg-slate-300' :
                                                        purchase.status === 'pending_refund' ? 'bg-yellow-400' : 'bg-indigo-500'
                                                        }`}
                                                    style={{
                                                        width: `${((purchase.purchased_credits - purchase.remaining_credits) / purchase.purchased_credits) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Refund Button */}
                                        {purchase.status !== 'refunded' && (
                                            <div className="flex items-center justify-between">
                                                {disabledReason && !refundable ? (
                                                    <span className="text-xs text-slate-400">{disabledReason}</span>
                                                ) : <span />}
                                                <button
                                                    onClick={() => setRefundTarget(purchase)}
                                                    disabled={!refundable}
                                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${refundable
                                                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                                        : 'text-slate-400 bg-slate-50 cursor-not-allowed'
                                                        }`}
                                                >
                                                    환불 요청
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {usages.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">사용 내역이 없습니다.</p>
                            </div>
                        ) : (
                            usages.map((usage) => (
                                <div key={usage.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900">{getServiceName(usage.service_type)}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(usage.used_at)}</p>
                                    </div>
                                    <span className="text-red-500 font-bold text-sm">-{usage.credits_used} 크레딧</span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Refresh Button */}
                <div className="text-center mt-6">
                    <button
                        onClick={fetchData}
                        className="text-slate-400 hover:text-indigo-500 text-sm flex items-center gap-1 mx-auto transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Refund Modal */}
            <RefundRequestModal
                isOpen={!!refundTarget}
                purchase={refundTarget}
                onClose={() => setRefundTarget(null)}
                onConfirm={handleRefundConfirm}
            />
        </div>
    );
};

export default UsageHistoryPage;
