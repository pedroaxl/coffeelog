import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Star, Snowflake, Clock, Split } from "lucide-react";
import { useCoffees } from "../api/hooks";
import { CoffeeCard } from "../components/CoffeeCard";
import {
  filterAndSort,
  type CatalogScope,
  type CatalogSort,
} from "../lib/coffee";

const SCOPES: { key: CatalogScope; label: string }[] = [
  { key: "available", label: "Available" },
  { key: "all", label: "All" },
  { key: "archived", label: "Archived" },
];

const SORTS: { key: CatalogSort; label: string; icon: typeof Star; color: string }[] = [
  { key: "stars", label: "Stars", icon: Star, color: "#C79A33" },
  { key: "longest", label: "Longest", icon: Snowflake, color: "#5B7B8C" },
  { key: "recent", label: "Recent", icon: Clock, color: "#5C3D28" },
  { key: "portion", label: "Portion", icon: Split, color: "#9A5228" },
];

/** Catalog (badge 3b) — scope segmented control + filter chips + rich cards. */
export function CatalogScreen() {
  const navigate = useNavigate();
  const { data: coffees, isLoading } = useCoffees();
  const [scope, setScope] = useState<CatalogScope>("available");
  const [sort, setSort] = useState<CatalogSort>("recent");
  const [query, setQuery] = useState("");

  const list = coffees ? filterAndSort(coffees, scope, sort, query) : [];

  return (
    <div className="min-h-full bg-cream px-[22px] pb-6 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-[26px] font-semibold">Catalog</h1>
        <button
          onClick={() => navigate("/catalog/new")}
          aria-label="Add coffee"
          className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-terracotta text-white"
        >
          <Plus size={20} />
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search coffees…"
        className="mb-[14px] w-full rounded-input border border-border-2 bg-card px-[13px] py-[11px] text-[14px] outline-none focus:border-terracotta"
      />

      {/* scope segmented */}
      <div className="mb-[14px] flex rounded-input bg-tan p-1">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`flex-1 rounded-[9px] py-2 text-[12.5px] ${
              scope === s.key ? "bg-white font-semibold text-brand shadow-card" : "text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* sort/filter chips */}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {SORTS.map((s) => {
          const active = sort === s.key;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`flex flex-none items-center gap-[5px] rounded-pill px-3 py-[7px] text-[12px] ${
                active ? "bg-brand text-cream" : "bg-tan"
              }`}
              style={{ color: active ? undefined : s.color }}
            >
              <Icon size={12} color={active ? "#FBF6EE" : s.color} /> {s.label}
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-[13px] text-muted">Loading…</p>}
      {!isLoading && list.length === 0 && (
        <div className="mt-10 text-center text-[13.5px] text-muted">
          No coffees here yet.
          <br />
          <button onClick={() => navigate("/catalog/new")} className="mt-2 font-semibold text-terracotta">
            Add your first coffee
          </button>
        </div>
      )}

      <div className="flex flex-col gap-[13px]">
        {list.map((c) => (
          <CoffeeCard key={c.id} coffee={c} />
        ))}
      </div>
    </div>
  );
}
