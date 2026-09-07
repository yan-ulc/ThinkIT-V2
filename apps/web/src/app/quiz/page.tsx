"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  FileText,
  LogOut,
  GraduationCap,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Layers,
  Clock,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";

interface QuizItem {
  id: string;
  document: string;
  document_name: string;
  title: string;
  created_at: string;
  total_questions: number;
}

interface DocumentItem {
  id: string;
  name: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
}

export default function QuizHubPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create Quiz Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15 | 20>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Fetch all quizzes and user documents
  useEffect(() => {
    const loadData = async () => {
      try {
        const [quizzesRes, docsRes] = await Promise.all([
          fetchApi("/documents/quizzes/"),
          fetchApi("/documents/")
        ]);

        const quizList = (quizzesRes && quizzesRes.data ? quizzesRes.data : quizzesRes) || [];
        const docList = (docsRes && docsRes.data ? docsRes.data : docsRes) || [];

        setQuizzes(Array.isArray(quizList) ? quizList : []);
        const readyDocs = (Array.isArray(docList) ? docList : []).filter(
          (d: DocumentItem) => d.status === "READY"
        );
        setDocuments(readyDocs);
        if (readyDocs.length > 0) {
          setSelectedDocId(readyDocs[0].id);
        }
      } catch (err) {
        console.error("Failed to load quiz hub data", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/login");
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kuis ini?")) return;
    setDeletingId(quizId);
    try {
      await fetchApi(`/documents/quizzes/${quizId}/`, {
        method: "DELETE"
      });
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (err) {
      console.error("Failed to delete quiz", err);
      alert("Gagal menghapus kuis. Silakan coba lagi.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedDocId) {
      setGenerateError("Pilih dokumen sumber terlebih dahulu.");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const payload: { title?: string; num_questions: number } = {
        num_questions: questionCount
      };
      if (customTitle.trim()) {
        payload.title = customTitle.trim();
      }

      const res = await fetchApi(`/documents/${selectedDocId}/generate-quiz/`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res && res.data) {
        setIsModalOpen(false);
        // Navigate directly to the newly generated quiz view
        router.push(`/quiz/${selectedDocId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat kuis.";
      setGenerateError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return quizzes;
    return quizzes.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.document_name && item.document_name.toLowerCase().includes(q))
    );
  }, [quizzes, searchQuery]);

  // Aggregate Stats
  const totalQuizzes = quizzes.length;
  const totalQuestions = quizzes.reduce((acc, curr) => acc + (curr.total_questions || 5), 0);
  const totalDocsCovered = new Set(quizzes.map(q => q.document)).size;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2">
          <Brain className="w-6 h-6 text-brand-400" />
          <span className="font-bold text-xl tracking-tight">ThinkIT</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl transition-colors font-medium"
          >
            <FileText className="w-5 h-5" />
            My Documents
          </Link>
          <Link
            href="/quiz"
            className="flex items-center gap-3 bg-brand-500/20 text-brand-300 px-4 py-3 rounded-xl transition-colors font-medium"
          >
            <GraduationCap className="w-5 h-5" />
            Quiz & Flashcards
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl transition-colors font-medium"
          >
            <Brain className="w-5 h-5" />
            User Profile
          </Link>
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-400 hover:text-white px-4 py-3 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {/* Top Header */}
        <header className="px-6 md:px-8 py-6 border-b border-white/5 flex items-center justify-between glass md:bg-transparent">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-brand-400" />
              <span>AI Quiz & Flashcards</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Koleksi kuis latihan interaktif dan kartu belajar materi PDF Anda
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kuis Baru</span>
          </button>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full flex-1">
          {/* Analytics Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Total Kuis Dibuat</span>
                <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoading ? "..." : totalQuizzes}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Paket kuis siap dikerjakan</p>
              </div>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Total Soal & Flashcards</span>
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoading ? "..." : totalQuestions}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Pertanyaan & kartu belajar AI</p>
              </div>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">Dokumen Tercakup</span>
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isLoading ? "..." : `${totalDocsCovered} Dokumen`}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Materi yang telah dievaluasi</p>
              </div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan judul kuis atau nama dokumen..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-gray-400 self-center">
              Menampilkan <span className="text-white font-semibold">{filteredQuizzes.length}</span> kuis
            </div>
          </div>

          {/* Quizzes Grid / List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Memuat daftar kuis...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="glass p-12 md:p-16 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-6 shadow-inner">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {searchQuery ? "Kuis Tidak Ditemukan" : "Belum Ada Kuis Dibuat"}
              </h3>
              <p className="text-sm text-gray-400 max-w-xs mb-6">
                {searchQuery
                  ? `Tidak ada kuis yang cocok dengan kata kunci "${searchQuery}".`
                  : "Buat kuis latihan dan kartu belajar AI dari dokumen PDF Anda untuk menguji pemahaman konsep."}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kuis Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map(quiz => {
                const dateFormatted = new Date(quiz.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });

                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-6 rounded-3xl border border-white/10 flex flex-col justify-between hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/5 transition-all group"
                  >
                    <div>
                      {/* Document Tag */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-gray-300 truncate max-w-[200px]">
                          <FileText className="w-3 h-3 text-brand-400 shrink-0" />
                          <span className="truncate">{quiz.document_name || "Dokumen PDF"}</span>
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
                          {quiz.total_questions || 10} Soal
                        </span>
                      </div>

                      {/* Quiz Title */}
                      <h3 className="font-bold text-lg text-white mb-2 group-hover:text-brand-300 transition-colors line-clamp-2">
                        {quiz.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Dibuat {dateFormatted}</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                      <Link
                        href={`/quiz/${quiz.document}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Mulai Latihan</span>
                      </Link>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        disabled={deletingId === quiz.id}
                        className="p-2 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 rounded-xl transition-colors disabled:opacity-50"
                        title="Hapus Kuis"
                      >
                        {deletingId === quiz.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* CREATE QUIZ MODAL */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-6 md:p-8 rounded-3xl border border-white/20 max-w-md w-full shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Buat Kuis AI Baru</h3>
                      <p className="text-xs text-gray-400">Generate kuis & flashcard dari dokumen</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {generateError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{generateError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Select Document */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Pilih Dokumen Sumber
                    </label>
                    {documents.length === 0 ? (
                      <p className="text-xs text-yellow-400">
                        Belum ada dokumen yang berstatus READY. Unggah dokumen di menu My Documents terlebih dahulu.
                      </p>
                    ) : (
                      <select
                        value={selectedDocId}
                        onChange={e => setSelectedDocId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                      >
                        {documents.map(doc => (
                          <option key={doc.id} value={doc.id} className="bg-slate-900 text-white">
                            {doc.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Custom Title Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Judul Kuis (Opsional)
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder="Contoh: Kuis Pertemuan 1 - Konsep Dasar"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
                    />
                  </div>

                  {/* Question Count Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Jumlah Soal & Flashcards
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {([
                        { count: 5, label: "5 Soal", desc: "~7s (Cepat)" },
                        { count: 10, label: "10 Soal", desc: "~15s (Standar)" },
                        { count: 15, label: "15 Soal", desc: "~25s (Lengkap)" },
                        { count: 20, label: "20 Soal", desc: "~35s (Komprehensif)" },
                      ] as const).map(opt => (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => setQuestionCount(opt.count)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            questionCount === opt.count
                              ? "bg-brand-500/20 border-brand-500 text-white shadow-lg shadow-brand-500/10"
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{opt.label}</span>
                            {questionCount === opt.count && (
                              <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 block mt-1">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isGenerating}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateQuiz}
                    disabled={isGenerating || documents.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sedang Menghasilkan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate ({questionCount} Soal)</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
