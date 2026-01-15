import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createSession, loadMessages, sendMessage, ChatMessage } from '../utils/chatService';

interface ChatbotProps {
    isOpen?: boolean;
    onClose?: () => void;
    onToggle?: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen: controlledIsOpen, onClose, onToggle }) => {
    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : localIsOpen;

    const handleToggle = () => {
        if (onToggle) onToggle();
        else if (isControlled) onClose?.();
        else setLocalIsOpen(!localIsOpen);
    };

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [userContext, setUserContext] = useState<any>(null);

    // Initial Load & Session Management
    useEffect(() => {
        if (isOpen) {
            initializeChat();
        }
    }, [isOpen]);

    const initializeChat = async () => {
        setIsLoadingHistory(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            setUserContext({
                ...session.user.user_metadata,
                email: session.user.email
            });

            // 1. Check for existing latest session
            const { data: sessions } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('user_id', session.user.id)
                .order('updated_at', { ascending: false })
                .limit(1);

            let currentSessionId = sessions?.[0]?.id || null;

            // 2. If no session, create one
            if (!currentSessionId) {
                currentSessionId = await createSession(session.user.id);
            }

            setSessionId(currentSessionId);

            // 3. Load History
            if (currentSessionId) {
                const history = await loadMessages(currentSessionId);
                if (history.length === 0) {
                    // Welcome Message if empty
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: "안녕하세요! 저는 당신의 운명을 읽어주는 AI 점술가입니다. 무엇이든 물어보세요! (예: '올해 연애운 어때?', '내 MBTI와 사주 궁합은?')",
                        createdAt: new Date()
                    }]);
                } else {
                    setMessages(history);
                }
            }

        } catch (e) {
            console.error("Chat Init Error", e);
        } finally {
            setIsLoadingHistory(false);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !sessionId || isTyping) return;

        const text = inputText;
        setInputText('');
        setIsTyping(true);

        // Optimistic Update
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

        } catch (error) {
            console.error("Send Error", error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: "죄송합니다. 메시지 전송 중 오류가 발생했습니다.",
                createdAt: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Desktop FAB - Only if not controlled by parent UI (or keeping as redundancy if needed, but per previous design it was hidden on mobile) */}
            <button
                onClick={handleToggle}
                className={`
                    fixed bottom-24 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-500
                    hidden md:block 
                    ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
                    bg-gradient-to-r from-amber-500 to-orange-600 text-white
                    hover:shadow-orange-500/50 hover:-translate-y-1
                `}
            >
                <MessageCircle className="w-8 h-8 animate-pulse" />
            </button>

            {/* Chat Window */}
            <div
                className={`
          fixed bottom-0 sm:bottom-6 right-0 sm:right-6 z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[600px] sm:max-h-[80vh]
          bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'}
        `}
            >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="w-6 h-6 text-yellow-100" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">AI 점술가</h3>
                            <p className="text-xs text-orange-100 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                운명 기록 중...
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggle}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 custom-scrollbar">
                    {isLoadingHistory && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id || idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-2 self-start mt-1 shrink-0">
                                    <Bot className="w-5 h-5 text-orange-600" />
                                </div>
                            )}
                            <div
                                className={`
                  max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap
                  ${msg.role === 'user'
                                        ? 'bg-amber-500 text-white rounded-br-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                    }
                `}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start items-center">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                                <Bot className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1">
                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-safe">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all"
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={sessionId ? "궁금한 운세를 물어보세요..." : "연결 중..."}
                            disabled={!sessionId}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isTyping || !sessionId}
                            className="p-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default Chatbot;
