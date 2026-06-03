export function inboxRecordElementId(prefix: string, recordId: string): string {
  return `inbox-${prefix}-${recordId}`;
}

export function scrollToInboxRecord(prefix: string, recordId: string): void {
  if (typeof window === "undefined") return;
  const element = document.getElementById(inboxRecordElementId(prefix, recordId));
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function readInboxFocusParams(): {
  focus: string | null;
  requestId: string | null;
  equipmentRequestId: string | null;
  siteId: string | null;
} {
  if (typeof window === "undefined") {
    return {
      focus: null,
      requestId: null,
      equipmentRequestId: null,
      siteId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    focus: params.get("focus"),
    requestId: params.get("requestId"),
    equipmentRequestId: params.get("equipmentRequestId"),
    siteId: params.get("siteId"),
  };
}
