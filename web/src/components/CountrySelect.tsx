import { COUNTRIES, flagEmoji } from "../lib/countries";

/**
 * Country dropdown (flag + name). Stores the country name to stay consistent
 * with existing data. If the current value isn't in the list (older free-text
 * entry), it's kept as an extra option so nothing is lost.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const known = COUNTRIES.some((c) => c.name === value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded-input border border-border-2 bg-card px-[13px] py-[11px] text-[14px] outline-none focus:border-terracotta"
    >
      <option value="">{placeholder}</option>
      {value && !known && <option value={value}>{value}</option>}
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.name}>
          {flagEmoji(c.code)} {c.name}
        </option>
      ))}
    </select>
  );
}
