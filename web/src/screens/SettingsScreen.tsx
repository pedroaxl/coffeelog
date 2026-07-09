import { useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "../api/hooks";
import { useToast } from "../components/Toast";
import { TagEditor } from "../components/TagEditor";
import type { Settings } from "../api/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">
        {title}
      </div>
      <div className="overflow-hidden rounded-[14px] border border-border-3 bg-card">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
  last,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`flex ${align === "start" ? "flex-col gap-2" : "items-center justify-between"} px-[15px] py-[12px] ${
        last ? "" : "border-b border-divider"
      }`}
    >
      <span className="text-[13.5px]">{label}</span>
      {children}
    </div>
  );
}

/** Small text/number field that commits on blur. */
function InlineInput({
  value,
  onCommit,
  type = "text",
  width = "w-28",
  suffix,
  placeholder,
}: {
  value: string | number;
  onCommit: (v: string) => void;
  type?: string;
  width?: string;
  suffix?: string;
  placeholder?: string;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <span className="flex items-center gap-1">
      <input
        type={type}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== String(value) && onCommit(v)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`${width} rounded-[9px] border border-border-2 bg-cream px-[10px] py-[6px] text-right text-[13px] outline-none focus:border-terracotta`}
      />
      {suffix && <span className="text-[12px] text-muted">{suffix}</span>}
    </span>
  );
}

/** Settings (badge 11d) — editable thresholds, label config, option lists, backup. */
export function SettingsScreen() {
  const { data, isLoading, isError } = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();

  const patch = (p: Partial<Settings>, msg = "Settings saved") =>
    update.mutate(p, { onSuccess: () => toast({ variant: "success", message: msg }) });

  const num = (s: string, fallback: number) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <div className="min-h-full bg-settings-bg px-[22px] pb-8 pt-4">
      <h1 className="mb-4 font-serif text-[24px] font-semibold">Settings</h1>
      {isLoading && <p className="text-[13px] text-muted">Loading…</p>}
      {isError && <p className="text-[13px] text-danger">Couldn't reach the server.</p>}

      {data && (
        <>
          <Section title="Server">
            <Row label="Instance URL">
              <InlineInput
                value={data.instanceUrl}
                width="w-44"
                placeholder="192.168.0.12:8080"
                onCommit={(v) => patch({ instanceUrl: v })}
              />
            </Row>
            <Row label="Sync status" last>
              <span className="flex items-center gap-[6px] text-[12.5px] font-semibold text-success">
                <span className="h-[7px] w-[7px] rounded-full bg-success" /> Connected
              </span>
            </Row>
          </Section>

          <Section title="Label printer">
            <Row label="Device">
              <InlineInput value={data.printerDevice} width="w-36" onCommit={(v) => patch({ printerDevice: v })} />
            </Row>
            <Row label="Integration">
              <span className="rounded-[20px] bg-state-defrosted-bg px-[9px] py-[3px] text-[11.5px] font-semibold text-state-defrosted">
                Phase 1 · PNG export
              </span>
            </Row>
            <Row label="Label size">
              <span className="flex items-center gap-1">
                <InlineInput value={data.labelWidthMm} type="number" width="w-14" onCommit={(v) => patch({ labelWidthMm: num(v, data.labelWidthMm) })} />
                <span className="text-[12px] text-muted">×</span>
                <InlineInput value={data.labelHeightMm} type="number" width="w-14" onCommit={(v) => patch({ labelHeightMm: num(v, data.labelHeightMm) })} suffix="mm" />
              </span>
            </Row>
            <Row label="Print resolution" last>
              <InlineInput value={data.labelDpi} type="number" width="w-20" onCommit={(v) => patch({ labelDpi: num(v, data.labelDpi) })} suffix="dpi" />
            </Row>
          </Section>

          <Section title="Freezer alerts">
            <Row label="Warn if not frozen after">
              <InlineInput value={data.warnNotFrozenAfterDays} type="number" width="w-16" onCommit={(v) => patch({ warnNotFrozenAfterDays: num(v, data.warnNotFrozenAfterDays) })} suffix="days" />
            </Row>
            <Row label="Warn if frozen over">
              <InlineInput value={data.warnFrozenOverDays} type="number" width="w-16" onCommit={(v) => patch({ warnFrozenOverDays: num(v, data.warnFrozenOverDays) })} suffix="days" />
            </Row>
            <Row label="Weight unit" last>
              <span className="text-[13px] text-muted">grams (g)</span>
            </Row>
          </Section>

          <Section title="Recipe options">
            <Row label="Methods" align="start" last={false}>
              <TagEditor tags={data.methodOptions} onChange={(t) => patch({ methodOptions: t }, "Methods updated")} />
            </Row>
            <Row label="Grinders" align="start" last>
              <TagEditor tags={data.grinderOptions} onChange={(t) => patch({ grinderOptions: t }, "Grinders updated")} />
            </Row>
          </Section>

          <Section title="Coffee options">
            <Row label="Varieties" align="start" last={false}>
              <TagEditor tags={data.varietyOptions} onChange={(t) => patch({ varietyOptions: t }, "Varieties updated")} />
            </Row>
            <Row label="Processes" align="start" last>
              <TagEditor tags={data.processOptions} onChange={(t) => patch({ processOptions: t }, "Processes updated")} />
            </Row>
          </Section>

          <Section title="Data">
            <a
              href="/api/backup"
              className="flex items-center justify-between px-[15px] py-[13px] text-[13.5px] hover:bg-cream"
            >
              Export backup (JSON)
              <span className="text-[12px] font-semibold text-terracotta">Download</span>
            </a>
            <div className="border-t border-divider px-[15px] py-[13px]">
              <span className="text-[13px] text-muted-2">CoffeeLog v1.0.0 · open source</span>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
