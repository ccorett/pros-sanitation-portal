"use client";

import { AdminPurchasingSection } from "@/components/admin/AdminPurchasingSection";
import { AdminStockSection } from "@/components/admin/AdminStockSection";
import { useCallback, useEffect, useState } from "react";

type StockTab = "inventory" | "purchasing";

function tabFromHash(hash: string): StockTab {
  return hash === "#purchasing-list" ? "purchasing" : "inventory";
}

function hashFromTab(tab: StockTab): string {
  return tab === "purchasing" ? "#purchasing-list" : "#inventory-list";
}

export function AdminStockManagementSection() {
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

  return (
    <div className="space-y-6">
      <nav
        aria-label="Stock management sections"
        className="flex flex-wrap gap-2 rounded-2xl border border-[#ebfbff]/10 bg-[#0c151d]/60 p-2"
      >
        <button
          type="button"
          onClick={() => selectTab("inventory")}
          className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "inventory"
              ? "bg-[#00c6ff]/15 text-[#00c6ff]"
              : "text-[#ebfbff]/65 hover:text-[#ebfbff]"
          }`}
        >
          Inventory List
        </button>
        <button
          type="button"
          onClick={() => selectTab("purchasing")}
          className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "purchasing"
              ? "bg-[#00c6ff]/15 text-[#00c6ff]"
              : "text-[#ebfbff]/65 hover:text-[#ebfbff]"
          }`}
        >
          Purchasing List
        </button>
      </nav>

      <div id={activeTab === "inventory" ? "inventory-list" : "purchasing-list"}>
        {activeTab === "inventory" ? (
          <AdminStockSection />
        ) : (
          <AdminPurchasingSection />
        )}
      </div>
    </div>
  );
}
