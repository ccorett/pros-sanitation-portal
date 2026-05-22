import { Circle } from "lucide-react";
import { COMPANY } from "@/lib/constants";

export function FooterSection() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#ebfbff]/10 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-5 sm:flex-row sm:items-end">
        <div className="text-center sm:text-left">
          <p className="font-bold text-[#ebfbff]">{COMPANY.name}</p>
          <p className="mt-1 text-sm text-[#ebfbff]/50">{COMPANY.tagline}</p>
          <p className="mt-3 text-xs text-[#ebfbff]/40">
            © {year} {COMPANY.name}. All rights reserved.
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-full border border-[#259f00]/30 bg-[#259f00]/10 px-4 py-2"
          role="status"
          aria-live="polite"
        >
          <Circle
            className="h-2.5 w-2.5 fill-[#6cc801] text-[#6cc801] status-pulse"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-[#6cc801]">System Operational</span>
        </div>
      </div>
    </footer>
  );
}
