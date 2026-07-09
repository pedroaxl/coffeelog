import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft } from "lucide-react";
import { useCreateCoffee, useUploadPhoto, useSettings, type CoffeeInput } from "../api/hooks";
import { Field, TextField, SelectField } from "../components/Form";
import { CountrySelect } from "../components/CountrySelect";
import { PhotoPicker } from "../components/PhotoPicker";
import { useToast } from "../components/Toast";
import { gramsLabel } from "../lib/format";
import { withValue } from "../lib/options";

type InitialState = "sealed" | "open" | "frozen";

const STATE_OPTIONS: { key: InitialState; label: string; hint: string }[] = [
  { key: "sealed", label: "Sealed", hint: "unopened, at room temp" },
  { key: "open", label: "Open", hint: "opened, in use" },
  { key: "frozen", label: "Frozen", hint: "sealed & frozen" },
];

/** New coffee wizard (badges 7a → 7b → 7c). No score field (set later). */
export function NewCoffeeWizard() {
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateCoffee();
  const { data: settings } = useSettings();
  const [createdId, setCreatedId] = useState<number | null>(null);
  const uploadPhoto = useUploadPhoto(createdId ?? 0);

  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [weight, setWeight] = useState("250");
  const [initialState, setInitialState] = useState<InitialState>("frozen");

  const set = (key: string) => (v: string) => setF((s) => ({ ...s, [key]: v }));
  const val = (key: string) => f[key] ?? "";

  async function finish() {
    const input: CoffeeInput = {
      name: val("name").trim(),
      roaster: val("roaster") || null,
      variety: val("variety") || null,
      process: val("process") || null,
      beanRegion: val("beanRegion") || null,
      beanCountry: val("beanCountry") || null,
      roasteryName: val("roasteryName") || null,
      roasteryCountry: val("roasteryCountry") || null,
      altitudeM: val("altitude") ? Number(val("altitude")) : null,
      roastLevel: val("roastLevel") || null,
      roastDate: val("roastDate") || null,
      purchaseDate: val("purchaseDate") || null,
      initialUnit: { weightG: Number(weight), initialState },
    };
    const coffee = await create.mutateAsync(input);
    setCreatedId(coffee.id);
    if (photo) {
      try {
        await uploadPhoto.mutateAsync(photo.file);
      } catch {
        toast({ variant: "error", message: "Coffee saved, but the photo couldn't be uploaded." });
      }
    }
    navigate(`/catalog/${coffee.id}`);
  }

  const canContinue = step === 1 ? val("name").trim().length > 0 : true;

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <div className="flex-none px-[22px] pt-4">
        <div className="mb-[14px] flex items-center justify-between">
          <button
            onClick={() => (step === 1 ? navigate(-1) : setStep(step - 1))}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-tan"
          >
            {step === 1 ? <X size={18} color="#5C3D28" /> : <ChevronLeft size={18} color="#5C3D28" />}
          </button>
          <span className="font-serif text-[18px] font-semibold">New coffee</span>
          <span className="text-[12.5px] text-muted">{step} of 3</span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-border-3">
          <div
            className="h-full rounded-[3px] bg-terracotta transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-[22px] py-5">
        {step === 1 && (
          <div className="flex flex-col gap-[14px]">
            <PhotoPicker
              previewUrl={photo?.url ?? null}
              onFile={(file) => setPhoto({ file, url: URL.createObjectURL(file) })}
            />
            <Field label="Coffee name">
              <TextField value={val("name")} onChange={set("name")} focused placeholder="e.g. Sítio da Torre" />
            </Field>
            <Field label="Roaster">
              <TextField value={val("roaster")} onChange={set("roaster")} />
            </Field>
            <Field label="Roastery country">
              <CountrySelect value={val("roasteryCountry")} onChange={set("roasteryCountry")} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-[14px]">
            <div className="flex gap-[10px]">
              <Field label="Variety" className="flex-1">
                <SelectField
                  value={val("variety")}
                  onChange={set("variety")}
                  options={withValue(settings?.varietyOptions ?? [], val("variety"))}
                  placeholder="Select…"
                />
              </Field>
              <Field label="Process" className="flex-1">
                <SelectField
                  value={val("process")}
                  onChange={set("process")}
                  options={withValue(settings?.processOptions ?? [], val("process"))}
                  placeholder="Select…"
                />
              </Field>
            </div>
            <div className="flex gap-[10px]">
              <Field label="Bean region" className="flex-[1.4]">
                <TextField value={val("beanRegion")} onChange={set("beanRegion")} />
              </Field>
              <Field label="Country" className="flex-1">
                <CountrySelect value={val("beanCountry")} onChange={set("beanCountry")} placeholder="Select…" />
              </Field>
            </div>
            <div className="flex gap-[10px]">
              <Field label="Altitude (m)" className="flex-1">
                <TextField value={val("altitude")} onChange={set("altitude")} type="number" />
              </Field>
              <Field label="Roast level" className="flex-1">
                <TextField value={val("roastLevel")} onChange={set("roastLevel")} />
              </Field>
            </div>
            <div className="flex gap-[10px]">
              <Field label="Roast date" className="flex-1">
                <TextField value={val("roastDate")} onChange={set("roastDate")} type="date" />
              </Field>
              <Field label="Purchase date" className="flex-1">
                <TextField value={val("purchaseDate")} onChange={set("purchaseDate")} type="date" />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Field label="Bag weight">
              <TextField value={weight} onChange={setWeight} type="number" suffix="g" focused />
            </Field>
            <div>
              <div className="mb-2 text-[12px] text-muted">Initial state</div>
              <div className="flex flex-col gap-2">
                {STATE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setInitialState(o.key)}
                    className={`flex items-center justify-between rounded-card border px-4 py-3 text-left ${
                      initialState === o.key
                        ? "border-terracotta bg-card"
                        : "border-border-2 bg-card"
                    }`}
                  >
                    <div>
                      <div className="text-[14px] font-semibold">{o.label}</div>
                      <div className="text-[11.5px] text-muted">{o.hint}</div>
                    </div>
                    <span
                      className={`h-5 w-5 rounded-full border-2 ${
                        initialState === o.key ? "border-terracotta bg-terracotta" : "border-border-2"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-border bg-card p-4 text-[13px] text-muted">
              Creates one bag: <b className="text-brand">{gramsLabel(Number(weight) || 0)}</b>,{" "}
              {STATE_OPTIONS.find((o) => o.key === initialState)?.label.toLowerCase()}.
            </div>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-border-3 px-[22px] py-3 pb-6">
        {step < 3 ? (
          <button
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
            className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            disabled={create.isPending}
            onClick={finish}
            className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-60"
          >
            {create.isPending ? "Saving…" : "Add coffee"}
          </button>
        )}
      </div>
    </div>
  );
}
