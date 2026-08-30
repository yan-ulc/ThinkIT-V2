"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, FileText, Send, User } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! I have read your document. What would you like to know about it?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: input }]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    // TODO: Connect to Django API
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `This is a mock answer based on your question: "${currentInput}". The backend integration will replace this.` 
      }]);
    }, 1500);
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
                  : "glass border border-white/10 rounded-tl-sm"
              }`}>
                {msg.content}
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
