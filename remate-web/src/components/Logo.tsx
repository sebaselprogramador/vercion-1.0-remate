/** Logo de Remate: isotipo y logotipo dibujados con trazos (no dependen de ninguna fuente). */
export function Isotipo({ tamano = 32 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" rx="28" fill="#1d5a42" />
      <g fill="none" stroke="#f5f0e5" strokeWidth="14" strokeLinecap="round">
        <path d="M40 44V88" />
        <path d="M40 66a22 22 0 0 1 22-22" />
      </g>
      <circle cx="82" cy="81" r="8.5" fill="#c8ad7a" />
    </svg>
  );
}

export function Logotipo({ ancho = 104, color = "#1d5a42" }: { ancho?: number; color?: string }) {
  return (
    <svg width={ancho} height={(ancho * 106) / 360} viewBox="0 0 360 106" role="img" aria-label="remate.">
      <g fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 40V80M10 58a18 18 0 0 1 18-18" />
        <path d="M44 60H84A20 20 0 1 0 78.1 74.1" />
        <path d="M102 40V80M102 56a16 16 0 0 1 32 0V80M134 56a16 16 0 0 1 32 0V80" />
        <path d="M224 60a20 20 0 1 0-40 0a20 20 0 1 0 40 0M224 40V80" />
        <path d="M252 26V68a12 12 0 0 0 12 12M242 40H266" />
        <path d="M280 60H320A20 20 0 1 0 314.1 74.1" />
      </g>
      <circle cx="342" cy="79" r="7.5" fill="#c8ad7a" />
    </svg>
  );
}
