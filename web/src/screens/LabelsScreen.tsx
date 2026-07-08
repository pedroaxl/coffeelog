import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Check, Download } from "lucide-react";
import { useCoffee, useCoffees } from "../api/hooks";
import { CoffeePhoto } from "../components/CoffeePhoto";
import { StatePill } from "../components/StatePill";
import { gramsLabel } from "../lib/format";

/** Print labels (badge 6b) — select units → live preview → export PNG/ZIP. */
export function LabelsScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const coffeeParam = params.get("coffee");
  const coffeeId = coffeeParam ? Number(coffeeParam) : undefined;

  if (!coffeeId) return <LabelCoffeePicker />;
  return <LabelPicker coffeeId={coffeeId} onBack={() => navigate("/catalog")} />;
}

/** When opened without a coffee, pick which coffee's units to label. */
function LabelCoffeePicker() {
  const navigate = useNavigate();
  const { data: coffees, isLoading } = useCoffees();
  const withUnits = (coffees ?? []).filter((c) => c.activeUnitCount > 0);
  return (
    <div className="min-h-full bg-cream px-[22px] pt-4">
      <h1 className="mb-1 font-serif text-[26px] font-semibold">Labels</h1>
      <p className="mb-4 text-[13px] text-muted">Pick a coffee to print unit labels for.</p>
      {isLoading && <p className="text-[13px] text-muted">Loading…</p>}
      <div className="flex flex-col gap-2">
        {withUnits.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/labels?coffee=${c.id}`)}
            className="flex items-center gap-3 rounded-card border border-border bg-card p-3 text-left"
          >
            <CoffeePhoto src={c.photoPath} width={44} height={50} radius={9} />
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold">{c.name}</div>
              <div className="text-[12px] text-muted">{c.activeUnitCount} units · {gramsLabel(c.remainingG)}</div>
            </div>
          </button>
        ))}
        {!isLoading && withUnits.length === 0 && (
          <p className="text-[13px] text-muted">No coffees with units to label yet.</p>
        )}
      </div>
    </div>
  );
}

function LabelPicker({ coffeeId, onBack }: { coffeeId: number; onBack: () => void }) {
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const activeUnits = useMemo(() => (coffee?.units ?? []).filter((u) => u.active), [coffee]);

  // Preselect frozen/defrosted tubes (the usual print target).
  const [selected, setSelected] = useState<Set<number> | null>(null);
  const sel = selected ?? new Set(activeUnits.filter((u) => u.kind === "tube").map((u) => u.id));

  if (isLoading || !coffee) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  const toggle = (id: number) => {
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedIds = activeUnits.filter((u) => sel.has(u.id)).map((u) => u.id);
  const previewId = selectedIds[0] ?? activeUnits[0]?.id;

  function exportLabels() {
    if (selectedIds.length === 0) return;
    const a = document.createElement("a");
    a.href = `/api/labels/export?ids=${selectedIds.join(",")}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <div className="flex flex-none items-center gap-3 px-[22px] pb-3 pt-4">
        <button onClick={onBack} aria-label="Back" className="flex h-[38px] w-[38px] items-center justify-center rounded-tile bg-tan">
          <ChevronLeft size={20} color="#5C3D28" />
        </button>
        <div>
          <div className="font-serif text-[20px] font-semibold leading-none">Print labels</div>
          <div className="mt-[3px] text-[12px] text-muted">Select units to generate QR</div>
        </div>
      </div>

      <div className="flex-1 px-[22px]">
        {/* live label preview (server-rendered PNG at the configured size) */}
        <div className="mb-5 mt-1">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">Label preview</div>
          <div className="flex items-center justify-center rounded-card border border-border-2 bg-white p-3 shadow-card">
            {previewId ? (
              <img
                key={previewId}
                src={`/api/labels/unit/${previewId}.png`}
                alt="Label preview"
                className="max-h-[150px] w-auto max-w-full"
              />
            ) : (
              <span className="py-8 text-[13px] text-muted">No units to preview</span>
            )}
          </div>
        </div>

        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">{coffee.name}</div>
        <div className="flex flex-col gap-2 pb-4">
          {activeUnits.map((u) => {
            const checked = sel.has(u.id);
            const label = u.kind === "bag" ? (u.sealState === "open" ? "Open bag" : "Sealed bag") : `${gramsLabel(u.weightG)} tube`;
            return (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                className={`flex items-center gap-[11px] rounded-[13px] border bg-card px-[13px] py-[11px] text-left ${
                  checked ? "border-terracotta" : "border-border opacity-80"
                }`}
                style={{ borderWidth: checked ? 1.5 : 1 }}
              >
                <span
                  className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] ${
                    checked ? "bg-terracotta" : "border-2 border-[#D9CBB8]"
                  }`}
                >
                  {checked && <Check size={14} color="#fff" strokeWidth={3} />}
                </span>
                <span className="flex-1 text-[13.5px] font-semibold">{label}</span>
                <StatePill status={u.status} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-none items-center gap-3 border-t border-border-3 bg-cream px-[22px] py-3 pb-6">
        <div className="flex-none">
          <div className="text-[12px] text-muted">Selected</div>
          <div className="text-[16px] font-bold text-brand">
            {selectedIds.length} label{selectedIds.length === 1 ? "" : "s"}
          </div>
        </div>
        <button
          onClick={exportLabels}
          disabled={selectedIds.length === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-btn bg-terracotta py-[14px] text-[14px] font-semibold text-white disabled:opacity-40"
        >
          <Download size={18} /> Export {selectedIds.length > 1 ? "ZIP" : "PNG"}
        </button>
      </div>
    </div>
  );
}
