import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Package, TestTube, Split, Tags, Plus } from "lucide-react";
import { useCoffee, useAddBag } from "../api/hooks";
import { StateDot } from "../components/StatePill";
import { BottomSheet } from "../components/BottomSheet";
import { useToast } from "../components/Toast";
import { STATUS_STYLES, gramsLabel, shortDate } from "../lib/format";
import type { StorageUnit } from "../api/types";

type InitialState = "sealed" | "open" | "frozen";

const STATE_OPTIONS: { key: InitialState; label: string; hint: string }[] = [
  { key: "sealed", label: "Sealed", hint: "unopened, at room temp" },
  { key: "open", label: "Open", hint: "opened, in use" },
  { key: "frozen", label: "Frozen", hint: "sealed & frozen" },
];

function UnitRow({ unit, onClick }: { unit: StorageUnit; onClick: () => void }) {
  const s = STATUS_STYLES[unit.status];
  const Icon = unit.kind === "bag" ? Package : TestTube;
  const date = unit.frozenDate ?? unit.openedDate;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-card border border-border bg-card px-[13px] py-3 text-left"
    >
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-tile"
        style={{ background: s.bg }}
      >
        <Icon size={19} color={s.color} />
      </span>
      <span className="flex-1">
        <span className="block text-[14px] font-semibold">
          {unit.kind === "bag" ? (unit.sealState === "open" ? "Open bag" : "Sealed bag") : "Falcon tube"}
        </span>
        <span className="mt-[3px] flex items-center gap-[6px]">
          <StateDot status={unit.status} size={7} />
          <span className="text-[11.5px] text-muted">
            {s.label}
            {date ? ` · ${shortDate(date)}` : ""}
            {` · #${unit.qrId}`}
          </span>
        </span>
      </span>
      <span className="text-[14px] font-bold text-brand">{gramsLabel(unit.weightG)}</span>
    </button>
  );
}

