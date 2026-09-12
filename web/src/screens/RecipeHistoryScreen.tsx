import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useCoffee, useRecipeVersions } from "../api/hooks";
import { longDate, mmss } from "../lib/format";
import type { Recipe } from "../api/types";

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-muted-2">{label}</div>
      <div className="mt-[1px] text-[13px] font-semibold">{value}</div>
    </div>
  );
}

function VersionCard({ version, previous }: { version: Recipe; previous?: Recipe }) {
  // What moved since the version before it — the reason a tweak is readable.
  const changes: string[] = [];
  if (previous) {
    const fields: [string, keyof Recipe, string][] = [
      ["method", "method", ""],
      ["dose", "doseG", " g"],
      ["yield", "yieldG", " g"],
      ["temp", "waterTempC", "°C"],
      ["grind", "grinderSetting", ""],
      ["filter", "filter", ""],
    ];
    for (const [label, key, unit] of fields) {
      const before = previous[key];
      const after = version[key];
      if (before !== after && (before != null || after != null)) {
        changes.push(`${label} ${before ?? "—"}${before != null ? unit : ""} → ${after ?? "—"}${after != null ? unit : ""}`);
      }
    }
  }

  return (
    <div
      className={`rounded-card border bg-card p-4 ${
        version.isCurrent ? "border-terracotta" : "border-border"
      }`}
    >
      <div className="mb-[6px] flex items-center gap-2">
        <span className="font-serif text-[17px] font-semibold">v{version.version}</span>
        <span
          className={`rounded-pill px-[8px] py-[2px] text-[10.5px] font-semibold ${
            version.kind === "baseline" ? "bg-tan text-brand" : "bg-chip-terracotta-bg text-accent-deep"
          }`}
        >
          {version.kind}
        </span>
        {version.isCurrent && (
          <span className="rounded-pill bg-terracotta px-[8px] py-[2px] text-[10.5px] font-semibold text-white">
            current
          </span>
        )}
        <span className="ml-auto text-[11px] text-muted-2">
          {longDate(version.createdAt.slice(0, 10))}
        </span>
      </div>

      {version.changeNote && (
        <p className="mb-[10px] text-[13px] leading-[1.45]">{version.changeNote}</p>
      )}

      <div className="mb-[10px] grid grid-cols-3 gap-x-3 gap-y-[10px]">
        <Param label="Method" value={version.method ?? "—"} />
        <Param
          label="Dose / yield"
          value={
            version.doseG != null || version.yieldG != null
              ? `${version.doseG ?? "—"} → ${version.yieldG ?? "—"} g`
              : "—"
          }
        />
        <Param label="Ratio" value={version.ratio != null ? `1 : ${version.ratio}` : "—"} />
        <Param
          label="Water"
          value={version.waterTempC != null ? `${version.waterTempC}°C` : "—"}
        />
        <Param
          label="Grind"
          value={[version.grinder, version.grinderSetting].filter(Boolean).join(" ") || "—"}
        />
        <Param
          label="Target"
          value={
            version.drainTargetMinSec != null || version.drainTargetMaxSec != null
              ? `${mmss(version.drainTargetMinSec) || "—"}–${mmss(version.drainTargetMaxSec) || "—"}`
              : "—"
          }
        />
      </div>

      {changes.length > 0 && (
        <div className="mb-[8px] flex flex-wrap gap-[6px]">
          {changes.map((c) => (
            <span
              key={c}
              className="rounded-pill bg-state-defrosted-bg px-[8px] py-[2px] text-[11px] text-state-defrosted"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="text-[11.5px] text-muted">
        {version.brewCount === 0
          ? "No brews yet — still a draft, edits stay on this version."
          : `${version.brewCount} brew${version.brewCount === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

/** Recipe history: every version of a coffee's recipe, newest first. */
export function RecipeHistoryScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const { data: coffee } = useCoffee(coffeeId);
  const { data: versions, isLoading } = useRecipeVersions(coffeeId);

  return (
    <div className="min-h-full bg-cream">
      <div className="flex items-center justify-between px-[22px] pb-2 pt-4">
        <button
          onClick={() => navigate(`/catalog/${coffeeId}`)}
          aria-label="Back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-tile bg-tan"
        >
          <ChevronLeft size={20} color="#5C3D28" />
        </button>
        <div className="text-center">
          <div className="font-serif text-[18px] font-semibold leading-none">Recipe history</div>
          <div className="mt-[2px] text-[11px] text-muted">{coffee?.name ?? ""}</div>
        </div>
        <span className="w-[38px]" />
      </div>

      <div className="mx-auto max-w-[760px] px-[22px] pb-10 pt-2">
        {isLoading && <p className="text-[13px] text-muted">Loading…</p>}
        {versions && versions.length === 0 && (
          <p className="text-[13px] text-muted">No recipe yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {versions?.map((v, i) => (
            <VersionCard key={v.id} version={v} previous={versions[i + 1]} />
          ))}
        </div>
      </div>
    </div>
  );
}
