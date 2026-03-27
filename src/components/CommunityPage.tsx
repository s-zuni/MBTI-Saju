import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, PenSquare, X, Send, Search, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatSafariDate } from '../utils/textUtils';
// import { useNavigate } from 'react-router-dom';

interface Comment {
    id: string;
    content: string;
    author_name: string;
    user_id: string;
    created_at: string;
    parent_id: string | null;
    replies?: Comment[];
}

interface Post {
    id: string;
    title: string;
    content: string;
    author_name: string;
    user_id: string;
    tag: string;
    likes: number;
    created_at: string;
    is_announcement: boolean;
    comments_count?: number;
}

interface CommunityPageProps {
    session?: any;
}

const CommunityPage: React.FC<CommunityPageProps> = ({ session: initialSession }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(initialSession?.user || null);
    const [activeTag, setActiveTag] = useState('전체');
    const [searchQuery, setSearchQuery] = useState('');
    const [isPopularOnly, setIsPopularOnly] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const postsPerPage = 15;
    const maxPageButtons = 10;

    // Modal States
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment', id: string } | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // const navigate = useNavigate();

    const tags = ['전체', '사주', 'MBTI', '궁합', '기타'];

    const checkUser = React.useCallback(async () => {
        try {
            // Safari ITP 대응: 
            // Safari에서는 페이지 마운트 직후 전역 세션이 반영되지 않을 수 있으므로 명시적으로 세션을 가져옵니다.
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            // Props로 전달받은 세션보다 직접 가져온 세션을 우선 시도합니다.
            const validUser = currentSession?.user || initialSession?.user || null;
            setUser(validUser);
        } catch (err) {
            console.error('[CommunityPage] checkUser error:', err);
            setUser(initialSession?.user || null);
        }
    }, [initialSession]);

    const fetchPosts = React.useCallback(async () => {
        setLoading(true);
        try {
            // Safari 대응: 세션 상태 동기화를 시도하되, 최신 세션 데이터를 직접 변수에 할당하여 사용합니다.
            let currentUserId = null;
            try {
                const { data: { session: fetchedSession } } = await supabase.auth.getSession();
                currentUserId = fetchedSession?.user?.id || initialSession?.user?.id;
            } catch (authErr) {
                console.warn('[CommunityPage] Auth session check failed, proceeding as anon:', authErr);
                currentUserId = initialSession?.user?.id;
            }

            const fetchTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('게시글 불러오기 타임아웃 (15초)')), 15000)
            );

            let query = supabase
                .from('posts')
                .select('id, title, content, author_name, user_id, created_at, likes, tag, is_announcement', { count: 'exact' });

            // 필터링 적용
            if (activeTag !== '전체') {
                query = query.eq('tag', activeTag);
            }
            if (searchQuery) {
                query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
            }
            if (isPopularOnly) {
                query = query.order('likes', { ascending: false });
            }

            query = query
                .order('is_announcement', { ascending: false })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

            const { data, count, error } = await Promise.race([
                query,
                fetchTimeout
            ]) as any;

            if (error) throw error;
            
            setPosts(data || []);
            setTotalPosts(count || 0);
        } catch (err: any) {
            console.error('[CommunityPage] Error fetching posts:', err);
            // Safari 등에서 무한 로딩 방지: 에러 발생 시 사용자에게 빈 목록이라도 보여주어 스피너 제거
            setPosts(prev => prev.length === 0 ? [] : prev);
        } finally {
            setLoading(false);
        }
    }, [activeTag, searchQuery, isPopularOnly, currentPage]);

    useEffect(() => {
        fetchPosts();
        checkUser();
    }, [fetchPosts, checkUser]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to page 1 on new search
        fetchPosts();
    };

    const handleTagChange = (tag: string) => {
        setActiveTag(tag);
        setCurrentPage(1); // Reset to page 1 on new tag
    };

    const totalPages = Math.ceil(totalPosts / postsPerPage);
    const startPage = Math.floor((currentPage - 1) / maxPageButtons) * maxPageButtons + 1;
    const endPage = Math.min(startPage + maxPageButtons - 1, totalPages);

    const handleLike = async (e: React.MouseEvent, postId: string, currentLikes: number) => {
        e.stopPropagation(); // Prevent opening modal
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        // Optimistic update
        setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));

        const { error } = await supabase
            .from('posts')
            .update({ likes: currentLikes + 1 })
            .eq('id', postId);

        if (error) {
            console.error('Like error:', error);
            // Revert on error
            setPosts(posts.map(p => p.id === postId ? { ...p, likes: currentLikes } : p));
        }
    };

    const handleWriteClick = () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        setEditingPost(null);
        setIsWriteModalOpen(true);
    };

    const handleEditClick = (post: Post) => {
        setEditingPost(post);
        setSelectedPost(null);
        setIsWriteModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-20">
            <div className="max-w-2xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-6">커뮤니티</h1>

                    {/* Search & Write */}
                    <div className="flex gap-3 mb-6">
                        <form onSubmit={handleSearch} className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="관심있는 내용을 검색해보세요"
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        </form>
                        <button
                            onClick={handleWriteClick}
                            className="btn-primary px-6 py-3 font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 whitespace-nowrap"
                        >
                            <PenSquare className="w-5 h-5" /> 글쓰기
                        </button>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide">
                        {tags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleTagChange(tag)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTag === tag
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                        <div className="h-6 w-[1px] bg-slate-200 mx-2 shrink-0"></div>
                        <button
                            onClick={() => {
                                setIsPopularOnly(!isPopularOnly);
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${isPopularOnly
                                ? 'bg-rose-500 text-white shadow-md'
                                : 'bg-white text-rose-500 border border-rose-100 hover:bg-rose-50'
                                }`}
                        >
                            🔥 실시간 인기
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10">로딩 중...</div>
                ) : (
                    <div className="space-y-4">
                        {posts.length === 0 && (
                            <div className="text-center py-10 text-slate-500">아직 게시글이 없습니다. 첫 글을 작성해보세요!</div>
                        )}
                        {posts.map(post => (
                            <div
                                key={post.id}
                                onClick={() => setSelectedPost(post)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        {post.is_announcement && (
                                            <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-black tracking-tighter">공지</span>
                                        )}
                                        <span className={`${post.is_announcement ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} px-2.5 py-1 rounded-lg text-xs font-bold`}>
                                            {post.tag || '일반'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            {new Date(formatSafariDate(post.created_at)).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1">{post.title}</h3>
                                <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{post.content}</p>

                                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                                            {post.author_name?.[0] || '익'}
                                        </div>
                                        {post.author_name || '익명'}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => handleLike(e, post.id, post.likes)}
                                            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors group/like"
                                        >
                                            <ThumbsUp className="w-4 h-4 group-hover/like:fill-rose-500 group-hover/like:text-rose-500 transition-colors" />
                                            <span className="text-sm font-medium">{post.likes || 0}</span>
                                        </button>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <MessageSquare className="w-4 h-4" />
                                            <span className="text-sm font-medium">댓글</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8 pt-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, startPage - 1))}
                                    disabled={startPage === 1}
                                    className="px-3 py-1 text-sm font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-500"
                                >
                                    이전
                                </button>

                                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setCurrentPage(num)}
                                        className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${currentPage === num
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(endPage + 1)}
                                    disabled={endPage >= totalPages}
                                    className="px-3 py-1 text-sm font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-500"
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Write Modal */}
            {isWriteModalOpen && (
                <WriteModal
                    onClose={() => setIsWriteModalOpen(false)}
                    onSuccess={() => {
                        setIsWriteModalOpen(false);
                        fetchPosts();
                    }}
                    user={user}
                    postToEdit={editingPost}
                />
            )}

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    user={user}
                    onDelete={() => {
                        setSelectedPost(null);
                        fetchPosts();
                    }}
                    onEdit={() => handleEditClick(selectedPost)}
                    onReport={(type, id) => {
                        setReportTarget({ type, id });
                        setIsReportModalOpen(true);
                    }}
                />
            )}

            {/* Report Modal */}
            {isReportModalOpen && reportTarget && (
                <ReportModal
                    onClose={() => {
                        setIsReportModalOpen(false);
                        setReportTarget(null);
                    }}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    user={user}
                />
            )}
        </div>
    );
};

// --- Sub Components ---

const WriteModal = ({ onClose, onSuccess, user, postToEdit }: { onClose: () => void, onSuccess: () => void, user: any, postToEdit?: Post | null }) => {
    const [title, setTitle] = useState(postToEdit?.title || '');
    const [content, setContent] = useState(postToEdit?.content || '');
    const [tag, setTag] = useState(postToEdit?.tag || '사주');
    const [isAnnouncement, setIsAnnouncement] = useState(postToEdit?.is_announcement || false);
    const [loading, setLoading] = useState(false);

    const isAdmin = user?.user_metadata?.role === 'admin';

    // Keyboard Navigation for Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            // Enter key logic might conflict with textarea newlines, so maybe ctrl+enter?
            // For now only Esc to close.
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return;
        setLoading(true);

        const postData = {
            title,
            content,
            tag,
            user_id: user.id,
            author_name: user?.user_metadata?.nickname || user?.user_metadata?.full_name || '익명',
            is_announcement: isAnnouncement,
        };

        let result;

        if (postToEdit) {
            result = await supabase
                .from('posts')
                .update(postData)
                .eq('id', postToEdit.id);
        } else {
            result = await supabase
                .from('posts')
                .insert(postData);
        }

        const { error } = result;

        setLoading(false);
        if (error) {
            alert('글 작성 실패: ' + error.message);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{postToEdit ? '글 수정하기' : '글쓰기'}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <select
                            className="input-field w-1/3"
                            value={tag}
                            onChange={e => setTag(e.target.value)}
                        >
                            <option>사주</option>
                            <option>MBTI</option>
                            <option>궁합</option>
                            <option>기타</option>
                        </select>
                        <input
                            type="text"
                            className="input-field w-full"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <textarea
                        className="input-field h-40 resize-none"
                        placeholder="내용을 입력하세요"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    ></textarea>

                    {isAdmin && (
                        <div className="flex items-center gap-2 p-1">
                            <input
                                type="checkbox"
                                id="is_announcement"
                                checked={isAnnouncement}
                                onChange={e => setIsAnnouncement(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="is_announcement" className="text-sm font-bold text-slate-700 cursor-pointer">
                                공지사항으로 등록하기
                            </label>
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary w-full py-3"
                    >
                        {loading ? '처리 중...' : (postToEdit ? '수정하기' : '등록하기')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PostDetailModal = ({ post, onClose, user, onDelete, onEdit, onReport }: { post: Post, onClose: () => void, user: any, onDelete?: () => void, onEdit?: () => void, onReport: (type: 'post' | 'comment', id: string) => void }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null); // ID of comment being replied to
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchComments();
        // Keyboard Nav
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            if (data) setComments(data);
        } catch (err) {
            console.error('[CommunityPage] fetchComments error:', err);
        } finally {
            // No global loading here, but could add local comment loading if needed
        }
    };

    const handleCommentSubmit = async () => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }
        if (!newComment.trim()) return;

        setLoading(true);
        const { error } = await supabase.from('comments').insert({
            post_id: post.id,
            user_id: user.id,
            author_name: user?.user_metadata?.nickname || user?.user_metadata?.full_name || '익명',
            content: newComment,
            parent_id: replyTo
        });

        if (error) {
            alert('댓글 실패: ' + error.message);
        } else {
            setNewComment('');
            setReplyTo(null);
            fetchComments();
        }
        setLoading(false);
    };

    // Helper to get replies
    const getReplies = (commentId: string) => comments.filter(c => c.parent_id === commentId);
    const rootComments = comments.filter(c => !c.parent_id);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col animate-fade-up overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-start bg-slate-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white text-slate-600 border px-2 py-0.5 rounded text-xs font-bold">{post.tag}</span>
                            <span className="text-xs text-slate-400">{new Date(formatSafariDate(post.created_at)).toLocaleString()}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-slate-500">작성자: {post.author_name}</p>
                            {user && (user.id === post.user_id || user.user_metadata?.role === 'admin') && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm('정말 삭제하시겠습니까? (관리자 권한 포함)')) return;
                                            const { error } = await supabase.from('posts').delete().eq('id', post.id);
                                            if (error) alert('삭제 실패: ' + error.message);
                                            else {
                                                alert('게시글물이 삭제되었습니다.');
                                                onClose();
                                                onDelete?.();
                                            }
                                        }}
                                        className="text-xs text-rose-500 hover:underline flex items-center gap-0.5"
                                    >
                                        <Trash2 className="w-3 h-3" /> 삭제
                                    </button>
                                    {user.id === post.user_id && (
                                        <button
                                            onClick={onEdit}
                                            className="text-xs text-slate-500 hover:underline flex items-center gap-0.5"
                                        >
                                            <Edit2 className="w-3 h-3" /> 수정
                                        </button>
                                    )}
                                    {user && user.id !== post.user_id && (
                                        <button
                                            onClick={() => onReport('post', post.id)}
                                            className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-0.5 ml-1"
                                        >
                                            <AlertTriangle className="w-3 h-3" /> 신고
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed mb-8 min-h-[100px]">{post.content}</p>

                    <div className="border-t pt-6">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> 댓글 {comments.length}
                        </h4>

                        <div className="space-y-4">
                            {rootComments.map(comment => (
                                <div key={comment.id} className="text-sm">
                                    <div className="bg-slate-50 p-3 rounded-xl">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-700">{comment.author_name}</span>
                                            <span className="text-xs text-slate-400">{new Date(formatSafariDate(comment.created_at)).toLocaleTimeString().slice(0, 5)}</span>
                                        </div>
                                        <p className="text-slate-600">{comment.content}</p>
                                        <div className="flex gap-2 mt-1">
                                            <button
                                                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                                                className="text-xs text-indigo-500 hover:underline font-medium"
                                            >
                                                답글 달기
                                            </button>
                                            {user && user.id !== comment.user_id && (
                                                <button
                                                    onClick={() => onReport('comment', comment.id)}
                                                    className="text-xs text-slate-400 hover:text-rose-500 font-medium"
                                                >
                                                    신고
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    <div className="pl-4 mt-2 space-y-2 border-l-2 border-slate-100 ml-2">
                                        {getReplies(comment.id).map(reply => (
                                            <div key={reply.id} className="bg-slate-50/50 p-2 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-600 text-xs">{reply.author_name}</span>
                                                    {user && user.id !== reply.user_id && (
                                                        <button
                                                            onClick={() => onReport('comment', reply.id)}
                                                            className="text-[10px] text-slate-400 hover:text-rose-500"
                                                        >
                                                            신고
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-slate-500 text-xs">{reply.content}</p>
                                            </div>
                                        ))}
                                        {/* Reply Input */}
                                        {replyTo === comment.id && (
                                            <div className="flex gap-2 mt-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                                                    placeholder="답글 입력..."
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                                                />
                                                <button onClick={handleCommentSubmit} disabled={loading} className="text-indigo-600 font-bold text-xs">등록</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Input */}
                <div className="p-4 border-t bg-white">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-slate-100 border-none rounded-full px-5 py-3 pr-12 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
                            placeholder={user ? "댓글을 입력하세요..." : "로그인이 필요합니다"}
                            disabled={!user}
                            value={replyTo ? '' : newComment} // Clear main input if replying 
                            onChange={e => {
                                if (!replyTo) setNewComment(e.target.value);
                            }}
                            onKeyDown={e => !replyTo && e.key === 'Enter' && handleCommentSubmit()}
                        />
                        <button
                            onClick={() => !replyTo && handleCommentSubmit()}
                            disabled={loading || !user}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700 transition-colors disabled:bg-slate-300"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </div>
                    {replyTo && <p className="text-xs text-center text-slate-400 mt-2">답글 작성 중...</p>}
                </div>
            </div>
        </div>
    );
};

const ReportModal = ({ onClose, targetType, targetId, user }: { onClose: () => void, targetType: 'post' | 'comment', targetId: string, user: any }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const reasons = [
        '부적절한 홍보 게시물',
        '음란물 또는 자극적인 내용',
        '욕설, 비하, 차별적 발언',
        '개인정보 노출',
        '기타'
    ];

    const handleSubmit = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        if (!reason.trim()) {
            alert('신고 사유를 선택하거나 입력해주세요.');
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('community_reports')
            .insert({
                reporter_id: user.id,
                post_id: targetType === 'post' ? targetId : null,
                comment_id: targetType === 'comment' ? targetId : null,
                reason,
                status: 'pending'
            });

        if (error) {
            alert('신고 제출 실패: ' + error.message);
        } else {
            alert('신고가 접수되었습니다. 관리자 확인 후 조치하겠습니다.');
            onClose();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-fade-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-rose-600">
                        <AlertTriangle className="w-5 h-5" /> {targetType === 'post' ? '게시물' : '댓글'} 신고
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                
                <div className="space-y-3">
                    <p className="text-sm text-slate-500 mb-2">신고 사유를 선택해주세요.</p>
                    <div className="grid grid-cols-1 gap-2">
                        {reasons.map(r => (
                            <button
                                key={r}
                                onClick={() => setReason(r)}
                                className={`px-4 py-3 rounded-xl text-sm text-left transition-all border ${
                                    reason === r 
                                    ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold' 
                                    : 'bg-slate-50 border-transparent text-slate-600'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    
                    <textarea
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 transition-all outline-none h-24 resize-none mt-2"
                        placeholder="상세 사유를 입력해주세요 (선택사항)"
                        value={reason && !reasons.includes(reason) ? reason : ''}
                        onChange={e => setReason(e.target.value)}
                    ></textarea>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 disabled:bg-slate-300 mt-4"
                    >
                        {loading ? '제출 중...' : '신고 제출하기'}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">허위 신고시 불이익을 받을 수 있습니다.</p>
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;
