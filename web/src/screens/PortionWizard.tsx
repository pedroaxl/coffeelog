import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, X, Plus, Package } from "lucide-react";
import { useCoffee, usePortion } from "../api/hooks";
import { useToast } from "../components/Toast";
import { gramsLabel } from "../lib/format";
import type { StorageUnit, TempState } from "../api/types";

/** Portion & freeze wizard (badges 7d → 7e → 7f). Manual per-tube weights. */
export function PortionWizard() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: coffee, isLoading } = useCoffee(coffeeId);

  const [step, setStep] = useState(1);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [tubes, setTubes] = useState<string[]>(["20", "15", "15"]);
  const [tubeState, setTubeState] = useState<TempState>("frozen");
  const [matchValue, setMatchValue] = useState("15");

  // Only bags are portionable (frozen tubes are not). A single bag is used
  // automatically even if the user never taps it — so bind the mutation to the
  // *effective* source, not just the tapped one.
  const sources = (coffee?.units ?? []).filter((u) => u.kind === "bag" && u.active);
  const source: StorageUnit | undefined =
    sources.find((s) => s.id === sourceId) ?? (sources.length === 1 ? sources[0] : undefined);
  const effectiveSourceId = source?.id ?? null;

  const portion = usePortion(effectiveSourceId ?? 0);

  if (isLoading || !coffee) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  const weights = tubes.map((t) => Number(t) || 0);
  const total = weights.reduce((s, w) => s + w, 0);
  const remainingAfter = (source?.weightG ?? 0) - total;
  const overweight = remainingAfter < 0;

  async function confirm() {
    if (!effectiveSourceId) return;
    const payload = { tubes: weights.filter((w) => w > 0).map((weightG) => ({ weightG })), tubeState };
    await portion.mutateAsync(payload);
    toast({
      variant: "success",
      message: `Portioned into ${payload.tubes.length} tubes`,
      action: { label: "Labels", onClick: () => navigate(`/labels?coffee=${coffeeId}`) },
    });
    navigate(`/catalog/${coffeeId}/units`);
  }

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
          <span className="font-serif text-[18px] font-semibold">Portion &amp; freeze</span>
          <span className="text-[12.5px] text-muted">{step} of 3</span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-border-3">
          <div className="h-full rounded-[3px] bg-terracotta transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 px-[22px] py-5">
        {step === 1 && (
          <>
            <p className="mb-3 text-[13px] text-muted">
              Pick which unit to portion from. Frozen tubes aren't portionable.
            </p>
            {sources.length === 0 && (
              <p className="text-[13.5px] text-muted">
                No bag to portion — this coffee only has tubes left.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {sources.map((s) => {
                const selected = effectiveSourceId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSourceId(s.id)}
                    className={`flex items-center gap-3 rounded-card border px-4 py-3 text-left ${
                      selected ? "border-terracotta bg-card" : "border-border-2 bg-card"
                    }`}
                  >
                    <Package size={20} color="#BE6A3A" />
                    <span className="flex-1">
                      <span className="block text-[14px] font-semibold">
                        {s.sealState === "open" ? "Open bag" : "Sealed bag"}
                      </span>
                      <span className="text-[12px] text-muted">{gramsLabel(s.weightG)} available</span>
                    </span>
                    <span
                      className={`h-5 w-5 rounded-full border-2 ${
                        selected ? "border-terracotta bg-terracotta" : "border-border-2"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && source && (
          <>
            <div className="mb-3 flex items-end gap-2">
              <label className="flex-1">
                <div className="mb-[6px] text-[12px] text-muted">Match all to</div>
                <input
                  type="number"
                  value={matchValue}
                  onChange={(e) => setMatchValue(e.target.value)}
                  className="w-full rounded-input border border-border-2 bg-card px-[13px] py-[10px] text-[14px] outline-none focus:border-terracotta"
                />
              </label>
              <button
                onClick={() => setTubes(tubes.map(() => matchValue))}
                className="rounded-btn bg-tan px-4 py-[10px] text-[13px] font-semibold text-brand"
              >
                Match all
              </button>
            </div>

            <div className="mb-3 flex flex-col gap-2">
              {tubes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-16 text-[13px] text-muted">Tube {i + 1}</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={t}
                      onChange={(e) => setTubes(tubes.map((x, j) => (j === i ? e.target.value : x)))}
                      className="w-full rounded-input border border-border-2 bg-card px-[13px] py-[10px] pr-8 text-[14px] font-semibold outline-none focus:border-terracotta"
                    />
                    <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[13px] text-muted">
                      g
                    </span>
                  </div>
                  <button
                    onClick={() => setTubes(tubes.filter((_, j) => j !== i))}
                    aria-label={`Remove tube ${i + 1}`}
                    disabled={tubes.length === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-tile bg-tan disabled:opacity-40"
                  >
                    <X size={16} color="#8A7867" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setTubes([...tubes, matchValue])}
              className="mb-4 flex items-center gap-1 rounded-pill border border-dashed border-[#D9C6AC] px-4 py-2 text-[13px] text-muted"
            >
              <Plus size={14} /> Add tube
            </button>

            <div className="mb-4">
              <div className="mb-2 text-[12px] text-muted">New tubes' state</div>
              <div className="flex gap-2">
                {(["frozen", "defrosted"] as TempState[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTubeState(st)}
                    className={`flex-1 rounded-btn py-[10px] text-[13px] font-semibold capitalize ${
                      tubeState === st ? "bg-brand text-cream" : "bg-tan text-brand"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`rounded-card border p-4 text-[13px] ${
                overweight ? "border-danger bg-danger-bg text-danger" : "border-border bg-card text-muted"
              }`}
            >
              {overweight ? (
                <>Tubes total {gramsLabel(total)} — more than the bag's {gramsLabel(source.weightG)}.</>
              ) : (
                <>
                  Open bag {gramsLabel(source.weightG)} →{" "}
                  <b className="text-brand">{gramsLabel(remainingAfter)}</b> left +{" "}
                  <b className="text-brand">{tubes.filter((t) => Number(t) > 0).length} tubes</b> ({tubeState}).
                </>
              )}
            </div>
          </>
        )}

        {step === 3 && source && (
          <div className="flex flex-col gap-3">
            <div className="rounded-card border border-border bg-card p-4">
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">
                Result
              </div>
              <div className="text-[14px]">
                <div className="flex justify-between py-1">
                  <span>Open bag remaining</span>
                  <b>{gramsLabel(remainingAfter)}</b>
                </div>
                {weights
                  .filter((w) => w > 0)
                  .map((w, i) => (
                    <div key={i} className="flex justify-between py-1 text-muted">
                      <span>
                        Tube {i + 1} · {tubeState}
                      </span>
                      <span>{gramsLabel(w)}</span>
                    </div>
                  ))}
              </div>
            </div>
            <p className="text-[13px] text-muted">
              Confirming creates the tubes and updates the bag. You can print their labels next.
            </p>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-border-3 px-[22px] py-3 pb-6">
        {step === 1 && (
          <button
            disabled={!effectiveSourceId}
            onClick={() => setStep(2)}
            className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-40"
          >
            Continue
          </button>
        )}
        {step === 2 && (
          <button
            disabled={overweight || total <= 0}
            onClick={() => setStep(3)}
            className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-40"
          >
            Review
          </button>
        )}
        {step === 3 && (
          <button
            disabled={portion.isPending}
            onClick={confirm}
            className="w-full rounded-btn bg-terracotta py-[14px] text-center text-[14.5px] font-semibold text-white disabled:opacity-60"
          >
            {portion.isPending ? "Portioning…" : "Portion & freeze"}
          </button>
        )}
      </div>
    </div>
  );
}
