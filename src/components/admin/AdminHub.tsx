"use client";

import type { AdminHubCard } from "@/lib/admin-hub-summary-service";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function AdminHub() {
  const [sections, setSections] = useState<AdminHubCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/hub-summary", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        cards?: AdminHubCard[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load admin hub summary.");
      }
      setSections(data.cards ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load admin hub summary.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading administration summary…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ff4d4f]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.id}
            className="glass-card flex flex-col rounded-2xl border border-[#00c6ff]/15 p-6 sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-[#ebfbff]">{section.title}</h2>
              {section.count > 0 ? (
                <span className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full border border-[#6cc801]/40 bg-[#6cc801]/15 px-2 text-xs font-bold text-[#6cc801]">
                  {section.count}
                </span>
              ) : null}
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[#ebfbff]/60">
              {section.description}
            </p>
            {section.lastEditedLabel ? (
              <p className="mt-4 text-xs text-[#ebfbff]/45">
                Last activity: {section.lastEditedLabel}
              </p>
            ) : (
              <p className="mt-4 text-xs text-[#ebfbff]/35">No recent edits</p>
            )}
            <Link
              href={section.href}
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#6cc801]/45 bg-gradient-to-r from-[#259f00]/25 to-[#00c6ff]/15 px-5 py-3 text-base font-bold text-[#ebfbff] transition-colors hover:from-[#259f00]/35 hover:to-[#00c6ff]/25"
            >
              Open
            </Link>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void loadSummary()}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh hub counts
      </button>
    </div>
  );
}
