import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare, Coins, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createSession, loadMessages, sendMessage, ChatMessage } from '../utils/chatService';
import { useNavigate } from 'react-router-dom';
import { useCoins } from '../hooks/useCoins';
import { SERVICE_COSTS } from '../config/coinConfig';
import CoinPurchaseModal from '../components/CoinPurchaseModal';

const MESSAGES_PER_COIN_CHARGE = 10; // 10회 대화당 코인 차감

const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [userContext, setUserContext] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [session, setSession] = useState<any>(null);

    // 코인 시스템
    const { coins, useCoins: spendCoins, addCoins, refreshCoins } = useCoins(session);
    const [messageCount, setMessageCount] = useState(0); // 현재 세션 메시지 카운트
    const [showCoinModal, setShowCoinModal] = useState(false);
    const [showCoinWarning, setShowCoinWarning] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Initial Load
    useEffect(() => {
        const init = async () => {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) {
                navigate('/');
                return;
            }

            setSession(authSession);
            setUserContext({
                name: authSession.user.user_metadata.full_name || authSession.user.user_metadata.name,
                mbti: authSession.user.user_metadata.mbti,
                birthDate: authSession.user.user_metadata.birth_date,
                birthTime: authSession.user.user_metadata.birth_time,
                gender: authSession.user.user_metadata.gender,
                email: authSession.user.email
            });

            await loadLatestSession(authSession.user.id);
        };
        init();
    }, [navigate]);

    const loadLatestSession = async (userId: string) => {
        setIsLoadingHistory(true);
        try {
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
                    setMessageCount(0);
                } else {
                    setMessages(history);
                    // 사용자 메시지 수 계산 (10회마다 코인 차감을 위해)
                    const userMsgCount = history.filter(m => m.role === 'user').length;
                    setMessageCount(userMsgCount % MESSAGES_PER_COIN_CHARGE);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleNewSession = async () => {
        if (!userContext || !session) return;

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
            setMessageCount(0);
        }
        setIsLoadingHistory(false);
        setIsSidebarOpen(false);
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !sessionId || isTyping) return;

        // 10회마다 코인 체크 (다음 메시지가 10의 배수일 때)
        const nextCount = messageCount + 1;
        if (nextCount % MESSAGES_PER_COIN_CHARGE === 0) {
            if (coins < SERVICE_COSTS.AI_CHAT_10) {
                setShowCoinModal(true);
                return;
            }
        }

        // 코인 경고 표시 (9회째 메시지일 때)
        if ((messageCount + 1) % MESSAGES_PER_COIN_CHARGE === MESSAGES_PER_COIN_CHARGE - 1) {
            setShowCoinWarning(true);
            setTimeout(() => setShowCoinWarning(false), 5000);
        }

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
        setMessageCount(prev => prev + 1);

        try {
            const response = await sendMessage(sessionId, text, messages, userContext);
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                createdAt: new Date()
            };
            setMessages(prev => [...prev, botMsg]);

            // 10회 도달 시 코인 차감
            if (nextCount % MESSAGES_PER_COIN_CHARGE === 0) {
                const success = await spendCoins('AI_CHAT_10');
                if (!success) {
                    console.error('Failed to spend coins for AI chat');
                }
            }
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

    const remainingFreeMessages = MESSAGES_PER_COIN_CHARGE - (messageCount % MESSAGES_PER_COIN_CHARGE);

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-8 text-white font-bold text-xl px-2">
                        <Bot className="w-8 h-8 text-indigo-400" />
                        <span>심층 상담</span>
                    </div>

                    <button
                        onClick={handleNewSession}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl transition-colors mb-4 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        새로운 상담 시작
                    </button>

                    {/* 코인 표시 */}
                    <div className="mb-4 p-3 bg-slate-800 rounded-xl">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">보유 코인</span>
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                                <Coins className="w-4 h-4" />
                                {coins}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            10회 대화 = 25코인
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Chats</div>
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
            <main className="flex-1 flex flex-col h-full relative animate-fade-in">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-3 border-b border-slate-100 bg-white z-10 h-14">
                    <div className="flex items-center">
                        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <span className="font-bold ml-1 text-slate-800 text-lg">심층 상담</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-bold">
                            <Coins className="w-3 h-3" />
                            {coins}
                        </div>
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Coin Warning Banner */}
                {showCoinWarning && (
                    <div className="absolute top-14 md:top-0 left-0 right-0 bg-amber-500 text-white p-3 flex items-center justify-center gap-2 z-10 animate-fade-in">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">다음 메시지 후 25코인이 차감됩니다 (현재: {coins}코인)</span>
                    </div>
                )}

                {/* Messages Counter Bar */}
                <div className="hidden md:flex items-center justify-between px-6 py-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <span>보유: <strong className="text-slate-900">{coins}</strong> 코인</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            남은 무료 메시지: <strong className="text-indigo-600">{remainingFreeMessages}회</strong>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCoinModal(true)}
                        className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 transition-colors"
                    >
                        + 코인 충전
                    </button>
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
                            AI는 실수할 수 있습니다. · 10회 대화마다 25코인이 차감됩니다.
                        </p>
                    </div>
                </div>
            </main>

            {/* Coin Purchase Modal */}
            <CoinPurchaseModal
                isOpen={showCoinModal}
                onClose={() => setShowCoinModal(false)}
                userEmail={session?.user?.email}
                currentCoins={coins}
                requiredCoins={SERVICE_COSTS.AI_CHAT_10}
                onSuccess={async (coinAmount, paymentId, packageId) => {
                    await addCoins(coinAmount, paymentId, packageId);
                    await refreshCoins();
                    setShowCoinModal(false);
                }}
            />
        </div>
    );
};

export default ChatPage;
