export type WorkspaceLayoutWidth = "standard" | "wide";

export const WORKSPACE_SHELL_MAX_WIDTH: Record<WorkspaceLayoutWidth, string> = {
  standard: "max-w-[min(100%,90rem)]",
  wide: "max-w-[min(100%,100rem)]",
};
