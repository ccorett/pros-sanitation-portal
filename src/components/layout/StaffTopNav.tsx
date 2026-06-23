import { SignOutButton } from "@/components/auth/SignOutButton";
import { InvoiceNotificationBell } from "@/components/layout/InvoiceNotificationBell";
import { getVisibleNavItems } from "@/lib/portal-route-access";
import type { EmployeeAccessContext } from "@/lib/operational-access";
import Link from "next/link";

type StaffTopNavProps = {
  accessContext: EmployeeAccessContext;
  showInvoiceNotifications?: boolean;
};

export function StaffTopNav({
  accessContext,
  showInvoiceNotifications = false,
}: StaffTopNavProps) {
  const items = getVisibleNavItems(accessContext);

  return (
    <div className="flex min-w-0 flex-1 basis-full items-center justify-end gap-2 sm:gap-3 md:min-w-[12rem] md:basis-auto">
      <nav className="staff-nav-scroll min-w-0 flex-1" aria-label="Staff navigation">
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
      {showInvoiceNotifications ? <InvoiceNotificationBell /> : null}
      <div className="staff-nav-signout shrink-0">
        <SignOutButton />
      </div>
    </div>
  );
}
