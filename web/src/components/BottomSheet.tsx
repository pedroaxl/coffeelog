import type { ReactNode } from "react";

/** Slide-up bottom sheet over a dimmed backdrop (badge 11e). */
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-[rgba(30,18,10,.35)]" onClick={onClose} />
      <div
        className="relative z-10 mx-auto w-full max-w-[440px] rounded-t-[22px] bg-cream p-5 pb-7"
        style={{ boxShadow: "0 -10px 40px -12px rgba(0,0,0,.4)" }}
      >
        <div className="mx-auto mb-3 h-[4px] w-10 rounded-full bg-[#E0D3C0]" />
        {children}
      </div>
    </div>
  );
}
