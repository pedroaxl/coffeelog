import { useState } from "react";
import { X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Full-screen image viewer. Shows the photo as large as it fits, navigates
 * between multiple photos, and offers "Open original" to view the
 * full-resolution file in a new tab (native pinch-zoom — handy for reading
 * package fine print).
 */
export function ImageLightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const src = images[i];
  const many = images.length > 1;
  const go = (delta: number) => setI((prev) => (prev + delta + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-[6px] text-[13px] font-medium text-white/85"
        >
          <ExternalLink size={16} /> Open original
        </a>
        <div className="flex items-center gap-3">
          {many && (
            <span className="text-[12px] text-white/70">
              {i + 1} / {images.length}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} color="#fff" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-auto p-2">
        <img
          src={src}
          alt="Coffee"
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />
        {many && (
          <>
            <button
              aria-label="Previous"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <ChevronLeft size={24} color="#fff" />
            </button>
            <button
              aria-label="Next"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <ChevronRight size={24} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
