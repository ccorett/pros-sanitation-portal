"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";

export type MobileDetailField = {
  label: string;
  value: ReactNode;
};

export const MOBILE_ACTIONS_CLASS =
  "mt-4 flex flex-col gap-2 [&_button]:min-h-[44px] [&_button]:w-full [&_a]:inline-flex [&_a]:min-h-[44px] [&_a]:w-full [&_a]:items-center [&_a]:justify-center md:[&_button]:w-auto md:[&_a]:w-auto";

export function DesktopTableView({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`hidden md:block ${className}`.trim()}>{children}</div>;
}

export function MobileCardStack({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`space-y-3 md:hidden ${className}`.trim()}>{children}</div>;
}

export function MobileRecordCard({
  title,
  subtitle,
  headerExtra,
  fields,
  detailFields,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  fields: MobileDetailField[];
  detailFields?: MobileDetailField[];
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(detailFields?.length);

  return (
    <article className="glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#ebfbff]">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-[#ebfbff]/60">{subtitle}</p>
          ) : null}
        </div>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>

      <dl className="mt-3 space-y-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-start justify-between gap-3 border-b border-[#ebfbff]/8 pb-2 last:border-0"
          >
            <dt className="shrink-0 text-xs text-[#ebfbff]/55">{field.label}</dt>
            <dd className="min-w-0 text-right text-sm font-medium text-[#ebfbff]/90">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>

      {hasDetails && expanded ? (
        <dl className="mt-2 space-y-2 border-t border-[#ebfbff]/10 pt-3">
          {detailFields!.map((field) => (
            <div
              key={field.label}
              className="flex items-start justify-between gap-3 border-b border-[#ebfbff]/8 pb-2 last:border-0"
            >
              <dt className="shrink-0 text-xs text-[#ebfbff]/55">{field.label}</dt>
              <dd className="min-w-0 text-right text-sm font-medium text-[#ebfbff]/90">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasDetails ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#ebfbff]/15 bg-[#ebfbff]/5 px-4 py-2 text-sm font-semibold text-[#ebfbff]/80 transition-colors hover:bg-[#ebfbff]/10 hover:text-[#ebfbff]"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              View Details
            </>
          )}
        </button>
      ) : null}

      {actions ? <div className={MOBILE_ACTIONS_CLASS}>{actions}</div> : null}
    </article>
  );
}
