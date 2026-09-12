"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeSelectorProps {
  variant?: "dropdown" | "inline";
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = "dropdown",
  className = "",
}) => {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (variant === "inline") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 ${className}`}>
        {themes.map((item) => {
          const isActive = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group focus-ring ${
                isActive
                  ? "bg-white/10 border-brand-500 shadow-lg shadow-brand-500/10"
                  : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8"
              }`}
            >
              {/* Color accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: `linear-gradient(90deg, ${item.previewColor}, ${item.accentColor})`,
                }}
              />

              <div className="flex items-center justify-between mb-2 mt-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: item.previewColor }}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm -ml-2"
                    style={{ backgroundColor: item.accentColor }}
                  />
                  <span className="font-medium text-sm text-gray-100 group-hover:text-white">
                    {item.name}
                  </span>
                </div>
                {isActive && (
                  <span className="p-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/40">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch Theme"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 focus-ring touch-target"
      >
        <Palette className="w-4 h-4 text-brand-400" />
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm inline-block"
          style={{
            backgroundColor:
              themes.find((t) => t.id === theme)?.previewColor || "#8b5cf6",
          }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-72 p-2 rounded-2xl glass-dark border border-white/15 shadow-2xl z-50 backdrop-blur-2xl"
          >
            <div className="px-3 py-2 border-b border-white/10 mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Interface Theme
              </span>
              <span className="text-[11px] text-brand-400 font-medium">
                {themes.find((t) => t.id === theme)?.name}
              </span>
            </div>

            <div className="space-y-1">
              {themes.map((item) => {
                const isActive = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTheme(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-brand-500/20 text-white font-medium border border-brand-500/30"
                        : "text-gray-300 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: item.previewColor }}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm -ml-1.5"
                          style={{ backgroundColor: item.accentColor }}
                        />
                      </div>
                      <span className="text-sm">{item.name}</span>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 text-brand-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
