import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, Plus, Split, Snowflake, ChevronRight } from "lucide-react";
import { BeanMark, LogoTile } from "../components/Logo";
import { CoffeeCard } from "../components/CoffeeCard";
import { useAlerts, useCoffees, useSettings } from "../api/hooks";
import { earliestFrozenDate } from "../lib/coffee";
import type { Coffee } from "../api/types";

type ListKey = "recent" | "longest" | "top" | "used";
const LISTS: { key: ListKey; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "longest", label: "Longest frozen" },
  { key: "top", label: "Top rated" },
  { key: "used", label: "Recently used" },
];

function selectList(coffees: Coffee[], key: ListKey): Coffee[] {
  const avail = coffees.filter((c) => c.status === "available");
  switch (key) {
    case "longest":
      return avail
        .filter((c) => earliestFrozenDate(c))
        .sort((a, b) => (earliestFrozenDate(a)! < earliestFrozenDate(b)! ? -1 : 1));
    case "top":
      return avail.filter((c) => c.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    case "used":
      return avail
        .filter((c) => c.lastUsedAt)
        .sort((a, b) => (a.lastUsedAt! < b.lastUsedAt! ? 1 : -1));
    default:
      return [...avail].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Home (badge 5a) — two alert cards + selectable coffee lists. */
export function HomeScreen() {
  const navigate = useNavigate();
  const { data: alerts } = useAlerts();
  const { data: coffees } = useCoffees();
  const [list, setList] = useState<ListKey>("recent");

  if (coffees && coffees.length === 0) return <EmptyHome />;

  const shown = coffees ? selectList(coffees, list) : [];

  return (
    <div className="flex min-h-full flex-col bg-brand">
      {/* app bar + quick actions */}
      <div className="px-[22px] pb-5 pt-4 text-[#F3EBDF]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-terracotta">
              <BeanMark size={20} />
            </div>
            <span className="font-serif text-[19px] font-semibold">CoffeeLog</span>
          </div>
          <button
            onClick={() => navigate("/scan")}
            aria-label="Scan"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/15"
          >
            <ScanLine size={18} color="#F3EBDF" />
          </button>
        </div>
        <div className="flex gap-[10px]">
          <button
            onClick={() => navigate("/scan")}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-terracotta py-[13px] text-[14px] font-semibold text-white"
          >
            <ScanLine size={19} /> Scan QR
          </button>
          <button
            onClick={() => navigate("/catalog/new")}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/30 py-[13px] text-[14px] font-semibold text-[#F3EBDF]"
          >
            <Plus size={19} /> New coffee
          </button>
        </div>
      </div>

      {/* cream sheet */}
      <div className="min-h-[420px] flex-1 rounded-t-[26px] bg-cream pb-6 pt-[18px]">
        {/* alerts */}
        <div className="flex flex-col gap-[10px] px-[22px] pb-5">
          <button
            onClick={() => navigate("/catalog?filter=portion")}
            className="flex items-center gap-3 rounded-card border border-[#E7CDB6] bg-[#F5E7DC] px-[14px] py-3 text-left"
          >
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-tile bg-terracotta">
              <Split size={18} color="#fff" />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-brand">Portion &amp; freeze</span>
              <span className="text-[11.5px] text-muted">
                {(alerts?.portionFreeze.length ?? 0) === 0
                  ? "Nothing waiting to be frozen"
                  : `${alerts!.portionFreeze.length} coffee(s) arrived and aren't frozen`}
              </span>
            </span>
            <Badge n={alerts?.portionFreeze.length ?? 0} color="#BE6A3A" />
          </button>

          <button
            onClick={() => navigate("/catalog?filter=longest")}
            className="flex items-center gap-3 rounded-card border border-[#CBDCE4] bg-[#E9F0F3] px-[14px] py-3 text-left"
          >
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-tile bg-state-frozen">
              <Snowflake size={18} color="#fff" />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-[#3E5967]">Frozen for too long</span>
              <span className="text-[11.5px] text-[#7C93A0]">
                {(alerts?.frozenTooLong.length ?? 0) === 0
                  ? "All frozen coffees are fresh"
                  : `${alerts!.frozenTooLong.length} coffee(s) frozen past the threshold`}
              </span>
            </span>
            <Badge n={alerts?.frozenTooLong.length ?? 0} color="#5B7B8C" />
          </button>
        </div>

        {/* selectable lists */}
        <div className="no-scrollbar mb-[14px] flex gap-2 overflow-x-auto px-[22px]">
          {LISTS.map((l) => (
            <button
              key={l.key}
              onClick={() => setList(l.key)}
              className={`flex-none rounded-pill px-[13px] py-2 text-[12.5px] ${
                list === l.key ? "bg-brand font-semibold text-cream" : "bg-tan text-brand"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-[11px] px-[22px]">
          {shown.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-muted">
              No coffees in this list yet.
              <br />
              <button onClick={() => navigate("/catalog/new")} className="mt-2 inline-flex items-center gap-1 font-semibold text-terracotta">
                Add a coffee <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            shown.map((c) => <CoffeeCard key={c.id} coffee={c} />)
          )}
        </div>
      </div>
    </div>
  );
}

/** Empty home / first run (badge 11a). */
function EmptyHome() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  return (
    <div className="flex min-h-full flex-col bg-brand">
      <div className="flex flex-1 flex-col items-center justify-center px-9 text-center text-[#F3EBDF]">
        <div className="mb-7">
          <LogoTile size={96} radius={28} />
        </div>
        <div className="mb-3 font-serif text-[28px] font-semibold leading-[1.12]">
          Welcome to
          <br />
          CoffeeLog
        </div>
        <p className="mb-10 text-[14px] leading-[1.5] text-[#F3EBDF]/70">
          Your cellar is empty. Add your first coffee to start tracking beans, units and recipes.
        </p>
        <button
          onClick={() => navigate("/catalog/new")}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-[15px] bg-terracotta py-[15px] text-[15px] font-semibold text-white"
        >
          <Plus size={19} /> Add your first coffee
        </button>
        <button
          onClick={() => navigate("/scan")}
          className="flex w-full items-center justify-center gap-2 rounded-[15px] bg-white/10 py-[15px] text-[15px] font-semibold text-[#F3EBDF]"
        >
          <ScanLine size={19} /> Scan a label
        </button>
      </div>
      <div className="flex-none px-9 pb-8 text-center">
        <div className="inline-flex items-center gap-[7px] text-[12px] text-[#F3EBDF]/50">
          <span className="h-[6px] w-[6px] rounded-full bg-[#7FB08A]" />
          Connected to home server{settings?.instanceUrl ? ` · ${settings.instanceUrl}` : ""}
        </div>
      </div>
    </div>
  );
}

function Badge({ n, color }: { n: number; color: string }) {
  return (
    <span
      className="rounded-pill px-[9px] py-[2px] text-[12px] font-bold text-white"
      style={{ background: color, opacity: n === 0 ? 0.35 : 1 }}
    >
      {n}
    </span>
  );
}
