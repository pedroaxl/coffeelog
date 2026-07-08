import { useState } from "react";
import { X } from "lucide-react";

/** Editable tasting-note chips with remove (×) and "+ add" (badge 11b). */
export function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  function commit() {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap gap-[7px]">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-[6px] rounded-pill bg-chip-terracotta-bg px-3 py-[6px] text-[12.5px] text-accent-deep"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
          >
            <X size={11} color="#9A5228" strokeWidth={2.4} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="note"
          className="rounded-pill border border-terracotta bg-card px-3 py-[6px] text-[12.5px] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-pill border border-dashed border-[#D9C6AC] px-3 py-[6px] text-[12.5px] text-muted"
        >
          + add
        </button>
      )}
    </div>
  );
}
