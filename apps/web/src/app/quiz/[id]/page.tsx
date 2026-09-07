"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  BookOpen, 
  Trophy, 
  AlertCircle,
  Clock,
  X,
  Eye,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";

interface QuizQuestion {
  id: string;
  question_type: "MCQ" | "FLASHCARD";
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  order: number;
  created_at: string;
}

interface Quiz {
  id: string;
  document: string;
  document_name: string;
  title: string;
  created_at: string;
  updated_at: string;
  total_questions: number;
  highest_score?: number | null;
  highest_percentage?: number | null;
  total_attempts?: number;
  questions: QuizQuestion[];
}

interface GradedQuestionResult {
  question_id: string;
  order: number;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

interface SubmitResponseData {
  attempt_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  is_new_high_score: boolean;
  highest_percentage: number;
  total_attempts: number;
  completed_at: string;
  results: GradedQuestionResult[];
}

interface AttemptItem {
  id: string;
  quiz: string;
  user: number;
  score: number;
  total_questions: number;
  percentage: number;
  answers: Record<string, string>;
  completed_at: string;
}

interface AttemptsSummaryData {
  quiz_id: string;
  quiz_title: string;
  highest_score: number | null;
  highest_percentage: number | null;
  total_attempts: number;
  attempts: AttemptItem[];
}

interface DocumentInfo {
  id: string;
  name: string;
  size: number;
  status: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuizPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeTab, setActiveTab] = useState<"quiz" | "flashcard" | "history">("quiz");

  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Practice Quiz Runner State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<SubmitResponseData | null>(null);

  // Attempts History State
  const [attemptsData, setAttemptsData] = useState<AttemptsSummaryData | null>(null);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

  // Flashcard Runner State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Export Copy State
  const [hasCopied, setHasCopied] = useState(false);

  // Quiz Generation Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [quizTitleInput, setQuizTitleInput] = useState("");
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<5 | 10 | 15 | 20>(5);

