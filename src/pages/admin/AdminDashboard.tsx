import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Users,
    CreditCard,
    RotateCcw,
    MessageSquare,
    TrendingUp,
    ArrowUpRight,
    Loader2
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSales: 0,
        pendingRefunds: 0,
        pendingInquiries: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                // Parallel fetching
                const [
                    { count: userCount },
                    { data: salesData },
                    { count: refundCount },
                    { count: inquiryCount }
                ] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('credit_purchases').select('price_paid').eq('status', 'active'),
                    supabase.from('credit_purchases').select('*', { count: 'exact', head: true }).eq('status', 'pending_refund'),
                    supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'pending')
                ]);

                const totalSales = salesData?.reduce((sum, item) => sum + (item.price_paid || 0), 0) || 0;

                setStats({
                    totalUsers: userCount || 0,
                    totalSales,
                    pendingRefunds: refundCount || 0,
                    pendingInquiries: inquiryCount || 0
                });
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    const statCards = [
        { name: '전체 회원', value: stats.totalUsers.toLocaleString() + '명', icon: <Users size={24} />, color: 'bg-blue-500', trend: '+12% 이번 달' },
        { name: '총 매출액', value: stats.totalSales.toLocaleString() + '원', icon: <CreditCard size={24} />, color: 'bg-emerald-500', trend: '+5% 이번 주' },
        { name: '환불 대기', value: stats.pendingRefunds.toLocaleString() + '건', icon: <RotateCcw size={24} />, color: 'bg-amber-500', trend: '집중 관리 필요' },
        { name: '미처리 문의', value: stats.pendingInquiries.toLocaleString() + '건', icon: <MessageSquare size={24} />, color: 'bg-purple-500', trend: '빠른 답변 권장' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">대시보드</h2>
                <p className="text-slate-500 font-medium">서비스 운영 현황을 한눈에 확인하세요.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`${card.color} text-white p-3 rounded-2xl shadow-lg`}>
                                {card.icon}
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1 group-hover:bg-slate-100 transition-colors">
                                상세보기 <ArrowUpRight size={12} />
                            </span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 mb-1">{card.name}</p>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{card.value}</h3>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <TrendingUp size={12} />
                            {card.trend}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 min-h-[400px] flex items-center justify-center">
                    <p className="text-slate-400 font-medium italic">매출 그래프 영역 (준비 중)</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 mb-6 tracking-tight">최근 가입자</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400 text-center py-10 italic font-medium">최근 가입 내역이 없습니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
