"use client";

import { authClient } from "@/lib/auth-client";
import { authSecondaryLinkClassName } from "@/lib/auth-link-styles";
import type { MouseEvent } from "react";

type CreateEmployeeAccountLinkProps = {
  className?: string;
};

export function CreateEmployeeAccountLink({
  className = authSecondaryLinkClassName,
}: CreateEmployeeAccountLinkProps) {
  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    try {
      const session = await authClient.getSession();
      if (session.data?.session) {
        await authClient.signOut();
      }
    } catch (error) {
      console.error("[create-account-link]", error);
    }

    window.location.assign("/employee-signup");
  };

  return (
    <a href="/employee-signup" className={className} onClick={handleClick}>
      Create Employee Account
    </a>
  );
}
