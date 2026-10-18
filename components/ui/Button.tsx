"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "lime" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const variants = {
      primary:
        "bg-forest text-surface hover:bg-forest-light active:bg-forest-dark shadow-sm border border-transparent",
      secondary:
        "bg-surface text-ink hover:bg-surface-elevated active:bg-surface-muted shadow-sm border border-border",
      outline:
        "bg-transparent text-ink hover:bg-surface active:bg-surface-muted border border-border",
      ghost:
        "bg-transparent text-ink hover:bg-surface-muted active:bg-border/20 border-transparent",
      lime:
        "bg-lime text-forest-dark font-bold hover:bg-lime-light active:bg-lime-dark shadow-sm border border-transparent",
      danger:
        "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 border-transparent",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-xs rounded-spatial-sm gap-1.5",
      md: "h-11 px-5 text-sm rounded-spatial-sm gap-2",
      lg: "h-13 px-7 text-base rounded-spatial font-semibold gap-2.5",
      icon: "h-10 w-10 p-0 rounded-full flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
