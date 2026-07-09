import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import {
  useCoffee,
  useUpdateCoffee,
  useUploadPhoto,
  useDeleteCoffee,
  useSettings,
} from "../api/hooks";
import { Field, TextField, SelectField } from "../components/Form";
import { TagEditor } from "../components/TagEditor";
import { CountrySelect } from "../components/CountrySelect";
import { PhotoPicker } from "../components/PhotoPicker";
import { useToast } from "../components/Toast";
import { withValue } from "../lib/options";

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d.]/g, "")));

/** Edit coffee (badge 11b) — full form, photo, tasting notes, delete. */
export function EditCoffeeScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const { data: settings } = useSettings();
  const update = useUpdateCoffee(coffeeId);
  const uploadPhoto = useUploadPhoto();
  const del = useDeleteCoffee();
  const toast = useToast();

  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<string[] | null>(null);

  if (isLoading || !coffee) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  // Lazily seed local state from the loaded coffee.
  const get = (key: string, fallback: string | null | number) =>
    form[key] ?? (fallback == null ? "" : String(fallback));
  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const tags = notes ?? coffee.tastingNotes;

  async function save() {
    await update.mutateAsync({
      name: get("name", coffee!.name),
      roaster: form.roaster ?? coffee!.roaster,
      variety: form.variety ?? coffee!.variety,
      process: form.process ?? coffee!.process,
      beanRegion: form.beanRegion ?? coffee!.beanRegion,
      beanCountry: form.beanCountry ?? coffee!.beanCountry,
      roasteryName: form.roasteryName ?? coffee!.roasteryName,
      roasteryCountry: form.roasteryCountry ?? coffee!.roasteryCountry,
      altitudeM: form.altitude !== undefined ? numOrNull(form.altitude) : coffee!.altitudeM,
      roastLevel: form.roastLevel ?? coffee!.roastLevel,
      roastDate: form.roastDate ?? coffee!.roastDate,
      purchaseDate: form.purchaseDate ?? coffee!.purchaseDate,
      tastingNotes: tags,
    });
    navigate(`/catalog/${coffeeId}`);
  }

  async function remove() {
    if (!confirm(`Delete "${coffee!.name}"? This removes its units and recipe.`)) return;
    await del.mutateAsync(coffeeId);
    navigate("/catalog");
  }

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <div className="flex flex-none items-center justify-between border-b border-border-3 px-[22px] py-3">
        <button onClick={() => navigate(-1)} className="text-[14px] text-muted">
          Cancel
        </button>
        <span className="font-serif text-[18px] font-semibold">Edit coffee</span>
        <button onClick={save} className="text-[14px] font-semibold text-terracotta">
          Save
        </button>
      </div>

      <div className="flex-1 px-[22px] py-4">
        <div className="mb-[18px] flex items-start gap-[16px]">
          <PhotoPicker
            previewUrl={coffee.photoPath}
            busy={uploadPhoto.isPending}
            size={92}
            onFile={(file) =>
              uploadPhoto.mutate(
                { id: coffeeId, file },
                { onError: () => toast({ variant: "error", message: "Couldn't upload that photo." }) }
              )
            }
          />
          <Field label="Coffee name" className="flex-1">
            <TextField value={get("name", coffee.name)} onChange={set("name")} focused />
          </Field>
        </div>

        <Field label="Roaster" className="mb-[14px]">
          <TextField value={get("roaster", coffee.roaster)} onChange={set("roaster")} />
        </Field>

        <div className="mb-[14px] flex gap-[10px]">
          <Field label="Variety" className="flex-1">
            <SelectField
              value={get("variety", coffee.variety)}
              onChange={set("variety")}
              options={withValue(settings?.varietyOptions ?? [], get("variety", coffee.variety))}
            />
          </Field>
          <Field label="Process" className="flex-1">
            <SelectField
              value={get("process", coffee.process)}
              onChange={set("process")}
              options={withValue(settings?.processOptions ?? [], get("process", coffee.process))}
            />
          </Field>
        </div>

        <div className="mb-[14px] flex gap-[10px]">
          <Field label="Bean origin (region)" className="flex-[1.4]">
            <TextField value={get("beanRegion", coffee.beanRegion)} onChange={set("beanRegion")} />
          </Field>
          <Field label="Country" className="flex-1">
            <CountrySelect value={get("beanCountry", coffee.beanCountry)} onChange={set("beanCountry")} />
          </Field>
        </div>

        <div className="mb-[14px] flex gap-[10px]">
          <Field label="Altitude (m)" className="flex-1">
            <TextField
              value={get("altitude", coffee.altitudeM)}
              onChange={set("altitude")}
              type="number"
            />
          </Field>
          <Field label="Roast level" className="flex-1">
            <TextField value={get("roastLevel", coffee.roastLevel)} onChange={set("roastLevel")} />
          </Field>
        </div>

        <div className="mb-[14px] flex gap-[10px]">
          <Field label="Roast date" className="flex-1">
            <TextField value={get("roastDate", coffee.roastDate)} onChange={set("roastDate")} type="date" />
          </Field>
          <Field label="Purchase date" className="flex-1">
            <TextField
              value={get("purchaseDate", coffee.purchaseDate)}
              onChange={set("purchaseDate")}
              type="date"
            />
          </Field>
        </div>

        <div className="mb-[14px] flex gap-[10px]">
          <Field label="Roastery name" className="flex-1">
            <TextField value={get("roasteryName", coffee.roasteryName)} onChange={set("roasteryName")} />
          </Field>
          <Field label="Roastery country" className="flex-1">
            <CountrySelect
              value={get("roasteryCountry", coffee.roasteryCountry)}
              onChange={set("roasteryCountry")}
            />
          </Field>
        </div>

        <div className="mb-2 text-[12px] text-muted">Tasting notes</div>
        <TagEditor tags={tags} onChange={setNotes} />
      </div>

      <div className="flex flex-none gap-[10px] border-t border-border-3 px-[22px] py-3 pb-6">
        <button
          onClick={remove}
          aria-label="Delete coffee"
          className="flex w-[52px] flex-none items-center justify-center rounded-btn bg-danger-bg"
        >
          <Trash2 size={20} color="#C0503A" />
        </button>
        <button
          onClick={save}
          disabled={update.isPending}
          className="flex-1 rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
