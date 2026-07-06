import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    Loader2,
    Search,
    Download,
    Eye,
    Check,
    X,
    Filter,
    FileText
} from 'lucide-react';

interface OrderItem {
    id: string;
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
    selected_option?: string | null;
}

interface Order {
    id: string;
    order_number: string;
    total_amount: number;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_address: string | null;
    shipping_memo: string | null;
    payment_key: string | null;
    created_at: string;
    user: {
        email: string;
        name: string;
    } | null;
    items: OrderItem[];
}

const AdminShopOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    // Detail modal states
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'>('pending');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_orders')
                .select(`
                    *,
                    items:shop_order_items(*),
                    user:profiles!user_id (
                        email,
                        name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map user profiles safely (Supabase profiles join might return array or object depending on schema)
            const mappedOrders: Order[] = (data || []).map((order: any) => {
                const usr = Array.isArray(order.user) ? order.user[0] : order.user;
                return {
                    ...order,
                    user: usr ? {
                        email: usr.email || '',
                        name: usr.name || ''
                    } : null
                };
            });

            setOrders(mappedOrders);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders().catch(err => console.error(err));
    }, [fetchOrders]);

    const handleToggleSelectAll = () => {
        if (selectedOrderIds.size === filteredOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
        }
    };

    const handleToggleSelect = (id: string) => {
        const next = new Set(selectedOrderIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedOrderIds(next);
    };

    const handleOpenDetailModal = (order: Order) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setIsDetailModalOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        try {
            setUpdatingStatus(true);
            const { error } = await supabase
                .from('shop_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            // Update local state
            setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
            await fetchOrders();
            alert('주문 상태가 변경되었습니다.');
        } catch (err) {
            console.error('Error updating order status:', err);
            alert('상태 업데이트에 실패했습니다.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const exportToExcel = async (exportType: 'selected' | 'all') => {
        const ordersToExport = exportType === 'selected'
            ? orders.filter(o => selectedOrderIds.has(o.id))
            : orders;

        if (ordersToExport.length === 0) {
            alert('다운로드할 주문이 없습니다.');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('주문내역');

            worksheet.columns = [
                { header: '주문번호', key: 'order_number', width: 25 },
                { header: '고객 이메일', key: 'email', width: 25 },
                { header: '주문 일시', key: 'date', width: 20 },
                { header: '총 주문금액', key: 'total_amount', width: 15 },
                { header: '주문 상태', key: 'status', width: 12 },
                { header: '수령인', key: 'shipping_name', width: 15 },
                { header: '연락처', key: 'shipping_phone', width: 18 },
                { header: '배송 주소', key: 'shipping_address', width: 45 },
                { header: '배송 메모', key: 'shipping_memo', width: 30 },
                { header: '상품명', key: 'product_name', width: 30 },
                { header: '선택 옵션', key: 'selected_option', width: 20 },
                { header: '단가', key: 'product_price', width: 12 },
                { header: '수량', key: 'quantity', width: 8 },
                { header: '소계', key: 'subtotal', width: 12 }
            ];

            // Header styling
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4F46E5' } // Indigo color
            };

            ordersToExport.forEach(order => {
                const formattedDate = new Date(order.created_at).toLocaleString('ko-KR');
                const statusMap: Record<string, string> = {
                    pending: '결제대기',
                    paid: '결제완료',
                    shipped: '배송중',
                    delivered: '배송완료',
                    cancelled: '주문취소'
                };

                order.items.forEach(item => {
                    worksheet.addRow({
                        order_number: order.order_number,
                        email: order.user?.email || '',
                        date: formattedDate,
                        total_amount: order.total_amount,
                        status: statusMap[order.status] || order.status,
                        shipping_name: order.shipping_name || '',
                        shipping_phone: order.shipping_phone || '',
                        shipping_address: order.shipping_address || '',
                        shipping_memo: order.shipping_memo || '',
                        product_name: item.product_name,
                        selected_option: item.selected_option || '',
                        product_price: item.product_price,
                        quantity: item.quantity,
                        subtotal: item.subtotal
                    });
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            saveAs(new Blob([buffer]), `주문내역_${dateStr}.xlsx`);
        } catch (err) {
            console.error('Excel export error:', err);
            alert('엑셀 파일 생성 중 오류가 발생했습니다.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
            case 'paid': return 'bg-blue-50 text-blue-600 border border-blue-200';
            case 'shipped': return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
            case 'delivered': return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
            case 'cancelled': return 'bg-red-50 text-red-600 border border-red-200';
            default: return 'bg-slate-50 text-slate-600';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return '결제 대기';
            case 'paid': return '결제 완료';
            case 'shipped': return '배송중';
            case 'delivered': return '배송 완료';
            case 'cancelled': return '주문 취소';
            default: return status;
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch =
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.shipping_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <FileText className="text-violet-600" />
                            운세 주문 관리
                        </h1>
                        <p className="text-sm text-slate-500">고객들의 주문 내역 및 배송 상태를 처리합니다.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button
                            onClick={() => exportToExcel('selected')}
                            disabled={selectedOrderIds.size === 0}
                            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:hover:bg-white border border-slate-200 font-bold rounded-2xl flex items-center gap-2 transition-all text-xs"
                        >
                            <Download size={14} />
                            선택 주문 다운로드 ({selectedOrderIds.size})
                        </button>
                        <button
                            onClick={() => exportToExcel('all')}
                            className="px-4 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-slate-200 transition-all text-xs"
                        >
                            <Download size={14} />
                            전체 주문 다운로드
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="주문번호, 이메일, 수령인으로 검색..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-violet-500 font-semibold text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-bold text-sm bg-white"
                        >
                            <option value="all">전체 주문 상태</option>
                            <option value="pending">결제 대기</option>
                            <option value="paid">결제 완료</option>
                            <option value="shipped">배송중</option>
                            <option value="delivered">배송 완료</option>
                            <option value="cancelled">주문 취소</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-violet-600" size={32} />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold">주문 내역이 없습니다.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-4 px-6 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                                                onChange={handleToggleSelectAll}
                                                className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500"
                                            />
                                        </th>
                                        <th className="py-4 px-6">주문번호</th>
                                        <th className="py-4 px-6">고객 이메일</th>
                                        <th className="py-4 px-6">주문일시</th>
                                        <th className="py-4 px-6">총 결제금액</th>
                                        <th className="py-4 px-6 text-center">상태</th>
                                        <th className="py-4 px-6 text-right">상세</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrderIds.has(order.id)}
                                                    onChange={() => handleToggleSelect(order.id)}
                                                    className="w-4 h-4 rounded text-violet-600 border-slate-300 focus:ring-violet-500"
                                                />
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900">{order.order_number}</td>
                                            <td className="py-4 px-6 text-slate-500 font-semibold">{order.user?.email || '탈퇴 사용자'}</td>
                                            <td className="py-4 px-6 text-slate-500">
                                                {new Date(order.created_at).toLocaleString('ko-KR')}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-800">
                                                ₩{order.total_amount.toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleOpenDetailModal(order)}
                                                    className="p-2 bg-slate-50 hover:bg-violet-50 text-slate-600 hover:text-violet-600 rounded-xl transition-colors inline-flex"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {isDetailModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">주문 상세 내역</h3>
                                <p className="text-xs text-slate-400 mt-1">번호: {selectedOrder.order_number}</p>
                            </div>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                            {/* Status Change Section */}
                            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                <div>
                                    <span className="text-xs text-slate-400 font-bold block mb-1">상태 변경</span>
                                    <select
                                        value={newStatus}
                                        onChange={e => setNewStatus(e.target.value as any)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white text-sm"
                                    >
                                        <option value="pending">결제 대기 (Pending)</option>
                                        <option value="paid">결제 완료 (Paid)</option>
                                        <option value="shipped">배송중 (Shipped)</option>
                                        <option value="delivered">배송 완료 (Delivered)</option>
                                        <option value="cancelled">주문 취소 (Cancelled)</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={updatingStatus || selectedOrder.status === newStatus}
                                    className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-md shadow-violet-100 flex items-center justify-center gap-2 self-end sm:self-auto disabled:opacity-50"
                                >
                                    {updatingStatus ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                    업데이트 적용
                                </button>
                            </div>

                            {/* Shipping Info */}
                            {selectedOrder.shipping_name ? (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">배송지 정보</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                                        <p><span className="font-bold text-slate-400 mr-2">수령인:</span> {selectedOrder.shipping_name}</p>
                                        <p><span className="font-bold text-slate-400 mr-2">연락처:</span> {selectedOrder.shipping_phone}</p>
                                        <p className="sm:col-span-2"><span className="font-bold text-slate-400 mr-2">배송지 주소:</span> {selectedOrder.shipping_address}</p>
                                        {selectedOrder.shipping_memo && (
                                            <p className="sm:col-span-2"><span className="font-bold text-slate-400 mr-2">배송 요청사항:</span> {selectedOrder.shipping_memo}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">배송 정보</h4>
                                    <p className="text-slate-500 font-semibold italic">디지털 상품 주문으로 배송지가 필요 없습니다.</p>
                                </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">주문 상품 정보</h4>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-xs font-bold text-slate-400 border-b border-slate-100">
                                                <th className="py-3 px-4">상품명</th>
                                                <th className="py-3 px-4">선택 옵션</th>
                                                <th className="py-3 px-4 w-20 text-right">단가</th>
                                                <th className="py-3 px-4 w-16 text-center">수량</th>
                                                <th className="py-3 px-4 w-24 text-right">금액</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                                            {selectedOrder.items.map(item => (
                                                <tr key={item.id}>
                                                    <td className="py-3 px-4 font-bold text-slate-800">{item.product_name}</td>
                                                    <td className="py-3 px-4 text-slate-500 font-semibold">{item.selected_option || '-'}</td>
                                                    <td className="py-3 px-4 text-right">₩{item.product_price.toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                                                    <td className="py-3 px-4 text-right font-black text-slate-800">
                                                        ₩{item.subtotal.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-50/50 font-bold text-slate-800">
                                                <td colSpan={4} className="py-4 px-4 text-right font-bold text-sm">합계 금액</td>
                                                <td className="py-4 px-4 text-right font-black text-sm text-violet-600">
                                                    ₩{selectedOrder.total_amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminShopOrders;
