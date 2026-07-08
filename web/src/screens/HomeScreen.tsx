import { ScanLine, Plus } from "lucide-react";
import { BeanMark } from "../components/Logo";

/**
 * Home (badge 5a) — dark espresso landing. Phase 0 renders the app bar + quick
 * actions shell; the alert cards and selectable coffee lists arrive in Phase 2.
 */
export function HomeScreen() {
  return (
    <div className="flex min-h-full flex-col bg-brand">
      <div className="px-[22px] pb-5 pt-4 text-[#F3EBDF]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-terracotta">
              <BeanMark size={20} />
            </div>
            <span className="font-serif text-[19px] font-semibold">CoffeeLog</span>
          </div>
        </div>
        <div className="flex gap-[10px]">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-terracotta py-[13px] text-[14px] font-semibold text-white">
            <ScanLine size={19} /> Scan QR
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/30 py-[13px] text-[14px] font-semibold text-[#F3EBDF]">
            <Plus size={19} /> New coffee
          </button>
        </div>
      </div>
      <div className="min-h-[420px] flex-1 rounded-t-[26px] bg-cream px-[22px] py-5">
        <p className="text-[13px] text-muted">
          Alerts and coffee lists land here in Phase 2.
        </p>
      </div>
    </div>
  );
}
