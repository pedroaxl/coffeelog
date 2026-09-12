import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { StarScore } from "./StarScore";
import { mmss, longDate } from "../lib/format";
import type { Brew } from "../api/types";

/** One line of the brew log: when, how long it ran, how it scored. */
export function BrewRow({ brew }: { brew: Brew }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/brews/${brew.id}`)}
      className="flex w-full items-center gap-[11px] rounded-input border border-border bg-card px-[13px] py-[11px] text-left"
    >
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold">
            {brew.drainTimeSec != null ? mmss(brew.drainTimeSec) : "—"}
          </span>
          <StarScore score={brew.rating} size={11} />
          {!brew.validForDialIn && (
            <span className="rounded-pill bg-tan px-[7px] py-[1px] text-[10px] font-semibold text-muted">
              excluded
            </span>
          )}
        </span>
        <span className="mt-[2px] block truncate text-[11.5px] text-muted">
          {longDate(brew.brewedAt.slice(0, 10))}
          {brew.notes ? ` · ${brew.notes}` : ""}
        </span>
      </span>
      <ChevronRight size={16} color="#B5A48F" />
    </button>
  );
}

/** The brew log grouped by the recipe version that produced each batch. */
export function BrewsByVersion({ brews }: { brews: Brew[] }) {
  const groups: { key: string; label: string; brews: Brew[] }[] = [];
  for (const brew of brews) {
    const key = String(brew.recipeVersionId ?? "none");
    const label = brew.recipeVersion != null ? `v${brew.recipeVersion}` : "Before versions";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.brews.push(brew);
    else groups.push({ key, label, brews: [brew] });
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, i) => (
        <div key={`${g.key}-${i}`}>
          <div className="mb-[6px] text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-2">
            {g.label}
          </div>
          <div className="flex flex-col gap-2">
            {g.brews.map((b) => (
              <BrewRow key={b.id} brew={b} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