/** Storage units (badge 6a) — summary tiles, bag, tubes, consumed footer, actions. */
export function StorageUnitsScreen() {
  const { id } = useParams();
  const coffeeId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: coffee, isLoading } = useCoffee(coffeeId);
  const addBag = useAddBag(coffeeId);

  const [addOpen, setAddOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("250");
  const [newState, setNewState] = useState<InitialState>("sealed");

  if (isLoading || !coffee) {
    return <div className="min-h-full bg-cream p-6 text-muted">Loading…</div>;
  }

  const bags = coffee.units.filter((u) => u.kind === "bag" && u.active);
  const tubes = coffee.units.filter((u) => u.kind === "tube" && u.active);
  const consumedCount = coffee.units.filter((u) => u.kind === "tube" && u.consumed).length;
  const tubesWeight = tubes.reduce((s, t) => s + t.weightG, 0);
  // Any active bag can be portioned — portioning opens a sealed bag automatically.
  const canPortion = bags.length > 0;

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <div className="flex flex-none items-center gap-3 px-[22px] pb-3 pt-4">
        <button
          onClick={() => navigate(`/catalog/${coffeeId}`)}
          aria-label="Back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-tile bg-tan"
        >
          <ChevronLeft size={20} color="#5C3D28" />
        </button>
        <div className="min-w-0">
          <div className="text-[12px] text-muted">Units of</div>
          <div className="truncate font-serif text-[20px] font-semibold leading-none">
            {coffee.name}
          </div>
        </div>
      </div>

      <div className="flex-1 px-[22px] pb-4">
        {/* summary tiles */}
        <div className="mb-4 flex gap-[10px]">
          <div className="flex-1 rounded-[15px] bg-brand px-[15px] py-[13px] text-[#F3EBDF]">
            <div className="font-serif text-[23px] font-bold">{gramsLabel(coffee.remainingG)}</div>
            <div className="mt-[1px] text-[11.5px] opacity-70">remaining</div>
          </div>
          <div className="flex-1 rounded-[15px] border border-border bg-card px-[15px] py-[13px]">
            <div className="font-serif text-[23px] font-bold text-brand">{coffee.activeUnitCount}</div>
            <div className="mt-[1px] text-[11.5px] text-muted">active units</div>
          </div>
        </div>

        {/* bags */}
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">
            {bags.length > 1 ? "Bags" : "Bag"}
          </span>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-[3px] text-[12px] font-semibold text-terracotta"
          >
            <Plus size={13} color="#BE6A3A" /> Add bag
          </button>
        </div>
        {bags.length > 0 ? (
          <div className="mb-[18px] flex flex-col gap-2">
            {bags.map((b) => (
              <UnitRow key={b.id} unit={b} onClick={() => navigate(`/units/${b.id}`)} />
            ))}
          </div>
        ) : (
          <p className="mb-[18px] text-[13px] text-muted">No bag — fully portioned or used.</p>
        )}

        {/* tubes */}
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">
            Falcon tubes
          </span>
          {tubes.length > 0 && (
            <span className="text-[11.5px] text-muted">
              {gramsLabel(tubesWeight)} · {tubes.length} tubes
            </span>
          )}
        </div>
        {tubes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {tubes.map((t) => (
              <UnitRow key={t.id} unit={t} onClick={() => navigate(`/units/${t.id}`)} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">No tubes yet — portion the bag to create some.</p>
        )}

        {consumedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 px-[2px] py-2">
            <StateDot status="consumed" size={7} />
            <span className="text-[12px] text-state-consumed">{consumedCount} tubes consumed</span>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex flex-none gap-[10px] border-t border-border-3 bg-cream px-[22px] py-3 pb-6">
        <button
          disabled={!canPortion}
          onClick={() => canPortion && navigate(`/catalog/${coffeeId}/portion`)}
          className="flex flex-1 items-center justify-center gap-[7px] rounded-btn bg-brand py-[13px] text-[13.5px] font-semibold text-[#F3EBDF] disabled:opacity-40"
        >
          <Split size={17} color="#E7B84B" /> Portion
        </button>
        <button
          onClick={() => navigate(`/labels?coffee=${coffeeId}`)}
          className="flex flex-1 items-center justify-center gap-[7px] rounded-btn bg-tan py-[13px] text-[13.5px] font-semibold text-brand"
        >
          <Tags size={17} color="#5C3D28" /> Labels
        </button>
      </div>

      {/* add another bag of the same coffee (its own state, dates and label) */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="mb-1 font-serif text-[19px] font-semibold">Add a bag</div>
        <p className="mb-4 text-[13.5px] leading-[1.5] text-muted">
          Adds another bag of {coffee.name}. It gets its own state, dates and label, so you can
          freeze or portion each bag separately.
        </p>

        <label className="mb-4 block">
          <div className="mb-[6px] text-[12px] text-muted">Bag weight</div>
          <div className="relative">
            <input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-full rounded-input border border-border-2 bg-card px-[13px] py-[11px] pr-8 text-[14px] font-semibold outline-none focus:border-terracotta"
            />
            <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[13px] text-muted">
              g
            </span>
          </div>
        </label>

        <div className="mb-2 text-[12px] text-muted">Initial state</div>
        <div className="mb-4 flex flex-col gap-2">
          {STATE_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setNewState(o.key)}
              className={`flex items-center justify-between rounded-card border bg-card px-4 py-3 text-left ${
                newState === o.key ? "border-terracotta" : "border-border-2"
              }`}
            >
              <span>
                <span className="block text-[14px] font-semibold">{o.label}</span>
                <span className="text-[11.5px] text-muted">{o.hint}</span>
              </span>
              <span
                className={`h-5 w-5 rounded-full border-2 ${
                  newState === o.key ? "border-terracotta bg-terracotta" : "border-border-2"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-[10px]">
          <button
            onClick={() => setAddOpen(false)}
            className="flex-1 rounded-btn bg-tan py-[13px] text-center text-[14px] font-semibold text-brand"
          >
            Cancel
          </button>
          <button
            disabled={!(Number(newWeight) > 0) || addBag.isPending}
            onClick={() =>
              addBag.mutate(
                { weightG: Number(newWeight), initialState: newState },
                {
                  onSuccess: () => {
                    setAddOpen(false);
                    toast({ variant: "success", message: "Bag added" });
                  },
                  onError: () => toast({ variant: "error", message: "Couldn't add the bag." }),
                }
              )
            }
            className="flex-1 rounded-btn bg-terracotta py-[13px] text-center text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {addBag.isPending ? "Adding…" : "Add bag"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
