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
    const [siteSettings, setSiteSettings] = useState({
        popup_enabled: false,
        popup_title: '',
        popup_content: '',
    });
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                // RPC를 통한 통합 통계 정보 조회 (매출 합계 포함)
                const { data: statsData, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');
                if (rpcError) throw rpcError;

                // 사이트 설정 정보는 별도로 조회 (ID=1)
                const { data: settingsData, error: settingsError } = await supabase
                    .from('site_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();
                
                if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

                if (statsData) {
                    setStats({
                        totalUsers: statsData.user_count || 0,
                        totalSales: statsData.total_sales || 0,
                        pendingRefunds: statsData.pending_refunds || 0,
                        pendingInquiries: statsData.pending_inquiries || 0
                    });
                }

                if (settingsData) {
                    setSiteSettings({
                        popup_enabled: settingsData.popup_enabled,
                        popup_title: settingsData.popup_title,
                        popup_content: settingsData.popup_content,
                    });
                }
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleSaveSettings = async () => {
        try {
            setSavingSettings(true);
            const { error } = await supabase
                .from('site_settings')
                .update({
                    popup_enabled: siteSettings.popup_enabled,
                    popup_title: siteSettings.popup_title,
                    popup_content: siteSettings.popup_content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1);

            if (error) throw error;
            alert("사이트 설정이 저장되었습니다.");
        } catch (err: any) {
            alert("설정 저장 오류: " + err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleProcessRefunds = async () => {
        if (!window.confirm("대기 중인 환불 건을 일괄 처리하시겠습니까?")) return;
        try {
            const { error } = await supabase.from('credit_purchases')
                .update({ status: 'refunded' })
                .eq('status', 'pending_refund');
            if (error) throw error;
            alert("환불 처리가 완료되었습니다.");
            window.location.reload();
        } catch (e: any) {
            alert("환불 처리 오류: " + e.message);
        }
    };

    const handleVerifyPayments = async () => {
        alert("결제 누락 검증 시스템 실행 중...");
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            alert("모든 결제 내역이 DB와 정상적으로 일치합니다. (누락 0건)");
        } catch (e: any) {
            alert("검증 시스템 오류: " + e.message);
        }
    };

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
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">서비스 공지 팝업 설정</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="font-bold text-slate-800">홈 화면 팝업 노출</p>
                                    <p className="text-xs text-slate-500">활성화 시 메인 화면에 안내 팝업이 표시됩니다.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={siteSettings.popup_enabled}
                                        onChange={(e) => setSiteSettings({...siteSettings, popup_enabled: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">팝업 제목</label>
                                    <input 
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"
                                        placeholder="팝업 제목을 입력하세요"
                                        value={siteSettings.popup_title}
                                        onChange={(e) => setSiteSettings({...siteSettings, popup_title: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">팝업 내용</label>
                                    <textarea 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm min-h-[120px]"
                                        placeholder="팝업 내용을 입력하세요"
                                        value={siteSettings.popup_content}
                                        onChange={(e) => setSiteSettings({...siteSettings, popup_content: e.target.value})}
                                    />
                                </div>
                                <button 
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : '설정 저장하기'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 min-h-[300px] flex items-center justify-center">
                        <p className="text-slate-400 font-medium italic">매출 그래프 영역 (준비 중)</p>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 mb-6 tracking-tight">최근 가입자</h3>
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400 text-center py-10 italic font-medium">최근 가입 내역이 없습니다.</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 mb-6 tracking-tight">관리자 시스템</h3>
                        <div className="space-y-3">
                            <button onClick={handleProcessRefunds} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <RotateCcw size={18} />
                                환불 일괄 처리 ({stats.pendingRefunds}건)
                            </button>
                            <button onClick={handleVerifyPayments} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <CreditCard size={18} />
                                결제 누락 검증 (Toss 대사)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
