import { countPendingVerificationAccounts } from "@/lib/admin-accounts-service";
import { formatEditTimestamp } from "@/lib/platform-edit-history";
import { prisma } from "@/lib/prisma";

export type AdminHubCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  lastEditedLabel: string | null;
};

export async function getAccountAccessHubCard(): Promise<AdminHubCard> {
  const pendingCount = await countPendingVerificationAccounts();

  const latestHistory = await prisma.accessHistory.findFirst({
    orderBy: { changedAt: "desc" },
    select: { changedAt: true },
  });

  return {
    id: "accounts",
    title: "Account Access",
    description:
      "Approve pending accounts, assign access levels, and manage portal account status.",
    href: "/admin/accounts",
    count: pendingCount,
    lastEditedLabel: latestHistory
      ? formatEditTimestamp(latestHistory.changedAt.toISOString())
      : null,
  };
}
