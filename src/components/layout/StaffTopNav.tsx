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
    <div className="flex w-full min-w-0 flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
      <nav className="staff-nav-scroll" aria-label="Staff portal">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm text-[#ebfbff]/60 transition-colors hover:text-[#ebfbff]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 justify-end sm:justify-start">
        <SignOutButton />
      </div>
    </div>
  );
}
