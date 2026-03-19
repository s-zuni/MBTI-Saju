import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Trash2, 
    Search, 
    Loader2, 
    ExternalLink,
    AlertCircle,
    Calendar,
    Plus,
    X,
    FileText
} from 'lucide-react';

interface Post {
    id: string;
    title: string;
    content: string;
    author_name: string;
    user_id: string;
    tag: string;
    likes: number;
    is_announcement: boolean;
    created_at: string;
}

const AdminCommunity: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState('전체');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const postsPerPage = 10;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', tag: '사주', is_announcement: false });

    const tags = ['전체', '사주', 'MBTI', '궁합', '기타'];
    const writeTags = ['사주', 'MBTI', '궁합', '기타'];

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('posts')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (activeTag !== '전체') {
                query = query.eq('tag', activeTag);
            }

            if (searchQuery) {
                query = query.ilike('title', `%${searchQuery}%`);
            }

            // Pagination
            const from = (currentPage - 1) * postsPerPage;
            const to = from + postsPerPage - 1;
            query = query.range(from, to);

            const { data, count, error } = await query;

            if (error) throw error;
            
            setPosts(data || []);
            setTotalPosts(count || 0);
        } catch (err: any) {
            console.error('Error fetching admin posts:', err);
            alert('게시글 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [activeTag, searchQuery, currentPage]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleCreatePost = async () => {
        if (!newPost.title || !newPost.content) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('인증된 사용자가 없습니다.');

            const { error } = await supabase
                .from('posts')
                .insert([{
                    title: newPost.title,
                    content: newPost.content,
                    tag: newPost.tag,
                    is_announcement: newPost.is_announcement,
                    user_id: user.id,
                    author_name: '관리자',
                    likes: 0
                }]);

            if (error) throw error;

            alert('게시글이 작성되었습니다.');
            setIsCreateModalOpen(false);
            setNewPost({ title: '', content: '', tag: '사주', is_announcement: false });
            fetchPosts();
        } catch (err: any) {
            alert('작성 실패: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!window.confirm('이 게시글을 정말로 삭제하시겠습니까? 관련 댓글도 모두 삭제될 수 있습니다.')) return;

        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            alert('게시글이 삭제되었습니다.');
            fetchPosts();
        } catch (err: any) {
            alert('삭제 실패: ' + err.message);
        }
    };

    const totalPages = Math.ceil(totalPosts / postsPerPage);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">커뮤니티 관리</h2>
                    <p className="text-slate-500 font-medium">사용자들이 작성한 게시글을 모니터링하고 관리합니다.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <Plus size={18} />
                        게시물 작성
                    </button>
                    <div className="text-right border-l border-slate-100 pl-4">
                        <span className="text-sm font-bold text-slate-400">전체 게시글</span>
                        <p className="text-xl font-black text-indigo-600">{totalPosts.toLocaleString()}개</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="제목으로 검색..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
                            />
                        </div>
                        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
                            {tags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        setActiveTag(tag);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        activeTag === tag
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">카테고리 / 날짜</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">제목 및 내용</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">작성자</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={32} />
                                        <p className="text-sm font-medium text-slate-400">데이터를 불러오는 중...</p>
                                    </td>
                                </tr>
                            ) : posts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <AlertCircle className="text-slate-200 mx-auto mb-2" size={48} />
                                        <p className="text-sm font-medium text-slate-400">게시글물이 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="block text-xs font-black text-indigo-600 mb-1">{post.tag || '일반'}</span>
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                                <Calendar size={10} />
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                                                {post.is_announcement && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-500 mr-2 border border-rose-100">
                                                        공지
                                                    </span>
                                                )}
                                                {post.title}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-400 line-clamp-1">{post.content}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                    {post.author_name?.[0] || '익'}
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{post.author_name || '익명'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => window.open(`/community?id=${post.id}`, '_blank')}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="게시글물 보기"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePost(post.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="삭제하기"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-6 border-t border-slate-50 flex justify-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                onClick={() => setCurrentPage(num)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                    currentPage === num
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Post Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">게시물 작성</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Community Post</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {writeTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setNewPost(prev => ({ ...prev, tag }))}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                newPost.tag === tag
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                                    <input 
                                        type="checkbox" 
                                        id="is_announcement"
                                        checked={newPost.is_announcement}
                                        onChange={(e) => setNewPost(prev => ({ ...prev, is_announcement: e.target.checked }))}
                                        className="w-4 h-4 text-rose-500 rounded border-slate-300 focus:ring-rose-500"
                                    />
                                    <label htmlFor="is_announcement" className="text-sm font-bold text-rose-600 cursor-pointer">
                                        공지사항으로 등록 (상단 고정 및 강조)
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">제목</label>
                                <input
                                    type="text"
                                    value={newPost.title}
                                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="게시물 제목을 입력하세요"
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[20px] text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">내용</label>
                                <textarea
                                    value={newPost.content}
                                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="게시물 내용을 입력하세요"
                                    rows={8}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-[20px] text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreatePost}
                                disabled={loading}
                                className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : '게시물 등록하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCommunity;
