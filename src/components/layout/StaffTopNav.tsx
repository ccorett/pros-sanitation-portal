import { SignOutButton } from "@/components/auth/SignOutButton";
import { getVisibleNavItems } from "@/lib/portal-route-access";
import type { EmployeeAccessContext } from "@/lib/operational-access";
import Link from "next/link";

type StaffTopNavProps = {
  accessContext: EmployeeAccessContext;
};

export function StaffTopNav({ accessContext }: StaffTopNavProps) {
  const items = getVisibleNavItems(accessContext);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm text-[#ebfbff]/60 transition-colors hover:text-[#ebfbff]"
        >
          {item.label}
        </Link>
      ))}
      <SignOutButton />
    </div>
  );
}
