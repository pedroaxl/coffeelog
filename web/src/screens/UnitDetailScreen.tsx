import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Coffee as CoffeeIcon, Snowflake, Tags, Package, TestTube } from "lucide-react";
import { useUnit, useConsume, useUndoConsume, useSetUnitState } from "../api/hooks";
import { useToast } from "../components/Toast";
import { BottomSheet } from "../components/BottomSheet";
import { StarScore } from "../components/StarScore";
import { STATUS_STYLES, gramsLabel, shortDate, daysSince } from "../lib/format";

const QUICK_GRAMS = [15, 18, 20, 30];

/** Unit detail (badge 10a) + consume flow (badges 9a-9c). Scanner lands here. */
export function UnitDetailScreen() {
  const { unitId } = useParams();
  const id = Number(unitId);
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading } = useUnit(id);
  const consume = useConsume(id);
  const undo = useUndoConsume();
  const setState = useSetUnitState(id);

  const [sheet, setSheet] = useState<null | "consume" | "editDate">(null);
  const [grams, setGrams] = useState("18");
  const [note, setNote] = useState("");
  const [frozenDraft, setFrozenDraft] = useState("");

  if (isLoading || !data) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  const { coffee, unit } = data;
  const s = STATUS_STYLES[unit.status];
  const isBag = unit.kind === "bag";
  const days = daysSince(unit.frozenDate);
  const r = coffee.recipe;

  async function doConsume() {
    const res = await consume.mutateAsync(
      isBag ? { grams: Number(grams), note: note || null } : { note: note || null }
    );
    setSheet(null);
    setNote("");
    const removed = isBag ? Number(grams) : unit.weightG;
    toast({
      variant: "neutral",
      message: `${isBag ? "Bag" : "Tube"} consumed · ${gramsLabel(removed)} removed`,
      action: { label: "Undo", onClick: () => undo.mutate(res.logId) },
    });
    if (!isBag) navigate(`/catalog/${coffee.id}/units`);
  }

  function toggleFreeze() {
    const next = unit.tempState === "frozen" ? "defrosted" : "frozen";
    setState.mutate(
      { tempState: next },
      { onSuccess: () => toast({ message: next === "frozen" ? "Marked frozen" : "Marked defrosted" }) }
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <div className="flex flex-none items-center justify-between px-[22px] pb-2 pt-4">
        <button
          onClick={() => navigate(`/catalog/${coffee.id}/units`)}
          aria-label="Back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-tile bg-tan"
        >
          <ChevronLeft size={20} color="#5C3D28" />
        </button>
        <span className="font-serif text-[18px] font-semibold">Unit</span>
        <span className="w-[38px]" />
      </div>

      <div className="flex-1 px-[22px] pt-2">
        {/* state banner */}
        <div
          className="mb-[14px] rounded-card-lg border p-[18px]"
          style={{ background: s.bg, borderColor: s.color + "44" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-[10px]">
              <span className="flex h-10 w-10 items-center justify-center rounded-tile bg-white">
                {isBag ? <Package size={22} color={s.color} /> : <TestTube size={22} color={s.color} />}
              </span>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: s.color }}>
                  {isBag ? "Bag" : "Falcon tube"}
                </div>
                <div className="text-[11.5px]" style={{ color: s.color + "cc" }}>
                  {coffee.name}
                </div>
              </div>
            </div>
            <span
              className="rounded-pill px-[11px] py-1 text-[11.5px] font-semibold text-white"
              style={{ background: s.color }}
            >
              {s.label}
            </span>
          </div>
          <div className="mt-[14px] flex items-end justify-between">
            <div>
              <span className="font-serif text-[40px] font-bold leading-none" style={{ color: s.color }}>
                {Number.isInteger(unit.weightG) ? unit.weightG : unit.weightG.toFixed(1)}
              </span>
              <span className="text-[18px]" style={{ color: s.color + "cc" }}> g</span>
              {unit.frozenDate && (
                <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: s.color + "cc" }}>
                  <span>
                    Frozen {shortDate(unit.frozenDate)} · {days} day{days === 1 ? "" : "s"} ago
                  </span>
                  <button
                    onClick={() => {
                      setFrozenDraft(unit.frozenDate ?? "");
                      setSheet("editDate");
                    }}
                    className="font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-tile bg-white px-[10px] py-2 text-center">
              <div className="text-[10px] text-muted">Label</div>
              <div className="text-[13px] font-bold text-brand">#{unit.qrId}</div>
            </div>
          </div>
        </div>

        {/* parent coffee */}
        <button
          onClick={() => navigate(`/catalog/${coffee.id}`)}
          className="mb-[14px] flex w-full items-center gap-3 rounded-card border border-border bg-card p-3 text-left"
        >
          <div className="h-[44px] w-[44px] flex-none rounded-[9px]" style={{ background: coffee.photoPath ? undefined : "linear-gradient(150deg,#8A5A38,#5C3D28)" }}>
            {coffee.photoPath && <img src={coffee.photoPath} alt="" className="h-full w-full rounded-[9px] object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold">{coffee.name}</div>
            <div className="flex items-center gap-1 text-[12px] text-muted">
              {[coffee.roaster, coffee.beanCountry].filter(Boolean).join(" · ")} <StarScore score={coffee.score} size={11} />
            </div>
          </div>
          <ChevronRight size={19} color="#B5A48F" />
        </button>

        {/* recipe recap */}
        {r && (r.brewType || r.method || r.doseG || r.grinder) && (
          <div className="mb-4 rounded-card bg-recipe p-4 text-[#EAD9C3]">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[12px] font-semibold tracking-[0.5px] text-gold-bright">RECIPE</span>
              {r.brewType && (
                <span className="rounded-pill bg-white/10 px-[8px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.4px]">
                  {r.brewType === "espresso" ? "Espresso" : "Filter"}
                </span>
              )}
            </div>
            <div className="flex gap-4 text-[13.5px]">
              {r.method && <span><b className="text-[#F3EBDF]">{r.method}</b></span>}
              {r.doseG != null && <span>{r.doseG} g dose</span>}
              {(r.grinder || r.grinderSetting) && (
                <span>{[r.grinder, r.grinderSetting].filter(Boolean).join(" · ")}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex-none px-[22px] pb-6 pt-2">
        <button
          onClick={() => setSheet("consume")}
          className="mb-[10px] flex w-full items-center justify-center gap-[9px] rounded-card bg-terracotta py-[15px] text-[15px] font-semibold text-white"
        >
          <CoffeeIcon size={19} color="#fff" /> Consume this unit
        </button>
        <div className="flex gap-[10px]">
          <button
            onClick={toggleFreeze}
            className="flex flex-1 items-center justify-center gap-[7px] rounded-btn bg-tan py-3 text-[13.5px] font-semibold text-brand"
          >
            <Snowflake size={16} color="#B07A1C" /> {unit.tempState === "frozen" ? "Defrost" : "Freeze"}
          </button>
          <button
            onClick={() => navigate(`/labels?coffee=${coffee.id}`)}
            className="flex flex-1 items-center justify-center gap-[7px] rounded-btn bg-tan py-3 text-[13.5px] font-semibold text-brand"
          >
            <Tags size={16} color="#5C3D28" /> Label
          </button>
        </div>
      </div>

      {/* consume sheet (9b bag grams / 9c whole tube) */}
      <BottomSheet open={sheet === "consume"} onClose={() => setSheet(null)}>
        <div className="mb-1 font-serif text-[19px] font-semibold">
          {isBag ? "Log consumption" : "Consume this tube?"}
        </div>
        <p className="mb-4 text-[13.5px] leading-[1.5] text-muted">
          {isBag
            ? "Enter how many grams you used — the bag weight updates."
            : `The ${gramsLabel(unit.weightG)} tube will be marked consumed and removed from stock. This can be undone.`}
        </p>

        {isBag && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_GRAMS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrams(String(g))}
                  className={`rounded-pill px-4 py-2 text-[13px] font-semibold ${
                    grams === String(g) ? "bg-brand text-cream" : "bg-tan text-brand"
                  }`}
                >
                  {g} g
                </button>
              ))}
              <div className="relative">
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  className="w-24 rounded-pill border border-border-2 bg-card px-4 py-2 pr-7 text-[13px] font-semibold outline-none focus:border-terracotta"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">g</span>
              </div>
            </div>
          </>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note — how was it? (for next time)"
          className="mb-4 w-full rounded-input border border-border-2 bg-card p-3 text-[13px] outline-none focus:border-terracotta"
        />

        <div className="flex gap-[10px]">
          <button
            onClick={() => setSheet(null)}
            className="flex-1 rounded-btn bg-tan py-[13px] text-center text-[14px] font-semibold text-brand"
          >
            Cancel
          </button>
          <button
            onClick={doConsume}
            disabled={consume.isPending || (isBag && !(Number(grams) > 0))}
            className="flex-1 rounded-btn py-[13px] text-center text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ background: isBag ? "#BE6A3A" : "#C0503A" }}
          >
            {isBag ? "Log consumption" : "Consume"}
          </button>
        </div>
      </BottomSheet>

      {/* edit frozen date (for coffees frozen before you started tracking) */}
      <BottomSheet open={sheet === "editDate"} onClose={() => setSheet(null)}>
        <div className="mb-1 font-serif text-[19px] font-semibold">Edit frozen date</div>
        <p className="mb-4 text-[13.5px] leading-[1.5] text-muted">
          Set when this unit was actually frozen — useful for coffee you froze before you
          started using the app.
        </p>
        <input
          type="date"
          value={frozenDraft}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setFrozenDraft(e.target.value)}
          className="mb-4 w-full rounded-input border border-border-2 bg-card px-[13px] py-[11px] text-[14px] outline-none focus:border-terracotta"
        />
        <div className="flex gap-[10px]">
          <button
            onClick={() => setSheet(null)}
            className="flex-1 rounded-btn bg-tan py-[13px] text-center text-[14px] font-semibold text-brand"
          >
            Cancel
          </button>
          <button
            disabled={!frozenDraft || setState.isPending}
            onClick={() =>
              setState.mutate(
                { frozenDate: frozenDraft },
                {
                  onSuccess: () => {
                    setSheet(null);
                    toast({ message: "Frozen date updated" });
                  },
                }
              )
            }
            className="flex-1 rounded-btn bg-terracotta py-[13px] text-center text-[14px] font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
