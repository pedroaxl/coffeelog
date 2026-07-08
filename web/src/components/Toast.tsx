import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, TriangleAlert, AlertCircle, Undo2 } from "lucide-react";

export type ToastVariant = "success" | "warning" | "error" | "neutral";

export interface ToastOptions {
  variant?: ToastVariant;
  message: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, "action">> {
  id: number;
  action?: ToastOptions["action"];
}

const ToastContext = createContext<(opts: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const STYLES: Record<ToastVariant, { bg: string; fg: string; accent: string; Icon: typeof Check }> = {
  success: { bg: "#26382C", fg: "#EAF3EC", accent: "#7FD096", Icon: Check },
  warning: { bg: "#2B211A", fg: "#EAD9C3", accent: "#E7B84B", Icon: TriangleAlert },
  error: { bg: "#F5E4DE", fg: "#7A2E20", accent: "#C0503A", Icon: AlertCircle },
  neutral: { bg: "#FFFDF9", fg: "#5C3D28", accent: "#BE6A3A", Icon: Undo2 },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (opts: ToastOptions) => {
      const id = Date.now() + Math.random();
      const item: ToastItem = {
        id,
        variant: opts.variant ?? "neutral",
        message: opts.message,
        durationMs: opts.durationMs ?? 4000,
        action: opts.action,
      };
      setItems((xs) => [...xs, item]);
      window.setTimeout(() => remove(id), item.durationMs);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[88px] z-50 mx-auto flex max-w-[440px] flex-col gap-[10px] px-[22px] md:bottom-6">
        {items.map((t) => {
          const s = STYLES[t.variant];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-[11px] rounded-btn px-[15px] py-[13px] shadow-card"
              style={{
                background: s.bg,
                color: s.fg,
                border: t.variant === "error" || t.variant === "neutral" ? "1px solid #E9C4BA33" : undefined,
              }}
            >
              <s.Icon size={19} color={s.accent} strokeWidth={2.2} />
              <span className="flex-1 text-[13.5px]">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    remove(t.id);
                  }}
                  className="text-[12.5px] font-semibold"
                  style={{ color: s.accent }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
