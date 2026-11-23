import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare, CreditCard } from 'lucide-react';
import { sendMessage, ChatMessage } from '../utils/chatService';
import { stripMarkdown } from '../utils/textUtils';
import { useNavigate } from 'react-router-dom';
import { SERVICE_COSTS } from '../config/creditConfig';
import { useGuestProfile } from '../hooks/useGuestProfile';
import GuestProfileCard from '../components/GuestProfileCard';
import { consumePaidServiceTicket, startServicePayment } from '../utils/servicePayCheckout';

const MESSAGES_PER_PACK = 5;

interface ChatPageProps {
    session?: any;
    defaultService?: 'tarot' | 'saju' | 'general';
}

const getWelcomeMessage = (defaultService: 'tarot' | 'saju' | 'general') => {
    if (defaultService === 'tarot') {
        return "신비한 타로의 세계에 오신 것을 환영합니다! 당신의 궁금한 점이나 고민을 말씀해 주시면 카드를 통해 길을 찾아드릴게요.";
    }
    if (defaultService === 'saju') {
        return "명리학 이론을 바탕으로 당신의 사주를 분석해 드립니다. 어떤 사주적 고민이 있으신가요?";
    }
    return "안녕하세요! 사주와 MBTI 데이터를 통해 당신의 삶을 깊이 있게 분석하고 심층적인 상담을 제공해 드릴게요. 어떤 고민이든 편하게 말씀해 주세요.";
};

