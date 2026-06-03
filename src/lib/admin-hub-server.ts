import type { Employee } from "@prisma/client";
import {
  type AdminHubCard,
  getAdminHubSummary,
} from "@/lib/admin-hub-summary-service";

export type { AdminHubCard } from "@/lib/admin-hub-summary-service";

/** @deprecated Prefer getAdminHubSummary or GET /api/admin/hub-summary */
export async function getAdminHubCards(actor: Employee): Promise<AdminHubCard[]> {
  const summary = await getAdminHubSummary(actor);
  return summary.cards;
}
