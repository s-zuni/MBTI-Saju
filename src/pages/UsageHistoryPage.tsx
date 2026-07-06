import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, RefreshCw, Receipt } from 'lucide-react';
import { SERVICE_NAMES } from '../config/creditConfig';
import { formatSafariDate } from '../utils/textUtils';

interface UsageHistoryPageProps {
    session: any;
}

const UsageHistoryPage: React.FC<UsageHistoryPageProps> = ({ session: initialSession }) => {
    const [activeTab, setActiveTab] = useState<'purchases' | 'usages' | 'orders'>('purchases');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ purchases: any[], usages: any[], orders: any[] }>({ purchases: [], usages: [], orders: [] });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 8500); // 8.5 seconds fallback

        try {
            // Safari ITP 대응: Props로 받은 세션보다 getSession()으로 가져온 최신 세션을 우선시합니다.
            const { data: { session: fetchedSession } } = await supabase.auth.getSession();
            const currentSession = fetchedSession || initialSession;
            const currentUserId = currentSession?.user?.id;

            if (!currentUserId) {
                console.warn('[UsageHistoryPage] 유저 ID를 찾을 수 없어 조회를 중단합니다.');
                setLoading(false);
                return;
            }

            // fetch with individual error handling for robustness
            const [pRes, uRes, oRes] = await Promise.all([
                supabase.from('credit_purchases')
                    .select('id, purchased_credits, price_paid, purchased_at, status, plan_id')
                    .eq('user_id', currentSession.user.id)
                    .order('purchased_at', { ascending: false }),
                supabase.from('credit_usages')
                    .select('id, service_type, used_at, credits_used')
                    .eq('user_id', currentSession.user.id)
                    .order('used_at', { ascending: false }),
                supabase.from('shop_orders')
                    .select(`
                        id,
                        order_number,
                        total_amount,
                        shipping_fee,
                        status,
                        created_at,
                        items:shop_order_items (
                            id,
                            product_name,
                            product_price,
                            quantity,
                            subtotal,
                            selected_option
                        )
                    `)
                    .eq('user_id', currentSession.user.id)
                    .order('created_at', { ascending: false })
            ]);

            setData({
                purchases: pRes.data || [],
                usages: uRes.data || [],
                orders: oRes.data || []
            });
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [initialSession]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (date: string) => {
        return new Date(formatSafariDate(date)).toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const getServiceName = (type: string) => {
        return SERVICE_NAMES[type.toUpperCase() as keyof typeof SERVICE_NAMES] || type;
    };

    // Re-use logic from previous version for badges and refund checks
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">사용 가능</span>;
            case 'pending_refund': return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">환불 대기</span>;
            case 'refunded': return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">환불 완료</span>;
            default: return null;
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-950 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-24 pt-14 md:pt-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center gap-3 mb-6">
                    <Receipt className="w-6 h-6 text-slate-950" />
                    <h1 className="text-2xl font-black text-slate-900">이용 내역</h1>
                </div>

                <div className="flex bg-white rounded-2xl p-1 mb-6 border border-slate-100 shadow-sm">
                    <button onClick={() => setActiveTab('purchases')} className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === 'purchases' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}>구매 내역</button>
                    <button onClick={() => setActiveTab('usages')} className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === 'usages' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}>사용 내역</button>
                    <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === 'orders' ? 'bg-slate-950 text-white' : 'text-slate-500'}`}>쇼핑 주문</button>
                </div>

                <div className="space-y-3">
                    {activeTab === 'purchases' ? (
                        data.purchases.length === 0 ? <p className="text-center py-20 text-slate-400 font-medium">구매 내역이 없습니다.</p> :
                        data.purchases.map(p => (
                            <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-900">
                                                {p.plan_id === 'deep_report' ? '운명 심층 분석 리포트' : `${p.purchased_credits} 크레딧`}
                                            </span>
                                            {getStatusBadge(p.status)}
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">{formatDate(p.purchased_at)}</p>
                                    </div>
                                    <span className="font-bold text-slate-900">₩{p.price_paid.toLocaleString()}</span>
                                </div>
                            </div>
                        ))
                    ) : activeTab === 'usages' ? (
                        data.usages.length === 0 ? <p className="text-center py-20 text-slate-400 font-medium">사용 내역이 없습니다.</p> :
                        data.usages.map(u => (
                            <div key={u.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-800">{getServiceName(u.service_type)}</p>
                                    <p className="text-xs text-slate-400 font-medium">{formatDate(u.used_at)}</p>
                                </div>
                                <span className="text-rose-500 font-bold">-{u.credits_used} 크레딧</span>
                            </div>
                        ))
                    ) : (
                        data.orders.length === 0 ? <p className="text-center py-20 text-slate-400 font-medium">쇼핑 주문 내역이 없습니다.</p> :
                        data.orders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">주문번호: {order.order_number}</p>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">{formatDate(order.created_at)}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        order.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                        order.status === 'paid' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                        order.status === 'shipped' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                        order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                        {
                                            order.status === 'pending' ? '결제 대기' :
                                            order.status === 'paid' ? '결제 완료' :
                                            order.status === 'shipped' ? '배송중' :
                                            order.status === 'delivered' ? '배송 완료' : '주문 취소'
                                        }
                                    </span>
                                </div>
                                <div className="space-y-2.5">
                                    {order.items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between text-xs font-semibold text-slate-600">
                                            <span>
                                                {item.product_name}
                                                {item.selected_option && <span className="text-[10px] text-slate-400 ml-1">({item.selected_option})</span>}
                                                <span className="text-slate-400 ml-1.5 font-bold">x{item.quantity}</span>
                                            </span>
                                            <span className="font-bold text-slate-800">₩{item.subtotal.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline text-xs font-bold text-slate-500">
                                    <span>배송비: ₩{(order.shipping_fee ?? 0).toLocaleString()}</span>
                                    <span className="text-sm font-black text-slate-900">
                                        총 결제금액: ₩{order.total_amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="text-center mt-8">
                    <button onClick={fetchData} className="text-slate-400 hover:text-slate-950 flex items-center gap-1 mx-auto transition-all text-sm font-bold">
                        <RefreshCw className="w-4 h-4" /> 새로고침
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UsageHistoryPage;
