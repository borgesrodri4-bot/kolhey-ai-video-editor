/**
 * KolheyLogo — Componente SVG inline fiel à identidade visual da Kolhey.
 *
 * A logo é composta por:
 * - Tipografia serifada em caixa alta: "KOLHEY"
 * - O "O" tem um círculo vazado em laranja (#E84B1A) que substitui a letra
 * - Tagline opcional: "Resultados que se cultivam" em itálico cursivo
 *
 * Props:
 *   size: "sm" | "md" | "lg" | "xl"  — controla a escala geral
 *   showTagline: boolean               — exibe ou oculta a tagline
 *   variant: "light" | "dark"         — cor do texto (branco ou navy)
 */

interface KolheyLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  variant?: "light" | "dark";
  className?: string;
}

const SIZES = {
  sm:  { width: 100, height: 28,  fontSize: 22, tagFontSize: 8,  tagY: 36, circleR: 8,  circleStroke: 2.2 },
  md:  { width: 150, height: 42,  fontSize: 34, tagFontSize: 11, tagY: 54, circleR: 12, circleStroke: 3   },
  lg:  { width: 220, height: 60,  fontSize: 50, tagFontSize: 15, tagY: 78, circleR: 17, circleStroke: 4   },
  xl:  { width: 340, height: 92,  fontSize: 76, tagFontSize: 22, tagY: 118, circleR: 26, circleStroke: 6  },
};

export function KolheyLogo({
  size = "md",
  showTagline = false,
  variant = "light",
  className = "",
}: KolheyLogoProps) {
  const s = SIZES[size];
  const textColor = variant === "light" ? "#FFFFFF" : "#0D1B2E";
  const orange = "#E84B1A";
  const totalHeight = showTagline ? s.height + s.tagFontSize + 10 : s.height;

  // The "O" circle is centered at roughly 30% of the word width
  // We compute its x position based on the letter spacing of "K" + half of "O"
  // For a serifed all-caps font at given size, "K" is ~0.62em wide
  const kWidth = s.fontSize * 0.62;
  const oWidth = s.fontSize * 0.72;
  const circleX = kWidth + oWidth / 2;
  const circleY = s.height / 2 - s.fontSize * 0.08; // slight optical center

  return (
    <svg
      viewBox={`0 0 ${s.width} ${totalHeight}`}
      width={s.width}
      height={totalHeight}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kolhey"
      role="img"
    >
      <defs>
        {/* Clip mask: punch the O shape out of the text so the circle shows through */}
        <mask id={`kolhey-o-mask-${size}`}>
          <rect width={s.width} height={s.height} fill="white" />
          {/* Ellipse that matches the inner counter of the "O" */}
          <ellipse
            cx={circleX}
            cy={circleY}
            rx={s.circleR * 0.62}
            ry={s.circleR * 0.72}
            fill="black"
          />
        </mask>
      </defs>

      {/* ── Main wordmark text ── */}
      <text
        x="0"
        y={s.height * 0.82}
        fontFamily="'Playfair Display', 'Georgia', serif"
        fontWeight="700"
        fontSize={s.fontSize}
        letterSpacing="0.04em"
        fill={textColor}
        mask={`url(#kolhey-o-mask-${size})`}
        style={{ textTransform: "uppercase" }}
      >
        KOLHEY
      </text>

      {/* ── Orange circle (the "O" ring) ── */}
      <circle
        cx={circleX}
        cy={circleY}
        r={s.circleR}
        fill="none"
        stroke={orange}
        strokeWidth={s.circleStroke}
      />

      {/* ── Tagline ── */}
      {showTagline && (
        <text
          x={s.width / 2}
          y={s.height + s.tagFontSize + 4}
          fontFamily="'Dancing Script', cursive"
          fontWeight="400"
          fontSize={s.tagFontSize}
          fill={variant === "light" ? "rgba(255,255,255,0.75)" : "rgba(13,27,46,0.6)"}
          textAnchor="middle"
          fontStyle="italic"
        >
          Resultados que se cultivam
        </text>
      )}
    </svg>
  );
}

/**
 * KolheyWordmark — versão compacta apenas com o texto "KOLHEY"
 * para uso em sidebars, headers e favicons textuais.
 */
export function KolheyWordmark({
  size = "md",
  variant = "light",
  className = "",
}: Omit<KolheyLogoProps, "showTagline">) {
  return (
    <KolheyLogo
      size={size}
      showTagline={false}
      variant={variant}
      className={className}
    />
  );
}

export default KolheyLogo;
