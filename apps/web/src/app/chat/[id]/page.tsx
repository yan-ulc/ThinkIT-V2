"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, FileText, Send, User } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageRaw {
  id: string;
  sender: "USER" | "AI";
  content: string;
  references?: unknown[];
  created_at: string;
}

export default function ChatPage() {
  const params = useParams();
  const documentId = params.id as string;
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi there! I have read your document. What would you like to know about it?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetchApi(`/chat/?document_id=${documentId}`);
        const sessions = res.data || res;
        if (sessions && sessions.length > 0) {
          const session = sessions[0];
          setSessionId(session.id);
          if (session.messages && session.messages.length > 0) {
            const history = session.messages.flatMap((m: ChatMessageRaw): Message[] => {
               if (m.sender === 'USER') return [{ role: 'user', content: m.content }];
               if (m.sender === 'AI') return [{ role: 'assistant', content: m.content }];
               return [];
            });
            setMessages([
              { role: "assistant", content: "Hi there! I have read your document. What would you like to know about it?" },
              ...history
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch chat history", err);
      }
    };
    fetchHistory();
  }, [documentId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const currentInput = input;
    // Add user message immediately
    setMessages(prev => [...prev, { role: "user", content: currentInput }]);
    setInput("");
    setIsTyping(true);

    try {
      // NOTE: In Next.js 13+ App Router, params are usually accessed directly or via `useParams`. 
      // But we mapped it from props here.
      const res = await fetchApi("/chat/message/", {
        method: "POST",
        body: JSON.stringify({ 
          document_id: documentId, 
          session_id: sessionId,
          message: currentInput 
        })
      });
      
      if (!sessionId && res.data?.session_id) {
        setSessionId(res.data.session_id);
      }
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: res.data?.ai_message?.content || "Sorry, I couldn't generate an answer." 
      }]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setMessages(prev => [...prev, { 
        role: "assistant" as const, 
        content: `Error: ${error.message || "Failed to get answer from API"}` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Document Info */}
      <aside className="w-80 glass-dark border-r border-white/5 flex flex-col hidden lg:flex relative z-20">
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="font-semibold truncate">Project_Blueprint.pdf</h2>
        </div>
        
        <div className="p-6">
          <div className="w-full aspect-[3/4] bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-gray-500 mb-6 relative overflow-hidden">
             <FileText className="w-16 h-16 opacity-50 mb-4" />
             <span className="text-sm">PDF Preview Unavailable</span>
             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
          
          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-green-400 font-medium">READY</span>
            </div>
            <div className="flex justify-between">
              <span>Size</span>
              <span className="text-white">2.4 MB</span>
            </div>
            <div className="flex justify-between">
              <span>Chunks</span>
              <span className="text-white">124</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10 bg-black/20">
        <header className="lg:hidden p-4 border-b border-white/5 glass flex items-center gap-4 sticky top-0 z-20">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="font-semibold truncate text-sm">Project_Blueprint.pdf</h2>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === "user" 
                  ? "bg-brand-600 text-white" 
                  : "bg-white/10 border border-white/10 text-brand-400"
              }`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-tr-sm shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                  : "glass border border-white/10 rounded-tl-sm text-gray-200"
              }`}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({...props}) => <p className="mb-4 last:mb-0" {...props} />,
                      ul: ({...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                      li: ({...props}) => <li className="" {...props} />,
                      h1: ({...props}) => <h1 className="text-xl font-bold mb-4 mt-6 text-white" {...props} />,
                      h2: ({...props}) => <h2 className="text-lg font-bold mb-3 mt-5 text-white" {...props} />,
                      h3: ({...props}) => <h3 className="text-base font-bold mb-3 mt-4 text-white" {...props} />,
                      strong: ({...props}) => <strong className="font-bold text-white" {...props} />,
                      a: ({...props}) => <a className="text-brand-400 hover:underline" target="_blank" rel="noreferrer" {...props} />,
                      code: ({ className, children, ...props }) => {
                        const isInline = !className?.includes('language-');
                        return isInline
                          ? <code className="bg-black/40 px-1.5 py-0.5 rounded text-brand-300 font-mono text-xs" {...props}>{children}</code>
                          : <div className="bg-black/60 p-4 rounded-xl border border-white/10 mb-4 overflow-x-auto"><code className="text-gray-300 font-mono text-xs leading-relaxed" {...props}>{children}</code></div>;
                      },
                      blockquote: ({...props}) => <blockquote className="border-l-2 border-brand-500 pl-4 italic text-gray-400 mb-4" {...props} />,
                      table: ({...props}) => <div className="overflow-x-auto mb-4 border border-white/10 rounded-lg"><table className="w-full text-left border-collapse" {...props} /></div>,
                      thead: ({...props}) => <thead className="bg-white/5" {...props} />,
                      th: ({...props}) => <th className="border-b border-white/10 p-3 font-semibold text-white text-xs uppercase tracking-wider" {...props} />,
                      td: ({...props}) => <td className="border-b border-white/5 p-3 text-gray-300" {...props} />,
                      tr: ({...props}) => <tr className="last:border-0" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-3xl mr-auto"
            >
               <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/10 border border-white/10 text-brand-400">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-5 glass border border-white/10 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent sticky bottom-0">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-white/5 border border-white/10 p-2 rounded-3xl backdrop-blur-xl focus-within:ring-2 focus-within:ring-brand-500/50 transition-all shadow-2xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something about this document..."
                className="flex-1 bg-transparent border-none focus:outline-none text-white px-4 py-3 placeholder:text-gray-500"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:hover:bg-brand-600 transition-all shadow-lg"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-3">
              AI can make mistakes. Always verify important information with the original document.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
