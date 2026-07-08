/** Coffee-bean logo mark, lifted from the design board (viewBox 0 0 48 48). */
export function BeanMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g transform="rotate(-32 24 24)">
        <ellipse cx="24" cy="24" rx="12.5" ry="19" fill="#F3EBDF" />
        <path
          d="M24 6 C 18 15, 30 33, 24 42"
          fill="none"
          stroke="#BE6A3A"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** Rounded terracotta tile containing the bean mark (logo 2a). */
export function LogoTile({ size = 46, radius = 14 }: { size?: number; radius?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-terracotta"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxShadow: "0 8px 20px -6px rgba(190,106,58,.55)",
      }}
    >
      <BeanMark size={Math.round(size * 0.6)} />
    </div>
  );
}
