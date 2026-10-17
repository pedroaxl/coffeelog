import { useNavigate } from "react-router-dom";
import { Package, Snowflake, Sprout, TestTube } from "lucide-react";
import type { Coffee } from "../api/types";
import { CoffeePhoto } from "./CoffeePhoto";
import { inventorySummary, earliestFrozenDate, type InventoryGroup } from "../lib/coffee";
import { STATUS_STYLES, shortDate, daysSince } from "../lib/format";

function groupLabel({ kind, status, count }: InventoryGroup): string {
  const what = kind === "tube" ? "tube" : "bag";
  return `${count} ${STATUS_STYLES[status].label.toLowerCase()} ${what}${count === 1 ? "" : "s"}`;
}

/** Rich horizontal catalog card: units summarized as icon + count in the top-right. */
export function CoffeeCard({ coffee }: { coffee: Coffee }) {
  const navigate = useNavigate();
  const inventory = inventorySummary(coffee);
  const origin = [coffee.beanRegion, coffee.beanCountry].filter(Boolean).join(", ");
  const frozenDate = earliestFrozenDate(coffee);
  const frozenDays = daysSince(frozenDate);

  const tags = [coffee.process, coffee.variety].filter(Boolean) as string[];

  return (
    <button
      onClick={() => navigate(`/catalog/${coffee.id}`)}
      className="w-full rounded-card-lg border border-border bg-card p-[15px] text-left shadow-card"
    >
      <div className="flex items-center gap-[14px]">
        <CoffeePhoto src={coffee.photoPath} width={48} height={56} radius={10} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-[16px] font-semibold">{coffee.name}</div>
            {inventory.length > 0 && (
              <div className="flex flex-none items-center gap-[9px] pt-[2px] text-[12px] font-semibold text-muted">
                {inventory.map((g) => {
                  const Icon = g.kind === "tube" ? TestTube : Package;
                  const label = groupLabel(g);
                  return (
                    <span
                      key={`${g.kind}-${g.status}`}
                      className="flex items-center gap-[3px]"
                      title={label}
                      aria-label={label}
                    >
                      <Icon size={14} strokeWidth={2.2} color={STATUS_STYLES[g.status].color} />
                      {g.count}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-[3px] truncate text-[12.5px] text-muted">
            {[coffee.roaster, origin].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      {(tags.length > 0 || coffee.roastDate || frozenDate) && (
        <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
          <div className="flex gap-[7px]">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-[8px] bg-tan-2 px-[9px] py-1 text-[11px] text-brand"
              >
                {t}
              </span>
            ))}
          </div>
          {frozenDays != null ? (
            <span className="flex items-center gap-1 text-[11.5px] font-semibold text-state-defrosted">
              <Snowflake size={13} color="#B07A1C" /> frozen {frozenDays} d ago
            </span>
          ) : coffee.roastDate ? (
            <span className="flex items-center gap-1 text-[11.5px] text-muted">
              <Sprout size={13} color="#BE6A3A" /> roasted {shortDate(coffee.roastDate)}
            </span>
          ) : null}
        </div>
      )}
    </button>
  );
}
