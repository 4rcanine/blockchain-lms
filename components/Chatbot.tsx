// components/Chatbot.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // <--- IMPORT THIS
import { 
    MessageCircle, 
    X, 
    Send, 
    Bot, 
    User, 
    Sparkles, 
    Loader2 
} from 'lucide-react';

interface Message {
    text: string;
    sender: 'user' | 'ai';
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Ref for auto-scrolling to the bottom
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/chat', { prompt: input });
            const aiMessage: Message = { text: response.data.response, sender: 'ai' };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: Message = { text: "I'm having trouble connecting to the neural network. Please try again later.", sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* --- Chat Window --- */}
            <div 
                className={`fixed bottom-24 right-6 w-full max-w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right z-50 border border-gray-100 overflow-hidden ${
                    isOpen 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-95 translate-y-10 pointer-events-none'
                }`}
                style={{ height: '600px', maxHeight: '80vh' }}
            >
                {/* Header */}
                <header className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base leading-tight">AI Assistant</h2>
                            <p className="text-xs text-indigo-100 opacity-90 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                Online & Ready
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Messages Area */}
                <div className="flex-grow p-4 overflow-y-auto bg-slate-50 space-y-4 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="w-8 h-8 text-indigo-500" />
                            </div>
                            <p className="font-medium text-gray-600">How can I help you learn Web3 today?</p>
                            <p className="text-xs mt-2">Ask about Solidity, React, or Smart Contracts.</p>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                            )}
                            
                            <div 
                                className={`p-3.5 max-w-[85%] text-sm leading-relaxed shadow-sm ${
                                    msg.sender === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'
                                }`}
                            >
                                {/* --- MARKDOWN RENDERER --- */}
                                <ReactMarkdown
                                    components={{
                                        // Custom styling for specific Markdown elements
                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                        code: ({node, ...props}) => <code className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                                        pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-2 rounded-lg text-xs overflow-x-auto mb-2" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>

                            {msg.sender === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                                    <User className="w-4 h-4 text-gray-500" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex justify-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type your question..."
                            disabled={isLoading}
                            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-400">AI can make mistakes. Verify important info.</p>
                    </div>
                </div>
            </div>

            {/* --- Floating Toggle Button --- */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all duration-300 z-[60] group ${
                    isOpen 
                        ? 'bg-gray-800 rotate-90' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-110'
                }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <MessageCircle className="w-7 h-7 text-white fill-white/20" />
                )}
                
                {/* Notification ping animation markdown*/}
                {!isOpen && messages.length === 0 && (
                    <span className="absolute top-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </button>
        </>
    );
}