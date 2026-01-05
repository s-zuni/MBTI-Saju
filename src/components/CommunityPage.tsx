import React from 'react';
import { MessageSquare, ThumbsUp } from 'lucide-react';

const CommunityPage: React.FC = () => {
    const posts = [
        { id: 1, title: 'ENTP랑 INFJ 궁합 어떤가요?', author: '익명1', likes: 12, comments: 5, tag: '궁합' },
        { id: 2, title: '오늘 운세 대박이네요 ㅋㅋ', author: '운세왕', likes: 8, comments: 2, tag: '잡담' },
        { id: 3, title: '사주에 물이 부족하다는데.. 물건 추천점요', author: '물부족', likes: 25, comments: 10, tag: '조언' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-20"> {/* Padding for Navbar and BottomNav */}
            <div className="max-w-2xl mx-auto px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">커뮤니티</h1>
                    <button className="btn-primary px-4 py-2 text-sm">글쓰기</button>
                </div>

                <div className="space-y-4">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{post.tag}</span>
                                <span className="text-xs text-slate-400">10분 전</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{post.title}</h3>
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>{post.author}</span>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="w-4 h-4" /> {post.likes}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="w-4 h-4" /> {post.comments}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;
