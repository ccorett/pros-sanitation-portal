"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const PARTICLE_COUNT = 24;

export function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 2 + (i % 3),
        delay: (i % 8) * 0.4,
        duration: 4 + (i % 5),
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 industrial-grid opacity-40" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, #00c6ff 18%, transparent), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, color-mix(in srgb, #259f00 12%, transparent), transparent)",
        }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-[#00c6ff]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: 0.25,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
