"use client";

import Link from "next/link";
import { ArrowRight, Brain, FileText, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between glass z-10 border-b-0 border-white/10 sticky top-0">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-brand-400" />
          <span className="font-bold text-xl tracking-tight">ThinkIT</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-brand-300 transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all border border-white/10"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Personal AI Document Workspace
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Chat with your <br />
            <span className="text-gradient">Personal Documents</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Upload your PDFs, books, and notes. Our intelligent RAG engine reads them for you. Ask questions and get instant, accurate answers based purely on your data.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-full font-semibold transition-all border border-white/10"
            >
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto w-full px-4"
        >
          {[
            { icon: FileText, title: "Smart Processing", desc: "We chunk, embed, and index your documents automatically using state-of-the-art vector databases." },
            { icon: Brain, title: "Instant Answers", desc: "Ask complex questions and get precise answers with direct citations to your original files." },
            { icon: Lock, title: "100% Private", desc: "Your workspace is yours alone. No team sharing, no data leaks. Pure personal intelligence." },
          ].map((feature, i) => (
            <div key={i} className="glass-dark p-6 rounded-2xl flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 border border-brand-500/30">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm mt-24 border-t border-white/5">
        © {new Date().getFullYear()} ThinkIT. All rights reserved.
      </footer>
    </div>
  );
}