const ChatPage: React.FC<ChatPageProps> = ({ defaultService = 'general' }) => {
    const navigate = useNavigate();
    const { profile, updateProfile } = useGuestProfile();
    const storageMsgKey = `mbtiju_guest_chat_${defaultService}`;
    const storageQuotaKey = `mbtiju_guest_chat_quota_${defaultService}`;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId] = useState<string>(`guest_${defaultService}`);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const ticketCheckedRef = useRef(false);

    const [remainingQuota, setRemainingQuota] = useState<number>(() => {
        try {
            const raw = localStorage.getItem(storageQuotaKey);
            const parsed = raw ? parseInt(raw, 10) : 0;
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        } catch {
            return 0;
        }
    });

    const saveQuota = (next: number) => {
        const clamped = Math.max(0, next);
        setRemainingQuota(clamped);
        try {
            localStorage.setItem(storageQuotaKey, String(clamped));
        } catch {
            // ignore
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageMsgKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt || Date.now()) })));
                    return;
                }
            }
        } catch {
            // ignore
        }
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: getWelcomeMessage(defaultService),
            createdAt: new Date(),
        }]);
    }, [defaultService, storageMsgKey]);

    useEffect(() => {
        if (messages.length === 0) return;
        try {
            localStorage.setItem(storageMsgKey, JSON.stringify(messages.slice(-50)));
        } catch {
            // ignore
        }
    }, [messages, storageMsgKey]);

    useEffect(() => {
        if (ticketCheckedRef.current) return;
        ticketCheckedRef.current = true;
        const ticket = consumePaidServiceTicket('AI_CHAT_5');
        if (ticket) {
            saveQuota(remainingQuota + MESSAGES_PER_PACK);
            if (ticket.payload?.draftMessage) {
                setInputText(ticket.payload.draftMessage);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleNewSession = () => {
        const resetMsgs: ChatMessage[] = [{
            id: 'welcome_new',
            role: 'assistant',
            content: "새로운 상담을 시작합니다. 무엇이 궁금하신가요?",
            createdAt: new Date()
        }];
        setMessages(resetMsgs);
        setIsSidebarOpen(false);
    };

    // Smart Auto-scroll: 사용자가 하단 근처에 있을 때만 자동 스크롤
    useEffect(() => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, shouldAutoScroll]);

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        setShouldAutoScroll(isNearBottom);
    };

    const handlePurchasePack = async (draftMessage?: string) => {
        setIsPaying(true);
        try {
            const returnPath = defaultService === 'tarot' ? '/tarot' : defaultService === 'saju' ? '/saju' : '/chat';
            const res = await startServicePayment({
                serviceType: 'AI_CHAT_5',
                serviceName: 'AI 사주 · 타로 채팅 5회권',
                returnPath,
                payload: {
                    defaultService,
                    draftMessage: draftMessage || '',
                },
                customerName: profile.name || '비회원',
            });
            if (!res.success && res.error_msg) {
                alert(res.error_msg);
            }
        } catch (err: any) {
            alert(err?.message || '결제 요청 중 오류가 발생했습니다.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isTyping) return;

        if (remainingQuota <= 0) {
            await handlePurchasePack(inputText);
            return;
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
        saveQuota(remainingQuota - 1);

        try {
            const initialBotMsg: ChatMessage = {
                id: botMessageId,
                role: 'assistant',
                content: '',
                createdAt: new Date()
            };
            setMessages(prev => [...prev, initialBotMsg]);

            const userContext = {
                name: profile.name || '이용자',
                mbti: profile.mbti || 'INFJ',
                birthDate: profile.birthDate,
                birthTime: profile.birthTime,
                gender: profile.gender,
            };

            let accumulatedText = '';
            await sendMessage(
                sessionId,
                text,
                messages,
                userContext,
                (token) => {
                    accumulatedText += token;
                    const cleanText = stripMarkdown(accumulatedText);
                    setMessages(prev => prev.map(m => 
                        m.id === botMessageId ? { ...m, content: cleanText } : m
                    ));
                    setShouldAutoScroll(true);
                }
            );
        } catch (err: any) {
            saveQuota(remainingQuota);
            setMessages(prev => prev.filter(m => m.id !== botMessageId));

            const errorMsg: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: `⚠️ 일시적인 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}\n\n잠시 후 다시 시도해주세요. 이번 대화의 이용권은 차감되지 않았습니다.`,
                createdAt: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const chatPackPrice = SERVICE_COSTS.AI_CHAT_5;

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
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">회원가입 없이 즉시 상담</span>
                    </div>

                    <button
                        onClick={handleNewSession}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl transition-colors mb-4 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        새로운 상담 시작
                    </button>

                    {/* 대화 이용권 표시 */}
                    <div className="mb-4 p-3 bg-slate-800 rounded-xl">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">남은 대화</span>
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                                <CreditCard className="w-4 h-4" />
                                {remainingQuota}회
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            5회 대화 이용권 = {chatPackPrice.toLocaleString()}원
                        </div>
                        <button
                            onClick={() => handlePurchasePack()}
                            disabled={isPaying}
                            className="mt-2.5 w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors"
                        >
                            {isPaying ? '결제 창 여는 중...' : `5회권 결제 (${chatPackPrice.toLocaleString()}원)`}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Session</div>
                        <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm truncate flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 opacity-50" />
                            현재 브라우저 상담
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
                        <button
                            onClick={() => setShowProfilePanel(v => !v)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold"
                        >
                            사주설정
                        </button>
                        <button
                            onClick={() => handlePurchasePack()}
                            disabled={isPaying}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black"
                        >
                            <CreditCard className="w-3 h-3" />
                            {remainingQuota}회 · 490원
                        </button>
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Desktop Top Bar */}
                <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <CreditCard className="w-4 h-4 text-amber-500" />
                            <span>남은 대화권: <strong className="text-slate-900">{remainingQuota}회</strong></span>
                        </div>
                        <button
                            onClick={() => setShowProfilePanel(v => !v)}
                            className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full font-bold text-slate-700 hover:bg-slate-100"
                        >
                            {profile.birthDate ? `${profile.birthDate} (${profile.mbti || 'MBTI'})` : '내 사주·MBTI 설정'}
                        </button>
                    </div>
                    <button
                        onClick={() => handlePurchasePack()}
                        disabled={isPaying}
                        className="text-xs px-3.5 py-1.5 bg-slate-900 text-white rounded-full font-black hover:bg-violet-600 transition-colors"
                    >
                        {isPaying ? '결제 창 여는 중...' : `5회 대화권 구매 (${chatPackPrice.toLocaleString()}원)`}
                    </button>
                </div>

                {showProfilePanel && (
                    <div className="p-4 bg-white border-b border-slate-100 max-w-3xl mx-auto w-full">
                        <GuestProfileCard profile={profile} onChange={updateProfile} compact showName title="상담용 내 사주 · MBTI" />
                    </div>
                )}

                {/* Messages */}
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50">
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
                                    {stripMarkdown(msg.content)}
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
                            <div className="text-[11px] text-slate-500 font-bold">
                                {remainingQuota > 0
                                    ? `남은 대화권: ${remainingQuota}회`
                                    : `메시지 전송 시 5회 이용권(${chatPackPrice.toLocaleString()}원) 결제`}
                            </div>
                        </div>
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value);
                                    setShouldAutoScroll(true);
                                }}
                                onFocus={() => {
                                    setShouldAutoScroll(true);
                                    setTimeout(() => {
                                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                    }, 200);
                                }}
                                placeholder="운세, 사주, 고민거리를 물어보세요..."
                                disabled={isTyping || isPaying}
                                autoCapitalize="sentences"
                                autoComplete="off"
                                autoCorrect="off"
                                style={{ fontSize: '16px' }}
                                className="w-full pl-4 md:pl-6 pr-12 md:pr-14 py-3 md:py-4 bg-slate-100/50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 text-slate-800 placeholder:text-slate-400 resize-none shadow-inner text-base"
                            />
                            <button
                                type="submit"
                                onClick={() => setShouldAutoScroll(true)}
                                disabled={!inputText.trim() || isTyping || isPaying}
                                className="absolute right-2 top-2 p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 transition-all shadow-lg shadow-violet-200"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                        <p className="text-center text-[10px] md:text-xs text-slate-400 mt-2 font-medium">
                            분석 결과는 참고용이며, 5회 대화마다 {chatPackPrice.toLocaleString()}원 건별 결제로 이용 가능합니다.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatPage;
