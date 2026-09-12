import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "ready" | "processing" | "failed" | "uploading" | "queued" | "info" | "brand" | "purple";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = "",
  variant = "brand",
  size = "md",
  dot = false,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-semibold rounded-full border transition-colors select-none tracking-wide";

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  const variantStyles = {
    ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    processing: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    failed: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    uploading: "bg-blue-500/10 text-blue-400 border-blue-500/25",
    queued: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    info: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };

  const dotColors = {
    ready: "bg-emerald-400",
    processing: "bg-amber-400 animate-pulse",
    failed: "bg-rose-400",
    uploading: "bg-blue-400 animate-pulse",
    queued: "bg-amber-300 animate-pulse",
    info: "bg-cyan-300",
    brand: "bg-brand-400",
    purple: "bg-purple-400",
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
