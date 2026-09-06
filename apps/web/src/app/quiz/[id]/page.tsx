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
  Clock
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
  questions: QuizQuestion[];
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

  // Flashcard Runner State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Export Copy State
  const [hasCopied, setHasCopied] = useState(false);

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
        }
      } catch (err) {
        console.error("Failed to fetch quizzes", err);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };
    fetchQuizzes();
  }, [documentId]);

  // Generate New Quiz with Gemini 2.5 Flash
  const handleGenerateQuiz = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetchApi(`/documents/${documentId}/generate-quiz/`, {
        method: "POST"
      });

      if (res && res.data) {
        const newQuiz = res.data as Quiz;
        setActiveQuiz(newQuiz);
        setQuizzes(prev => [newQuiz, ...prev.filter(q => q.id !== newQuiz.id)]);
        // Reset quiz runner state
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setQuizFinished(false);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
        setActiveTab("quiz");
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
      setCurrentCardIndex(0);
      setIsCardFlipped(false);
      setActiveTab("quiz");
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
  const isAnswered = selectedOption !== undefined;

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: option
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < mcqQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizFinished(false);
  };

  // Score Calculation
  const score = mcqQuestions.reduce((acc, q, idx) => {
    const chosen = selectedAnswers[idx];
    if (!chosen) return acc;
    // Check match either whole string or option prefix
    const isCorrect = chosen === q.correct_answer || chosen.startsWith(q.correct_answer.slice(0, 2));
    return isCorrect ? acc + 1 : acc;
  }, 0);

  const percentage = mcqQuestions.length > 0 ? Math.round((score / mcqQuestions.length) * 100) : 0;

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
            href="/dashboard"
            className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
            title="Back to Dashboard"
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
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 text-[10px] font-semibold border border-brand-500/30">
                  Gemini 2.5 Flash
                </span>
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
            onClick={handleGenerateQuiz}
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
                <span>Generate New</span>
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
            <p className="text-gray-400 text-sm">Loading quiz materials...</p>
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
            <h3 className="text-xl font-bold text-white mb-2">Analyzing Document with Gemini 2.5</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-4">
              Extracting key concepts, synthesizing 5 practice questions with explanations, and building flashcards...
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-300 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing educational curriculum...</span>
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
            <h2 className="text-2xl font-bold mb-3 text-white">Generate Your AI Practice Quiz</h2>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              Transform <span className="text-white font-semibold">{document?.name || "your document"}</span> into interactive multiple-choice tests and study flashcards powered by Google Gemini.
            </p>
            <button
              onClick={handleGenerateQuiz}
              disabled={document?.status !== "READY"}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Practice Quiz & Flashcards</span>
            </button>
            {document?.status !== "READY" && (
              <p className="text-xs text-yellow-400 mt-3">
                Document is currently {document?.status}. It must be READY to generate quizzes.
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
                  <span>Practice Quiz ({mcqQuestions.length})</span>
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
                  title="Export Quiz as JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                  title="Copy Study Guide as Markdown"
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
                  title="View Past Quizzes"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">History</span>
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
                      {/* Stepper Header & Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                          <span className="font-semibold text-brand-300">
                            QUESTION {currentQuestionIndex + 1} OF {mcqQuestions.length}
                          </span>
                          <span>
                            {Math.round(((currentQuestionIndex + 1) / mcqQuestions.length) * 100)}% Complete
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-6">
                          <div 
                            className="bg-gradient-to-r from-brand-500 to-purple-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / mcqQuestions.length) * 100}%` }}
                          />
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

                            if (isAnswered) {
                              if (isCorrectAnswer) {
                                optionStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10";
                                icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
                              } else if (isSelected) {
                                optionStyle = "bg-rose-500/20 border-rose-500 text-rose-200";
                                icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
                              } else {
                                optionStyle = "bg-white/5 border-white/5 text-gray-500 opacity-60";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectOption(opt)}
                                disabled={isAnswered}
                                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-sm md:text-base font-medium ${optionStyle}`}
                              >
                                <span>{opt}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation Card & Next Stepper */}
                      <div>
                        {isAnswered && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-xs md:text-sm text-brand-200 mb-6 leading-relaxed flex items-start gap-3"
                          >
                            <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-brand-300 mb-1">Explanation:</strong>
                              <p className="text-gray-300">{currentQuestion.explanation}</p>
                            </div>
                          </motion.div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            disabled={!isAnswered}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:hover:bg-brand-600 shadow-lg shadow-brand-600/20"
                          >
                            <span>{currentQuestionIndex === mcqQuestions.length - 1 ? "Finish Quiz" : "Next Question"}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="glass p-12 rounded-3xl border border-white/10 text-center">
                      <p className="text-gray-400">No multiple-choice questions found in this quiz.</p>
                    </div>
                  )
                ) : (
                  /* Score Summary Card */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-8 md:p-12 rounded-3xl border border-white/10 text-center max-w-lg mx-auto flex flex-col items-center my-auto shadow-2xl"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-xl shadow-yellow-500/20 mb-6">
                      <Trophy className="w-10 h-10" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold mb-1 text-white">Quiz Completed!</h2>
                    <p className="text-sm text-gray-400 mb-6">
                      Here is your performance summary for <span className="text-white font-semibold">{activeQuiz.title}</span>:
                    </p>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 w-full mb-8 flex items-center justify-around">
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">SCORE</span>
                        <span className="text-3xl font-extrabold text-brand-400">{score} / {mcqQuestions.length}</span>
                      </div>
                      <div className="h-10 w-px bg-white/10" />
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">ACCURACY</span>
                        <span className="text-3xl font-extrabold text-emerald-400">{percentage}%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      <button
                        type="button"
                        onClick={handleRestartQuiz}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Try Again</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("flashcard")}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/20"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Study Flashcards</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateQuiz}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Generate New Quiz</span>
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
                        Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px]">Space</kbd> to flip
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
                              Concept / Term
                            </span>
                            <span className="text-gray-500">Click to flip</span>
                          </div>

                          <div className="my-auto">
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                              {currentCard.question_text}
                            </h3>
                          </div>

                          <div className="text-xs text-gray-500">
                            Tap anywhere to reveal definition
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-purple-950/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-purple-500/40 flex flex-col justify-between text-center shadow-2xl">
                          <div className="flex items-center justify-between text-xs text-emerald-400">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 uppercase tracking-wider text-[10px] font-bold">
                              Answer / Takeaway
                            </span>
                            <span className="text-gray-400">Click to flip back</span>
                          </div>

                          <div className="my-auto">
                            <p className="text-base md:text-lg text-gray-200 leading-relaxed font-medium">
                              {currentCard.explanation || currentCard.correct_answer}
                            </p>
                          </div>

                          <div className="text-xs text-purple-300">
                            {document?.name || "Document Context"}
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
                        <span>Previous</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCardFlipped(prev => !prev)}
                        className="p-2.5 rounded-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 transition-all"
                        title="Flip Card"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNextCard}
                        disabled={currentCardIndex === flashcardQuestions.length - 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="glass p-12 rounded-3xl border border-white/10 text-center">
                    <p className="text-gray-400">No flashcards found in this quiz.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HISTORY & ALL QUIZZES */}
            {activeTab === "history" && (
              <div className="glass p-6 md:p-8 rounded-3xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Quiz History</h3>
                    <p className="text-xs text-gray-400">All practice quizzes generated for this document.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateQuiz}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Another</span>
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
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {dateFormatted} • {q.total_questions || 10} Questions & Flashcards
                          </p>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleSelectQuiz(q.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all shrink-0"
                          >
                            Open Quiz
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
