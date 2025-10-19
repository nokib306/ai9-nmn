import React, { useState, useRef, useEffect } from 'react';
import { type BrowserProfile, ProfileStatus, ChatMessage, MessageAuthor } from '../types';
import { getAiAgentResponse } from '../services/geminiService';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { FunctionCall } from '@google/genai';

interface AiAgentProps {
    isVisible: boolean;
    onClose: () => void;
    profiles: BrowserProfile[];
    actions: {
        navigate: (profileName: string, url: string) => string;
        launch: (profileName: string) => string;
        close: (profileName: string) => string;
        create: (profileName: string) => string;
    }
}

const AiAgent: React.FC<AiAgentProps> = ({ isVisible, onClose, profiles, actions }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { author: MessageAuthor.AI, text: "Hello! How can I help you manage your browser profiles?" }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleFunctionCall = (functionCall: FunctionCall) => {
        let result = "Unknown function.";
        const { name, args } = functionCall;

        if (name === 'navigate_url' && args.profile_name && args.url) {
            result = actions.navigate(args.profile_name as string, args.url as string);
        } else if (name === 'launch_profile' && args.profile_name) {
            result = actions.launch(args.profile_name as string);
        } else if (name === 'close_profile' && args.profile_name) {
            result = actions.close(args.profile_name as string);
        } else if (name === 'create_profile' && args.profile_name) {
            result = actions.create(args.profile_name as string);
        } else if (name === 'list_profiles') {
            if (profiles.length === 0) {
                result = "There are no profiles yet."
            } else {
                result = "Here are your profiles:\n" + profiles.map(p => `- ${p.name} (${p.status})`).join('\n');
            }
        }
        
        setMessages(prev => [...prev, { author: MessageAuthor.System, text: result }]);
        return result;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: ChatMessage = { author: MessageAuthor.User, text: input };
        setMessages(prev => [...prev, userMessage, { author: MessageAuthor.AI, text: '', isLoading: true }]);
        setInput('');

        const { text: aiText, functionCall } = await getAiAgentResponse(input, profiles);

        if (functionCall) {
            const systemResponse = handleFunctionCall(functionCall);
            // We can optionally send the result back to the LLM for a more natural response,
            // but for now we'll just show the direct system feedback.
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { author: MessageAuthor.AI, text: systemResponse };
                return newMessages;
            });
        } else {
             setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { author: MessageAuthor.AI, text: aiText || "I'm not sure how to respond to that." };
                return newMessages;
            });
        }
    };

    return (
        <div className={`fixed bottom-0 right-0 left-0 sm:left-auto sm:right-8 sm:bottom-28 bg-brand-surface border border-brand-dark/50 shadow-2xl rounded-t-lg sm:rounded-lg w-full sm:w-96 h-[70vh] sm:h-[60vh] flex flex-col transition-transform duration-300 ease-in-out z-[9998] ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <header className="flex items-center justify-between p-3 border-b border-brand-dark">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-brand-secondary" />
                    <h3 className="font-bold text-white">Aura AI Agent</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-dark">
                    <CloseIcon />
                </button>
            </header>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-2 ${msg.author === MessageAuthor.User ? 'justify-end' : 'justify-start'}`}>
                       {msg.author !== MessageAuthor.User && <div className="w-7 h-7 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-4 h-4 text-white"/></div>}
                        <div className={`max-w-xs md:max-w-sm rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msg.author === MessageAuthor.User ? 'bg-brand-secondary text-white rounded-br-none' : 'bg-brand-dark text-brand-text rounded-bl-none'}`}>
                            {msg.isLoading ? <div className="animate-pulse">...</div> : msg.text}
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t border-brand-dark flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g., Launch profile 'Work'"
                    className="w-full bg-brand-dark border border-brand-dark/50 focus:border-brand-secondary focus:ring-brand-secondary rounded-lg px-4 py-2 text-sm text-brand-text"
                />
                <button type="submit" className="bg-brand-secondary p-2 rounded-lg text-white hover:bg-blue-500 transition-colors disabled:opacity-50" disabled={!input.trim()}>
                    <SendIcon/>
                </button>
            </form>
        </div>
    );
};

export default AiAgent;