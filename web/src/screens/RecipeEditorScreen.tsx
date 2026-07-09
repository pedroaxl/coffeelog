import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCoffee, usePutRecipe, useSettings } from "../api/hooks";
import { Field, TextField, SelectField } from "../components/Form";
import type { BrewType } from "../api/types";

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const BREW_TYPES: { key: BrewType; label: string }[] = [
  { key: "filter", label: "Filter" },
  { key: "espresso", label: "Espresso" },
];

/** Recipe editor (badge 11c) — Method + Grinder come from the Settings lists. */
export function RecipeEditorScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const { data: settings } = useSettings();
  const putRecipe = usePutRecipe(coffeeId);

  const r = coffee?.recipe;
  const [brewType, setBrewType] = useState<BrewType | null | undefined>(undefined);
  const [method, setMethod] = useState<string | null | undefined>(undefined);
  const [dose, setDose] = useState<string | undefined>();
  const [yieldG, setYieldG] = useState<string | undefined>();
  const [temp, setTemp] = useState<string | undefined>();
  const [grinder, setGrinder] = useState<string | undefined>();
  const [setting, setSetting] = useState<string | undefined>();
  const [protocol, setProtocol] = useState<string | undefined>();

  if (isLoading || !coffee) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  const brewTypeVal = brewType !== undefined ? brewType : r?.brewType ?? null;
  const methodVal = method !== undefined ? method : r?.method ?? null;
  const doseVal = dose ?? (r?.doseG != null ? String(r.doseG) : "");
  const yieldVal = yieldG ?? (r?.yieldG != null ? String(r.yieldG) : "");
  const tempVal = temp ?? (r?.waterTempC != null ? String(r.waterTempC) : "");
  const grinderVal = grinder ?? r?.grinder ?? "";
  const settingVal = setting ?? r?.grinderSetting ?? "";
  const protocolVal = protocol ?? r?.protocol ?? "";

  const doseNum = Number(doseVal);
  const yieldNum = Number(yieldVal);
  const ratio =
    doseNum > 0 && yieldVal !== "" ? `1 : ${(yieldNum / doseNum).toFixed(1)}` : "—";

  const methodOptions = settings?.methodOptions ?? [];
  const grinderOptions = settings?.grinderOptions ?? [];

  async function save() {
    await putRecipe.mutateAsync({
      brewType: brewTypeVal,
      method: methodVal,
      doseG: numOrNull(doseVal),
      yieldG: numOrNull(yieldVal),
      waterTempC: numOrNull(tempVal),
      grinder: grinderVal || null,
      grinderSetting: settingVal || null,
      protocol: protocolVal || null,
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
          <div className="font-serif text-[18px] font-semibold leading-none">Edit recipe</div>
          <div className="mt-[2px] text-[11px] text-muted">{coffee.name}</div>
        </div>
        <button onClick={save} className="text-[14px] font-semibold text-terracotta">
          Save
        </button>
      </div>

      <div className="flex-1 px-[22px] py-4">
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
            <TextField value={doseVal} onChange={setDose} type="number" suffix="g" focused />
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

        <div className="mb-[18px] flex gap-[10px]">
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
          disabled={putRecipe.isPending}
          className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white"
        >
          Save recipe
        </button>
      </div>
    </div>
  );
}
