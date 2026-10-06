
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';
import { ChatMessage, MeetingPlan } from '../types';

interface ChatBotProps {
  meetingPlan: MeetingPlan | null;
  docContext: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ meetingPlan, docContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: promptText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(promptText, messages, meetingPlan, docContext);
      const botMessage: ChatMessage = { role: 'model', content: reply };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: error?.message || "Sorry, I encountered an error processing that request."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    handleSendPrompt(input);
  };

  const quickPrompts = [
    "Draft calendar invite text",
    "List 3 key risks & questions",
    "How to shorten to 30 mins?",
  ];

  return (
    <div id="meeting-assistant-chat" className="flex flex-col h-[520px] border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <Bot size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Meeting Assistant</h3>
            <p className="text-[11px] text-slate-500">Refine agenda & draft invites</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-8 px-4 flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-3">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Interactive Assistant</p>
            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Ask to adjust timings, draft invitations, or probe document details.
            </p>
            <div className="flex flex-col gap-1.5 w-full">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(qp)}
                  className="text-xs text-left bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-between group"
                >
                  <span>{qp}</span>
                  <span className="text-slate-300 group-hover:text-blue-500 text-[10px]">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2.5 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-center text-slate-400 text-xs italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Loader2 size={13} className="animate-spin text-blue-600" />
              Gemini is analyzing...
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this agenda or document..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors shadow-sm flex items-center justify-center"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
