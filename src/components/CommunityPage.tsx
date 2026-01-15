import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, PenSquare, X, Send, Search, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
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
    comments_count?: number; // Fetched separately or via count
}

const CommunityPage: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTag, setActiveTag] = useState('전체');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    // const navigate = useNavigate();

    const tags = ['전체', '잡담', '질문', '공유', '궁합'];

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    };

    const fetchPosts = React.useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (activeTag !== '전체') {
            query = query.eq('tag', activeTag);
        }

        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) console.error('Error fetching posts:', error);
        else setPosts(data || []);
        setLoading(false);
    }, [activeTag, searchQuery]);

    useEffect(() => {
        fetchPosts();
        checkUser();
    }, [fetchPosts]); // Refetch when fetchPosts changes (which depends on activeTag/searchQuery)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPosts();
    };

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
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {tags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(tag)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTag === tag
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
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
                                        <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-xs font-bold">{post.tag || '일반'}</span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            {new Date(post.created_at).toLocaleDateString()}
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
                />
            )}
        </div>
    );
};

// --- Sub Components ---

const WriteModal = ({ onClose, onSuccess, user, postToEdit }: { onClose: () => void, onSuccess: () => void, user: any, postToEdit?: Post | null }) => {
    const [title, setTitle] = useState(postToEdit?.title || '');
    const [content, setContent] = useState(postToEdit?.content || '');
    const [tag, setTag] = useState(postToEdit?.tag || '잡담');
    const [loading, setLoading] = useState(false);

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
            author_name: user?.user_metadata?.full_name || '익명',
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
                            <option>잡담</option>
                            <option>질문</option>
                            <option>공유</option>
                            <option>궁합</option>
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

const PostDetailModal = ({ post, onClose, user, onDelete, onEdit }: { post: Post, onClose: () => void, user: any, onDelete?: () => void, onEdit?: () => void }) => {
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
        const { data } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

        if (data) {
            // Organize into nested structure not strictly needed for 1 level deep, but good for UI
            // For simplicity, let's just show flat or filtered list in UI
            setComments(data);
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
            author_name: user.user_metadata.full_name || '익명',
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
                            <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-slate-500">작성자: {post.author_name}</p>
                            {user && user.id === post.user_id && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm('정말 삭제하시겠습니까?')) return;
                                            const { error } = await supabase.from('posts').delete().eq('id', post.id);
                                            if (error) alert('삭제 실패: ' + error.message);
                                            else {
                                                alert('게시글이 삭제되었습니다.');
                                                onClose();
                                                onDelete?.();
                                            }
                                        }}
                                        className="text-xs text-rose-500 hover:underline flex items-center gap-0.5"
                                    >
                                        <Trash2 className="w-3 h-3" /> 삭제
                                    </button>
                                    <button
                                        onClick={onEdit}
                                        className="text-xs text-slate-500 hover:underline flex items-center gap-0.5"
                                    >
                                        <Edit2 className="w-3 h-3" /> 수정
                                    </button>
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
                                            <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                        </div>
                                        <p className="text-slate-600">{comment.content}</p>
                                        <button
                                            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                                            className="text-xs text-indigo-500 hover:underline mt-1 font-medium"
                                        >
                                            답글 달기
                                        </button>
                                    </div>

                                    {/* Replies */}
                                    <div className="pl-4 mt-2 space-y-2 border-l-2 border-slate-100 ml-2">
                                        {getReplies(comment.id).map(reply => (
                                            <div key={reply.id} className="bg-slate-50/50 p-2 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-600 text-xs">{reply.author_name}</span>
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

export default CommunityPage;
