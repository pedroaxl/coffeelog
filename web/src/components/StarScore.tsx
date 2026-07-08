import { useState } from "react";

const GOLD = "#C79A33";
const EMPTY = "#E3D6C2";

/** Read-only star row. `score` null renders all-empty. */
export function StarScore({ score, size = 13 }: { score: number | null; size?: number }) {
  return (
    <span style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: score != null && n <= score ? GOLD : EMPTY }}>
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * Interactive star picker (detail screen). Editable anytime per the locked
 * decision — clicking a filled star again clears the score back to unset.
 */
export function StarPicker({
  score,
  onChange,
  size = 30,
}: {
  score: number | null;
  onChange: (score: number | null) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? score ?? 0;
  return (
    <div className="flex" style={{ fontSize: size, letterSpacing: 2 }} role="radiogroup" aria-label="Score">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(score === n ? null : n)}
          style={{ color: n <= shown ? GOLD : EMPTY, lineHeight: 1, background: "none", border: 0, cursor: "pointer", padding: 0 }}
        >
          ★
        </button>
      ))}
    </div>
  );
}
