import { ChevronRight } from "lucide-react";
import { useSettings } from "../api/hooks";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.6px] text-muted">
        {title}
      </div>
      <div className="overflow-hidden rounded-[14px] border border-border-3 bg-card">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-[15px] py-[13px] ${
        last ? "" : "border-b border-divider"
      }`}
    >
      <span className="text-[13.5px]">{label}</span>
      <span className="text-[13px] text-muted">{value}</span>
    </div>
  );
}

/**
 * Settings (badge 11d) — Phase 0 shows live server-backed values (proves the
 * full stack). Editing thresholds and the Method/Grinder lists lands in Phase 4.
 */
export function SettingsScreen() {
  const { data, isLoading, isError } = useSettings();

  return (
    <div className="min-h-full bg-settings-bg px-[22px] pt-4">
      <h1 className="mb-4 font-serif text-[24px] font-semibold">Settings</h1>

      {isLoading && <p className="text-[13px] text-muted">Loading…</p>}
      {isError && (
        <p className="text-[13px] text-danger">Couldn't reach the server.</p>
      )}

      {data && (
        <>
          <Section title="Server">
            <Row label="Instance URL" value={data.instanceUrl || "—"} />
            <Row
              label="Sync status"
              last
              value={
                <span className="flex items-center gap-[6px] font-semibold text-success">
                  <span className="h-[7px] w-[7px] rounded-full bg-success" />
                  Connected
                </span>
              }
            />
          </Section>

          <Section title="Label printer">
            <Row label="Device" value={data.printerDevice} />
            <Row
              label="Integration"
              value={
                <span className="rounded-[20px] bg-state-defrosted-bg px-[9px] py-[3px] text-[11.5px] font-semibold text-state-defrosted">
                  Phase 1 · PNG export
                </span>
              }
            />
            <Row
              label="Label size"
              last
              value={`${data.labelWidthMm} × ${data.labelHeightMm} mm`}
            />
          </Section>

          <Section title="Freezer alerts">
            <Row
              label="Warn if not frozen after"
              value={`${data.warnNotFrozenAfterDays} days`}
            />
            <Row
              label="Warn if frozen over"
              value={`${data.warnFrozenOverDays} days`}
            />
            <Row label="Weight unit" last value={`${data.weightUnit}`} />
          </Section>

          <Section title="Recipe options">
            <Row label="Methods" value={data.methodOptions.join(" · ")} />
            <Row label="Grinders" last value={data.grinderOptions.join(" · ")} />
          </Section>

          <Section title="Data">
            <Row label="Export backup (JSON)" value={<ChevronRight size={17} color="#B5A48F" />} />
            <Row label="Version" last value="CoffeeLog v1.0.0 · open source" />
          </Section>
        </>
      )}
    </div>
  );
}
