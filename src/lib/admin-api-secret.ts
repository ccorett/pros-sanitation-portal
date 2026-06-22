/**
 * Shared secret verification for admin automation routes (cron, purge, unlock).
 * Set ADMIN_API_SECRET in production; development allows calls when unset.
 */
export function verifyAdminApiSecret(request: Request): boolean {
  const configured = process.env.ADMIN_API_SECRET?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "development";
  }

  const headerSecret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  return headerSecret === configured || querySecret === configured;
}
