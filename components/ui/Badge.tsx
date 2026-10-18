import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "lime" | "forest" | "cream" | "outline" | "success";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-surface-muted text-ink-muted border-border",
    lime: "bg-lime/30 text-forest border-lime/40 font-bold",
    forest: "bg-forest text-surface border-transparent",
    cream: "bg-cream text-forest border-border",
    outline: "bg-transparent text-ink border-border",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-pill border tracking-wide uppercase",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
