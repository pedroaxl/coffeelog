import { daysSince } from "../lib/dates.js";
import type { Coffee } from "../repos/coffees.js";
import type { Settings } from "../repos/settings.js";

export interface Alerts {
  portionFreeze: Coffee[];
  frozenTooLong: Coffee[];
}

/** Does a coffee have any active, currently-frozen unit? */
function hasActiveFrozenUnit(coffee: Coffee): boolean {
  return coffee.units.some((u) => u.active && u.status === "frozen");
}

/**
 * Compute the two Home alert queues from coffees + Settings thresholds.
 * - Portion & freeze: bought coffees that still aren't frozen after N days.
 * - Frozen too long: coffees with a unit frozen longer than the threshold.
 */
export function computeAlerts(coffees: Coffee[], settings: Settings): Alerts {
  const portionFreeze = coffees.filter((c) => {
    if (c.status !== "available") return false;
    if (hasActiveFrozenUnit(c)) return false;
    const age = daysSince(c.purchaseDate);
    return age != null && age >= settings.warnNotFrozenAfterDays;
  });

  const frozenTooLong = coffees.filter((c) =>
    c.units.some((u) => {
      if (!u.active || u.status !== "frozen") return false;
      const age = daysSince(u.frozenDate);
      return age != null && age > settings.warnFrozenOverDays;
    })
  );

  return { portionFreeze, frozenTooLong };
}
