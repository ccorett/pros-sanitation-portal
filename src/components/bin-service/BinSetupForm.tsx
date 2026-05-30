"use client";

import { Button } from "@/components/ui/Button";
import { CounterField } from "@/components/bin-service/CounterField";
import {
  SERVICE_DAY_OPTIONS,
  WEEK_PATTERN_OPTIONS,
} from "@/lib/bin-service/schedule";
import type { BinWeekPattern, ServiceDayOfWeek } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Technician = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
};

type BinSetupFormProps = {
  siteId: string;
  siteName: string;
  returnPath?: string;
  initial: {
    expectedRegularBins: number;
    expectedNewBins: number;
    weekPattern: BinWeekPattern;
    serviceDay: ServiceDayOfWeek;
    assignedTechnicianId: string | null;
    accessInstructions: string | null;
    contactName: string | null;
    contactPhone: string | null;
    signatureRequired: boolean;
    active: boolean;
  } | null;
};

export function BinSetupForm({
  siteId,
  siteName,
  returnPath = "/admin",
  initial,
}: BinSetupFormProps) {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    expectedRegularBins: initial?.expectedRegularBins ?? 0,
    expectedNewBins: initial?.expectedNewBins ?? 0,
    weekPattern: initial?.weekPattern ?? ("WEEK_1_3" as BinWeekPattern),
    serviceDay: initial?.serviceDay ?? ("TUESDAY" as ServiceDayOfWeek),
    assignedTechnicianId: initial?.assignedTechnicianId ?? "",
    accessInstructions: initial?.accessInstructions ?? "",
    contactName: initial?.contactName ?? "",
    contactPhone: initial?.contactPhone ?? "",
    signatureRequired: initial?.signatureRequired ?? false,
    active: initial?.active ?? true,
  });

  useEffect(() => {
    fetch("/api/bin-service/technicians")
      .then((res) => res.json())
      .then((data: { technicians: Technician[] }) => {
        setTechnicians(data.technicians ?? []);
      })
      .catch(() => setTechnicians([]));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/bin-service/sites/${siteId}/setup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedTechnicianId: form.assignedTechnicianId || null,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to save setup.");
      return;
    }

    router.push(returnPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">{siteName}</h2>
        <p className="mt-2 text-sm text-[#ebfbff]/55">
          Biweekly sanitary bin service setup. Counts are expected totals, not
          fixed bin asset IDs.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CounterField
            label="Expected regular bins"
            value={form.expectedRegularBins}
            onChange={(value) =>
              setForm((current) => ({ ...current, expectedRegularBins: value }))
            }
          />
          <CounterField
            label="Expected new bins"
            value={form.expectedNewBins}
            onChange={(value) =>
              setForm((current) => ({ ...current, expectedNewBins: value }))
            }
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <p className="text-sm font-medium text-[#00c6ff]">Schedule</p>
        <p className="mt-1 text-sm text-[#ebfbff]/55">Biweekly route pattern</p>

        <div className="mt-4">
          <p className="mb-2 text-sm text-[#ebfbff]/70">Week pattern</p>
          <div className="grid grid-cols-2 gap-3">
            {WEEK_PATTERN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, weekPattern: option.value }))
                }
                className={[
                  "min-h-[52px] rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                  form.weekPattern === option.value
                    ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                    : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70 hover:bg-[#ebfbff]/10",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm text-[#ebfbff]/70">Service day</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {SERVICE_DAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, serviceDay: option.value }))
                }
                className={[
                  "min-h-[48px] rounded-xl border px-2 py-2 text-sm font-semibold transition-colors",
                  form.serviceDay === option.value
                    ? "border-[#00c6ff]/50 bg-[#00c6ff]/15 text-[#00c6ff]"
                    : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70 hover:bg-[#ebfbff]/10",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
        <p className="text-sm font-medium text-[#00c6ff]">Assignment & access</p>

        <div>
          <p className="mb-2 text-sm text-[#ebfbff]/70">Assigned technician</p>
          <div className="grid gap-2">
            {technicians.length === 0 ? (
              <p className="text-sm text-[#ebfbff]/50">No active technicians found.</p>
            ) : (
              technicians.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      assignedTechnicianId: tech.id,
                    }))
                  }
                  className={[
                    "min-h-[52px] rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                    form.assignedTechnicianId === tech.id
                      ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                      : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70 hover:bg-[#ebfbff]/10",
                  ].join(" ")}
                >
                  {tech.firstName} {tech.lastName}
                  <span className="ml-2 text-xs font-normal text-[#ebfbff]/45">
                    {tech.employeeId}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Access instructions</span>
          <textarea
            value={form.accessInstructions}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                accessInstructions: event.target.value,
              }))
            }
            rows={3}
            className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            placeholder="Gate code, loading dock entry, after-hours access..."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Contact name</span>
            <input
              value={form.contactName}
              onChange={(event) =>
                setForm((current) => ({ ...current, contactName: event.target.value }))
              }
              className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Contact phone</span>
            <input
              value={form.contactPhone}
              onChange={(event) =>
                setForm((current) => ({ ...current, contactPhone: event.target.value }))
              }
              className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              setForm((current) => ({ ...current, signatureRequired: true }))
            }
            className={[
              "min-h-[52px] rounded-xl border px-4 py-3 text-sm font-semibold",
              form.signatureRequired
                ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
            ].join(" ")}
          >
            Signature required
          </button>
          <button
            type="button"
            onClick={() =>
              setForm((current) => ({ ...current, signatureRequired: false }))
            }
            className={[
              "min-h-[52px] rounded-xl border px-4 py-3 text-sm font-semibold",
              !form.signatureRequired
                ? "border-[#00c6ff]/50 bg-[#00c6ff]/15 text-[#00c6ff]"
                : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
            ].join(" ")}
          >
            No signature
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, active: true }))}
            className={[
              "min-h-[52px] rounded-xl border px-4 py-3 text-sm font-semibold",
              form.active
                ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
            ].join(" ")}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, active: false }))}
            className={[
              "min-h-[52px] rounded-xl border px-4 py-3 text-sm font-semibold",
              !form.active
                ? "border-[#ebfbff]/30 bg-[#ebfbff]/10 text-[#ebfbff]/60"
                : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
            ].join(" ")}
          >
            Inactive
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth loading={loading} className="min-h-[56px] text-base">
        Save Bin Service Setup
      </Button>
    </form>
  );
}
