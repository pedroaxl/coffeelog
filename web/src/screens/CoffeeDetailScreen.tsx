import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, ChevronRight, Split } from "lucide-react";
import { useCoffee, usePatchScore } from "../api/hooks";
import { StarPicker } from "../components/StarScore";
import { StateDot } from "../components/StatePill";
import { longDate, gramsLabel } from "../lib/format";
import type { Coffee } from "../api/types";

function DetailCell({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={`bg-cream px-[13px] py-[11px] ${span ? "col-span-2" : ""}`}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-[2px] text-[13.5px] font-semibold">{value || "—"}</div>
    </div>
  );
}

function UnitRow({ unit }: { unit: Coffee["units"][number] }) {
  const label =
    unit.kind === "bag"
      ? unit.sealState === "open"
        ? "Open bag"
        : "Sealed bag"
      : "Falcon tube";
  return (
    <div className="flex items-center gap-[11px] rounded-input border border-border bg-card px-[13px] py-[11px]">
      <StateDot status={unit.status} />
      <span className="flex-1 text-[13.5px] font-semibold">{label}</span>
      <span className="text-[12.5px] text-muted">{gramsLabel(unit.weightG)}</span>
    </div>
  );
}

/** Coffee detail (badge 3c) — photo hero + score + details + recipe + units. */
export function CoffeeDetailScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const patchScore = usePatchScore(coffeeId);

  if (isLoading) return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  if (!coffee) return <div className="min-h-full bg-cream p-6 text-muted">Coffee not found.</div>;

  const origin = [coffee.beanRegion, coffee.beanCountry].filter(Boolean).join(" · ");
  const roastery = [coffee.roasteryName, coffee.roasteryCountry].filter(Boolean).join(" · ");
  const activeUnits = coffee.units.filter((u) => u.active);
  const r = coffee.recipe;

  return (
    <div className="min-h-full bg-cream">
      {/* photo hero */}
      <div
        className="relative h-[270px]"
        style={{
          background: coffee.photoPath
            ? undefined
            : "linear-gradient(160deg,#8A5A38,#4A3020)",
        }}
      >
        {coffee.photoPath && (
          <img src={coffee.photoPath} alt="" className="h-full w-full object-cover" />
        )}
        <button
          onClick={() => navigate("/catalog")}
          aria-label="Back"
          className="absolute left-[22px] top-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <button
          onClick={() => navigate(`/catalog/${coffee.id}/edit`)}
          aria-label="Edit"
          className="absolute right-[22px] top-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <Pencil size={18} color="#fff" />
        </button>
        <div className="absolute inset-x-0 bottom-0 h-[110px] bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute inset-x-[22px] bottom-[18px] text-[#F3EBDF]">
          {coffee.roaster && <div className="text-[12.5px] opacity-85">{coffee.roaster}</div>}
          <div className="mt-[2px] font-serif text-[26px] font-semibold leading-[1.05]">
            {coffee.name}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[760px] px-[22px] pb-10 pt-[18px]">
        {/* score */}
        <div className="mb-[18px] flex items-center justify-between rounded-card border border-border bg-card px-4 py-[14px]">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">
              Your score
            </div>
            <div className="mt-1">
              <StarPicker score={coffee.score} onChange={(s) => patchScore.mutate(s)} size={26} />
            </div>
          </div>
          <span className="text-[11px] text-muted-2">
            {coffee.score == null ? "Tap to rate" : "Tap a star to change"}
          </span>
        </div>

        {/* details */}
        <h2 className="mb-[10px] font-serif text-[16px] font-semibold">Details</h2>
        <div className="mb-[18px] grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border">
          <DetailCell label="Variety" value={coffee.variety ?? ""} />
          <DetailCell label="Process" value={coffee.process ?? ""} />
          <DetailCell label="Bean origin" value={origin} span />
          <DetailCell label="Altitude" value={coffee.altitudeM ? `${coffee.altitudeM} m` : ""} />
          <DetailCell label="Roast" value={coffee.roastLevel ?? ""} />
          <DetailCell label="Roastery" value={roastery} span />
          <DetailCell label="Roast date" value={longDate(coffee.roastDate)} />
          <DetailCell label="Purchase date" value={longDate(coffee.purchaseDate)} />
        </div>

        {/* tasting notes */}
        {coffee.tastingNotes.length > 0 && (
          <>
            <h2 className="mb-[10px] font-serif text-[16px] font-semibold">Tasting notes</h2>
            <div className="mb-5 flex flex-wrap gap-2">
              {coffee.tastingNotes.map((n) => (
                <span
                  key={n}
                  className="rounded-pill bg-chip-terracotta-bg px-[13px] py-[6px] text-[12.5px] text-accent-deep"
                >
                  {n}
                </span>
              ))}
            </div>
          </>
        )}

        {/* recipe */}
        <div className="mb-[10px] flex items-center justify-between">
          <h2 className="font-serif text-[16px] font-semibold">Recipe</h2>
          <button
            onClick={() => navigate(`/catalog/${coffee.id}/recipe`)}
            className="flex items-center gap-[5px] text-[12.5px] font-semibold text-terracotta"
          >
            <Pencil size={14} color="#BE6A3A" /> Edit
          </button>
        </div>
        <div className="mb-[22px] rounded-card bg-recipe p-4 text-[#EAD9C3]">
          {r && (r.method || r.doseG || r.grinder || r.protocol) ? (
            <>
              <div className="mb-3 flex gap-[18px]">
                <RecipeStat label="Method" value={r.method ?? "—"} />
                <RecipeStat label="Dose" value={r.doseG != null ? `${r.doseG} g` : "—"} />
                <RecipeStat
                  label="Grinder"
                  value={[r.grinder, r.grinderSetting].filter(Boolean).join(" · ") || "—"}
                />
              </div>
              {r.protocol && (
                <div className="border-t border-white/15 pt-3 text-[13px] leading-[1.55] opacity-90">
                  {r.protocol}
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate(`/catalog/${coffee.id}/recipe`)}
              className="text-[13px] opacity-80"
            >
              No recipe yet — tap Edit to add one.
            </button>
          )}
        </div>

        {/* units */}
        <div className="mb-[10px] flex items-baseline justify-between">
          <h2 className="font-serif text-[16px] font-semibold">
            Units · {gramsLabel(coffee.remainingG)}
          </h2>
          <span className="text-[12px] text-muted">{coffee.activeUnitCount} units</span>
        </div>
        {activeUnits.length > 0 ? (
          <div className="mb-4 flex flex-col gap-2">
            {activeUnits.map((u) => (
              <UnitRow key={u.id} unit={u} />
            ))}
          </div>
        ) : (
          <p className="mb-4 text-[13px] text-muted">No active units — this coffee is used up.</p>
        )}

        {/* portion action (Phase 2 flow) */}
        <button
          onClick={() => navigate(`/catalog/${coffee.id}/units`)}
          className="flex w-full items-center gap-[13px] rounded-card bg-brand px-4 py-[15px] text-left"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-white/10">
            <Split size={21} color="#E7B84B" />
          </span>
          <span className="flex-1 text-[#F3EBDF]">
            <span className="block text-[14.5px] font-semibold">Portion &amp; freeze</span>
            <span className="mt-[2px] block text-[11.5px] leading-[1.35] opacity-70">
              Splits the open bag into new tubes — updates existing units.
            </span>
          </span>
          <ChevronRight size={20} color="#F3EBDF" className="flex-none opacity-60" />
        </button>
      </div>
    </div>
  );
}

function RecipeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] opacity-60">{label}</div>
      <div className="mt-[2px] text-[14px] font-semibold text-[#F3EBDF]">{value}</div>
    </div>
  );
}
