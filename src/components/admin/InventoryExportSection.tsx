"use client";

import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { useState } from "react";

export function InventoryExportSection() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch("/api/inventory/export");
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Unable to download inventory.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? "inventory-export.csv";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download inventory.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-bold text-[#ebfbff]">Download Inventory</h2>
      <p className="mt-2 text-sm text-[#ebfbff]/55">
        Export the current Neon inventory as CSV. The file includes item name,
        category, quantity, unit, calculated stock status, storage area, supplier,
        and last updated timestamp.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        <Button
          type="button"
          className="inline-flex min-h-[48px] items-center gap-2"
          disabled={downloading}
          onClick={() => void handleDownload()}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {downloading ? "Preparing download…" : "Download Inventory"}
        </Button>
      </div>
    </div>
  );
}
