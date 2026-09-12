"use client";

import Link from "next/link";
import { ArrowRight, Brain, FileText, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { slideUp, staggerContainer, staggerItem } from "@/lib/animations";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between glass z-10 border-b border-white/10 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Brain className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white font-heading">ThinkIT</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-colors focus-ring touch-target flex items-center"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="text-xs sm:text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/25 active:scale-[0.98] focus-ring touch-target flex items-center"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="max-w-3xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-300 text-xs sm:text-sm font-medium mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
            <span>Personal AI Document Workspace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-heading leading-tight">
            Chat with your <br />
            <span className="text-gradient">Personal Documents</span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Upload your PDFs, books, and lecture notes. Our intelligent RAG engine reads them for you, generates AI practice quizzes, and answers questions with direct citations.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-500/25 focus-ring touch-target"
            >
              <span>Start for free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all border border-white/10 focus-ring touch-target"
            >
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 max-w-5xl mx-auto w-full px-4"
        >
          {[
            {
              icon: FileText,
              title: "Smart Document Ingestion",
              desc: "Upload PDFs with automatic chunking, dense vector embeddings, and persistent storage in PostgreSQL pgvector.",
            },
            {
              icon: Brain,
              title: "Conversational RAG with Citations",
              desc: "Ask deep questions across your library and receive accurate AI answers accompanied by interactive page citations.",
            },
            {
              icon: GraduationCap,
              title: "AI Quiz & Flashcards",
              desc: "Automatically generate multiple-choice quizzes and 3D study flashcards to accelerate comprehension.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="glass-card p-6 rounded-3xl flex flex-col items-center text-center space-y-3.5 border border-white/10 hover:border-brand-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-heading">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="py-8 text-center text-gray-500 text-xs mt-20 border-t border-white/5">
        © {new Date().getFullYear()} ThinkIT. All rights reserved.
      </footer>
    </div>
  );
}
