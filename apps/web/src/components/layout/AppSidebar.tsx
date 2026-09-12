"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, FileText, GraduationCap, LogOut, User } from "lucide-react";
import { fetchApi } from "@/lib/api";

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout/", { method: "POST" });
    } catch {}
    localStorage.removeItem("access_token");
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
    <aside className="w-64 glass border-r border-white/5 flex-col hidden md:flex shrink-0 h-screen sticky top-0">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-xl tracking-tight text-white font-heading">ThinkIT</span>
          <span className="block text-[10px] text-gray-400 font-medium tracking-wider uppercase">AI Workspace</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm focus-ring touch-target ${
                item.isActive
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 ${item.isActive ? "text-brand-400" : "text-gray-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-4 mt-auto border-t border-white/5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 px-4 py-3 w-full rounded-xl transition-colors text-sm font-medium focus-ring touch-target"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
