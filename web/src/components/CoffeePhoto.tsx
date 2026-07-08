/**
 * Coffee photo slot. Renders the real uploaded image when present, otherwise the
 * design's brown gradient placeholder.
 */
export function CoffeePhoto({
  src,
  width,
  height,
  radius = 12,
  className = "",
}: {
  src: string | null;
  width: number | string;
  height: number | string;
  radius?: number;
  className?: string;
}) {
  const style = { width, height, borderRadius: radius } as const;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`flex-none object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <div
      className={`flex-none ${className}`}
      style={{ ...style, background: "linear-gradient(150deg,#8A5A38,#5C3D28)" }}
    />
  );
}
