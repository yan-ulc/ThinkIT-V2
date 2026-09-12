import Link from "next/link";
import { Brain, FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative z-10">
      <div className="w-full max-w-md glass-card rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-6 shadow-lg shadow-brand-500/20">
          <FileQuestion className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">
          404 Error
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-heading">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          Dokumen atau rute yang Anda cari tidak tersedia atau mungkin telah dipindahkan.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 px-5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-brand-600/25 focus-ring touch-target"
          >
            <Brain className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white py-3 px-5 rounded-xl font-medium text-sm transition-all border border-white/10 focus-ring touch-target"
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