  // Fetch Document Info
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetchApi(`/documents/${documentId}/`);
        if (res && res.data) {
          setDocument(res.data);
        } else if (res && res.id) {
          setDocument(res as DocumentInfo);
        }
      } catch (err) {
        console.error("Failed to fetch document", err);
      } finally {
        setIsLoadingDoc(false);
      }
    };
    fetchDoc();
  }, [documentId]);

  // Fetch Attempts for a Quiz
  const fetchAttempts = async (quizId: string) => {
    setIsLoadingAttempts(true);
    try {
      const res = await fetchApi(`/documents/quizzes/${quizId}/attempts/`);
      if (res && res.data) {
        setAttemptsData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch quiz attempts", err);
    } finally {
      setIsLoadingAttempts(false);
    }
  };

  // Fetch Existing Quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetchApi(`/documents/${documentId}/quizzes/`);
        const list = res.data || [];
        setQuizzes(list);
        if (list.length > 0) {
          // Fetch full detail for the latest quiz
          const detailRes = await fetchApi(`/documents/quizzes/${list[0].id}/`);
          setActiveQuiz(detailRes);
          fetchAttempts(list[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch quizzes", err);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };
    fetchQuizzes();
  }, [documentId]);

  // Fetch attempts when active quiz changes
  useEffect(() => {
    if (activeQuiz?.id) {
      fetchAttempts(activeQuiz.id);
    }
  }, [activeQuiz?.id]);

  // Generate New Quiz with Gemini Flash
  const handleGenerateQuiz = async (customTitle?: string, count: number = 5) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);
    setIsConfigModalOpen(false);

    try {
      const payload: { title?: string; num_questions?: number } = {
        num_questions: count
      };
      if (customTitle && customTitle.trim()) {
        payload.title = customTitle.trim();
      }

      const res = await fetchApi(`/documents/${documentId}/generate-quiz/`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res && res.data) {
        const newQuiz = res.data as Quiz;
        setActiveQuiz(newQuiz);
        setQuizzes(prev => [newQuiz, ...prev.filter(q => q.id !== newQuiz.id)]);
        // Reset quiz runner state
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setQuizFinished(false);
        setIsReviewMode(false);
        setSubmittedResult(null);
        setSubmitError(null);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
        setActiveTab("quiz");
        setQuizTitleInput("");
        fetchAttempts(newQuiz.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate quiz with AI.";
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Switch Active Quiz from History
  const handleSelectQuiz = async (quizId: string) => {
    try {
      const res = await fetchApi(`/documents/quizzes/${quizId}/`);
      setActiveQuiz(res);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setQuizFinished(false);
      setIsReviewMode(false);
      setSubmittedResult(null);
      setSubmitError(null);
      setCurrentCardIndex(0);
      setIsCardFlipped(false);
      setActiveTab("quiz");
      fetchAttempts(quizId);
    } catch (err) {
      console.error("Failed to fetch quiz detail", err);
    }
  };

  // Filter questions
  const mcqQuestions = activeQuiz?.questions?.filter(q => q.question_type === "MCQ") || [];
  const flashcardQuestions = activeQuiz?.questions?.filter(q => q.question_type === "FLASHCARD") || [];

  // Quiz Navigation & Answering
  const currentQuestion = mcqQuestions[currentQuestionIndex];
  const selectedOption = selectedAnswers[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = mcqQuestions.length > 0 && answeredCount === mcqQuestions.length;
  const unansweredCount = Math.max(0, mcqQuestions.length - answeredCount);

  // In Exam Mode: user can select and change their answer freely.
  // In Review Mode: answers are locked.
  const handleSelectOption = (option: string) => {
    if (isReviewMode || submittedResult) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: option
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < mcqQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    setIsReviewMode(false);
    setSubmittedResult(null);
    setSubmitError(null);
  };

  const handleStartReview = () => {
    setIsReviewMode(true);
    setQuizFinished(false);
    setCurrentQuestionIndex(0);
  };

  // Submit Quiz to Backend
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || isSubmitting) return;

    if (!isAllAnswered) {
      // Find first unanswered index and focus it
      const firstUnanswered = mcqQuestions.findIndex((_, idx) => selectedAnswers[idx] === undefined);
      if (firstUnanswered !== -1) {
        setCurrentQuestionIndex(firstUnanswered);
      }
      setSubmitError(`Semua soal wajib dijawab sebelum submit. Masih ada ${unansweredCount} soal yang belum diisi.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetchApi(`/documents/quizzes/${activeQuiz.id}/submit/`, {
        method: "POST",
        body: JSON.stringify({ answers: selectedAnswers })
      });

      if (res && res.data) {
        setSubmittedResult(res.data);
        setQuizFinished(true);
        setIsReviewMode(false);
        // Refresh attempts history
        fetchAttempts(activeQuiz.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim jawaban kuis.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Score fallback calculation for display if needed
  const localScore = mcqQuestions.reduce((acc, q, idx) => {
    const chosen = selectedAnswers[idx];
    if (!chosen) return acc;
    const isCorrect = chosen === q.correct_answer || chosen.startsWith(q.correct_answer.slice(0, 2));
    return isCorrect ? acc + 1 : acc;
  }, 0);
  const localPercentage = mcqQuestions.length > 0 ? Math.round((localScore / mcqQuestions.length) * 100) : 0;

  const currentScore = submittedResult?.score ?? localScore;
  const currentPercentage = submittedResult?.percentage ?? localPercentage;
  const highestScorePercentage = submittedResult?.highest_percentage ?? attemptsData?.highest_percentage ?? activeQuiz?.highest_percentage ?? null;

  // Flashcard Flip & Navigation
  const currentCard = flashcardQuestions[currentCardIndex];

  const handleNextCard = () => {
    setIsCardFlipped(false);
    if (currentCardIndex < flashcardQuestions.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const handlePrevCard = () => {
    setIsCardFlipped(false);
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation for flashcards
  useEffect(() => {
    if (activeTab !== "flashcard") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsCardFlipped(prev => !prev);
      } else if (e.key === "ArrowRight") {
        setIsCardFlipped(false);
        setCurrentCardIndex(prev => (prev < flashcardQuestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowLeft") {
        setIsCardFlipped(false);
        setCurrentCardIndex(prev => (prev > 0 ? prev - 1 : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, flashcardQuestions.length]);

  // Export JSON
  const handleExportJson = () => {
    if (!activeQuiz) return;
    const blob = new Blob([JSON.stringify(activeQuiz, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${activeQuiz.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Markdown Study Guide
  const handleCopyMarkdown = () => {
    if (!activeQuiz) return;
    let md = `# ${activeQuiz.title}\nDokumen: ${document?.name || "ThinkIT Document"}\n\n`;
    md += `## Soal Pilihan Ganda (Practice Quiz)\n\n`;
    mcqQuestions.forEach((q, i) => {
      md += `### ${i + 1}. ${q.question_text}\n`;
      q.options.forEach(opt => {
        md += `- ${opt}\n`;
      });
      md += `\n**Jawaban Benar**: ${q.correct_answer}\n`;
      md += `*Pembahasan*: ${q.explanation}\n\n`;
    });

    md += `## Kartu Belajar (Flashcards)\n\n`;
    flashcardQuestions.forEach((f, i) => {
      md += `### Kartu ${i + 1}: ${f.question_text}\n`;
      md += `> ${f.explanation}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0c] text-white">
      {/* Top Header */}
      <header className="px-4 md:px-8 py-3.5 glass border-b border-white/10 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/quiz"
            className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
            title="Kembali ke Quiz Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl shrink-0 border border-purple-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm md:text-base truncate max-w-xs sm:max-w-md">
                  {activeQuiz?.title || "AI Quiz & Flashcards"}
                </h1>
                {highestScorePercentage !== null && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>Tertinggi: {highestScorePercentage}%</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate max-w-xs">
                {document?.name || "Loading document..."}
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/chat/${documentId}`}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-brand-400" />
            <span>Chat Room</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            disabled={isGenerating || document?.status !== "READY"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buat Kuis Baru</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {/* Error Alert */}
        {generateError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{generateError}</span>
            </div>
            <button
              onClick={() => setGenerateError(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {(isLoadingDoc || isLoadingQuizzes) && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Memuat materi kuis...</p>
          </div>
        )}

        {/* Generating AI State */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-10 rounded-3xl border border-brand-500/30 text-center my-auto flex flex-col items-center justify-center max-w-lg mx-auto shadow-2xl"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center text-white shadow-xl shadow-brand-500/30 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-brand-500/20 blur-lg -z-10"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Menganalisis Dokumen dengan Gemini Flash</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-4">
              Mengekstrak konsep kunci, menyusun soal kuis pilihan ganda terkalibrasi, dan merancang kartu belajar...
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-300 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyusun kurikulum latihan interaktif...</span>
            </div>
          </motion.div>
        )}

        {/* Empty State: No Quiz Generated Yet */}
        {!isLoadingDoc && !isLoadingQuizzes && !isGenerating && !activeQuiz && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-10 md:p-14 rounded-3xl border border-white/10 text-center my-auto flex flex-col items-center justify-center max-w-lg mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">Generate Kuis Latihan AI Anda</h2>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              Ubah dokumen <span className="text-white font-semibold">{document?.name || "PDF Anda"}</span> menjadi kuis pilihan ganda interaktif dan kartu belajar (flashcards) otomatis bertenaga Google Gemini Flash.
            </p>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              disabled={document?.status !== "READY"}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Buat Kuis Latihan & Flashcards</span>
            </button>
            {document?.status !== "READY" && (
              <p className="text-xs text-yellow-400 mt-3">
                Dokumen masih berstatus {document?.status}. Harus berstatus READY untuk generate kuis.
              </p>
            )}
          </motion.div>
        )}

        {/* Active Quiz Workspace */}
        {!isLoadingDoc && !isLoadingQuizzes && !isGenerating && activeQuiz && (
          <div className="flex-1 flex flex-col">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between mb-6 bg-white/5 border border-white/10 p-1 rounded-2xl">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("quiz")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                    activeTab === "quiz"
                      ? "bg-brand-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Kuis Pilihan Ganda ({mcqQuestions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("flashcard")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                    activeTab === "flashcard"
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Flashcards ({flashcardQuestions.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 pr-1">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                  title="Export Kuis format JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                  title="Salin Panduan Belajar Markdown"
                >
                  {hasCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === "history"
                      ? "bg-white/10 text-white font-semibold"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="Lihat Riwayat Attempt & Kuis"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Riwayat</span>
                  {attemptsData && attemptsData.total_attempts > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-brand-500/30 text-brand-300 text-[10px] font-bold">
                      {attemptsData.total_attempts}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: PRACTICE QUIZ RUNNER */}
            {activeTab === "quiz" && (
              <div className="flex-1 flex flex-col justify-between">
                {!quizFinished ? (
                  currentQuestion ? (
                    <motion.div
                      key={currentQuestion.id || currentQuestionIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass p-6 md:p-8 rounded-3xl border border-white/10 flex-1 flex flex-col justify-between"
                    >
                      <div>
                        {/* Review Mode Banner */}
                        {isReviewMode && (
                          <div className="mb-4 p-3 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-between text-xs text-brand-200">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-brand-400 shrink-0" />
                              <span>
                                <strong>Mode Review Jawaban</strong> — Nilai: {currentPercentage}% ({currentScore}/{mcqQuestions.length} Benar). Klik nomor soal untuk berpindah.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuizFinished(true)}
                              className="px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-white font-medium transition-all shrink-0 ml-2"
                            >
                              Lihat Rangkuman
                            </button>
                          </div>
                        )}

                        {/* Stepper Header & Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                            <span className="font-semibold text-brand-300 uppercase tracking-wider">
                              SOAL {currentQuestionIndex + 1} DARI {mcqQuestions.length}
                            </span>
                            <span>
                              {answeredCount} dari {mcqQuestions.length} Terjawab ({Math.round((answeredCount / mcqQuestions.length) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-brand-500 to-purple-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${(answeredCount / mcqQuestions.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Question Palette / Question Quick Jump Bar */}
                        <div className="mb-6 p-3 rounded-2xl bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 mb-2 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span>Daftar Nomor Soal:</span>
                              {!isReviewMode && (
                                <span className="text-gray-500 text-[10px]">(Bisa diklik untuk lompat)</span>
                              )}
                            </span>
                            {isReviewMode ? (
                              <span className="text-[10px] text-gray-300 flex items-center gap-2">
                                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Benar
                                </span>
                                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Salah
                                </span>
                              </span>
                            ) : (
                              <span>
                                {isAllAnswered ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Semua Terjawab
                                  </span>
                                ) : (
                                  <span className="text-amber-400 font-semibold">
                                    {unansweredCount} belum dijawab
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {mcqQuestions.map((q, idx) => {
                              const isCurrent = idx === currentQuestionIndex;
                              const isAnsweredThis = selectedAnswers[idx] !== undefined;

                              let btnStyle = "bg-white/5 text-gray-400 border-white/10 hover:border-white/30";

                              if (isReviewMode) {
                                const chosen = selectedAnswers[idx];
                                const isCorrect = chosen === q.correct_answer || (chosen && chosen.startsWith(q.correct_answer.slice(0, 2)));
                                if (isCorrect) {
                                  btnStyle = "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10";
                                } else {
                                  btnStyle = "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/10";
                                }
                              } else if (isAnsweredThis) {
                                btnStyle = "bg-brand-500/25 text-brand-200 border-brand-500/50";
                              }

                              if (isCurrent) {
                                btnStyle += " ring-2 ring-brand-400 ring-offset-2 ring-offset-[#0a0a0c] font-bold text-white shadow-md";
                              }

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setCurrentQuestionIndex(idx)}
                                  className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center border transition-all ${btnStyle}`}
                                  title={`Soal ${idx + 1}${isAnsweredThis ? " (Sudah Dijawab)" : " (Belum Dijawab)"}`}
                                >
                                  {idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Question Text */}
                        <h3 className="text-lg md:text-xl font-bold leading-relaxed mb-6 text-white">
                          {currentQuestion.question_text}
                        </h3>

                        {/* Options Grid */}
                        <div className="space-y-3 mb-6">
                          {currentQuestion.options.map((opt, optIdx) => {
                            const isSelected = selectedOption === opt;
                            const isCorrectAnswer = opt === currentQuestion.correct_answer || opt.startsWith(currentQuestion.correct_answer.slice(0, 2));

                            let optionStyle = "bg-white/5 border-white/10 hover:border-brand-500/40 text-gray-200 hover:bg-white/10";
                            let icon = null;

                            if (isReviewMode) {
                              // REVIEW MODE: reveal answers and corrections
                              if (isCorrectAnswer) {
                                optionStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10";
                                icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
                              } else if (isSelected) {
                                optionStyle = "bg-rose-500/20 border-rose-500 text-rose-200 shadow-md shadow-rose-500/10";
                                icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
                              } else {
                                optionStyle = "bg-white/5 border-white/5 text-gray-500 opacity-60";
                              }
                            } else {
                              // EXAM MODE: Highlight selected answer only, NO spoilers!
                              if (isSelected) {
                                optionStyle = "bg-brand-500/20 border-brand-500 text-white shadow-md shadow-brand-500/10";
                                icon = <div className="w-3.5 h-3.5 rounded-full bg-brand-400 ring-4 ring-brand-400/20 shrink-0" />;
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectOption(opt)}
                                disabled={isReviewMode}
                                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-sm md:text-base font-medium ${optionStyle}`}
                              >
                                <span>{opt}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation Card (Review Mode Only) & Navigation Stepper */}
                      <div>
                        {isReviewMode && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-xs md:text-sm text-brand-200 mb-6 leading-relaxed flex items-start gap-3 shadow-lg"
                          >
                            <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-brand-300">Pembahasan & Penjelasan AI:</strong>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                                  Kunci: {currentQuestion.correct_answer}
                                </span>
                              </div>
                              <p className="text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
                            </div>
                          </motion.div>
                        )}

                        {/* Submit Error Banner */}
                        {submitError && (
                          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>{submitError}</span>
                            </div>
                            <button
                              onClick={() => setSubmitError(null)}
                              className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-all shrink-0"
                            >
                              Tutup
                            </button>
                          </div>
                        )}

                        {/* Stepper Bottom Controls */}
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                          {/* Previous Button */}
                          <button
                            type="button"
                            onClick={handlePrevQuestion}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white/5"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Sebelumnya</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {/* Next Button */}
                            {currentQuestionIndex < mcqQuestions.length - 1 && (
                              <button
                                type="button"
                                onClick={handleNextQuestion}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs md:text-sm font-semibold text-white transition-all"
                              >
                                <span>Berikutnya</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}

                            {/* In Review Mode: Return to Score Summary */}
                            {isReviewMode ? (
                              <button
                                type="button"
                                onClick={() => setQuizFinished(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs md:text-sm transition-all shadow-lg shadow-brand-600/20"
                              >
                                <Trophy className="w-4 h-4" />
                                <span>Rangkuman Nilai</span>
                              </button>
                            ) : (
                              /* In Exam Mode: Submit Button with strict validation */
                              <button
                                type="button"
                                onClick={handleSubmitQuiz}
                                disabled={!isAllAnswered || isSubmitting}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg ${
                                  isAllAnswered
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 hover:scale-[1.02]"
                                    : "bg-white/10 text-gray-400 border border-white/10 cursor-not-allowed"
                                }`}
                                title={
                                  !isAllAnswered
                                    ? `Jawab seluruh ${mcqQuestions.length} soal untuk menyelesaikan kuis`
                                    : "Kirim jawaban dan lihat skor"
                                }
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menilai Kuis...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                      {isAllAnswered
                                        ? "Selesaikan Kuis"
                                        : `Selesaikan Kuis (${unansweredCount} Kosong)`}
                                    </span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="glass p-12 rounded-3xl border border-white/10 text-center">
                      <p className="text-gray-400">Tidak ada soal pilihan ganda pada kuis ini.</p>
                    </div>
                  )
                ) : (
                  /* SCORE COMPLETION CARD */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-8 md:p-12 rounded-3xl border border-white/10 text-center max-w-xl mx-auto flex flex-col items-center my-auto shadow-2xl"
                  >
                    {/* New High Score Celebratory Banner */}
                    {submittedResult?.is_new_high_score && (
                      <div className="w-full mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 flex items-center justify-center gap-2 text-amber-300 text-xs md:text-sm font-bold shadow-lg shadow-amber-500/10">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>REKOR BARU! Nilai Tertinggi Terbaru Berhasil Diraih!</span>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </div>
                    )}

                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-xl shadow-yellow-500/20 mb-6">
                      <Trophy className="w-10 h-10" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold mb-1 text-white">Kuis Selesai!</h2>
                    <p className="text-sm text-gray-400 mb-6">
                      Berikut hasil evaluasi untuk <span className="text-white font-semibold">{activeQuiz.title}</span>:
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-8">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Skor</span>
                        <span className="text-2xl font-extrabold text-brand-400">
                          {currentScore} / {mcqQuestions.length}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Akurasi</span>
                        <span className="text-2xl font-extrabold text-emerald-400">
                          {currentPercentage}%
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Nilai Tertinggi</span>
                        <span className="text-2xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{highestScorePercentage ?? currentPercentage}%</span>
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Percobaan</span>
                        <span className="text-2xl font-extrabold text-purple-400">
                          {submittedResult?.total_attempts ?? attemptsData?.total_attempts ?? 1}x
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      <button
                        type="button"
                        onClick={handleStartReview}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 hover:scale-[1.02]"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Review Pembahasan</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRestartQuiz}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Ulangi Kuis</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Riwayat Attempt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("flashcard")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/20"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Kartu Belajar</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB 2: FLASHCARD STUDY DECK */}
            {activeTab === "flashcard" && (
              <div className="flex-1 flex flex-col justify-between">
                {currentCard ? (
                  <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
                    {/* Flashcard Header Controls */}
                    <div className="flex items-center justify-between w-full text-xs text-gray-400 mb-4 px-2">
                      <span className="font-semibold text-purple-300">
                        CARD {currentCardIndex + 1} OF {flashcardQuestions.length}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        Tip: Tekan <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px]">Space</kbd> untuk membalik kartu
                      </span>
                    </div>

                    {/* 3D Flippable Card */}
                    <div
                      onClick={() => setIsCardFlipped(prev => !prev)}
                      className="w-full h-80 md:h-96 rounded-3xl cursor-pointer perspective select-none group"
                    >
                      <motion.div
                        animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="relative w-full h-full rounded-3xl preserve-3d"
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 backface-hidden glass p-8 md:p-10 rounded-3xl border border-white/10 hover:border-purple-500/50 flex flex-col justify-between text-center transition-colors">
                          <div className="flex items-center justify-between text-xs text-purple-400">
                            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 uppercase tracking-wider text-[10px] font-bold">
                              Konsep / Istilah
                            </span>
                            <span className="text-gray-500">Klik untuk membalik</span>
                          </div>

                          <div className="my-auto">
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                              {currentCard.question_text}
                            </h3>
                          </div>

                          <div className="text-xs text-gray-500">
                            Ketuk di mana saja untuk melihat definisi
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-purple-950/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-purple-500/40 flex flex-col justify-between text-center shadow-2xl">
                          <div className="flex items-center justify-between text-xs text-emerald-400">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 uppercase tracking-wider text-[10px] font-bold">
                              Jawaban / Definisi
                            </span>
                            <span className="text-gray-400">Klik untuk membalik</span>
                          </div>

                          <div className="my-auto">
                            <p className="text-base md:text-lg text-gray-200 leading-relaxed font-medium">
                              {currentCard.explanation || currentCard.correct_answer}
                            </p>
                          </div>

                          <div className="text-xs text-purple-300">
                            {document?.name || "Konteks Dokumen"}
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Deck Stepper Navigation */}
                    <div className="flex items-center justify-between w-full mt-6 px-2">
                      <button
                        type="button"
                        onClick={handlePrevCard}
                        disabled={currentCardIndex === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sebelumnya</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCardFlipped(prev => !prev)}
                        className="p-2.5 rounded-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 transition-all"
                        title="Balik Kartu"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNextCard}
                        disabled={currentCardIndex === flashcardQuestions.length - 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                      >
                        <span>Berikutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="glass p-12 rounded-3xl border border-white/10 text-center">
                    <p className="text-gray-400">Tidak ada flashcard pada paket kuis ini.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HISTORY & ALL ATTEMPTS */}
            {activeTab === "history" && (
              <div className="space-y-6">
                {/* Section 1: Attempt History for Active Quiz */}
                <div className="glass p-6 md:p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-white">Riwayat Percobaan Kuis Ini</h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Statistik dan rekaman semua pengerjaan untuk "{activeQuiz.title}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleRestartQuiz();
                        setActiveTab("quiz");
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all shadow"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kerjakan Ulang Kuis</span>
                    </button>
                  </div>

                  {/* Summary Metric Banners */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                      <span className="text-[11px] font-semibold text-amber-300 block mb-1">NILAI TERTINGGI</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                          {attemptsData?.highest_percentage !== null && attemptsData?.highest_percentage !== undefined
                            ? `${attemptsData.highest_percentage}%`
                            : "Belum Ada"}
                        </span>
                        {attemptsData?.highest_score !== null && attemptsData?.highest_score !== undefined && (
                          <span className="text-xs text-amber-300/80">
                            ({attemptsData.highest_score}/{mcqQuestions.length} Benar)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                      <span className="text-[11px] font-semibold text-purple-300 block mb-1">TOTAL PERCOBAAN</span>
                      <span className="text-2xl font-bold text-white">
                        {attemptsData?.total_attempts ?? 0} Kali
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                      <span className="text-[11px] font-semibold text-blue-300 block mb-1">STATUS KUIS</span>
                      <span className="text-2xl font-bold text-white">
                        {attemptsData && attemptsData.total_attempts > 0 ? "Terselesaikan" : "Belum Dicoba"}
                      </span>
                    </div>
                  </div>

                  {/* Attempts List */}
                  {isLoadingAttempts ? (
                    <div className="py-10 text-center flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                      <span>Memuat riwayat pengerjaan...</span>
                    </div>
                  ) : attemptsData?.attempts && attemptsData.attempts.length > 0 ? (
                    <div className="space-y-3">
                      {attemptsData.attempts.map((att, idx) => {
                        const dateFormatted = new Date(att.completed_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        const isTopScore = att.percentage === attemptsData.highest_percentage;

                        let scoreColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                        if (att.percentage < 60) {
                          scoreColor = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                        } else if (att.percentage < 80) {
                          scoreColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
                        }

                        return (
                          <div
                            key={att.id}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-gray-300">
                                #{attemptsData.attempts.length - idx}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-white">
                                    {att.score} dari {att.total_questions} Soal Benar
                                  </span>
                                  {isTopScore && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1">
                                      <Trophy className="w-3 h-3 text-amber-400" />
                                      <span>Nilai Tertinggi</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{dateFormatted}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`px-3 py-1.5 rounded-xl font-bold text-sm border ${scoreColor}`}>
                                {att.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-gray-400 text-sm mb-3">
                        Belum ada riwayat pengerjaan kuis ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleRestartQuiz();
                          setActiveTab("quiz");
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all"
                      >
                        Mulai Kerjakan Sekarang
                      </button>
                    </div>
                  )}
                </div>

                {/* Section 2: Other Quizzes for this Document */}
                <div className="glass p-6 md:p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="text-lg font-bold text-white">Daftar Paket Kuis Dokumen Ini</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Semua variasi kuis yang dibuat dari materi "{document?.name || "dokumen ini"}"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConfigModalOpen(true)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Buat Variasi Lain</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {quizzes.map((q) => {
                      const isCurrent = q.id === activeQuiz.id;
                      const dateFormatted = new Date(q.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                            isCurrent
                              ? "bg-brand-500/15 border-brand-500/50"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate text-white">{q.title}</h4>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-brand-500 text-[10px] font-bold text-white">
                                  SEDANG AKTIF
                                </span>
                              )}
                              {q.highest_percentage !== null && q.highest_percentage !== undefined && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-amber-400" />
                                  <span>Tertinggi: {q.highest_percentage}%</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {dateFormatted} • {q.total_questions || 5} Soal & Flashcards
                            </p>
                          </div>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSelectQuiz(q.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all shrink-0"
                            >
                              Buka Kuis Ini
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUIZ CONFIGURATION MODAL */}
        {isConfigModalOpen && (
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
                    <h3 className="text-lg font-bold text-white">Generate AI Quiz</h3>
                    <p className="text-xs text-gray-400">Atur judul dan jumlah soal kuis</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Quiz Title Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Judul Kuis (Opsional)
                  </label>
                  <input
                    type="text"
                    value={quizTitleInput}
                    onChange={(e) => setQuizTitleInput(e.target.value)}
                    placeholder={`Default: Kuis: ${document?.name || "Materi Dokumen"}`}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Bisa dikosongkan untuk memakai judul otomatis dari AI.
                  </p>
                </div>

                {/* Question Count Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Pilih Jumlah Soal & Flashcards
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      { count: 5, label: "5 Soal", desc: "~7 detik (Cepat)" },
                      { count: 10, label: "10 Soal", desc: "~15 detik (Standar)" },
                      { count: 15, label: "15 Soal", desc: "~25 detik (Lengkap)" },
                      { count: 20, label: "20 Soal", desc: "~35 detik (Komprehensif)" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.count}
                        type="button"
                        onClick={() => setSelectedQuestionCount(opt.count)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedQuestionCount === opt.count
                            ? "bg-brand-500/20 border-brand-500 text-white shadow-lg shadow-brand-500/10"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{opt.label}</span>
                          {selectedQuestionCount === opt.count && (
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
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateQuiz(quizTitleInput, selectedQuestionCount)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mulai Generate ({selectedQuestionCount} Soal)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
