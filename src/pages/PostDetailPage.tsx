import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';
import { MessageSquare, ThumbsUp, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatSafariDate } from '../utils/textUtils';

interface Comment {
    id: string;
    content: string;
    author_name: string;
    user_id: string;
    created_at: string;
    parent_id: string | null;
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
}

const PostDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPost = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setPost(data);

            const { data: commentsData, error: commentsError } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', id)
                .order('created_at', { ascending: true });

            if (commentsError) throw commentsError;
            setComments(commentsData || []);
        } catch (err: any) {
            console.error('Error fetching post:', err);
            setError(err.message || '게시글을 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPost();
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
    }, [fetchPost]);

    const handleLike = async () => {
        if (!user || !post) return;
        const { error } = await supabase
            .from('posts')
            .update({ likes: post.likes + 1 })
            .eq('id', post.id);
        
        if (!error) {
            setPost({ ...post, likes: post.likes + 1 });
        }
    };

    const handleCommentSubmit = async () => {
        if (!user || !newComment.trim() || !id) return;
        setIsSubmitting(true);
        const { error } = await supabase.from('comments').insert({
            post_id: id,
            user_id: user.id,
            author_name: user?.user_metadata?.nickname || user?.user_metadata?.full_name || '익명',
            content: newComment,
        });

        if (error) {
            alert('댓글 작성 실패: ' + error.message);
        } else {
            setNewComment('');
            fetchPost();
        }
        setIsSubmitting(false);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
    );

    if (error || !post) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
            <p className="text-slate-500 mb-4">{error || '게시글이 존재하지 않습니다.'}</p>
            <button onClick={() => navigate('/community')} className="btn-primary px-6 py-2">커뮤니티로 돌아가기</button>
        </div>
    );

    const ogTitle = `${post.title} | MBTI & 사주 커뮤니티`;
    const ogDescription = post.content.substring(0, 160);
    const ogUrl = `https://www.mbtiju.com/community/post/${post.id}`;

    return (
        <div className="min-h-screen bg-slate-50 pb-32 pt-24">
            <Helmet>
                <title>{ogTitle}</title>
                <meta name="description" content={ogDescription} />
                <meta property="og:title" content={ogTitle} />
                <meta property="og:description" content={ogDescription} />
                <meta property="og:url" content={ogUrl} />
                <meta property="og:type" content="article" />
                <link rel="canonical" href={ogUrl} />
            </Helmet>

            <div className="max-w-3xl mx-auto px-6">
                <button 
                    onClick={() => navigate('/community')}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-8 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" /> 리스트로 돌아가기
                </button>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                            post.is_announcement ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                            {post.is_announcement ? 'NOTICE' : (post.tag || 'GENERAL')}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                            {new Date(formatSafariDate(post.created_at)).toLocaleString()}
                        </span>
                    </div>

                    <h1 className="text-3xl font-extrabold text-slate-900 mb-6 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-600 shadow-sm border border-white">
                            {post.author_name?.[0] || 'A'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700">{post.author_name || '익명'}</p>
                            <p className="text-[11px] text-slate-400">작성자</p>
                        </div>
                    </div>

                    <div className="text-slate-800 whitespace-pre-wrap leading-relaxed text-lg mb-12">
                        {post.content}
                    </div>

                    <div className="flex items-center justify-center gap-8 py-8 border-t border-b border-slate-50 mb-12">
                        <button 
                            onClick={handleLike}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center transition-all group-hover:bg-rose-50 group-active:scale-95">
                                <ThumbsUp className="w-6 h-6 text-slate-400 group-hover:text-rose-500" />
                            </div>
                            <span className="text-sm font-black text-slate-400 group-hover:text-rose-500">{post.likes}</span>
                        </button>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-8">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-600" /> 댓글 {comments.length}
                        </h3>

                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-slate-50 p-5 rounded-2xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">{comment.author_name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {new Date(formatSafariDate(comment.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                                </div>
                            ))}
                        </div>

                        {/* Comment Input */}
                        <div className="pt-6">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-white border-2 border-slate-100 rounded-[24px] px-6 py-4 pr-14 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all min-h-[100px] resize-none text-slate-700"
                                    placeholder={user ? "당신의 생각을 들려주세요..." : "로그인이 필요합니다"}
                                    disabled={!user || isSubmitting}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <button
                                    onClick={handleCommentSubmit}
                                    disabled={!user || !newComment.trim() || isSubmitting}
                                    className="absolute right-3 bottom-3 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white hover:bg-indigo-700 transition-all disabled:bg-slate-200"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostDetailPage;
