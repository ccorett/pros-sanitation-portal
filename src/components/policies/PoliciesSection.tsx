"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { PolicyDto } from "@/lib/policy-service";
import { useCallback, useEffect, useState } from "react";

export function PoliciesSection() {
  const [policies, setPolicies] = useState<PolicyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/policies");
      if (!response.ok) {
        throw new Error("Unable to load policies.");
      }
      const data = (await response.json()) as { policies: PolicyDto[] };
      setPolicies(data.policies);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load policies.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  async function acknowledge(policyId: string) {
    setActingId(policyId);
    setMessage(null);
    try {
      const response = await fetch(`/api/policies/${policyId}/acknowledge`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to confirm policy.");
      }
      setMessage("Policy confirmed.");
      await loadPolicies();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to confirm policy.",
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading policies…
        </div>
      ) : policies.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          No policies published yet.
        </div>
      ) : (
        policies.map((policy) => (
          <article key={policy.id} className="glass-card rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#ebfbff]">{policy.title}</h2>
                <p className="mt-1 text-xs text-[#ebfbff]/45">
                  {policy.category} · Version {policy.version} · Effective{" "}
                  {formatDisplayDate(policy.effectiveDate)}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  policy.acknowledged
                    ? "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]"
                    : "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]"
                }`}
              >
                {policy.acknowledged ? "Confirmed" : "Pending"}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#ebfbff]/75">
              {policy.body}
            </p>
            {policy.acknowledged && policy.acknowledgedAt ? (
              <p className="mt-4 text-xs text-[#ebfbff]/45">
                Confirmed {formatDisplayDate(policy.acknowledgedAt)}
              </p>
            ) : (
              <Button
                type="button"
                className="mt-5 min-h-[44px]"
                disabled={actingId === policy.id}
                onClick={() => void acknowledge(policy.id)}
              >
                {actingId === policy.id ? "Saving…" : "Confirm Policy"}
              </Button>
            )}
          </article>
        ))
      )}
    </div>
  );
}
