"use client";

import { authClient } from "@/lib/auth-client";
import {
  buildEmployeeLoginUrl,
  isProtectedPortalPath,
} from "@/lib/portal-auth-redirect";
import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

type ProtectedPortalLinkProps = ComponentProps<typeof Link>;

export function ProtectedPortalLink({
  href,
  onClick,
  ...props
}: ProtectedPortalLinkProps) {
  const { data: session, isPending } = authClient.useSession();
  const hrefString = typeof href === "string" ? href : (href.pathname ?? "/");

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || isPending) {
      return;
    }

    const path = hrefString.split("?")[0] ?? hrefString;
    if (!session?.session && isProtectedPortalPath(path)) {
      event.preventDefault();
      window.location.assign(buildEmployeeLoginUrl(hrefString));
    }
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
