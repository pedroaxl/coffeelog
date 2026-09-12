import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, ArrowUpCircle } from "lucide-react";
import {
  useBrew,
  useCoffee,
  useRecipeVersions,
  usePatchBrew,
  useDeleteBrew,
  usePromoteBrew,
} from "../api/hooks";
import { StarPicker } from "../components/StarScore";
import { BottomSheet } from "../components/BottomSheet";
import { Field, TextField } from "../components/Form";
import { useToast } from "../components/Toast";
import { mmss, parseMmSs, longDate } from "../lib/format";


/** An executed parameter, with what the recipe asked for when they differ. */
function Executed({
  label,
  value,
  planned,
}: {
  label: string;
  value: string | null;
  planned?: string | null;
}) {
  const differs = planned != null && planned !== value;
  return (
    <div>
      <div className="text-[10.5px] text-muted-2">{label}</div>
      <div className="mt-[1px] text-[13.5px] font-semibold">{value ?? "—"}</div>
      {differs && (
        <div className="mt-[2px] text-[10.5px] text-state-defrosted">
          {planned ?? "—"} → {value ?? "—"}
        </div>
      )}
    </div>
  );
}

function num(value: number | null, unit = ""): string | null {
  return value == null ? null : `${value}${unit}`;
}

/** Brew detail: what was executed, how it differed from the plan, how it tasted. */
export function BrewDetailScreen() {
  const { brewId } = useParams();
  const id = Number(brewId);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: brew, isLoading } = useBrew(id);
  const { data: coffee } = useCoffee(brew?.coffeeId);
  const { data: versions } = useRecipeVersions(brew?.coffeeId);
  const patch = usePatchBrew(id);
  const remove = useDeleteBrew();
  const promote = usePromoteBrew(id);

  const [drain, setDrain] = useState<string | undefined>();
  const [notes, setNotes] = useState<string | undefined>();
  const [nextAction, setNextAction] = useState<string | undefined>();
  const [promoteNote, setPromoteNote] = useState("");
  const [sheet, setSheet] = useState<null | "promote">(null);

  if (isLoading || !brew) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  // The recipe version this brew was made against — the other half of every
  // diff, and not necessarily the current one.
  const planned = versions?.find((v) => v.id === brew.recipeVersionId);

  const drainVal = drain ?? mmss(brew.drainTimeSec);
  const notesVal = notes ?? brew.notes ?? "";
  const nextActionVal = nextAction ?? brew.nextAction ?? "";
  const dirty =
    parseMmSs(drainVal) !== brew.drainTimeSec ||
    notesVal !== (brew.notes ?? "") ||
    nextActionVal !== (brew.nextAction ?? "");

  const target =
    planned && brew.drainTimeSec != null &&
    planned.drainTargetMinSec != null &&
    planned.drainTargetMaxSec != null
      ? brew.drainTimeSec >= planned.drainTargetMinSec &&
        brew.drainTimeSec <= planned.drainTargetMaxSec
      : null;

  async function save() {
    await patch.mutateAsync({
      drainTimeSec: parseMmSs(drainVal),
      notes: notesVal.trim() || null,
      nextAction: nextActionVal.trim() || null,
    });
    toast({ message: "Brew updated" });
  }

  async function doPromote() {
    const res = await promote.mutateAsync({ changeNote: promoteNote.trim() || null });
    setSheet(null);
    toast({ message: `Recipe is now v${res.recipeVersion.version}` });
    navigate(`/catalog/${brew!.coffeeId}`);
  }

  async function doDelete() {
    if (!confirm("Delete this brew? The stock is not changed.")) return;
    const coffeeId = brew!.coffeeId;
    await remove.mutateAsync(brew!.id);
    navigate(`/catalog/${coffeeId}`);
  }

  return (
    <div className="min-h-full bg-cream">
      <div className="flex items-center justify-between px-[22px] pb-2 pt-4">
        <button
          onClick={() => navigate(`/catalog/${brew.coffeeId}`)}
          aria-label="Back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-tile bg-tan"
        >
          <ChevronLeft size={20} color="#5C3D28" />
        </button>
        <div className="text-center">
          <div className="font-serif text-[18px] font-semibold leading-none">Brew</div>
          <div className="mt-[2px] text-[11px] text-muted">
            {longDate(brew.brewedAt.slice(0, 10))}
            {coffee ? ` · ${coffee.name}` : ""}
          </div>
        </div>
        <button onClick={doDelete} aria-label="Delete" className="flex h-[38px] w-[38px] items-center justify-center rounded-tile bg-tan">
          <Trash2 size={17} color="#C0503A" />
        </button>
      </div>

      <div className="mx-auto max-w-[760px] px-[22px] pb-10 pt-2">
        {/* drain time — the headline number */}
        <div className="mb-4 rounded-card-lg border border-border bg-card p-[18px] text-center">
          <div className="text-[11px] uppercase tracking-[0.6px] text-muted">Drain time</div>
          <div className="font-serif text-[40px] font-bold leading-tight">
            {brew.drainTimeSec != null ? mmss(brew.drainTimeSec) : "—"}
          </div>
          {target === true && <div className="text-[12px] text-success">within target</div>}
          {target === false && (
            <div className="text-[12px] text-state-defrosted">
              outside target {mmss(planned!.drainTargetMinSec)}–{mmss(planned!.drainTargetMaxSec)}
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-2">
            <StarPicker
              score={brew.rating}
              onChange={(rating) => patch.mutate({ rating })}
              size={22}
            />
          </div>
        </div>

        {brew.recipeVersion != null ? (
          <button
            onClick={() => navigate(`/catalog/${brew.coffeeId}/recipe/versions`)}
            className="mb-4 flex w-full items-center justify-between rounded-card border border-border bg-card px-[13px] py-[11px] text-left"
          >
            <span className="text-[13px]">
              Brewed on recipe <b>v{brew.recipeVersion}</b>
            </span>
            <span className="text-[12px] font-semibold text-terracotta">History</span>
          </button>
        ) : (
          <p className="mb-4 text-[12px] text-muted">
            No recipe version — imported from a v1 note.
          </p>
        )}

        <h2 className="mb-[10px] font-serif text-[16px] font-semibold">What was executed</h2>
        <div className="mb-[18px] grid grid-cols-3 gap-x-3 gap-y-[12px] rounded-card border border-border bg-card p-4">
          <Executed label="Method" value={brew.method} planned={planned?.method} />
          <Executed label="Dose" value={num(brew.doseG, " g")} planned={num(planned?.doseG ?? null, " g")} />
          <Executed label="Yield" value={num(brew.yieldG, " g")} planned={num(planned?.yieldG ?? null, " g")} />
          <Executed label="Ratio" value={brew.ratio != null ? `1 : ${brew.ratio}` : null} />
          <Executed
            label="Water"
            value={num(brew.waterTempC, "°C")}
            planned={num(planned?.waterTempC ?? null, "°C")}
          />
          <Executed
            label="Grind"
            value={[brew.grinder, brew.grinderSetting].filter(Boolean).join(" ") || null}
            planned={
              planned
                ? [planned.grinder, planned.grinderSetting].filter(Boolean).join(" ") || null
                : undefined
            }
          />
          <Executed label="Filter" value={brew.filter} planned={planned?.filter} />
          {brew.extractionYield != null && (
            <Executed label="EY" value={`${brew.extractionYield}%`} />
          )}
          {brew.tds != null && <Executed label="TDS" value={`${brew.tds}%`} />}
        </div>

        {!brew.validForDialIn && (
          <p className="mb-4 rounded-card bg-tan px-[13px] py-[10px] text-[12.5px] text-muted">
            Excluded from dial-in comparisons{brew.discardReason ? ` — ${brew.discardReason}` : ""}.
          </p>
        )}

        <h2 className="mb-[10px] font-serif text-[16px] font-semibold">Tasting</h2>
        <Field label="Drain time" className="mb-3">
          <TextField value={drainVal} onChange={setDrain} placeholder="2:50" />
        </Field>
        <textarea
          value={notesVal}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="How was it?"
          className="mb-3 w-full rounded-input border border-border-2 bg-card p-3 text-[13px] outline-none focus:border-terracotta"
        />
        <Field label="Next action" className="mb-4">
          <TextField
            value={nextActionVal}
            onChange={setNextAction}
            placeholder="e.g. abrir para 6.0"
          />
        </Field>

        <button
          onClick={save}
          disabled={!dirty || patch.isPending}
          className="mb-3 w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-40"
        >
          Save changes
        </button>

        <button
          onClick={() => setSheet("promote")}
          className="flex w-full items-center justify-center gap-[8px] rounded-btn bg-tan py-[13px] text-center text-[14px] font-semibold text-brand"
        >
          <ArrowUpCircle size={17} color="#5C3D28" /> Promote to a new recipe version
        </button>
      </div>

      <BottomSheet open={sheet === "promote"} onClose={() => setSheet(null)}>
        <div className="mb-1 font-serif text-[19px] font-semibold">Promote this brew</div>
        <p className="mb-4 text-[13.5px] leading-[1.5] text-muted">
          Copies what this brew actually used into a new recipe version. The protocol and
          drain target carry over from the version it was brewed against.
        </p>
        <Field label="Why the change" className="mb-4">
          <TextField
            value={promoteNote}
            onChange={setPromoteNote}
            placeholder="e.g. ficou doce, mantém assim"
          />
        </Field>
        <div className="flex gap-[10px]">
          <button
            onClick={() => setSheet(null)}
            className="flex-1 rounded-btn bg-tan py-[13px] text-center text-[14px] font-semibold text-brand"
          >
            Cancel
          </button>
          <button
            onClick={doPromote}
            disabled={promote.isPending}
            className="flex-1 rounded-btn bg-terracotta py-[13px] text-center text-[14px] font-semibold text-white disabled:opacity-50"
          >
            Promote
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
