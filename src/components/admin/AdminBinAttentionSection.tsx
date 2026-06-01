"use client";

import { BinServiceUpdateModal } from "@/components/bin-service/BinServiceUpdateModal";
import {
  formatBinDate,
  formatBinDateTime,
  serviceStatusLabel,
} from "@/lib/bin-locations-status";
import {
  getBinAttentionItems,
  getBinLocationById,
  type BinLocationView,
} from "@/lib/bin-locations-storage";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export function AdminBinAttentionSection() {
  const { data: session } = authClient.useSession();
  const updatedBy =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Admin";

  const [items, setItems] = useState(() => getBinAttentionItems());
  const [activeLocation, setActiveLocation] = useState<BinLocationView | null>(
    null,
  );

  function refresh() {
    setItems(getBinAttentionItems());
  }

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("pros-bin-locations-updated", handler);
    return () => window.removeEventListener("pros-bin-locations-updated", handler);
  }, []);

  function openUpdate(locationId: string) {
    const location = getBinLocationById(locationId);
    if (location) {
      setActiveLocation(location);
    }
  }

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
        No bin service locations need admin attention right now.
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-[1300px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
              <th className="px-4 py-4 font-semibold">Service Status</th>
              <th className="px-4 py-4 font-semibold">Last Updated By</th>
              <th className="px-4 py-4 font-semibold">Last Updated</th>
              <th className="px-4 py-4 font-semibold">Notes</th>
              <th className="px-4 py-4 font-semibold">Issue / Cannot Access</th>
              <th className="px-4 py-4 font-semibold">Last Service</th>
              <th className="px-4 py-4 font-semibold">Next Service</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
              >
                <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                  {item.locationName}
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full border border-[#f97316]/35 bg-[#f97316]/15 px-3 py-1 text-xs font-semibold text-[#f97316]">
                    {serviceStatusLabel(item.serviceStatus)}
                  </span>
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {item.lastUpdatedBy ?? "—"}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {item.lastUpdatedAt
                    ? formatBinDateTime(item.lastUpdatedAt)
                    : "—"}
                </td>
                <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                  {item.notes || "—"}
                </td>
                <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                  {item.issueOrAccessReason}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {formatBinDate(item.lastServiceDate)}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {formatBinDate(item.nextServiceDate)}
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => openUpdate(item.id)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
                  >
                    Update Service
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-[#ebfbff]/10 px-4 py-3">
          <button
            type="button"
            onClick={refresh}
            className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
          >
            Refresh attention queue
          </button>
        </div>
      </div>

      {activeLocation ? (
        <BinServiceUpdateModal
          location={activeLocation}
          updatedBy={`Admin: ${updatedBy}`}
          onClose={() => setActiveLocation(null)}
          onSaved={refresh}
        />
      ) : null}
    </>
  );
}
