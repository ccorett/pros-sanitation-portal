/** Server-only Ably API key (never expose to the client). */
export function isAblyConfigured(): boolean {
  return Boolean(process.env.ABLY_API_KEY?.trim());
}

/** Shared channel namespace for portal realtime (token capabilities must allow these). */
export const portalAblyChannels = {
  broadcast: "portal:broadcast",
  adminHub: "portal:admin-hub",
  approvalInbox: "portal:approval-inbox",
  employee: (employeeId: string) => `portal:employee:${employeeId}`,
} as const;

export function portalAblyCapabilities(employeeId: string): Record<string, string[]> {
  return {
    [portalAblyChannels.employee(employeeId)]: ["publish", "subscribe", "presence"],
    [portalAblyChannels.broadcast]: ["subscribe"],
    [portalAblyChannels.adminHub]: ["subscribe", "presence"],
    [portalAblyChannels.approvalInbox]: ["subscribe", "presence"],
  };
}
