import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCoffee, usePatchRecipe, useSettings } from "../api/hooks";
import { Field, TextField, SelectField } from "../components/Form";
import { withValue } from "../lib/options";
import { mmss, parseMmSs } from "../lib/format";
import type { BrewType, RecipeKind } from "../api/types";

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const BREW_TYPES: { key: BrewType; label: string }[] = [
  { key: "filter", label: "Filter" },
  { key: "espresso", label: "Espresso" },
];

const KINDS: { key: RecipeKind; label: string; hint: string }[] = [
  { key: "tweak", label: "Tweak", hint: "One variable moved — comparable with the last version." },
  { key: "baseline", label: "Baseline", hint: "A reset: several things changed at once." },
];

/** Recipe editor (badge 11c) — Method, Grinder and Filter come from Settings. */
export function RecipeEditorScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const { data: settings } = useSettings();
  const patchRecipe = usePatchRecipe(coffeeId);

  const r = coffee?.recipe;
  const [brewType, setBrewType] = useState<BrewType | null | undefined>(undefined);
  const [method, setMethod] = useState<string | null | undefined>(undefined);
  const [dose, setDose] = useState<string | undefined>();
  const [yieldG, setYieldG] = useState<string | undefined>();
  const [temp, setTemp] = useState<string | undefined>();
  const [grinder, setGrinder] = useState<string | undefined>();
  const [setting, setSetting] = useState<string | undefined>();
  const [filter, setFilter] = useState<string | undefined>();
  const [drainMin, setDrainMin] = useState<string | undefined>();
  const [drainMax, setDrainMax] = useState<string | undefined>();
  const [protocol, setProtocol] = useState<string | undefined>();
  const [changeNote, setChangeNote] = useState<string | undefined>();
  const [kind, setKind] = useState<RecipeKind | undefined>();

  if (isLoading || !coffee) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  // A version nobody has brewed yet is a draft: saving edits it in place. Once a
  // brew points at it, it is history — saving forks the next version instead,
  // and that fork is worth a sentence about why.
  const frozen = !!r && r.brewCount > 0;
  const nextVersion = r ? r.version + 1 : 1;

  const brewTypeVal = brewType !== undefined ? brewType : r?.brewType ?? null;
  const methodVal = method !== undefined ? method : r?.method ?? null;
  const doseVal = dose ?? (r?.doseG != null ? String(r.doseG) : "");
  const yieldVal = yieldG ?? (r?.yieldG != null ? String(r.yieldG) : "");
  const tempVal = temp ?? (r?.waterTempC != null ? String(r.waterTempC) : "");
  const grinderVal = grinder ?? r?.grinder ?? "";
  const settingVal = setting ?? r?.grinderSetting ?? "";
  const filterVal = filter ?? r?.filter ?? "";
  const drainMinVal = drainMin ?? mmss(r?.drainTargetMinSec);
  const drainMaxVal = drainMax ?? mmss(r?.drainTargetMaxSec);
  const protocolVal = protocol ?? r?.protocol ?? "";
  // A fork's note describes the new version, so it starts empty rather than
  // inheriting the reason the previous version existed.
  const noteVal = changeNote ?? (frozen ? "" : r?.changeNote ?? "");
  const kindVal = kind ?? (frozen ? "tweak" : r?.kind ?? "baseline");

  const doseNum = Number(doseVal);
  const yieldNum = Number(yieldVal);
  const ratio =
    doseNum > 0 && yieldVal !== "" ? `1 : ${(yieldNum / doseNum).toFixed(1)}` : "—";

  const methodOptions = withValue(settings?.methodOptions ?? [], methodVal);
  const grinderOptions = withValue(settings?.grinderOptions ?? [], grinderVal);
  const filterOptions = withValue(settings?.filterOptions ?? [], filterVal);

  const canSave = !frozen || noteVal.trim().length > 0;

  async function save() {
    if (!canSave) return;
    await patchRecipe.mutateAsync({
      brewType: brewTypeVal,
      method: methodVal,
      doseG: numOrNull(doseVal),
      yieldG: numOrNull(yieldVal),
      waterTempC: numOrNull(tempVal),
      grinder: grinderVal || null,
      grinderSetting: settingVal || null,
      filter: filterVal || null,
      drainTargetMinSec: parseMmSs(drainMinVal),
      drainTargetMaxSec: parseMmSs(drainMaxVal),
      protocol: protocolVal || null,
      changeNote: noteVal.trim() || null,
      ...(frozen ? { kind: kindVal } : {}),
    });
    navigate(`/catalog/${coffeeId}`);
  }

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <div className="flex flex-none items-center justify-between border-b border-border-3 px-[22px] py-3">
        <button onClick={() => navigate(-1)} className="text-[14px] text-muted">
          Cancel
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-[6px]">
            <span className="font-serif text-[18px] font-semibold leading-none">Edit recipe</span>
            {r && (
              <span className="rounded-pill bg-tan px-[7px] py-[2px] text-[10.5px] font-semibold text-brand">
                v{r.version}
              </span>
            )}
          </div>
          <div className="mt-[2px] text-[11px] text-muted">{coffee.name}</div>
        </div>
        <button
          onClick={save}
          disabled={!canSave}
          className="text-[14px] font-semibold text-terracotta disabled:opacity-40"
        >
          Save
        </button>
      </div>

      <div className="flex-1 px-[22px] py-4">
        {frozen && (
          <div className="mb-4 rounded-card border border-state-defrosted/30 bg-state-defrosted-bg p-[13px]">
            <div className="text-[13px] font-semibold text-state-defrosted">
              Saving creates v{nextVersion}
            </div>
            <p className="mt-[3px] text-[12px] leading-[1.45] text-muted">
              v{r!.version} has {r!.brewCount} brew{r!.brewCount === 1 ? "" : "s"} against it, so it
              stays as it is. Say what you changed and why.
            </p>
          </div>
        )}

        <Field label={frozen ? "Why the change (required)" : "Note on this version"} className="mb-4">
          <TextField
            value={noteVal}
            onChange={setChangeNote}
            placeholder="e.g. amargou no final, abri a moagem"
            focused={frozen}
          />
        </Field>

        {frozen && (
          <Field label="Kind of change" className="mb-4">
            <div className="flex gap-2">
              {KINDS.map((k) => {
                const active = kindVal === k.key;
                return (
                  <button
                    key={k.key}
                    onClick={() => setKind(k.key)}
                    className={`flex-1 rounded-[11px] py-[10px] text-[13px] ${
                      active ? "bg-brand font-semibold text-cream" : "bg-tan text-brand"
                    }`}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-[6px] text-[11.5px] leading-[1.4] text-muted-2">
              {KINDS.find((k) => k.key === kindVal)!.hint}
            </div>
          </Field>
        )}

        <Field label="Brew type" className="mb-4">
          <div className="flex gap-2">
            {BREW_TYPES.map((b) => {
              const active = brewTypeVal === b.key;
              return (
                <button
                  key={b.key}
                  onClick={() => setBrewType(active ? null : b.key)}
                  className={`flex-1 rounded-[11px] py-[10px] text-[13px] ${
                    active ? "bg-brand font-semibold text-cream" : "bg-tan text-brand"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Method" className="mb-4">
          <div className="flex flex-wrap gap-2">
            {methodOptions.map((m) => {
              const active = methodVal === m;
              return (
                <button
                  key={m}
                  onClick={() => setMethod(active ? null : m)}
                  className={`rounded-[11px] px-3 py-[9px] text-[13px] ${
                    active ? "bg-brand font-semibold text-cream" : "bg-tan text-brand"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="mb-[14px] grid grid-cols-2 gap-[10px]">
          <Field label="Dose">
            <TextField value={doseVal} onChange={setDose} type="number" suffix="g" />
          </Field>
          <Field label={brewTypeVal === "espresso" ? "Yield (out)" : "Yield (water)"}>
            <TextField value={yieldVal} onChange={setYieldG} type="number" suffix="g" />
          </Field>
          <Field label="Ratio">
            <div className="rounded-input border border-border-3 bg-tan-2 px-[13px] py-[11px] text-[15px] font-semibold text-muted">
              {ratio}
            </div>
          </Field>
          <Field label="Water temp">
            <TextField value={tempVal} onChange={setTemp} type="number" suffix="°C" />
          </Field>
        </div>

        <div className="mb-[14px] flex gap-[10px]">
          <Field label="Grinder" className="flex-[1.5]">
            <SelectField
              value={grinderVal}
              onChange={setGrinder}
              options={grinderOptions}
              placeholder="Select grinder…"
            />
          </Field>
          <Field label="Setting" className="flex-1">
            <TextField value={settingVal} onChange={setSetting} placeholder="e.g. 22 clicks" />
          </Field>
        </div>

        <Field label="Filter" className="mb-[14px]">
          <SelectField
            value={filterVal}
            onChange={setFilter}
            options={filterOptions}
            placeholder="Select filter…"
          />
        </Field>

        {/* Target drawdown window — a brew can then say "2:50 ✓ within target". */}
        <div className="mb-[18px]">
          <div className="mb-[6px] text-[12px] text-muted">Target drain time</div>
          <div className="flex items-center gap-[10px]">
            <TextField value={drainMinVal} onChange={setDrainMin} placeholder="2:30" />
            <span className="text-[13px] text-muted-2">to</span>
            <TextField value={drainMaxVal} onChange={setDrainMax} placeholder="3:00" />
          </div>
        </div>

        <div className="mb-[6px] flex items-center justify-between">
          <div className="text-[12px] text-muted">Protocol (free text)</div>
          <div className="text-[11px] text-muted-2">Markdown ok</div>
        </div>
        <textarea
          value={protocolVal}
          onChange={(e) => setProtocol(e.target.value)}
          rows={5}
          placeholder="Bloom 40 g / 40 s. 1st pour → 150 g at 0:45…"
          className="min-h-[118px] w-full rounded-card bg-recipe p-[14px] text-[13px] leading-[1.6] text-[#EAD9C3] outline-none placeholder:text-[#EAD9C3]/40"
        />
      </div>

      <div className="flex-none border-t border-border-3 px-[22px] py-3 pb-6">
        <button
          onClick={save}
          disabled={patchRecipe.isPending || !canSave}
          className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-40"
        >
          {frozen ? `Save as v${nextVersion}` : "Save recipe"}
        </button>
      </div>
    </div>
  );
}
