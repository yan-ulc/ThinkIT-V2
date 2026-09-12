"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  GraduationCap,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Layers,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface QuizItem {
  id: string;
  document: string;
  document_name: string;
  title: string;
  created_at: string;
  total_questions: number;
  total_flashcards?: number;
  highest_score?: number | null;
  highest_percentage?: number | null;
  total_attempts?: number;
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [quizzesRes, docsRes] = await Promise.all([
          fetchApi("/documents/quizzes/"),
          fetchApi("/documents/"),
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

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kuis ini?")) return;
    setDeletingId(quizId);
    try {
      await fetchApi(`/documents/quizzes/${quizId}/`, {
        method: "DELETE",
      });
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error("Gagal menghapus kuis", err);
      alert("Gagal menghapus kuis");
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
      const payload: { num_questions: number; title?: string } = {
        num_questions: questionCount,
      };
      if (customTitle.trim()) {
        payload.title = customTitle.trim();
      }

      const res = await fetchApi(`/documents/${selectedDocId}/generate-quiz/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newQuiz = res && res.data ? res.data : res;
      if (newQuiz && newQuiz.id) {
        setIsModalOpen(false);
        setCustomTitle("");
        router.push(`/quiz/${selectedDocId}`);
      } else {
        setGenerateError(res?.message || "Gagal membuat kuis. Coba lagi.");
      }
    } catch (err: unknown) {
      console.error("Quiz generation error", err);
      setGenerateError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memanggil AI generator."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) return quizzes;
    const q = searchQuery.toLowerCase();
    return quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(q) ||
        (quiz.document_name && quiz.document_name.toLowerCase().includes(q))
    );
  }, [quizzes, searchQuery]);

  const totalQuizzes = quizzes.length;
  const totalQuestions = useMemo(() => {
    return quizzes.reduce((acc, curr) => acc + (curr.total_questions ?? 0), 0);
  }, [quizzes]);

  const totalDocsCovered = useMemo(() => {
    const docIds = new Set(quizzes.map((q) => q.document));
    return docIds.size;
  }, [quizzes]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Reusable Desktop Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {/* Reusable Responsive App Header */}
        <AppHeader
          title="AI Quiz & Flashcards"
          subtitle="Koleksi kuis latihan interaktif dan kartu belajar materi PDF Anda"
          actions={
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Buat Kuis Baru
            </Button>
          }
        />

        <div className="p-5 md:p-8 max-w-6xl mx-auto w-full flex-1">
          {/* Analytics Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total Kuis Dibuat
                </span>
                <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white font-heading">
                  {isLoading ? "..." : totalQuizzes}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Paket kuis siap dikerjakan</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total Soal & Flashcards
                </span>
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white font-heading">
                  {isLoading ? "..." : totalQuestions}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Pertanyaan & kartu belajar AI</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Dokumen Tercakup
                </span>
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white font-heading">
                  {isLoading ? "..." : `${totalDocsCovered} Dokumen`}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Materi yang telah dievaluasi</p>
              </div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan judul kuis atau nama dokumen..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus-ring transition-all"
                aria-label="Cari kuis"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors focus-ring"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="w-3.5 h-3.5" />
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
            <div className="glass-card p-10 md:p-16 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-6 shadow-inner">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-heading">
                {searchQuery ? "Kuis Tidak Ditemukan" : "Belum Ada Kuis Dibuat"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xs mb-6 leading-relaxed">
                {searchQuery
                  ? `Tidak ada kuis yang cocok dengan kata kunci "${searchQuery}".`
                  : "Buat kuis latihan dan kartu belajar AI dari dokumen PDF Anda untuk menguji pemahaman konsep."}
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Buat Kuis Sekarang
              </Button>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredQuizzes.map((quiz) => {
                const dateFormatted = new Date(quiz.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <motion.div
                    key={quiz.id}
                    variants={staggerItem}
                    whileHover={{ y: -3 }}
                    className="glass-card glass-hover p-5 rounded-3xl border border-white/10 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Document Tag */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="brand" size="sm">
                          {quiz.total_questions ?? 0} Soal
                        </Badge>
                        <span className="text-[11px] text-gray-400">{dateFormatted}</span>
                      </div>

                      <h3
                        className="font-bold text-base text-white mb-1.5 line-clamp-2 leading-snug group-hover:text-brand-300 transition-colors"
                        title={quiz.title}
                      >
                        {quiz.title}
                      </h3>

                      <p
                        className="text-xs text-gray-400 flex items-center gap-1.5 mb-5 truncate"
                        title={quiz.document_name}
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{quiz.document_name || "Dokumen PDF"}</span>
                      </p>

                      {/* Score or Attempts */}
                      {quiz.highest_percentage !== undefined && quiz.highest_percentage !== null ? (
                        <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-gray-300 font-medium">Skor Tertinggi</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">
                            {quiz.highest_percentage}%
                          </span>
                        </div>
                      ) : (
                        <div className="mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 text-center">
                          Belum pernah dikerjakan
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      <Link
                        href={`/quiz/${quiz.document}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/20 active:scale-[0.98] focus-ring touch-target"
                        aria-label={`Mulai kuis ${quiz.title}`}
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Mulai Latihan</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        disabled={deletingId === quiz.id}
                        className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 text-gray-400 hover:text-rose-300 transition-colors focus-ring touch-target flex items-center justify-center"
                        title="Hapus kuis"
                        aria-label={`Hapus kuis ${quiz.title}`}
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
            </motion.div>
          )}
        </div>

        {/* Create Quiz Modal using standardized Modal component */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-heading">Buat Kuis AI Baru</h3>
                <p className="text-xs text-gray-400">Generate kuis & flashcard dari dokumen</p>
              </div>
            </div>
          }
        >
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
                <p className="text-xs text-amber-400">
                  Belum ada dokumen yang berstatus READY. Unggah dokumen di menu My Documents terlebih dahulu.
                </p>
              ) : (
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus-ring transition-all"
                  aria-label="Pilih dokumen sumber kuis"
                >
                  {documents.map((doc) => (
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
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Contoh: Kuis Pertemuan 1 - Konsep Dasar"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-sm focus-ring transition-all"
                aria-label="Judul kuis opsional"
              />
            </div>

            {/* Question Count Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Jumlah Soal & Flashcards
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { count: 5, label: "5 Soal", desc: "~7s (Cepat)" },
                    { count: 10, label: "10 Soal", desc: "~15s (Standar)" },
                    { count: 15, label: "15 Soal", desc: "~25s (Lengkap)" },
                    { count: 20, label: "20 Soal", desc: "~35s (Komprehensif)" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setQuestionCount(opt.count)}
                    className={`p-3 rounded-2xl border text-left transition-all focus-ring touch-target ${
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
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsModalOpen(false)}
              disabled={isGenerating}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateQuiz}
              disabled={isGenerating || documents.length === 0}
              isLoading={isGenerating}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Generate ({questionCount} Soal)
            </Button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
