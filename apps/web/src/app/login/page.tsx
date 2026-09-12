"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Brain, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg] = useState(() =>
    searchParams.get("expired") === "1" ? "Your session has ended. Please log in again." : ""
  );

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
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
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("access_token", res.data.access_token);
      router.push("/dashboard");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to login");
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white font-heading">Welcome Back</h1>
        <p className="text-gray-400 text-sm">Sign in to your personal AI workspace</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {infoMsg && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-medium text-gray-300">Password</label>
            <a href="#" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Forgot?
            </a>
          </div>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-6"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#0f172a] px-3 text-gray-400 font-medium">Or continue with</span>
        </div>
      </div>

      <div className="w-full">
        <GoogleSignInButton
          mode="signin"
          onError={(msg) => setErrorMsg(msg)}
        />
      </div>

      <p className="text-center text-gray-400 text-xs mt-8">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative min-h-screen">
      <Link
        href="/"
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2.5 hover:opacity-80 transition-opacity focus-ring rounded-xl p-1"
        aria-label="Back to ThinkIT Homepage"
      >
        <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
          <Brain className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white font-heading">ThinkIT</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md glass-dark p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <Suspense fallback={<div className="text-center text-gray-400 py-12">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
