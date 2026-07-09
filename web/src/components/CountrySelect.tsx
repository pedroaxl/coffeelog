import { FREQUENT_COUNTRIES, ALL_COUNTRIES, flagEmoji, isKnownCountry } from "../lib/countries";

/**
 * Country dropdown (flag + name). Stores the country name to stay consistent
 * with existing data. Frequent coffee origins are grouped at the top; every
 * country follows, alphabetically sorted, so any country is easy to find. An
 * unrecognized current value (older free-text entry) is kept as an option.
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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded-input border border-border-2 bg-card px-[13px] py-[11px] text-[14px] outline-none focus:border-terracotta"
    >
      <option value="">{placeholder}</option>
      {value && !isKnownCountry(value) && <option value={value}>{value}</option>}
      <optgroup label="Frequent">
        {FREQUENT_COUNTRIES.map((c) => (
          <option key={`f-${c.code}`} value={c.name}>
            {flagEmoji(c.code)} {c.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="All countries">
        {ALL_COUNTRIES.map((c) => (
          <option key={c.code} value={c.name}>
            {flagEmoji(c.code)} {c.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
