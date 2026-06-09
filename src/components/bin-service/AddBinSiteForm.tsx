"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AddBinSiteFormProps = {
  onCreated?: () => void;
};

export function AddBinSiteForm({ onCreated }: AddBinSiteFormProps = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: "Pennysaver",
    name: "",
    area: "",
    address: "",
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/bin-service/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to add site.");
      return;
    }

    const data = (await response.json()) as { site: { id: string } };
    onCreated?.();
    router.push(`/jobs/bin-management/setup/${data.site.id}?from=admin`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-bold text-[#ebfbff]">Add Bin Location</h2>
      <label className="block">
        <span className="text-sm text-[#ebfbff]/70">Client name</span>
        <input
          value={form.clientName}
          onChange={(event) =>
            setForm((current) => ({ ...current, clientName: event.target.value }))
          }
          className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm text-[#ebfbff]/70">Site name</span>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          required
          className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm text-[#ebfbff]/70">Area</span>
        <input
          value={form.area}
          onChange={(event) =>
            setForm((current) => ({ ...current, area: event.target.value }))
          }
          className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
          placeholder="Scarborough, Canaan, Carnbee..."
        />
      </label>
      <label className="block">
        <span className="text-sm text-[#ebfbff]/70">Address</span>
        <input
          value={form.address}
          onChange={(event) =>
            setForm((current) => ({ ...current, address: event.target.value }))
          }
          required
          className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}
      <Button type="submit" fullWidth loading={loading}>
        Add Bin Location
      </Button>
    </form>
  );
}
