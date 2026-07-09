import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, ChevronRight, Split, Expand } from "lucide-react";
import { useCoffee, usePatchScore } from "../api/hooks";
import { StarPicker } from "../components/StarScore";
import { StateDot } from "../components/StatePill";
import { ImageLightbox } from "../components/ImageLightbox";
import { longDate, gramsLabel } from "../lib/format";
import { flagForName } from "../lib/countries";
import type { Coffee } from "../api/types";

function DetailCell({ label, value, span }: { label: string; value: ReactNode; span?: boolean }) {
  const empty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
  return (
    <div className={`bg-cream px-[13px] py-[11px] ${span ? "col-span-2" : ""}`}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-[2px] text-[13.5px] font-semibold">{empty ? "—" : value}</div>
    </div>
  );
}

/** A country with its flag, or just the name if the flag is unknown. */
function CountryText({ country }: { country: string | null }) {
  if (!country) return null;
  const flag = flagForName(country);
  return (
    <>
      {flag && <span className="mr-[4px]">{flag}</span>}
      {country}
    </>
  );
}

/** Join parts with " · ", skipping empty ones. */
function DotList({ parts }: { parts: ReactNode[] }) {
  const items = parts.filter((p) => p !== null && p !== undefined && p !== "");
  if (items.length === 0) return null;
  return (
    <>
      {items.map((p, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {p}
        </span>
      ))}
    </>
  );
}

function UnitRow({ unit, onClick }: { unit: Coffee["units"][number]; onClick: () => void }) {
  const label =
    unit.kind === "bag"
      ? unit.sealState === "open"
        ? "Open bag"
        : "Sealed bag"
      : "Falcon tube";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[11px] rounded-input border border-border bg-card px-[13px] py-[11px] text-left"
    >
      <StateDot status={unit.status} />
      <span className="flex-1 text-[13.5px] font-semibold">{label}</span>
      <span className="text-[12.5px] text-muted">{gramsLabel(unit.weightG)}</span>
      <ChevronRight size={16} color="#B5A48F" />
    </button>
  );
}

/** Coffee detail (badge 3c) — photo hero + score + details + recipe + units. */
export function CoffeeDetailScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const patchScore = usePatchScore(coffeeId);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (isLoading) return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  if (!coffee) return <div className="min-h-full bg-cream p-6 text-muted">Coffee not found.</div>;

  // The wizard captures "Roaster" + roastery country; fall back to the roaster
  // name so the Roastery row never shows only a country.
  const roasteryName = coffee.roasteryName || coffee.roaster;
  const activeUnits = coffee.units.filter((u) => u.active);
  const hasPortionableBag = coffee.units.some((u) => u.kind === "bag" && u.active);
  const r = coffee.recipe;

  return (
    <div className="min-h-full bg-cream">
      {/* photo hero */}
      <div
        className={`relative h-[270px] ${coffee.photoPath ? "cursor-zoom-in" : ""}`}
        onClick={() => coffee.photoPath && setLightbox(0)}
        style={{
          background: coffee.photoPath
            ? undefined
            : "linear-gradient(160deg,#8A5A38,#4A3020)",
        }}
      >
        {coffee.photoPath && (
          <img src={coffee.photoPath} alt={coffee.name} className="h-full w-full object-cover" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/catalog");
          }}
          aria-label="Back"
          className="absolute left-[22px] top-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/catalog/${coffee.id}/edit`);
          }}
          aria-label="Edit"
          className="absolute right-[22px] top-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <Pencil size={18} color="#fff" />
        </button>
        {coffee.photoPath && (
          <span className="pointer-events-none absolute right-[22px] top-[70px] flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur">
            <Expand size={15} color="#fff" />
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px] bg-gradient-to-t from-black/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-[22px] bottom-[18px] text-[#F3EBDF]">
          {coffee.roaster && <div className="text-[12.5px] opacity-85">{coffee.roaster}</div>}
          <div className="mt-[2px] font-serif text-[26px] font-semibold leading-[1.05]">
            {coffee.name}
          </div>
        </div>
      </div>

      {lightbox !== null && coffee.photos.length > 0 && (
        <ImageLightbox images={coffee.photos} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div className="mx-auto max-w-[760px] px-[22px] pb-10 pt-[18px]">
        {/* extra photos */}
        {coffee.photos.length > 1 && (
          <div className="no-scrollbar mb-[18px] flex gap-2 overflow-x-auto">
            {coffee.photos.map((p, i) => (
              <button
                key={p}
                onClick={() => setLightbox(i)}
                className="h-[60px] w-[60px] flex-none overflow-hidden rounded-[10px] border border-border"
              >
                <img src={p} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

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
          <DetailCell
            label="Bean origin"
            span
            value={<DotList parts={[coffee.beanRegion, <CountryText country={coffee.beanCountry} />]} />}
          />
          <DetailCell label="Altitude" value={coffee.altitudeM ? `${coffee.altitudeM} m` : ""} />
          <DetailCell label="Roast" value={coffee.roastLevel ?? ""} />
          <DetailCell
            label="Roastery"
            span
            value={<DotList parts={[roasteryName, <CountryText country={coffee.roasteryCountry} />]} />}
          />
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
          <button
            onClick={() => navigate(`/catalog/${coffee.id}/units`)}
            className="flex items-center gap-[2px] text-[12px] font-semibold text-terracotta"
          >
            Manage <ChevronRight size={13} color="#BE6A3A" />
          </button>
        </div>
        {activeUnits.length > 0 ? (
          <div className="mb-4 flex flex-col gap-2">
            {activeUnits.map((u) => (
              <UnitRow key={u.id} unit={u} onClick={() => navigate(`/units/${u.id}`)} />
            ))}
          </div>
        ) : (
          <p className="mb-4 text-[13px] text-muted">No active units — this coffee is used up.</p>
        )}

        {/* portion action — launches the wizard directly (works from any bag) */}
        {hasPortionableBag && (
          <button
            onClick={() => navigate(`/catalog/${coffee.id}/portion`)}
            className="flex w-full items-center gap-[13px] rounded-card bg-brand px-4 py-[15px] text-left"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-white/10">
              <Split size={21} color="#E7B84B" />
            </span>
            <span className="flex-1 text-[#F3EBDF]">
              <span className="block text-[14.5px] font-semibold">Portion &amp; freeze</span>
              <span className="mt-[2px] block text-[11.5px] leading-[1.35] opacity-70">
                Splits a bag into new tubes — updates existing units.
              </span>
            </span>
            <ChevronRight size={20} color="#F3EBDF" className="flex-none opacity-60" />
          </button>
        )}
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
