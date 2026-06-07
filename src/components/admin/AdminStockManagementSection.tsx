"use client";

import { AdminPurchasingSection } from "@/components/admin/AdminPurchasingSection";
import { AdminStockSection } from "@/components/admin/AdminStockSection";
import { InventoryExportSection } from "@/components/admin/InventoryExportSection";
import { InventoryImportSection } from "@/components/admin/InventoryImportSection";
import { useCallback, useEffect, useState } from "react";

type StockTab = "inventory" | "purchasing" | "import" | "export";

type AdminStockManagementSectionProps = {
  canEditStock: boolean;
  canImportExport: boolean;
};

function tabFromHash(hash: string): StockTab {
  if (hash === "#purchasing-list") return "purchasing";
  if (hash === "#import-inventory") return "import";
  if (hash === "#download-inventory") return "export";
  return "inventory";
}

function hashFromTab(tab: StockTab): string {
  switch (tab) {
    case "purchasing":
      return "#purchasing-list";
    case "import":
      return "#import-inventory";
    case "export":
      return "#download-inventory";
    default:
      return "#inventory-list";
  }
}

export function AdminStockManagementSection({
  canEditStock,
  canImportExport,
}: AdminStockManagementSectionProps) {
  const [activeTab, setActiveTab] = useState<StockTab>("inventory");

  const syncTabFromLocation = useCallback(() => {
    setActiveTab(tabFromHash(window.location.hash));
  }, []);

  useEffect(() => {
    syncTabFromLocation();
    window.addEventListener("hashchange", syncTabFromLocation);
    return () => window.removeEventListener("hashchange", syncTabFromLocation);
  }, [syncTabFromLocation]);

  function selectTab(tab: StockTab) {
    setActiveTab(tab);
    const nextHash = hashFromTab(tab);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

  const tabs: Array<{ id: StockTab; label: string; visible: boolean }> = [
    { id: "inventory", label: "Inventory List", visible: true },
    { id: "purchasing", label: "Purchasing List", visible: canEditStock },
    { id: "import", label: "Import Inventory", visible: canImportExport },
    { id: "export", label: "Download Inventory", visible: canImportExport },
  ];

  return (
    <div className="space-y-6">
      <nav
        aria-label="Stock management sections"
        className="flex flex-wrap gap-2 rounded-2xl border border-[#ebfbff]/10 bg-[#0c151d]/60 p-2"
      >
        {tabs
          .filter((tab) => tab.visible)
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-[#00c6ff]/15 text-[#00c6ff]"
                  : "text-[#ebfbff]/65 hover:text-[#ebfbff]"
              }`}
            >
              {tab.label}
            </button>
          ))}
      </nav>

      <div
        id={
          activeTab === "inventory"
            ? "inventory-list"
            : activeTab === "purchasing"
              ? "purchasing-list"
              : activeTab === "import"
                ? "import-inventory"
                : "download-inventory"
        }
      >
        {activeTab === "inventory" ? (
          <AdminStockSection canEditStock={canEditStock} />
        ) : activeTab === "purchasing" ? (
          <AdminPurchasingSection />
        ) : activeTab === "import" ? (
          <InventoryImportSection />
        ) : (
          <InventoryExportSection />
        )}
      </div>
    </div>
  );
}
