import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Search,
    Download,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';

interface Payment {
    id: string;
    user_id: string;
    price_paid: number;
    purchased_credits: number;
    status: string;
    purchased_at: string;
    payment_id: string;
    profiles: {
        name: string;
        email: string;
    };
}

const PaymentManagement: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('credit_purchases')
                .select(`
          *,
          profiles:user_id (name, email)
        `)
                .order('purchased_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filteredPayments = payments.filter(p =>
        p.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.payment_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> 결제완료</span>;
            case 'pending_refund':
                return <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-fit"><Clock size={12} /> 환불요청</span>;
            case 'refunded':
                return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-fit"><AlertCircle size={12} /> 환불완료</span>;
            default:
                return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-black w-fit">{status}</span>;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">결제 관리</h2>
                    <p className="text-slate-500 font-medium">전체 결제 내역 및 매출 현황을 확인합니다.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="이름, 이메일, 주문번호 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-80 font-medium"
                        />
                    </div>
                    <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-slate-500">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">주문 정보</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">결제 금액</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">상품(크레딧)</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">상태</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">결제 일시</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">결제 내역이 없습니다.</td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-slate-800 font-bold">{p.profiles?.name || '탈퇴 사용자'}</div>
                                            <div className="text-xs text-slate-400">{p.profiles?.email || '-'}</div>
                                            <div className="text-[10px] text-slate-300 mt-1 font-mono">{p.payment_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-900 font-black">{p.price_paid?.toLocaleString()}원</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-indigo-600 font-black">{p.purchased_credits?.toLocaleString()} C</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(p.status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(p.purchased_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentManagement;
