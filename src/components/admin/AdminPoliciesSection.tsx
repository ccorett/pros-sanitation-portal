"use client";

import { Button } from "@/components/ui/Button";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { AdminPolicyDto } from "@/lib/policy-service";
import { useCallback, useEffect, useState } from "react";

export function AdminPoliciesSection() {
  const [policies, setPolicies] = useState<AdminPolicyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [version, setVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/policies");
      if (!response.ok) {
        throw new Error("Unable to load policies.");
      }
      const data = (await response.json()) as { policies: AdminPolicyDto[] };
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

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, version, effectiveDate }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create policy.");
      }
      setTitle("");
      setBody("");
      setVersion("1.0");
      setMessage("Policy published.");
      await loadPolicies();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create policy.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/policies/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to delete policy.");
      }
      setMessage("Policy removed.");
      await loadPolicies();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete policy.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Add Policy</h2>
        <label className="block">
          <span className={authLabelClassName}>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${authInputClassName} mt-2`}
            required
          />
        </label>
        <label className="block">
          <span className={authLabelClassName}>Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className={`${authInputClassName} mt-2`}
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={authLabelClassName}>Version</span>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className={`${authInputClassName} mt-2`}
              required
            />
          </label>
          <label className="block">
            <span className={authLabelClassName}>Effective date</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className={`${authInputClassName} mt-2`}
              required
            />
          </label>
        </div>
        <Button type="submit" disabled={submitting} className="min-h-[48px]">
          {submitting ? "Publishing…" : "Publish Policy"}
        </Button>
      </form>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading policies…
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <article key={policy.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">{policy.title}</h3>
                  <p className="mt-1 text-xs text-[#ebfbff]/45">
                    v{policy.version} · Effective {formatDisplayDate(policy.effectiveDate)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px] text-xs"
                  onClick={() => void handleDelete(policy.id)}
                >
                  Delete
                </Button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-[#ebfbff]/70">
                {policy.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
