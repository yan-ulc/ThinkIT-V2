"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";
import { MobileNav } from "./MobileNav";

export interface AppHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle, actions }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <>
      <header className="px-5 md:px-8 py-4 md:py-6 border-b border-white/5 flex items-center justify-between glass md:bg-transparent sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Hamburger Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open mobile navigation menu"
            className="md:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus-ring touch-target flex items-center justify-center shrink-0 border border-white/10 bg-white/5"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white font-heading truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>

      {/* Mobile Drawer */}
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </>
  );
};
