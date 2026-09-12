"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, FileText, GraduationCap, LogOut, User, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();

  // Close nav on route change or escape key
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout/", { method: "POST" });
    } catch {}
    localStorage.removeItem("access_token");
    onClose();
    router.push("/login");
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "My Documents",
      icon: FileText,
      isActive: pathname === "/dashboard",
    },
    {
      href: "/quiz",
      label: "Quiz & Flashcards",
      icon: GraduationCap,
      isActive: pathname.startsWith("/quiz"),
    },
    {
      href: "/profile",
      label: "User Profile",
      icon: User,
      isActive: pathname === "/profile",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative w-72 max-w-[80vw] h-full glass-dark border-r border-white/10 flex flex-col z-10 shadow-2xl"
          >
            {/* Header with Brand & Close Button */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-lg text-white font-heading">ThinkIT</span>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider">Mobile Menu</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus-ring touch-target flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all font-medium text-sm focus-ring touch-target ${
                      item.isActive
                        ? "bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-sm"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${item.isActive ? "text-brand-400" : "text-gray-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t border-white/10 mt-auto">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 px-4 py-3.5 w-full rounded-2xl transition-colors text-sm font-medium focus-ring touch-target"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
