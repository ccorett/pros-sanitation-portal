import { SignOutButton } from "@/components/auth/SignOutButton";
import Link from "next/link";

export function StaffTopNav() {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/staff-dashboard"
        className="text-sm text-[#ebfbff]/60 hover:text-[#ebfbff] transition-colors"
      >
        Dashboard
      </Link>
      <Link
        href="/admin"
        className="text-sm text-[#ebfbff]/60 hover:text-[#ebfbff] transition-colors"
      >
        Admin
      </Link>
      <Link
        href="/my-profile"
        className="text-sm text-[#ebfbff]/60 hover:text-[#ebfbff] transition-colors"
      >
        My Profile
      </Link>
      <SignOutButton />
    </div>
  );
}
