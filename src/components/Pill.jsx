import { C } from "../lib/domain";
import { RADIUS, TYPE } from "../lib/tokens";

const TONES = {
  neutral: { color: C.textMid, bg: C.surface, border: C.border },
  primary: { color: C.primary, bg: C.primaryBg, border: C.primaryBorder },
  accent: { color: C.accent, bg: C.accentBg, border: C.accentBorder },
  success: { color: C.green, bg: C.greenBg, border: C.greenBorder },
  warning: { color: C.amber, bg: C.amberBg, border: C.amberBorder },
  danger: { color: C.red, bg: C.redBg, border: C.redBorder },
  info: { color: C.blue, bg: C.blueBg, border: C.blueBorder },
};

export function Pill({ tone = "neutral", children, icon, size = "md", style }) {
  const t = TONES[tone] || TONES.neutral;
  const pad = size === "sm" ? "2px 8px" : "4px 10px";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        padding: pad,
        borderRadius: RADIUS.pill,
        whiteSpace: "nowrap",
        fontSize: TYPE.caption.size,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: TYPE.caption.letterSpacing,
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

