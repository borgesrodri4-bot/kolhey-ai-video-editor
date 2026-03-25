/**
 * KolheyLogo — Componente SVG inline fiel à identidade visual da Kolhey.
 *
 * Modelo de referência:
 * - "KOLHEY" em serifada branca, caixa alta
 * - O "O" é um círculo laranja (#E84B1A) vazado (stroke, sem fill)
 * - Tagline "Resultados que se cultivam" em cursiva abaixo
 * - Onça/jaguar: imagem real gerada por IA, posicionada à direita,
 *   translúcida (opacity ~0.25), como no modelo original da marca
 */

const JAGUAR_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663468388409/gwVBgn9SLQhabuuxC5oTDT/kolhey-jaguar-bVoRNbzGMWaVBkEiy3GRYG.webp";

interface KolheyLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  showJaguar?: boolean;
  variant?: "light" | "dark";
  className?: string;
}

// ─── Tamanhos ─────────────────────────────────────────────────────────────────
const SIZES = {
  sm:  { textW: 110, textH: 26, fs: 22, ls: 1.5 },
  md:  { textW: 165, textH: 38, fs: 33, ls: 2   },
  lg:  { textW: 240, textH: 56, fs: 48, ls: 3   },
  xl:  { textW: 340, textH: 80, fs: 68, ls: 4   },
};

export function KolheyLogo({
  size = "md",
  showTagline = false,
  showJaguar = false,
  variant = "light",
  className = "",
}: KolheyLogoProps) {
  const s = SIZES[size];
  const textColor = variant === "light" ? "#FFFFFF" : "#0D1B2E";
  const orange = "#E84B1A";

  // Onça: quadrado com lado = textH * 3.6, sobreposta ~35% ao texto pela esquerda
  const jSize = s.textH * 3.6;
  const jOverlap = jSize * 0.38;

  const tagH = showTagline ? s.fs * 0.30 + 6 : 0;

  // Largura e altura totais do SVG
  const totalW = showJaguar ? s.textW + jSize - jOverlap : s.textW;
  const totalH = showJaguar
    ? Math.max(s.textH + tagH, jSize * 0.88)
    : s.textH + tagH;

  // Linha de base do texto — centralizado verticalmente
  const textBaseY = showJaguar
    ? (totalH - tagH) * 0.70
    : s.textH * 0.82;

  // Círculo do O:
  // "K" em Playfair Display ocupa ~0.60em + letter-spacing
  const kW = s.fs * 0.60 + s.ls;
  // "O" ocupa ~0.70em
  const oW = s.fs * 0.70;
  const cx = kW + oW / 2;
  const cy = textBaseY - s.fs * 0.36;
  const r  = s.fs * 0.34;
  const sw = s.fs * 0.052;

  // Posição da onça: à direita, centralizada verticalmente
  const jX = s.textW - jOverlap;
  const jY = (totalH - jSize) / 2;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      width={totalW}
      height={totalH}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={className}
      aria-label="Kolhey"
      role="img"
    >
      {/* ── Onça decorativa — imagem real com opacidade baixa ── */}
      {showJaguar && (
        <image
          href={JAGUAR_URL}
          x={jX}
          y={jY}
          width={jSize}
          height={jSize}
          opacity={0.22}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {/* ── "K" ── */}
      <text
        x="0"
        y={textBaseY}
        fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize={s.fs}
        fill={textColor}
      >K</text>

      {/* ── "LHEY" ── */}
      <text
        x={kW + oW + s.ls}
        y={textBaseY}
        fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize={s.fs}
        letterSpacing={s.ls}
        fill={textColor}
      >LHEY</text>

      {/* ── Círculo laranja — o "O" ── */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={orange}
        strokeWidth={sw}
      />

      {/* ── Tagline ── */}
      {showTagline && (
        <text
          x={s.textW / 2}
          y={textBaseY + s.fs * 0.18 + tagH * 0.7}
          fontFamily="'Dancing Script', cursive"
          fontWeight="400"
          fontSize={s.fs * 0.24}
          fill={variant === "light" ? "rgba(255,255,255,0.58)" : "rgba(13,27,46,0.48)"}
          textAnchor="middle"
          fontStyle="italic"
        >
          Resultados que se cultivam
        </text>
      )}
    </svg>
  );
}

/** Versão compacta — apenas wordmark, sem tagline nem onça. */
export function KolheyWordmark({
  size = "md",
  variant = "light",
  className = "",
}: Omit<KolheyLogoProps, "showTagline" | "showJaguar">) {
  return (
    <KolheyLogo size={size} showTagline={false} showJaguar={false} variant={variant} className={className} />
  );
}

/** Versão hero — wordmark grande + tagline + onça decorativa à direita. */
export function KolheyHero({
  size = "xl",
  variant = "light",
  className = "",
}: Omit<KolheyLogoProps, "showTagline" | "showJaguar">) {
  return (
    <KolheyLogo size={size} showTagline showJaguar variant={variant} className={className} />
  );
}

export default KolheyLogo;
