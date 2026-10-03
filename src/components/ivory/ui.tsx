"use client";

// Ivory design system – core primitives (ported from the Claude Design kit, inline styles by design).

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function scoreBand(score: number) {
  if (score >= 75) return { key: "high", color: "var(--score-high)", soft: "var(--score-high-soft)", label: "Bardzo dobrze" };
  if (score >= 50) return { key: "mid", color: "var(--score-mid)", soft: "var(--score-mid-soft)", label: "Do dopracowania" };
  return { key: "low", color: "var(--score-low)", soft: "var(--score-low-soft)", label: "Wymaga pracy" };
}

const SIZES = {
  s: { height: "var(--control-h-s)", padding: "0 14px", font: "var(--type-body-s)" },
  m: { height: "var(--control-h)", padding: "0 20px", font: "var(--type-body)" },
  l: { height: "var(--control-h-l)", padding: "0 26px", font: "var(--type-body-l)" },
};
const VARIANTS = {
  primary: { background: "var(--graphite-900)", color: "var(--ivory-50)", border: "1px solid var(--graphite-900)", hover: "var(--stone-800)" },
  accent: { background: "var(--accent)", color: "var(--text-on-accent)", border: "1px solid var(--accent)", hover: "var(--mint-300)" },
  secondary: { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--line-strong)", hover: "var(--surface-sunken)" },
  ghost: { background: "transparent", color: "var(--text-primary)", border: "1px solid transparent", hover: "var(--surface-sunken)" },
  danger: { background: "transparent", color: "var(--negative-text)", border: "1px solid var(--coral-200)", hover: "var(--negative-soft)" },
};

type ButtonProps = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
};

export function Button({ variant = "primary", size = "m", disabled, iconLeft, iconRight, fullWidth, children, style, onClick, href, type = "button" }: ButtonProps) {
  const [hover, setHover] = useState(false);
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const css: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    height: s.height, padding: s.padding, font: s.font, letterSpacing: "var(--tracking-body)",
    width: fullWidth ? "100%" : undefined,
    borderRadius: "var(--radius-pill)", border: v.border, color: v.color,
    background: hover && !disabled ? v.hover : v.background,
    opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer",
    transition: "background var(--dur-fast) var(--ease-out)", whiteSpace: "nowrap",
    ...style,
  };
  const content = <>{iconLeft}{children}{iconRight}</>;
  if (href && !disabled) {
    return (
      <Link href={href} style={css} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={css} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {content}
    </button>
  );
}

const CARD_TONES: Record<string, CSSProperties> = {
  default: { background: "var(--surface-card)", border: "1px solid var(--line-subtle)" },
  sunken: { background: "var(--surface-sunken)", border: "1px solid transparent" },
  outline: { background: "transparent", border: "1px solid var(--line-strong)" },
  dark: { background: "var(--surface-dark-raised)", border: "1px solid var(--line-dark)", color: "var(--ink-text)" },
};

export function Card({ tone = "default", padding = "m", children, style }: { tone?: keyof typeof CARD_TONES; padding?: "s" | "m" | "l"; children?: ReactNode; style?: CSSProperties }) {
  const pad = { s: 16, m: 24, l: 32 }[padding];
  return <div style={{ ...CARD_TONES[tone], padding: pad, borderRadius: "var(--radius-l)", minWidth: 0, ...style }}>{children}</div>;
}

const BADGE_TONES = {
  neutral: { background: "var(--surface-sunken)", color: "var(--text-secondary)", dot: "var(--stone-500)" },
  accent: { background: "var(--accent-soft)", color: "var(--accent-text)", dot: "var(--mint-500)" },
  negative: { background: "var(--negative-soft)", color: "var(--negative-text)", dot: "var(--coral-500)" },
  warm: { background: "#FBF1E4", color: "#8A5A2B", dot: "var(--amber-400)" },
  dark: { background: "var(--graphite-900)", color: "var(--ivory-50)", dot: "var(--mint-300)" },
};

