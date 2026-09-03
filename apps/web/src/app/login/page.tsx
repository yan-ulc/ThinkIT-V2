"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Brain, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { fetchApi } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setInfoMsg("Your session has ended. Please log in again.");
      router.replace("/login");
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetchApi("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      
      localStorage.setItem("access_token", res.data.access_token);
      router.push("/dashboard");
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to login');
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-gray-400 text-sm">Sign in to your personal workspace</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {infoMsg && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm px-4 py-3 rounded-xl">
            {infoMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
            {errorMsg}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            placeholder="you@example.com"
          />
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <a href="#" className="text-xs text-brand-400 hover:text-brand-300">Forgot?</a>
          </div>
          <input 
            type="password" 
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-4 py-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        Don't have an account?{" "}
        <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Brain className="w-6 h-6 text-brand-400" />
        <span className="font-bold text-xl tracking-tight">ThinkIT</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-dark p-8 rounded-3xl relative overflow-hidden shadow-2xl"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl"></div>

        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}>
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
