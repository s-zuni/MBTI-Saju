import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Trash2,
    Search,
    Loader2,
    AlertCircle,
    Plus,
    X,
    Star,
    ToggleLeft,
    ToggleRight,
    MessageSquare
} from 'lucide-react';
import { formatSafariDate } from '../../utils/textUtils';

interface Review {
    id: string;
    author_name: string;
    mbti: string;
    rating: number;
    service_tag: string;
    content: string;
    is_verified: boolean;
    created_at: string;
}

const AdminReviews: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeService, setActiveService] = useState('전체');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Form states
    const [authorName, setAuthorName] = useState('');
    const [mbti, setMbti] = useState('ENFP');
    const [rating, setRating] = useState<number>(5);
    const [serviceTag, setServiceTag] = useState('심층 사주 리포트');
    const [content, setContent] = useState('');
    const [isVerified, setIsVerified] = useState(true);
    const [saving, setSaving] = useState(false);

    const services = ['전체', '심층 사주 리포트', 'AI 사주 상담', '타로', '오늘의 운세', 'KBO 팬 궁합'];
    const writeServices = ['심층 사주 리포트', 'AI 사주 상담', '타로', '오늘의 운세', 'KBO 팬 궁합'];

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (activeService !== '전체') {
                query = query.eq('service_tag', activeService);
            }

            const { data, error } = await query;
            if (error) throw error;
            setReviews(data || []);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
    }, [activeService]);

    useEffect(() => {
        fetchReviews().catch(err => console.error(err));
    }, [fetchReviews]);

    const handleCreateReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authorName.trim() || !content.trim()) {
            alert('작성자와 내용을 모두 입력해 주세요.');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from('reviews')
                .insert({
                    author_name: authorName,
                    mbti,
                    rating,
                    service_tag: serviceTag,
                    content,
                    is_verified: isVerified
                });

            if (error) throw error;
            
            alert('리뷰가 등록되었습니다.');
            setIsCreateModalOpen(false);
            setAuthorName('');
            setContent('');
            setRating(5);
            setMbti('ENFP');
            await fetchReviews();
        } catch (err: any) {
            alert(`리뷰 등록 실패: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteReview = async (id: string) => {
        if (!window.confirm('이 리뷰를 정말 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchReviews();
        } catch (err: any) {
            alert(`삭제 실패: ${err.message}`);
        }
    };

    const handleToggleVerified = async (review: Review) => {
        try {
            const { error } = await supabase
                .from('reviews')
                .update({ is_verified: !review.is_verified })
                .eq('id', review.id);

            if (error) throw error;
            await fetchReviews();
        } catch (err: any) {
            console.error('Error toggling verify status:', err);
        }
    };

    const filteredReviews = reviews.filter(rev => 
        rev.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.mbti.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <MessageSquare className="text-violet-600" />
                            이용 후기 관리
                        </h1>
                        <p className="text-sm text-slate-500">사용자들이 남긴 실제 리뷰를 검토하고 구매 인증 상태를 관리합니다.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-violet-200 transition-all text-sm"
                    >
                        <Plus size={18} />
                        리뷰 직접 추가
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="작성자, MBTI, 리뷰 내용으로 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-violet-500 font-semibold text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={activeService}
                            onChange={e => setActiveService(e.target.value)}
                            className="px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-bold text-sm bg-white"
                        >
                            {services.map(srv => (
                                <option key={srv} value={srv}>{srv}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-violet-600" size={32} />
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                        <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold">검색된 이용 후기가 없습니다.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-4 px-6">등록일자</th>
                                        <th className="py-4 px-6">서비스명</th>
                                        <th className="py-4 px-6">작성자 / MBTI</th>
                                        <th className="py-4 px-6">만족도 별점</th>
                                        <th className="py-4 px-6 w-96">상세 후기 내용</th>
                                        <th className="py-4 px-6 text-center">구매 인증</th>
                                        <th className="py-4 px-6 text-right">삭제</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredReviews.map(review => (
                                        <tr key={review.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 text-slate-500">
                                                {new Date(formatSafariDate(review.created_at)).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 border border-slate-100">
                                                    {review.service_tag}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900">
                                                {review.author_name}
                                                <span className="ml-2 px-1.5 py-0.2 bg-violet-50 text-violet-600 rounded text-[10px] font-black">
                                                    {review.mbti}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1">
                                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                                    <span className="font-bold text-slate-800">{review.rating}점</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 font-medium">
                                                <p className="line-clamp-2 max-w-sm" title={review.content}>
                                                    {review.content}
                                                </p>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleToggleVerified(review)}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors inline-block"
                                                >
                                                    {review.is_verified ? (
                                                        <ToggleRight className="text-violet-600" size={32} />
                                                    ) : (
                                                        <ToggleLeft className="text-slate-300" size={32} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleDeleteReview(review.id)}
                                                    className="p-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl transition-colors inline-flex"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Create Review Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800">이용 후기 직접 작성</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateReview} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">이용한 서비스</label>
                                <select
                                    value={serviceTag}
                                    onChange={e => setServiceTag(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold bg-white text-sm"
                                >
                                    {writeServices.map(srv => (
                                        <option key={srv} value={srv}>{srv}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">작성자명 (ex: 홍*동)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="홍*동"
                                        value={authorName}
                                        onChange={e => setAuthorName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">MBTI</label>
                                    <select
                                        value={mbti}
                                        onChange={e => setMbti(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold bg-white text-sm"
                                    >
                                        {['ENFP', 'INFJ', 'INTJ', 'INFP', 'ENFJ', 'ENTJ', 'INTP', 'ENTP', 'ESFP', 'ISFP', 'ISTP', 'ESTP', 'ESFJ', 'ISFJ', 'ISTJ', 'ESTJ'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">만족도 별점</label>
                                    <select
                                        value={rating}
                                        onChange={e => setRating(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold bg-white text-sm"
                                    >
                                        <option value={5}>5.0점 (매우 만족)</option>
                                        <option value={4.5}>4.5점</option>
                                        <option value={4}>4.0점 (만족)</option>
                                        <option value={3.5}>3.5점</option>
                                        <option value={3}>3.0점 (보통)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-6 pl-4">
                                    <input
                                        type="checkbox"
                                        id="isVerifiedCheckbox"
                                        checked={isVerified}
                                        onChange={e => setIsVerified(e.target.checked)}
                                        className="w-5 h-5 rounded text-violet-600 border-slate-200 focus:ring-violet-500"
                                    />
                                    <label htmlFor="isVerifiedCheckbox" className="text-sm font-bold text-slate-600">
                                        구매 인증 표시
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">상세 리뷰 내용</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="상세한 후기 내용을 적어주세요."
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold text-sm resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    {saving && <Loader2 className="animate-spin" size={18} />}
                                    저장하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
