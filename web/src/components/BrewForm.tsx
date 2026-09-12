import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StarPicker } from "./StarScore";
import { Field, TextField, SelectField } from "./Form";
import { withValue } from "../lib/options";
import { mmss, parseMmSs, gramsLabel } from "../lib/format";
import { useSettings } from "../api/hooks";
import type { BrewInput, Coffee, Recipe, StorageUnit } from "../api/types";

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

/** The recipe, read-only: the form assumes it was followed unless you say otherwise. */
function RecipeRecap({ recipe }: { recipe: Recipe }) {
  const parts = [
    recipe.method,
    recipe.doseG != null ? `${recipe.doseG} g` : null,
    recipe.yieldG != null ? `→ ${recipe.yieldG} g` : null,
    recipe.waterTempC != null ? `${recipe.waterTempC}°C` : null,
    [recipe.grinder, recipe.grinderSetting].filter(Boolean).join(" ") || null,
  ].filter(Boolean);
  return (
    <div className="mb-4 rounded-card bg-recipe px-[14px] py-[11px] text-[#EAD9C3]">
      <div className="mb-[3px] flex items-center gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.5px] text-gold-bright">RECIPE</span>
        <span className="rounded-pill bg-white/10 px-[7px] py-[1px] text-[10px] font-semibold">
          v{recipe.version}
        </span>
      </div>
      <div className="text-[12.5px] leading-[1.45] opacity-90">{parts.join(" · ")}</div>
      {(recipe.drainTargetMinSec != null || recipe.drainTargetMaxSec != null) && (
        <div className="mt-[3px] text-[11.5px] opacity-60">
          Target {mmss(recipe.drainTargetMinSec) || "—"}–{mmss(recipe.drainTargetMaxSec) || "—"}
        </div>
      )}
    </div>
  );
}

