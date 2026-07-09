import { useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

/**
 * Multi-photo manager for the edit form: thumbnails (cover first), tap a photo
 * to make it the cover, × to remove, and Choose/Camera to add more (front/back
 * of the package, etc.).
 */
export function PhotoGallery({
  photos,
  onAdd,
  onRemove,
  onSetCover,
  busy,
}: {
  photos: string[];
  onAdd: (files: File[]) => void;
  onRemove: (path: string) => void;
  onSetCover: (path: string) => void;
  busy?: boolean;
}) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onAdd(files);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p} className="relative">
            <button
              type="button"
              onClick={() => i !== 0 && onSetCover(p)}
              title={i === 0 ? "Cover" : "Make cover"}
              className={`block h-[76px] w-[76px] overflow-hidden rounded-[12px] border ${
                i === 0 ? "border-terracotta" : "border-border-2"
              }`}
            >
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded-[6px] bg-brand/85 px-[6px] py-[1px] text-[9.5px] font-semibold text-cream">
                Cover
              </span>
            )}
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onRemove(p)}
              className="absolute -right-[6px] -top-[6px] flex h-[20px] w-[20px] items-center justify-center rounded-full border border-border bg-white shadow-card"
            >
              <X size={12} color="#C0503A" strokeWidth={2.5} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border-2 bg-card text-muted"
        >
          {busy ? <span className="text-[11px]">…</span> : <>
            <ImagePlus size={20} color="#B5A48F" />
            <span className="text-[10px]">Add</span>
          </>}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex items-center gap-[6px] rounded-pill bg-tan px-3 py-[6px] text-[12px] font-semibold text-brand"
        >
          <ImagePlus size={13} color="#5C3D28" /> Choose
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-[6px] rounded-pill bg-tan px-3 py-[6px] text-[12px] font-semibold text-brand"
        >
          <Camera size={13} color="#5C3D28" /> Camera
        </button>
        {photos.length > 1 && <span className="text-[11px] text-muted-2">Tap a photo to make it the cover</span>}
      </div>

      <input ref={libraryRef} type="file" accept="image/*" multiple hidden onChange={handle} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
    </div>
  );
}
