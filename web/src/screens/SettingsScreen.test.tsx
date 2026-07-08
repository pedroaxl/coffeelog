import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsScreen } from "./SettingsScreen";
import type { Settings } from "../api/types";

const settings: Settings = {
  instanceUrl: "192.168.0.12:8080",
  warnNotFrozenAfterDays: 3,
  warnFrozenOverDays: 40,
  labelWidthMm: 40,
  labelHeightMm: 30,
  labelDpi: 300,
  weightUnit: "g",
  printerDevice: "Niimbot B1",
  methodOptions: ["V60 02", "Origami (Conical)"],
  grinderOptions: ["1Zpresso ZP6"],
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(settings), { status: 200 }))
  );
});

function renderWithClient(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SettingsScreen", () => {
  it("shows the Niimbot B1 printer and seeded thresholds from the API", async () => {
    renderWithClient(<SettingsScreen />);
    expect(await screen.findByText("Niimbot B1")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("40 days")).toBeInTheDocument();
    expect(screen.getByText(/V60 02/)).toBeInTheDocument();
  });
});