function Disclosure({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-[5px] py-[6px] text-[13px] font-semibold text-terracotta"
      >
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {label}
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}

export interface BrewDraft {
  brew: BrewInput;
  /** Whether the unit should be consumed as part of saving this brew. */
  consumeUnit: boolean;
  grams: number | null;
}

/**
 * The brew form (flows A and B).
 *
 * With a recipe defined it assumes the recipe was followed and asks for one
 * thing — the drain time — so a brew is two taps from the unit screen. The
 * executed parameters sit behind a disclosure, pre-filled; changing them here
 * records what happened without touching the recipe. With no recipe, those
 * fields start empty and open, and saving turns them into v1.
 */
export function BrewForm({
  coffee,
  unit,
  onSave,
  saving,
}: {
  coffee: Coffee;
  unit?: StorageUnit;
  onSave: (draft: BrewDraft) => void;
  saving?: boolean;
}) {
  const r = coffee.recipe;
  const { data: settings } = useSettings();
  const isBag = unit?.kind === "bag";

  const [drain, setDrain] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [consume, setConsume] = useState(true);
  // Disclosure state is deliberately not sticky: the default is always the
  // low-friction path, however much was expanded last time.
  const [adjusted, setAdjusted] = useState(!r);

  // Executed parameters — undefined means "as the recipe says".
  const [method, setMethod] = useState<string | undefined>();
  const [dose, setDose] = useState<string | undefined>();
  const [yieldG, setYieldG] = useState<string | undefined>();
  const [temp, setTemp] = useState<string | undefined>();
  const [grinder, setGrinder] = useState<string | undefined>();
  const [setting, setSetting] = useState<string | undefined>();
  const [filter, setFilter] = useState<string | undefined>();

  const methodVal = method ?? r?.method ?? "";
  const doseVal = dose ?? (r?.doseG != null ? String(r.doseG) : "");
  const yieldVal = yieldG ?? (r?.yieldG != null ? String(r.yieldG) : "");
  const tempVal = temp ?? (r?.waterTempC != null ? String(r.waterTempC) : "");
  const grinderVal = grinder ?? r?.grinder ?? "";
  const settingVal = setting ?? r?.grinderSetting ?? "";
  const filterVal = filter ?? r?.filter ?? "";

  // A bag is drawn down by what the brew actually used, so the dose is the
  // amount taken — with no dose there is nothing to subtract.
  const takeG = numOrNull(doseVal);
  const canConsume = !isBag || (takeG != null && takeG > 0);

  const drainSec = parseMmSs(drain);
  const target =
    r && drainSec != null && r.drainTargetMinSec != null && r.drainTargetMaxSec != null
      ? drainSec >= r.drainTargetMinSec && drainSec <= r.drainTargetMaxSec
      : null;

  function submit() {
    onSave({
      brew: {
        drainTimeSec: drainSec,
        rating,
        notes: notes.trim() || null,
        // Executed parameters are sent only when they were touched or when there
        // is no recipe to inherit them from; the server fills in the rest.
        ...(adjusted
          ? {
              method: methodVal || null,
              doseG: numOrNull(doseVal),
              yieldG: numOrNull(yieldVal),
              waterTempC: numOrNull(tempVal),
              grinder: grinderVal || null,
              grinderSetting: settingVal || null,
              filter: filterVal || null,
            }
          : {}),
      },
      consumeUnit: !!unit && consume && canConsume,
      grams: isBag ? takeG : null,
    });
  }

  return (
    <div>
      {r ? (
        <RecipeRecap recipe={r} />
      ) : (
        <p className="mb-4 text-[13px] leading-[1.5] text-muted">
          No recipe yet — what you enter here becomes v1.
        </p>
      )}

      {/* The one field the flow actually asks for. */}
      <Field label="Drain time" className="mb-1">
        <input
          autoFocus
          inputMode="numeric"
          value={drain}
          onChange={(e) => setDrain(e.target.value)}
          placeholder="2:50"
          className="w-full rounded-input border border-border-2 bg-card px-[14px] py-[14px] text-center font-serif text-[28px] font-semibold outline-none focus:border-terracotta"
        />
      </Field>
      <div className="mb-4 h-[16px] text-center text-[11.5px]">
        {target === true && <span className="text-success">within target</span>}
        {target === false && <span className="text-state-defrosted">outside target</span>}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] text-muted">Rating</span>
        <StarPicker score={rating} onChange={setRating} size={24} />
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="How was it? (optional — you can come back later)"
        className="mb-3 w-full rounded-input border border-border-2 bg-card p-3 text-[13px] outline-none focus:border-terracotta"
      />

      <Disclosure
        open={adjusted}
        onToggle={() => setAdjusted((v) => !v)}
        label={r ? "Adjusted something?" : "Brew parameters"}
      >
        <div className="mb-[10px] grid grid-cols-2 gap-[10px]">
          <Field label="Dose">
            <TextField value={doseVal} onChange={setDose} type="number" suffix="g" />
          </Field>
          <Field label="Yield">
            <TextField value={yieldVal} onChange={setYieldG} type="number" suffix="g" />
          </Field>
          <Field label="Water temp">
            <TextField value={tempVal} onChange={setTemp} type="number" suffix="°C" />
          </Field>
          <Field label="Grinder setting">
            <TextField value={settingVal} onChange={setSetting} placeholder="e.g. 6.0" />
          </Field>
        </div>
        <Field label="Method" className="mb-[10px]">
          <SelectField
            value={methodVal}
            onChange={setMethod}
            options={withValue(settings?.methodOptions ?? [], methodVal)}
            placeholder="Select method…"
          />
        </Field>
        <div className="mb-[10px] flex gap-[10px]">
          <Field label="Grinder" className="flex-1">
            <SelectField
              value={grinderVal}
              onChange={setGrinder}
              options={withValue(settings?.grinderOptions ?? [], grinderVal)}
              placeholder="Select grinder…"
            />
          </Field>
          <Field label="Filter" className="flex-1">
            <SelectField
              value={filterVal}
              onChange={setFilter}
              options={withValue(settings?.filterOptions ?? [], filterVal)}
              placeholder="Select filter…"
            />
          </Field>
        </div>
        {r && (
          <p className="mb-1 text-[11.5px] leading-[1.4] text-muted-2">
            Changing these records what you did — the recipe stays on v{r.version}.
          </p>
        )}
      </Disclosure>

      {unit && (
        <label className="mb-4 flex items-center justify-between rounded-input border border-border-2 bg-card px-[13px] py-[10px]">
          <span className={`text-[13px] ${canConsume ? "" : "text-muted-2"}`}>
            {!isBag
              ? "Mark this tube consumed"
              : canConsume
                ? `Take ${gramsLabel(takeG!)} from this bag`
                : "Set a dose to take it from the bag"}
          </span>
          <input
            type="checkbox"
            checked={consume && canConsume}
            disabled={!canConsume}
            onChange={(e) => setConsume(e.target.checked)}
            className="h-[18px] w-[18px] accent-[#BE6A3A]"
          />
        </label>
      )}

      <button
        onClick={submit}
        disabled={saving}
        className="w-full rounded-btn bg-terracotta py-[15px] text-center text-[15px] font-semibold text-white disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}
