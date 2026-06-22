import { purgeExpiredRemovedAccounts } from "@/lib/account-retention";
import { verifyAdminApiSecret } from "@/lib/admin-api-secret";
import { NextResponse } from "next/server";

/**
 * Purges removed employee accounts whose scheduledPurgeAt has elapsed.
 *
 * Protect with Authorization: Bearer $ADMIN_API_SECRET
 * or ?secret=$ADMIN_API_SECRET when invoking manually.
 * Vercel Cron invokes this path daily via GET.
 */
async function handlePurge(request: Request) {
  if (!verifyAdminApiSecret(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const result = await purgeExpiredRemovedAccounts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to purge expired removed accounts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handlePurge(request);
}

export async function POST(request: Request) {
  return handlePurge(request);
}
