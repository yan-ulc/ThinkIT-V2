"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for observability without sensitive data
    console.error("Application runtime error caught by boundary:", error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative z-10">
      <div className="w-full max-w-md glass-dark rounded-3xl p-8 border border-rose-500/30 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">
          Terjadi Gangguan
        </span>
        <h1 className="text-2xl font-bold text-white mb-3 font-heading">
          Aplikasi Menemukan Kendala
        </h1>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          Maaf, terjadi kesalahan saat memuat tampilan ini. Anda dapat mencoba memuat ulang atau kembali ke dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 px-5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-brand-600/25 focus-ring touch-target cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white py-3 px-5 rounded-xl font-medium text-sm transition-all border border-white/10 focus-ring touch-target"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
