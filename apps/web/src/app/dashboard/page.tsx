"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, FileText, LogOut, MessageSquare, Plus, UploadCloud, Loader2, HardDrive, Layers, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi, API_URL } from "@/lib/api";

interface Document {
  id: string;
  name: string;
  size: number;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  created_at: string;
}

interface DocumentAnalytics {
  total_documents: number;
  total_storage_bytes: number;
  storage_used_mb: number;
  total_chunks: number;
  status_counts: {
    ready: number;
    processing: number;
    queued: number;
    failed: number;
    uploading: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetchApi("/documents/analytics/");
      if (res && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const streamDocuments = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return router.push("/login");

      await fetchAnalytics();

      try {
        // SSE requires importing API_URL, let's just use fetchApi as a base or write raw fetch
        const response = await fetch(`${API_URL}/documents/stream/`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortController.signal
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("access_token");
            router.push("/login?expired=1");
          }
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep the incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                setDocuments(data);
                fetchAnalytics();
              } catch {}
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') console.error("Stream failed", err);
      }
    };

    streamDocuments();

    return () => abortController.abort();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("access_token");
    router.push("/");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    // Note: In real app, add Idempotency-Key header for this request

    try {
      await fetchApi("/documents/upload/", {
        method: "POST",
        body: formData,
      });
      fetchAnalytics();
      // SSE will auto-update the list!
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
          <Link href="/profile" className="flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl transition-colors font-medium">
            <Brain className="w-5 h-5" />
            User Profile
          </Link>
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 text-gray-400 hover:text-white px-4 py-3 w-full transition-colors">
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
          {/* Document Analytics Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {/* Total Documents Card */}
            <div className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Total Documents</span>
                <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoadingAnalytics ? "..." : (analytics?.total_documents ?? documents.length)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics?.status_counts?.ready ?? 0} ready for AI chat
                </p>
              </div>
            </div>

            {/* Storage Used Card */}
            <div className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Storage Used</span>
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <HardDrive className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoadingAnalytics
                    ? "..."
                    : analytics
                    ? analytics.storage_used_mb >= 1
                      ? `${analytics.storage_used_mb} MB`
                      : `${Math.round(analytics.total_storage_bytes / 1024)} KB`
                    : "0 KB"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Total uploaded file size</p>
              </div>
            </div>

            {/* Chunks Indexed Card */}
            <div className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Chunks Indexed</span>
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoadingAnalytics ? "..." : (analytics?.total_chunks ?? 0)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Vector embeddings ready</p>
              </div>
            </div>

            {/* Document Status Breakdown Card */}
            <div className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Status Overview</span>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    {analytics?.status_counts?.ready ?? 0} Ready
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    {(analytics?.status_counts?.processing ?? 0) + (analytics?.status_counts?.queued ?? 0)} Active
                  </span>
                  {(analytics?.status_counts?.failed ?? 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      {analytics?.status_counts?.failed} Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Processing breakdown</p>
              </div>
            </div>
          </motion.div>

          {/* Upload Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full glass-dark border border-dashed border-brand-500/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/[0.02] transition-colors mb-12"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf" 
              className="hidden" 
            />
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 mb-6">
              {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold mb-2">
              {isUploading ? "Uploading..." : "Upload a Document"}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Drag and drop your PDF here, or click to browse. We&apos;ll read it and get it ready for chat.
            </p>
            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all pointer-events-none">
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
            {documents.map((doc) => (
                <div key={doc.id} className="glass p-5 rounded-2xl flex flex-col border border-white/10 hover:border-brand-500/50 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    {doc.status === "READY" ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">READY</span>
                    ) : doc.status === "FAILED" ? (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">FAILED</span>
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
