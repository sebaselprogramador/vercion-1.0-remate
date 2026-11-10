export type Tipo = "sillon" | "camara" | "lampara";

/** Ilustración según la categoría mientras los productos no tengan foto. */
export function ilustracionDeCategoria(categoria: string | null): Tipo {
  if (categoria === "Tecnología" || categoria === "Coleccionables") return "camara";
  if (categoria === "Moda") return "lampara";
  return "sillon";
}

/** Ilustraciones simples en el estilo de la propuesta "Vitrina local". */
export function Ilustracion({ tipo, alto = 160 }: { tipo: Tipo; alto?: number }) {
  return (
    <div className={`ilustracion ${tipo === "camara" ? "ilustracion-arena" : ""}`} style={{ height: alto }}>
      <svg viewBox="0 0 200 140" height={alto * 0.8} aria-hidden="true">
        <ellipse cx="100" cy="124" rx="70" ry="9" fill="#c9d9c3" />
        <circle cx="100" cy="66" r="56" fill="#fffcf6" opacity="0.55" />
        {tipo === "sillon" && (
          <g>
            <rect x="62" y="30" width="76" height="62" rx="18" fill="#6f9466" />
            <rect x="56" y="70" width="88" height="30" rx="10" fill="#4f7a49" />
            <rect x="48" y="58" width="18" height="40" rx="9" fill="#6f9466" />
            <rect x="134" y="58" width="18" height="40" rx="9" fill="#6f9466" />
            <rect x="66" y="98" width="6" height="22" rx="3" fill="#6b4a32" transform="rotate(10 69 109)" />
            <rect x="128" y="98" width="6" height="22" rx="3" fill="#6b4a32" transform="rotate(-10 131 109)" />
          </g>
        )}
        {tipo === "camara" && (
          <g>
            <rect x="58" y="46" width="84" height="56" rx="8" fill="#33463c" />
            <rect x="72" y="38" width="28" height="10" rx="3" fill="#33463c" />
            <circle cx="104" cy="74" r="22" fill="#8fa98a" />
            <circle cx="104" cy="74" r="14" fill="#20382d" />
            <circle cx="98" cy="68" r="4" fill="#dde9d8" />
            <rect x="66" y="54" width="14" height="6" rx="2" fill="#dde9d8" />
          </g>
        )}
        {tipo === "lampara" && (
          <g>
            <polygon points="74,64 126,64 112,30 88,30" fill="#c8ad7a" />
            <rect x="98" y="64" width="4" height="50" fill="#6b4a32" />
            <rect x="78" y="112" width="44" height="6" rx="3" fill="#6b4a32" />
          </g>
        )}
      </svg>
    </div>
  );
}
