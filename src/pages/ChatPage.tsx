import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare, Coins, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createSession, loadMessages, sendMessage, ChatMessage } from '../utils/chatService';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '../hooks/useCredits';
import { SERVICE_COSTS } from '../config/creditConfig';
import CreditPurchaseModal from '../components/CreditPurchaseModal';

const MESSAGES_PER_COIN_CHARGE = 5; // 5회 대화당 크레딧 차감

interface ChatPageProps {
    session: any;
    defaultService?: 'tarot' | 'saju' | 'general';
}

const ChatPage: React.FC<ChatPageProps> = ({ session: initialSession, defaultService = 'general' }) => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [userContext, setUserContext] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [session, setSession] = useState<any>(initialSession);

    // 크레딧 시스템
    const { credits, useCredits: consumeCredits, purchaseCredits } = useCredits(session);
    const [messageCount, setMessageCount] = useState(0); // 현재 세션 메시지 카운트
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showCreditWarning, setShowCreditWarning] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false);

    // 1. Initial Load
    useEffect(() => {
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
                        const welcomeMsg = defaultService === 'tarot' 
                            ? "신비한 타로의 세계에 오신 것을 환영합니다! 당신의 궁금한 점이나 고민을 말씀해 주시면 카드를 통해 길을 찾아드릴게요."
                            : defaultService === 'saju'
                            ? "공인된 명리학 데이터를 바탕으로 당신의 운명을 분석해 드립니다. 어떤 사주적 고민이 있으신가요?"
                            : "안녕하세요! 사주와 MBTI 데이터를 통해 당신의 삶을 깊이 있게 분석하고 심층적인 상담을 제공해 드릴게요. 어떤 고민이든 편하게 말씀해 주세요.";
                        
                        setMessages([{
                            id: 'welcome',
                            role: 'assistant',
                            content: welcomeMsg,
                            createdAt: new Date()
                        }]);
                        setMessageCount(0);
                    } else {
                        setMessages(history);
                        // 사용자 메시지 수 계산 (10회마다 크레딧 차감을 위해)
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

        const init = async () => {
            // Safari ITP 대응: Props로 받은 세션보다 getSession()으로 가져온 최신 세션을 우선시합니다.
            const { data: { session: fetchedSession } } = await supabase.auth.getSession();
            const currentSession = fetchedSession || initialSession;
            
            if (!currentSession) {
                navigate('/');
                return;
            }

            setSession(currentSession);
            setUserContext({
                name: currentSession.user.user_metadata.full_name || currentSession.user.user_metadata.name,
                mbti: currentSession.user.user_metadata.mbti,
                birthDate: currentSession.user.user_metadata.birth_date,
                birthTime: currentSession.user.user_metadata.birth_time,
                gender: currentSession.user.user_metadata.gender,
                email: currentSession.user.email
            });

            await loadLatestSession(currentSession.user.id);
        };
        init();
    }, [navigate, initialSession, defaultService]);

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

    // Smart Auto-scroll: 사용자가 하단 근처에 있을 때만 자동 스크롤
    useEffect(() => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, shouldAutoScroll]);

    // Enable auto-scroll once the user starts interacting or new messages arrive post-load
    useEffect(() => {
        if (messages.length > 0 && !isLoadingHistory) {
            // History loaded, don't auto-scroll yet. 
            // But if a NEW message is added (length increases), we can enable it if it's the assistant's response or user's input.
        }
    }, [messages.length, isLoadingHistory]);

    // Smart Auto-scroll: Only scroll if the user was already at the bottom
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        
        // Threshold of 150px to be considered "at bottom"
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        setShouldAutoScroll(isNearBottom);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !sessionId || isTyping) return;

        // 10회마다 크레딧 체크 (0, 10, 20... 회차 대화 시작 시)
        if (messageCount % MESSAGES_PER_COIN_CHARGE === 0) {
            if (credits < SERVICE_COSTS.AI_CHAT_5) {
                setShowCreditModal(true);
                return;
            }
        }

        // 크레딧 경고 표시 (9회째 메시지일 때)
        if ((messageCount + 1) % MESSAGES_PER_COIN_CHARGE === MESSAGES_PER_COIN_CHARGE - 1) {
            setShowCreditWarning(true);
            setTimeout(() => setShowCreditWarning(false), 5000);
        }

        const text = inputText;
        setInputText('');
        setIsTyping(true);
        const botMessageId = (Date.now() + 1).toString();

        const tempMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            createdAt: new Date()
        };
        setMessages(prev => [...prev, tempMsg]);
        setMessageCount(prev => prev + 1);

        try {
            // Initial empty assistant message
            const initialBotMsg: ChatMessage = {
                id: botMessageId,
                role: 'assistant',
                content: '',
                createdAt: new Date()
            };
            setMessages(prev => [...prev, initialBotMsg]);

            let accumulatedText = '';
            await sendMessage(
                sessionId, 
                text, 
                messages, 
                userContext,
                (token) => {
                    accumulatedText += token;
                    setMessages(prev => prev.map(m => 
                        m.id === botMessageId ? { ...m, content: accumulatedText } : m
                    ));
                    setShouldAutoScroll(true);
                }
            );

            // 10회 도달 시 크레딧 차감
            if ((messageCount) % MESSAGES_PER_COIN_CHARGE === 0) {
                const success = await consumeCredits('AI_CHAT_5');
                if (!success) {
                    console.error('Failed to spend credits for professional chat');
                }
            }
        } catch (err: any) {
            // Roll back message count and remove the failed bot message
            setMessageCount(prev => prev - 1);
            setMessages(prev => prev.filter(m => m.id !== botMessageId));

            const errorMsg: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: `⚠️ 신령님과의 연결이 끊겼습니다: ${err.message || '알 수 없는 오류'}\n\n시스템 과부하일 수 있으니 잠시 후 다시 시도해주세요. 안심하세요! 메시지 전달에 실패하여 이번 대화의 크레딧은 차감되지 않았습니다.`,
                createdAt: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const remainingFreeMessages = MESSAGES_PER_COIN_CHARGE - (messageCount % MESSAGES_PER_COIN_CHARGE);

    return (
        <div className="flex h-[calc(100dvh-4rem)] md:h-screen bg-white">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-1 text-white font-bold text-xl px-2">
                        <Bot className="w-8 h-8 text-violet-400" />
                        <span>{defaultService === 'tarot' ? '신비한 타로 상담' : defaultService === 'saju' ? '명리 심층 분석' : '운명 심층 상담'}</span>
                    </div>
                    <div className="px-2 mb-8 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4,100+명이 상담 중</span>
                    </div>

                    <button
                        onClick={handleNewSession}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl transition-colors mb-4 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        새로운 상담 시작
                    </button>

                    {/* 크레딧 표시 */}
                    <div className="mb-4 p-3 bg-slate-800 rounded-xl">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">보유 크레딧</span>
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                                <Coins className="w-4 h-4" />
                                {credits}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            5회 대화 = 20크레딧
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
                        <span className="font-bold ml-1 text-slate-800 text-lg">
                            {defaultService === 'tarot' ? '타로 상담' : defaultService === 'saju' ? '사주 분석' : '운명 상담'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-bold">
                            <Coins className="w-3 h-3" />
                            {credits}
                        </div>
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Credit Warning Banner */}
                {showCreditWarning && (
                    <div className="absolute top-14 md:top-0 left-0 right-0 bg-amber-500 text-white p-3 flex items-center justify-center gap-2 z-10 animate-fade-in">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">다음 메시지 후 20크레딧이 차감됩니다 (현재: {credits}크레딧)</span>
                    </div>
                )}

                {/* Messages Counter Bar */}
                <div className="hidden md:flex items-center justify-between px-6 py-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <span>보유: <strong className="text-slate-900">{credits}</strong> 크레딧</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            남은 무료 메시지: <strong className="text-violet-600">{remainingFreeMessages}회</strong>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreditModal(true)}
                        className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 transition-colors"
                    >
                        + 크레딧 충전
                    </button>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50">
                    {isLoadingHistory && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start max-w-3xl mx-auto'}`}>
                            <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-violet-600' : 'bg-emerald-600'}`}>
                                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                                </div>
                                <div className={`
                                    rounded-2xl p-4 shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap
                                    ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}
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
                <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <button 
                                onClick={handleNewSession}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-full text-xs font-bold hover:bg-violet-100 active:scale-95 transition-all mb-1 border border-violet-100 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>새 상담 시작</span>
                            </button>
                            <div className="text-[10px] text-slate-400 font-medium">
                                남은 무료: {remainingFreeMessages}회
                            </div>
                        </div>
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value);
                                    setShouldAutoScroll(true); // User interaction enables auto-scroll
                                }}
                                placeholder="운세, 사주, 고민거리를 물어보세요..."
                                disabled={isTyping}
                                className="w-full pl-4 md:pl-6 pr-12 md:pr-14 py-3 md:py-4 bg-slate-100/50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 text-slate-800 placeholder:text-slate-400 resize-none shadow-inner"
                            />
                            <button
                                type="submit"
                                onClick={() => setShouldAutoScroll(true)}
                                disabled={!inputText.trim() || isTyping}
                                className="absolute right-2 top-2 p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 transition-all shadow-lg shadow-violet-200"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                        <p className="text-center text-[10px] md:text-xs text-slate-400 mt-2 font-medium">
                            분석 결과는 참고용이며, 5회 대화마다 20크레딧이 차감됩니다.
                        </p>
                    </div>
                </div>
            </main>

            {/* Credit Purchase Modal */}
            <CreditPurchaseModal
                isOpen={showCreditModal}
                onClose={() => setShowCreditModal(false)}
                userEmail={session?.user?.email}
                currentCredits={credits}
                requiredCredits={SERVICE_COSTS.AI_CHAT_5}
                onSuccess={async (planId, pricePaid, creditAmount, paymentId) => {
                    await purchaseCredits(planId, pricePaid, creditAmount, paymentId);
                    setShowCreditModal(false);
                }}
            />
        </div>
    );
};

export default ChatPage;
