"use client";

type CounterFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function CounterField({
  label,
  value,
  onChange,
  min = 0,
  max,
}: CounterFieldProps) {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  function adjust(delta: number) {
    let next = value + delta;
    next = Math.max(min, next);
    if (max !== undefined) {
      next = Math.min(max, next);
    }
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-4">
      <p className="text-sm font-medium text-[#ebfbff]/70">
        {label}
        {max !== undefined ? (
          <span className="text-[#ebfbff]/45"> (max {max})</span>
        ) : null}
      </p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={atMin}
          onClick={() => adjust(-1)}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#ebfbff]/15 bg-[#ebfbff]/5 text-2xl font-bold text-[#ebfbff] transition-colors hover:bg-[#ebfbff]/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-3xl font-bold text-[#ebfbff]">
          {value}
        </span>
        <button
          type="button"
          disabled={atMax}
          onClick={() => adjust(1)}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/15 text-2xl font-bold text-[#6cc801] transition-colors hover:bg-[#6cc801]/25 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
