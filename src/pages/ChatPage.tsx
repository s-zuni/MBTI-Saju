import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createSession, loadMessages, sendMessage, ChatMessage } from '../utils/chatService';
import Navbar from '../components/Navbar'; // reuse Navbar if wanted, or stand-alone
import { useNavigate } from 'react-router-dom';

const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [userContext, setUserContext] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Initial Load
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/'); // Redirect if not logged in
                return;
            }

            setUserContext({
                ...session.user.user_metadata,
                email: session.user.email
            });

            await loadLatestSession(session.user.id);
        };
        init();
    }, [navigate]);

    const loadLatestSession = async (userId: string) => {
        setIsLoadingHistory(true);
        try {
            // Check for existing latest session
            const { data: sessions } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1);

            let sid = sessions?.[0]?.id || null;

            if (!sid) {
                sid = await createSession(userId);
            }

            if (sid) {
                setSessionId(sid);
                const history = await loadMessages(sid);
                if (history.length === 0) {
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: "안녕하세요! 저는 당신의 운명을 읽어주는 AI 점술가입니다. 사주와 MBTI를 기반으로 어떤 고민이든 들어드릴게요.",
                        createdAt: new Date()
                    }]);
                } else {
                    setMessages(history);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleNewSession = async () => {
        // Start fresh
        if (!userContext) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setIsLoadingHistory(true);
        const newSid = await createSession(session.user.id, "새로운 상담");
        if (newSid) {
            setSessionId(newSid);
            setMessages([{
                id: 'welcome_new',
                role: 'assistant',
                content: "새로운 상담을 시작합니다. 무엇이 궁금하신가요?",
                createdAt: new Date()
            }]);
        }
        setIsLoadingHistory(false);
        setIsSidebarOpen(false); // Close sidebar on mobile
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !sessionId || isTyping) return;

        const text = inputText;
        setInputText('');
        setIsTyping(true);

        const tempMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            createdAt: new Date()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const response = await sendMessage(sessionId, text, messages, userContext);
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                createdAt: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                createdAt: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar (Desktop: always visible, Mobile: toggle) */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-8 text-white font-bold text-xl px-2">
                        <Bot className="w-8 h-8 text-indigo-400" />
                        <span>AI 점술가</span>
                    </div>

                    <button
                        onClick={handleNewSession}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl transition-colors mb-4 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        새로운 상담 시작
                    </button>

                    <div className="flex-1 overflow-y-auto">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Chats</div>
                        {/* Placeholder for session list */}
                        <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm truncate flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 opacity-50" />
                            현재 상담 세션
                        </button>
                    </div>

                    <div className="border-t border-slate-800 pt-4 mt-auto">
                        <button onClick={() => navigate('/')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm">
                            홈으로 돌아가기
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full relative">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center p-4 border-b border-slate-100 bg-white z-10">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold ml-2 text-slate-800">AI 심층 상담</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50">
                    {isLoadingHistory && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start max-w-3xl mx-auto'}`}>
                            <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                                </div>
                                <div className={`
                                    rounded-2xl p-4 shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap
                                    ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}
                                `}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start max-w-3xl mx-auto">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="운세, 사주, 고민거리를 물어보세요..."
                                disabled={isTyping}
                                className="w-full pl-6 pr-14 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400 resize-none shadow-inner"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || isTyping}
                                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                        <p className="text-center text-xs text-slate-400 mt-2">
                            AI는 실수할 수 있습니다.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatPage;
