"use client";

import React, { useState, useEffect } from "react";
import { User, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { fadeIn } from "@/lib/animations";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
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

  const handleUpgrade = async () => {
    setIsProcessingPayment(true);
    try {
      alert(
        "Midtrans payment gateway integration is currently in Sandbox mode. Your API keys are not fully configured yet."
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Reusable Desktop Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {/* Reusable Responsive App Header with Mobile Hamburger */}
        <AppHeader
          title="User Profile"
          subtitle="Manage your personal information and subscription"
        />

        <div className="p-5 md:p-8 max-w-4xl mx-auto w-full flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
            </div>
          ) : user ? (
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Profile Card Header */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 shadow-lg shadow-brand-500/20">
                  <User className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="text-xl sm:text-3xl font-bold text-white font-heading truncate">
                      {user.name}
                    </h2>
                    <Badge variant="brand" size="sm">Active Account</Badge>
                  </div>
                  <p className="text-sm text-gray-400 truncate mb-3">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    Member since {new Date(user.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Status & Plan Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Status Card */}
                <Card variant="glass-card" className="p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <CardHeader className="mb-6">
                      <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl">
                        <ShieldCheck className="w-5 h-5 text-brand-400" />
                        <span>Account Status</span>
                      </CardTitle>
                    </CardHeader>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center pb-3.5 border-b border-white/5">
                        <span className="text-gray-400">Current Plan</span>
                        <Badge variant="brand" size="sm">Free Tier</Badge>
                      </div>
                      <div className="flex justify-between items-center pb-3.5 border-b border-white/5">
                        <span className="text-gray-400">Documents Processed</span>
                        <span className="font-semibold text-white">0 / 5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">AI Model Provider</span>
                        <span className="font-semibold text-gray-300">Gemini & Groq</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Upgrade / Billing Card */}
                <Card
                  variant="glass-dark"
                  className="p-6 sm:p-8 border border-brand-500/30 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

                  <div>
                    <CardHeader className="mb-2">
                      <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl">
                        <CreditCard className="w-5 h-5 text-brand-400" />
                        <span>Upgrade to Premium</span>
                      </CardTitle>
                    </CardHeader>
                    <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">
                      Unlock unlimited document uploads, faster AI processing, and advanced chat memory with priority GPU clusters.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={handleUpgrade}
                    isLoading={isProcessingPayment}
                  >
                    Pay via Midtrans
                  </Button>
                </Card>
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-rose-400 p-8 glass-card rounded-2xl">
              Failed to load profile. Please try refreshing.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
