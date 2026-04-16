import React, { useEffect, useState } from 'react';
import { supabase, ensureValidSession } from '../../supabaseClient';
import {
    Plus,
    Edit3,
    Check,
    X,
    Loader2,
    Coins,
    CreditCard,
    Trash2
} from 'lucide-react';

interface PricingPlan {
    id: string;
    name: string;
    credits: number;
    price: number;
    original_price: number;
    description: string;
    is_popular: boolean;
    is_active: boolean;
    sort_order: number;
}

const PlanManagement: React.FC = () => {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<PricingPlan>>({
        id: '',
        name: '',
        credits: 0,
        price: 0,
        original_price: 0,
        description: '',
        is_popular: false,
        is_active: true,
        sort_order: 0
    });

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (err) {
            console.error('Error fetching plans:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSave = async () => {
        if (!formData.id || !formData.name) {
            alert('아이디와 명칭은 필수입니다.');
            return;
        }

        try {
            setLoading(true);

            // RLS 오류 방지: 세션 유효성 강제 확인
            const session = await ensureValidSession();
            if (!session) {
                alert('로그인이 만료되었습니다. 다시 로그인해 주세요.');
                return;
            }

            // 관리자 권한 확인 (DB profiles 테이블 직접 조회)
            const { data: profile, error: roleError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (roleError || profile?.role !== 'admin') {
                console.error('Permission denied:', roleError);
                alert(`관리자 권한이 없습니다. (현재 역할: ${profile?.role || '일반유저'})`);
                return;
            }

            const { error } = await supabase
                .from('pricing_plans')
                .upsert(formData);

            if (error) {
                console.error('RLS Error details:', error);
                throw error;
            }

            alert('요금제가 저장되었습니다.');
            setIsAdding(false);
            setEditingPlan(null);
            fetchPlans();
        } catch (err: any) {
            console.error('Save failed:', err);
            alert(`저장 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const session = await ensureValidSession();
            if (!session) {
                alert('세션이 만료되었습니다.');
                return;
            }

            // 관리자 권한 확인 (DB)
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profile?.role !== 'admin') {
                alert('관리자 권한이 필요합니다.');
                return;
            }

            const { error } = await supabase
                .from('pricing_plans')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchPlans();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`'${name}' 요금제를 정말 삭제하시겠습니까?`)) {
            return;
        }

        try {
            setLoading(true);
            const session = await ensureValidSession();
            if (!session) {
                alert('세션이 만료되었습니다.');
                return;
            }

            // 관리자 권한 확인
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profile?.role !== 'admin') {
                alert('관리자 권한이 필요합니다.');
                return;
            }

            const { error } = await supabase
                .from('pricing_plans')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            alert('요금제가 삭제되었습니다.');
            fetchPlans();
        } catch (err: any) {
            console.error('Delete failed:', err);
            alert(`삭제 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">요금제 관리</h2>
                    <p className="text-slate-500 font-medium">사용자에게 노출될 크레딧 상품을 구성합니다.</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({
                            id: '', name: '', credits: 100, price: 10000,
                            original_price: 15000, description: '',
                            is_popular: false, is_active: true, sort_order: plans.length
                        });
                        setIsAdding(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg shadow-slate-200"
                >
                    <Plus size={20} /> 새 요금제 추가
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && !isAdding && !editingPlan ? (
                    <div className="col-span-full py-20 text-center">
                        <Loader2 className="animate-spin text-slate-950 mx-auto" size={32} />
                    </div>
                ) : plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`bg-white p-8 rounded-3xl border ${plan.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'} shadow-sm relative group`}
                    >
                        {plan.is_popular && (
                            <span className="absolute -top-3 left-8 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-amber-200 uppercase tracking-widest">Popular</span>
                        )}

                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-950">
                                <Coins size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setFormData(plan);
                                        setEditingPlan(plan);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-all"
                                    title="수정"
                                >
                                    <Edit3 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id, plan.name)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    title="삭제"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-800 mb-1">{plan.name}</h3>
                        <p className="text-sm text-slate-400 font-medium mb-6 min-h-[40px]">{plan.description || '설명 없음'}</p>

                        <div className="space-y-3 mb-8">
                            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl">
                                <span className="text-xs font-bold text-slate-400">제공 크레딧</span>
                                <span className="font-black text-slate-950">{plan.credits?.toLocaleString()} C</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl">
                                <span className="text-xs font-bold text-slate-400">판매 가격</span>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-300 line-through font-bold">{plan.original_price?.toLocaleString()}원</div>
                                    <div className="font-black text-slate-800">{plan.price?.toLocaleString()}원</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => toggleActive(plan.id, plan.is_active)}
                            className={`w-full py-4 rounded-2xl font-black transition-all border-2 ${plan.is_active
                                ? 'border-slate-950 text-slate-950 hover:bg-slate-50 shadow-sm'
                                : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                                }`}
                        >
                            {plan.is_active ? '비활성화 하기' : '활성화 하기'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Editor Modal */}
            {(isAdding || editingPlan) && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">요금제 {isAdding ? '추가' : '수정'}</h3>
                                <p className="text-slate-400 font-medium mt-1">상세 정보를 입력해 주세요.</p>
                            </div>
                            <button
                                onClick={() => { setIsAdding(false); setEditingPlan(null); }}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">상품 ID (영문/숫자)</label>
                                <input
                                    type="text"
                                    disabled={!!editingPlan}
                                    value={formData.id}
                                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-bold text-slate-800 outline-none disabled:opacity-50"
                                    placeholder="starter_pack"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">상품 명칭</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-bold text-slate-800 outline-none"
                                    placeholder="스타터 패키지"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">제공 크레딧</label>
                                <div className="relative">
                                    <Coins className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        value={formData.credits}
                                        onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border-none pl-12 pr-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-black text-slate-800 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">정가 (원)</label>
                                <input
                                    type="number"
                                    value={formData.original_price}
                                    onChange={(e) => setFormData({ ...formData, original_price: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-bold text-slate-800 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">실제 판매가 (원)</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border-none pl-12 pr-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-black text-slate-800 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">노출 순서 (작을수록 앞)</label>
                                <input
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-bold text-slate-800 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-black text-slate-400 ml-1">상품 설명</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl focus:ring-2 focus:ring-slate-950 font-medium text-slate-600 outline-none min-h-[80px]"
                                    placeholder="상품에 대한 상세 설명을 입력하세요."
                                />
                            </div>
                            <div className="flex gap-6 mt-2 ml-1">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => setFormData({ ...formData, is_popular: !formData.is_popular })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.is_popular ? 'bg-slate-900' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_popular ? 'left-7' : 'left-1'}`} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">인기 상품 표시</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">즉시 활성 상태</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={() => { setIsAdding(false); setEditingPlan(null); }}
                                className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-5 bg-slate-950 text-white font-black rounded-3xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                            >
                                <Check size={24} />
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanManagement;
