import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, User, Bot } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { generateChatbotResponse } from '../utils/sajuLogic';

// Types
interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface ChatbotProps {
    isOpen?: boolean;
    onClose?: () => void;
    onToggle?: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen: controlledIsOpen, onClose, onToggle }) => {
    const [localIsOpen, setLocalIsOpen] = useState(false);

    // Determine if we are controlled or uncontrolled
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : localIsOpen;

    const handleToggle = () => {
        if (onToggle) {
            onToggle();
        } else if (isControlled) {
            onClose?.();
        } else {
            setLocalIsOpen(!localIsOpen);
        }
    };

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: "안녕하세요! 저는 당신의 운명을 읽어주는 AI 점술가입니다. 무엇이든 물어보세요! (예: '올해 연애운 어때?', '내 MBTI와 사주 궁합은?')",
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userContext, setUserContext] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load User Context
        const loadContext = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.user_metadata) {
                setUserContext({
                    ...session.user.user_metadata,
                    birth_time: session.user.user_metadata.birth_time
                });
            }
        };
        loadContext();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            text: inputText,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        // Send to API
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: inputText,
                    messages: messages, // Send history context
                    mbti: userContext?.mbti,
                    birthDate: userContext?.birth_date,
                    birthTime: userContext?.birth_time,
                    name: userContext?.full_name,
                    gender: userContext?.gender
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            const botMsg: Message = {
                id: Date.now() + 1,
                text: data.reply,
                sender: 'bot',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error('Chat Error:', error);
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: "죄송합니다. 잠시 연결이 원활하지 않습니다. 다시 시도해 주세요.",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating Action Button - Only show on Desktop if not controlled (or if we want a FAB on desktop even if controlled)
                For now, we hide it on mobile since it's in the BottomNav
            */}
            <button
                onClick={handleToggle}
                className={`
                    fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-500
                    hidden md:block 
                    ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
                    bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                    hover:shadow-indigo-500/50 hover:-translate-y-1
                `}
            >
                <MessageCircle className="w-8 h-8 animate-pulse" />
            </button>

            {/* Chat Window */}
            <div
                className={`
          fixed bottom-6 right-6 z-50 w-full max-w-[380px] h-[600px] max-h-[80vh]
          bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'}
        `}
            >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">AI 점술가</h3>
                            <p className="text-xs text-indigo-100 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                운명 분석 중...
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
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`
                  max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${msg.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                    }
                `}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
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
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="운세를 물어보세요..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isTyping}
                            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
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