export function Badge({ tone = "neutral", dot, children, style }: { tone?: keyof typeof BADGE_TONES; dot?: boolean; children?: ReactNode; style?: CSSProperties }) {
  const t = BADGE_TONES[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 10px", borderRadius: "var(--radius-pill)", background: t.background, color: t.color, font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: t.dot }} />}
      {children}
    </span>
  );
}

export function SegmentedTabs<T extends string>({ items, value, onChange }: { items: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" style={{ display: "inline-flex", padding: 4, gap: 2, borderRadius: "var(--radius-pill)", background: "var(--surface-sunken)" }}>
      {items.map((it) => {
        const active = it === value;
        return (
          <button key={it} role="tab" aria-selected={active} onClick={() => onChange(it)}
            style={{ height: 32, padding: "0 16px", border: 0, borderRadius: "var(--radius-pill)", cursor: "pointer", font: "var(--type-body-s)", fontWeight: active ? 500 : 400, background: active ? "var(--surface-card)" : "transparent", color: active ? "var(--text-primary)" : "var(--text-secondary)", transition: "background var(--dur-fast) var(--ease-out)" }}>
            {it}
          </button>
        );
      })}
    </div>
  );
}

export function TopBar({ brand, items, active, right }: { brand: string; items: { href: string; label: string; key: string }[]; active: string; right?: ReactNode }) {
  return (
    <header style={{ height: 64, display: "flex", alignItems: "center", gap: 32, padding: "0 32px", borderBottom: "1px solid var(--line-subtle)", background: "var(--surface-page)", position: "sticky", top: 0, zIndex: 20 }}>
      <Link href="/" style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)", fontWeight: 500 }}>{brand}</Link>
      <nav style={{ display: "flex", gap: 4, flex: 1 }}>
        {items.map((it) => {
          const on = it.key === active;
          return (
            <Link key={it.key} href={it.href}
              style={{ height: 36, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-pill)", font: "var(--type-body-s)", background: on ? "var(--surface-sunken)" : "transparent", color: on ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
    </header>
  );
}

export function Dialog({ open, onClose, title, description, children, actions, width = 480 }: { open: boolean; onClose: () => void; title?: string; description?: string; children?: ReactNode; actions?: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 24, background: "rgba(20,20,20,0.28)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: width, background: "var(--surface-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--line-subtle)", boxShadow: "var(--shadow-overlay)", padding: 32, display: "grid", gap: 20, animation: "ds-fade-up var(--dur-base) var(--ease-out)" }}>
        {(title || description) && (
          <div style={{ display: "grid", gap: 8 }}>
            {title && <h2 style={{ margin: 0, font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)" }}>{title}</h2>}
            {description && <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-secondary)" }}>{description}</p>}
          </div>
        )}
        {children}
        {actions && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>{actions}</div>}
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px", borderRadius: "var(--radius-pill)", background: band.soft, font: "var(--type-body-s)", fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: band.color }} />{score}
    </span>
  );
}

export function Stat({ label, value, unit, delta, hint }: { label: string; value: ReactNode; unit?: string; delta?: number; hint?: string }) {
  const up = typeof delta === "number" && delta > 0;
  const down = typeof delta === "number" && delta < 0;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ font: "var(--type-numeral-l)", letterSpacing: "var(--tracking-display)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {unit && <span style={{ font: "var(--type-body)", color: "var(--text-tertiary)" }}>{unit}</span>}
        {typeof delta === "number" && (
          <span style={{ font: "var(--type-body-s)", fontWeight: 500, color: up ? "var(--positive)" : down ? "var(--negative-text)" : "var(--text-tertiary)" }}>
            {up ? "+" : down ? "−" : "±"}{Math.abs(delta)}
          </span>
        )}
      </div>
      {hint && <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{hint}</span>}
    </div>
  );
}

export type ChartPoint = { label: string; value: number; color?: string };

export function LineChart({ data, height = 200, min = 0, max = 100, color = "var(--graphite-900)", showDots = true }: { data: ChartPoint[]; height?: number; min?: number; max?: number; color?: string; showDots?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setW(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver(() => ref.current && setW(ref.current.getBoundingClientRect().width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const padL = 32, padB = 28, padT = 12, padR = 24;
  const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const x = (i: number) => padL + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const ticks = [min, (min + max) / 2, max];
  return (
    <div ref={ref} style={{ width: "100%", minWidth: 0, height, overflow: "hidden" }}>
      {w > 0 && (
        <svg width={w} height={height} style={{ display: "block" }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="var(--line-subtle)" />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" style={{ font: "var(--type-caption)", fill: "var(--text-tertiary)" }}>{t}</text>
            </g>
          ))}
          <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          {showDots && data.map((d, i) => (
            <circle key={i} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 4.5 : 3} fill={d.color ?? (i === data.length - 1 ? "var(--mint-400)" : "var(--surface-card)")} stroke={color} strokeWidth={1.5} />
          ))}
          {data.map((d, i) => (data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && (
            <text key={"l" + i} x={x(i)} y={height - 8} textAnchor="middle" style={{ font: "var(--type-caption)", fill: "var(--text-tertiary)" }}>{d.label}</text>
          ))}
        </svg>
      )}
    </div>
  );
}

export function BarList({ data, max = 100 }: { data: { label: string; value: number }[]; max?: number }) {
  const colorFor = (v: number) => (v >= 75 ? "var(--score-high)" : v >= 50 ? "var(--score-mid)" : "var(--score-low)");
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 180px) 1fr 36px", alignItems: "center", gap: 14 }}>
          <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>{d.label}</span>
          <div style={{ height: 8, borderRadius: 4, background: "var(--score-track)", overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", borderRadius: 4, background: colorFor(d.value), transition: "width var(--dur-slow) var(--ease-out)" }} />
          </div>
          <span style={{ font: "var(--type-body-s)", fontWeight: 500, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export type Column<R> = { key: string; label: string; align?: "left" | "right"; width?: number; render?: (r: R) => ReactNode };

export function Table<R extends { id: string }>({ columns, rows, onRowClick }: { columns: Column<R>[]; rows: R[]; onRowClick?: (r: R) => void }) {
  const [hover, setHover] = useState(-1);
  return (
    <div style={{ width: "100%", overflowX: "auto", background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", font: "var(--type-body-s)" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ height: 44, padding: "0 20px", textAlign: c.align || "left", font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-tertiary)", borderBottom: "1px solid var(--line-subtle)", whiteSpace: "nowrap", width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
              style={{ cursor: onRowClick ? "pointer" : "default", background: onRowClick && hover === i ? "var(--surface-raised)" : "transparent" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ height: 56, padding: "0 20px", textAlign: c.align || "left", color: "var(--text-primary)", borderBottom: i < rows.length - 1 ? "1px solid var(--line-subtle)" : 0, fontVariantNumeric: "tabular-nums" }}>
                  {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageHead({ eyebrow, title, right }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
      <div style={{ display: "grid", gap: 8 }}>
        {eyebrow && <span style={{ font: "var(--type-body-s)", color: "var(--text-tertiary)" }}>{eyebrow}</span>}
        <h1 style={{ margin: 0, font: "var(--type-h1)", letterSpacing: "var(--tracking-display)" }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "grid", justifyItems: "start", gap: 12, padding: 32, background: "var(--surface-card)", border: "1px dashed var(--line-strong)", borderRadius: "var(--radius-l)" }}>
      <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)" }}>{title}</span>
      {text && <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)", maxWidth: 520 }}>{text}</span>}
      {action}
    </div>
  );
}

export function Difficulty({ level }: { level: number }) {
  const label = { 1: "Łatwy", 2: "Średni", 3: "Trudny" }[level as 1 | 2 | 3];
  return (
    <span title={`Trudność: ${label}`} style={{ display: "inline-flex", gap: 3 }}>
      {[1, 2, 3].map((i) => <span key={i} style={{ width: 6, height: 14, borderRadius: 3, background: i <= level ? "var(--graphite-900)" : "var(--ivory-300)" }} />)}
    </span>
  );
}
