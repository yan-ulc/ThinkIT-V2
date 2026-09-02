"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, FileText, LogOut, User, Loader2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetchApi("/auth/me/");
        setUser(response.data);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout/", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("access_token");
    router.push("/");
  };

  const handleUpgrade = async () => {
    setIsProcessingPayment(true);
    try {
      // Sprint 5 integration placeholder
      alert("Midtrans payment gateway integration is currently in Sandbox mode. Your API keys are not fully configured yet.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingPayment(false);
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
          <Link href="/dashboard" className="flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl transition-colors font-medium">
            <FileText className="w-5 h-5" />
            My Documents
          </Link>
          <Link href="/profile" className="flex items-center gap-3 bg-brand-500/20 text-brand-300 px-4 py-3 rounded-xl transition-colors font-medium">
            <User className="w-5 h-5" />
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
          <h1 className="text-2xl font-bold">User Profile</h1>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
            </div>
          ) : user ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="glass-dark p-8 rounded-3xl border border-white/5 flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-brand-500/20 flex items-center justify-center border-4 border-brand-500/30">
                  <User className="w-12 h-12 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">{user.first_name} {user.last_name}</h2>
                  <p className="text-gray-400">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-8 rounded-3xl border border-white/10">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-brand-400" />
                    Account Status
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <span className="text-gray-400">Current Plan</span>
                      <span className="font-semibold text-white bg-white/10 px-3 py-1 rounded-full text-sm">Free Tier</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <span className="text-gray-400">Documents Processed</span>
                      <span className="font-semibold text-white">0 / 5</span>
                    </div>
                  </div>
                </div>

                <div className="glass-dark p-8 rounded-3xl border border-brand-500/30 bg-brand-500/5 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand-400" />
                    Upgrade to Premium
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Unlock unlimited document uploads, faster AI processing, and advanced chat memory.
                  </p>
                  
                  <button 
                    onClick={handleUpgrade}
                    disabled={isProcessingPayment}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pay via Midtrans"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-red-400">Failed to load profile.</div>
          )}
        </div>
      </main>
    </div>
  );
}
