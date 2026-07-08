import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import { X, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import type { UnitDetail } from "../api/hooks";
import { extractQrId } from "../lib/qr";
import { STATUS_STYLES, shortDate, gramsLabel } from "../lib/format";

type ScanState =
  | { kind: "scanning" }
  | { kind: "error"; message: string }
  | { kind: "found"; data: UnitDetail }
  | { kind: "notfound"; code: string };

/** Scanner (badge 6c) — camera QR → resolve qrId → result sheet → open unit. */
export function ScanScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>({ kind: "scanning" });
  const [manual, setManual] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls: { stop: () => void } | undefined;
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (cancelled || !result) return;
        if (stateRef.current.kind !== "scanning") return;
        void resolve(result.getText());
      })
      .then((c) => {
        controls = c;
        if (cancelled) c.stop();
      })
      .catch((err) => {
        setState({
          kind: "error",
          message:
            err?.name === "NotAllowedError"
              ? "Camera permission denied. Enter the label code below instead."
              : "Camera unavailable (needs HTTPS or localhost). Enter the code below.",
        });
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  async function resolve(text: string) {
    const qrId = extractQrId(text);
    if (!qrId) return;
    try {
      const data = await api.get<UnitDetail>(`/scan/${qrId}`);
      setState({ kind: "found", data });
    } catch {
      setState({ kind: "notfound", code: qrId });
    }
  }

  return (
    <div className="relative flex min-h-full flex-col bg-[#1A130D]">
      {/* camera viewport */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="absolute inset-x-[22px] top-2 z-10 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35"
          >
            <X size={20} color="#fff" />
          </button>
          <span className="text-[14px] font-semibold text-[#F3EBDF]">Scan label</span>
          <span className="w-10" />
        </div>

        {state.kind === "scanning" && (
          <>
            {/* corner-bracket scan frame */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2">
              {["top-0 left-0 border-t-4 border-l-4 rounded-tl-[22px]",
                "top-0 right-0 border-t-4 border-r-4 rounded-tr-[22px]",
                "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[22px]",
                "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[22px]"].map((c) => (
                <span key={c} className={`absolute h-11 w-11 border-terracotta ${c}`} />
              ))}
              <span className="absolute inset-x-3 top-1/2 h-[2px] bg-gold-bright shadow-[0_0_12px_#E7B84B]" />
            </div>
            <div className="absolute inset-x-0 bottom-[120px] text-center text-[13.5px] text-[#F3EBDF]/85">
              Point at the label's QR
            </div>
          </>
        )}

        {state.kind === "error" && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-card bg-black/50 p-5 text-center text-[13.5px] text-[#F3EBDF]">
            {state.message}
          </div>
        )}
      </div>

      {/* manual entry (fallback for http/LAN where the camera is blocked) */}
      {(state.kind === "scanning" || state.kind === "error" || state.kind === "notfound") && (
        <div className="flex-none bg-[#1A130D] px-[22px] pb-6 pt-3">
          {state.kind === "notfound" && (
            <div className="mb-2 text-center text-[12.5px] text-danger">No unit for code “{state.code}”.</div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void resolve(manual);
            }}
            className="flex gap-2"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Enter label code (e.g. A4F2K7)"
              className="flex-1 rounded-btn border border-white/20 bg-white/10 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none"
            />
            <button type="submit" className="rounded-btn bg-terracotta px-4 py-3 text-[14px] font-semibold text-white">
              Open
            </button>
          </form>
        </div>
      )}

      {/* result sheet */}
      {state.kind === "found" && <ResultSheet data={state.data} onClose={() => setState({ kind: "scanning" })} />}
    </div>
  );
}

function ResultSheet({ data, onClose }: { data: UnitDetail; onClose: () => void }) {
  const navigate = useNavigate();
  const { coffee, unit } = data;
  const s = STATUS_STYLES[unit.status];
  const r = coffee.recipe;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[24px] bg-cream p-5 pb-7" style={{ boxShadow: "0 -18px 40px -20px rgba(0,0,0,.5)" }}>
      <div className="mx-auto mb-3 h-[4px] w-10 rounded-full bg-[#E0D3C0]" />
      <div className="mb-[10px] flex items-center gap-[5px] text-[11px] font-semibold tracking-[0.5px] text-success">
        <span className="h-[7px] w-[7px] rounded-full bg-success" /> UNIT SCANNED
      </div>
      <div className="mb-[14px] flex items-center gap-[13px]">
        <div className="h-[58px] w-[50px] flex-none rounded-[11px]" style={{ background: coffee.photoPath ? undefined : "linear-gradient(150deg,#8A5A38,#5C3D28)" }}>
          {coffee.photoPath && <img src={coffee.photoPath} alt="" className="h-full w-full rounded-[11px] object-cover" />}
        </div>
        <div className="flex-1">
          <div className="font-serif text-[18px] font-semibold leading-[1.05]">{coffee.name}</div>
          <div className="my-[2px] text-[12px] text-muted">
            {gramsLabel(unit.weightG)} {unit.kind} ·{" "}
            <span className="font-semibold" style={{ color: s.color }}>
              {s.label}{unit.frozenDate ? ` ${shortDate(unit.frozenDate)}` : ""}
            </span>
          </div>
          {r && (r.method || r.doseG || r.grinder) && (
            <div className="flex gap-3 text-[11.5px] text-brand">
              {r.method && <span className="font-semibold">{r.method}</span>}
              {r.doseG != null && <span>{r.doseG} g</span>}
              {r.grinder && <span>{[r.grinder, r.grinderSetting].filter(Boolean).join(" · ")}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-[10px]">
        <button
          onClick={() => navigate(`/units/${unit.id}`)}
          className="flex flex-1 items-center justify-center gap-1 rounded-btn bg-terracotta py-[13px] text-[14px] font-semibold text-white"
        >
          Open unit <ChevronRight size={16} />
        </button>
        <button onClick={onClose} className="rounded-btn bg-tan px-5 py-[13px] text-[14px] font-semibold text-brand">
          Rescan
        </button>
      </div>
    </div>
  );
}
