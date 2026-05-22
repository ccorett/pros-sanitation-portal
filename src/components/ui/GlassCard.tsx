"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: "div" | "article" | "section";
  id?: string;
}

export function GlassCard({
  children,
  className = "",
  hover = false,
  as = "div",
  id,
}: GlassCardProps) {
  const Component = motion[as];

  return (
    <Component
      id={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={
        hover
          ? {
              y: -4,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={[
        "glass-card rounded-2xl p-5 sm:p-6 transition-shadow duration-300",
        hover
          ? "hover:shadow-xl hover:shadow-[#00c6ff]/10 hover:border-[#00c6ff]/25 cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}
