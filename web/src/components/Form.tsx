import type { ReactNode } from "react";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-[6px] text-[12px] text-muted">{label}</div>
      {children}
    </label>
  );
}

const baseInput =
  "w-full rounded-input bg-card px-[13px] py-[11px] text-[14px] outline-none border";

export function TextField({
  value,
  onChange,
  focused,
  placeholder,
  type = "text",
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  focused?: boolean;
  placeholder?: string;
  type?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} ${focused ? "border-terracotta" : "border-border-2"} focus:border-terracotta ${
          suffix ? "pr-8" : ""
        }`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[13px] text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseInput} appearance-none border-border-2 focus:border-terracotta`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
