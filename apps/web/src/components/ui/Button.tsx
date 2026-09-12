import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-ring select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 touch-target cursor-pointer";

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/25 border border-brand-400/20",
      secondary:
        "bg-white/10 hover:bg-white/15 text-white border border-white/10 shadow-sm",
      outline:
        "border border-white/20 hover:border-brand-400/50 text-gray-200 hover:text-white hover:bg-white/5",
      ghost:
        "text-gray-400 hover:text-white hover:bg-white/5",
      glass:
        "glass hover:bg-white/10 text-white border border-white/10 shadow-sm",
      danger:
        "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 h-8 gap-1.5",
      md: "text-sm px-4 py-2.5 h-10 gap-2",
      lg: "text-base px-6 py-3 h-12 gap-2.5",
      icon: "w-10 h-10 p-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {children && <span className="opacity-80">{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
