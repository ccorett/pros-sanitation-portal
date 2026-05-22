"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "login";

interface ButtonProps {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#259f00] to-[#6cc801] text-[#0c151d] hover:brightness-110 shadow-lg shadow-[#259f00]/25",
  secondary:
    "border border-[#00c6ff]/40 bg-[#00c6ff]/10 text-[#ebfbff] hover:bg-[#00c6ff]/20 hover:border-[#00c6ff]/60",
  ghost:
    "bg-transparent text-[#ebfbff]/80 hover:text-[#ebfbff] hover:bg-[#ebfbff]/5",
  login:
    "bg-gradient-to-r from-[#259f00] to-[#6cc801] text-[#0c151d] hover:brightness-110 w-full min-h-[52px] text-base font-semibold",
};

export function Button({
  variant = "primary",
  loading = false,
  children,
  fullWidth = false,
  className = "",
  disabled,
  type = "button",
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px] sm:min-h-[52px] sm:text-base",
        variantStyles[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Please wait…</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
