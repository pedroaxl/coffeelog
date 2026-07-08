import { Plus } from "lucide-react";

/** Catalog (badge 3b) — Phase 0 placeholder; list, filters and cards in Phase 1. */
export function CatalogScreen() {
  return (
    <div className="min-h-full bg-cream px-[22px] pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-[26px] font-semibold">Catalog</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-terracotta text-white">
          <Plus size={20} />
        </button>
      </div>
      <p className="text-[13px] text-muted">Coffee catalog arrives in Phase 1.</p>
    </div>
  );
}
