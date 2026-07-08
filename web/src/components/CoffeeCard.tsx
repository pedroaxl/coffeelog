import { useNavigate } from "react-router-dom";
import { Snowflake, Sprout } from "lucide-react";
import type { Coffee } from "../api/types";
import { CoffeePhoto } from "./CoffeePhoto";
import { StatePill } from "./StatePill";
import { StarScore } from "./StarScore";
import { primaryStatus, earliestFrozenDate } from "../lib/coffee";
import { shortDate, daysSince } from "../lib/format";

/** Rich horizontal catalog card (badge 3b, style 1c). */
export function CoffeeCard({ coffee }: { coffee: Coffee }) {
  const navigate = useNavigate();
  const status = primaryStatus(coffee);
  const origin = [coffee.beanRegion, coffee.beanCountry].filter(Boolean).join(", ");
  const frozenDate = earliestFrozenDate(coffee);
  const frozenDays = daysSince(frozenDate);

  const tags = [coffee.process, coffee.variety].filter(Boolean) as string[];

  return (
    <button
      onClick={() => navigate(`/catalog/${coffee.id}`)}
      className="w-full rounded-card-lg border border-border bg-card p-[15px] text-left shadow-card"
    >
      <div className="flex gap-[14px]">
        <CoffeePhoto src={coffee.photoPath} width={58} height={70} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-[16px] font-semibold">{coffee.name}</div>
            <StatePill status={status} />
          </div>
          <div className="mb-2 mt-[3px] truncate text-[12.5px] text-muted">
            {[coffee.roaster, origin].filter(Boolean).join(" · ")}
          </div>
          <StarScore score={coffee.score} />
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
          {status === "frozen" && frozenDays != null ? (
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
