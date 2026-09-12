"use client";

import React, { useState, useEffect } from "react";
import { User, Loader2, CreditCard, ShieldCheck, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
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
    try {
      setIsProcessingPayment(true);
      const res = await fetchApi("/payments/create-transaction/", {
        method: "POST",
        body: JSON.stringify({ plan: "premium" }),
      });
      if (res.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
      }
    } catch (err) {
      console.error("Payment initiation failed", err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Reusable Desktop Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppHeader
          title="Account & Settings"
          subtitle="Manage your profile credentials, billing tier, and appearance themes"
        />

        <div className="p-5 md:p-8 max-w-4xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center p-24">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
          ) : user ? (
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Profile Card */}
              <Card variant="glass" className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-300 font-bold text-2xl shadow-inner shadow-brand-500/20">
                    {user.name ? user.name[0].toUpperCase() : <User className="w-8 h-8" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h2 className="text-xl font-bold text-white font-heading">
                        {user.name || "ThinkIT User"}
                      </h2>
                      <Badge variant="ready" size="sm" dot>
                        Active Account
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-3 flex items-center justify-center sm:justify-start gap-1.5">
                      <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              </Card>

              {/* Theme & Appearance Customization */}
              <Card variant="glass" className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white font-heading">
                      Interface Theme & Appearance
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Personalize your workspace palette and neon glass accents
                    </p>
                  </div>
                </div>

                <ThemeSelector variant="inline" />
              </Card>

              {/* Settings & Billing Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscription Tier Info */}
                <Card variant="glass" className="p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <CardHeader className="mb-4">
                      <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span>Workspace Quotas</span>
                      </CardTitle>
                    </CardHeader>

                    <div className="space-y-3.5 text-xs sm:text-sm">
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
      </div>
    </div>
  );
}
