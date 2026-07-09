import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { CoffeePhoto } from "./CoffeePhoto";

/**
 * Photo chooser offering both the library and the device camera. On mobile the
 * "Camera" button opens the camera directly (capture); "Choose" opens the photo
 * library / file picker. On desktop both fall back to a file dialog.
 */
export function PhotoPicker({
  previewUrl,
  onFile,
  busy,
  size = 120,
}: {
  previewUrl: string | null;
  onFile: (file: File) => void;
  busy?: boolean;
  size?: number;
}) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = ""; // allow re-picking the same file
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => libraryRef.current?.click()}
        className="relative flex items-center justify-center overflow-hidden rounded-[16px] border border-dashed border-border-2 bg-card text-muted"
        style={{ width: size, height: size }}
      >
        {previewUrl ? (
          <CoffeePhoto src={previewUrl} width={size} height={size} radius={16} />
        ) : (
          <span className="flex flex-col items-center gap-2">
            <ImagePlus size={26} color="#B5A48F" />
            <span className="text-[11px]">Add photo</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[12px] text-white">
            …
          </span>
        )}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex items-center gap-[6px] rounded-pill bg-tan px-3 py-[7px] text-[12.5px] font-semibold text-brand"
        >
          <ImagePlus size={14} color="#5C3D28" /> Choose
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-[6px] rounded-pill bg-tan px-3 py-[7px] text-[12.5px] font-semibold text-brand"
        >
          <Camera size={14} color="#5C3D28" /> Camera
        </button>
      </div>

      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={handle} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handle}
      />
    </div>
  );
}
