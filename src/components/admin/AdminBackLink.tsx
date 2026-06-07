import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function AdminBackLink() {
  return (
    <Link
      href="/admin"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#ebfbff]/15 bg-[#ebfbff]/5 px-4 py-2 text-sm font-semibold text-[#00c6ff] transition-colors hover:bg-[#00c6ff]/10"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      Administration
    </Link>
  );
}
