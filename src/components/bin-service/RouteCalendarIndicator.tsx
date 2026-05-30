import type { RotationStatusColor } from "@/lib/bin-service/status";
import { getRotationStatusStyles } from "@/lib/bin-service/status";
import { CalendarDays } from "lucide-react";

type RouteCalendarIndicatorProps = {
  color: RotationStatusColor;
  label?: string;
};

export function RouteCalendarIndicator({
  color,
  label,
}: RouteCalendarIndicatorProps) {
  const styles = getRotationStatusStyles(color);

  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border border-[#ebfbff]/10 bg-[#0c151d]/50 px-2.5 py-1.5"
      title={label}
    >
      <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[#ebfbff]/15 bg-[#ebfbff]/5">
        <CalendarDays className="h-3.5 w-3.5 text-[#ebfbff]/60" aria-hidden="true" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0c151d] ${styles.calendar}`}
          aria-hidden="true"
        />
      </div>
      {label ? (
        <span className="text-xs font-medium text-[#ebfbff]/70">{label}</span>
      ) : null}
    </div>
  );
}
