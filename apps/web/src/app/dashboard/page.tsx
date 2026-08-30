"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, FileText, LogOut, MessageSquare, Plus, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [documents] = useState([
    { id: 1, name: "Project_Blueprint.pdf", size: "2.4 MB", status: "READY" },
    { id: 2, name: "Financial_Report_Q3.pdf", size: "1.1 MB", status: "PROCESSING" },
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2">
          <Brain className="w-6 h-6 text-brand-400" />
          <span className="font-bold text-xl tracking-tight">ThinkIT</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 bg-brand-500/20 text-brand-300 px-4 py-3 rounded-xl transition-colors font-medium">
            <FileText className="w-5 h-5" />
            My Documents
          </Link>
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <button className="flex items-center gap-3 text-gray-400 hover:text-white px-4 py-3 w-full transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between glass md:bg-transparent">
          <h1 className="text-2xl font-bold">Documents</h1>
          <button className="md:hidden flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Upload
          </button>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full flex-1">
          {/* Upload Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full glass-dark border border-dashed border-brand-500/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/[0.02] transition-colors mb-12"
          >
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 mb-6">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Upload a Document</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Drag and drop your PDF here, or click to browse. We'll read it and get it ready for chat.
            </p>
            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all">
              Select PDF File
            </button>
          </motion.div>

          {/* Document List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold mb-6">Recent Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc, i) => (
                <div key={doc.id} className="glass p-5 rounded-2xl flex flex-col border border-white/10 hover:border-brand-500/50 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    {doc.status === "READY" ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">READY</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/20 animate-pulse">PROCESSING</span>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-lg truncate mb-1">{doc.name}</h4>
                  <p className="text-sm text-gray-500 mb-6">{doc.size}</p>
                  
                  <Link 
                    href={`/chat/${doc.id}`}
                    className={`mt-auto flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all ${
                      doc.status === "READY" 
                        ? "bg-brand-600 hover:bg-brand-500 text-white" 
                        : "bg-white/5 text-gray-500 pointer-events-none"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat with PDF
                  </Link>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
