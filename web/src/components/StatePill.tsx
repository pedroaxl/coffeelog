import type { UnitStatus } from "../api/types";
import { STATUS_STYLES } from "../lib/format";

/** Rounded status chip colored by the design's status system. */
export function StatePill({ status, label }: { status: UnitStatus; label?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="rounded-[8px] px-2 py-[3px] text-[11px] font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {label ?? s.label}
    </span>
  );
}

/** Small colored dot for the status. */
export function StateDot({ status, size = 9 }: { status: UnitStatus; size?: number }) {
  return (
    <span
      className="inline-block flex-none rounded-full"
      style={{ width: size, height: size, background: STATUS_STYLES[status].dot }}
    />
  );
}
