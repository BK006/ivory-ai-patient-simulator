"use client";

// Ivory – session components: module card, client brief, live voice visualizer, controls, trust meter.

import { useEffect, useMemo, useState, type ReactNode } from "react";

const TINTS = ["#E7EEF0", "#E8EEE4", "#F2E9DC", "#F1E3DF", "#E8E6F0"];
export const initials = (name: string) => (name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2);
const tintFor = (name: string) => TINTS[(name || "").length % TINTS.length];

export function ModuleCard({ name, description, patients, sessions, bestScore, skills = [], onClick }: {
  name: string; description?: string; patients: { name: string; age: number; tagline: string }[];
  sessions: number; bestScore: number | null; skills?: string[]; onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const band = bestScore == null ? null : bestScore >= 75 ? "var(--score-high)" : bestScore >= 50 ? "var(--score-mid)" : "var(--score-low)";
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 16, padding: 24, minWidth: 0, cursor: onClick ? "pointer" : "default", background: "var(--surface-card)", borderRadius: "var(--radius-l)", border: `1px solid ${hover && onClick ? "var(--line-strong)" : "var(--line-subtle)"}`, transition: "border-color var(--dur-fast) var(--ease-out)" }}>
      <span style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)", textWrap: "pretty" }}>{name}</span>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        {description && <p style={{ margin: 0, font: "var(--type-body-s)", color: "var(--text-secondary)", textWrap: "pretty" }}>{description}</p>}
        <div style={{ display: "grid", gap: 10 }}>
          {patients.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 32, height: 32, borderRadius: 16, background: tintFor(p.name), display: "grid", placeItems: "center", font: "var(--type-body-s)", color: "var(--stone-700)", flexShrink: 0 }}>{initials(p.name)}</span>
              <span style={{ display: "grid", minWidth: 0 }}>
                <span style={{ font: "var(--type-body-s)", fontWeight: 500 }}>{p.name}, {p.age}</span>
                <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.tagline}</span>
              </span>
            </div>
          ))}
        </div>
        {skills.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {skills.map((t) => <span key={t} style={{ height: 24, padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-pill)", background: "var(--surface-sunken)", font: "var(--type-caption)", color: "var(--text-secondary)" }}>{t}</span>)}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 16, borderTop: "1px solid var(--line-subtle)", font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
        <span>{sessions === 0 ? "Nie rozpoczęty" : `${sessions} ${sessions === 1 ? "sesja" : sessions < 5 ? "sesje" : "sesji"}`}</span>
        {bestScore != null && (
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
            Najlepszy wynik
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: band! }} />{bestScore}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function BriefRow({ label, children, compact }: { label: string; children: ReactNode; compact?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0, 1fr)" : "minmax(120px, 160px) minmax(0, 1fr)", gap: compact ? 4 : 16, padding: compact ? "12px 0" : "14px 0", borderTop: "1px solid var(--line-subtle)" }}>
      <span style={{ font: compact ? "var(--type-caption)" : "var(--type-body-s)", color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ font: compact ? "var(--type-body-s)" : "var(--type-body)", color: "var(--text-primary)", textWrap: "pretty" }}>{children}</span>
    </div>
  );
}

export type BriefData = {
  module?: string; name: string; age?: number; occupation?: string;
  situation?: string; reason?: string; background?: string; goal?: string; unknown?: string[];
  /** Replaces the default rows (used by follow-up visits). */
  rows?: { label: string; value: string }[];
};

export function ClientBrief({ module, name, age, occupation, situation, reason, background, goal, unknown, rows, compact }: BriefData & { compact?: boolean }) {
  return (
    <div style={{ display: "grid", gap: 20, padding: compact ? 20 : 32, minWidth: 0, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-xl)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: compact ? 48 : 64, height: compact ? 48 : 64, borderRadius: 32, background: tintFor(name), display: "grid", placeItems: "center", font: compact ? "var(--type-h4)" : "var(--type-h3)", color: "var(--stone-700)", flexShrink: 0 }}>{initials(name)}</span>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          {module && <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>{module}</span>}
          <span style={{ font: compact ? "var(--type-h3)" : "var(--type-h2)", letterSpacing: "var(--tracking-heading)" }}>{name}{age ? `, ${age}` : ""}</span>
          {occupation && <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>{occupation}</span>}
        </div>
      </div>
      {rows ? (
        <div>{rows.map((r) => <BriefRow key={r.label} compact={compact} label={r.label}>{r.value}</BriefRow>)}</div>
      ) : (
      <div>
        {situation && <BriefRow compact={compact} label="Sytuacja życiowa">{situation}</BriefRow>}
        {reason && <BriefRow compact={compact} label="Powód zgłoszenia">{reason}</BriefRow>}
        {background && <BriefRow compact={compact} label="Ważne w historii">{background}</BriefRow>}
        {unknown && unknown.length > 0 && <BriefRow compact={compact} label="Czego nie wiemy">{unknown.join(" · ")}</BriefRow>}
        {goal && <BriefRow compact={compact} label="Cel sesji">{goal}</BriefRow>}
      </div>
      )}
    </div>
  );
}

export type Speaker = "client" | "you" | "idle";

const SPEAKERS: Record<Speaker, { color: string; soft: string; label: string }> = {
  client: { color: "var(--stone-700)", soft: "var(--ivory-200)", label: "Mówi pacjent" },
  you: { color: "var(--mint-500)", soft: "var(--mint-50)", label: "Mówisz" },
  idle: { color: "var(--stone-400)", soft: "var(--ivory-200)", label: "Słucham…" },
};

/** Polls a 0–1 level getter (ElevenLabs input/output volume) on animation frames, smoothed. */
function useLevel(getLevel: () => number) {
  const [st, setSt] = useState({ lv: 0, t: 0 });
  useEffect(() => {
    let raf = 0, cur = 0;
    const t0 = performance.now();
    const tick = () => {
      let v = 0;
      try { v = Math.min(1, Math.max(0, getLevel() * 1.6)); } catch { v = 0; }
      cur += (v - cur) * 0.3;
      setSt({ lv: cur, t: (performance.now() - t0) / 1000 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel]);
  return st;
}

export function VoiceVisualizer({ speaker, getLevel, name, label: labelProp, size = 280, bars = 48 }: {
  speaker: Speaker; getLevel: () => number; name: string; label?: string; size?: number; bars?: number;
}) {
  const { lv, t: now } = useLevel(getLevel);
  const sp = SPEAKERS[speaker];
  const seeds = useMemo(() => Array.from({ length: bars }, (_, i) => 0.55 + 0.45 * Math.abs(Math.sin(i * 2.3))), [bars]);
  const r0 = size * 0.3;
  const label = labelProp || (speaker === "client" ? `Mówi ${name.split(" ")[0]}` : sp.label);
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 20 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{ position: "absolute", inset: size * 0.5 - r0 * (1 + lv * 0.25), borderRadius: "50%", background: sp.soft, transition: "background var(--dur-slow) var(--ease-out)" }} />
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {seeds.map((s, i) => {
            const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
            const wob = 0.5 + 0.5 * Math.sin(now * 6 + i * 0.7);
            const len = 4 + lv * s * wob * size * 0.17;
            const x1 = size / 2 + Math.cos(a) * (r0 + 6), y1 = size / 2 + Math.sin(a) * (r0 + 6);
            const x2 = size / 2 + Math.cos(a) * (r0 + 6 + len), y2 = size / 2 + Math.sin(a) * (r0 + 6 + len);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={sp.color} strokeWidth={2.5} strokeLinecap="round" opacity={0.35 + lv * 0.65} />;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <span style={{ width: r0 * 1.2, height: r0 * 1.2, borderRadius: "50%", background: "var(--surface-card)", border: "1px solid var(--line-subtle)", display: "grid", placeItems: "center", font: `300 ${Math.round(size * 0.1)}px/1 var(--font-display)`, letterSpacing: "var(--tracking-heading)", color: "var(--stone-700)" }}>
            {initials(name)}
          </span>
        </div>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: sp.color, transition: "background var(--dur-base) var(--ease-out)" }} />{label}
      </span>
    </div>
  );
}

function CtrlBtn({ label, active, danger, onClick, children, big }: { label: string; active?: boolean; danger?: boolean; onClick?: () => void; children: ReactNode; big?: boolean }) {
  const [h, setH] = useState(false);
  const d = big ? 64 : 52;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
      <button aria-label={label} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ width: d, height: d, borderRadius: d / 2, display: "grid", placeItems: "center", cursor: "pointer", padding: 0, border: danger ? "1px solid var(--coral-500)" : active ? "1px solid var(--graphite-900)" : "1px solid var(--line-strong)", background: danger ? (h ? "var(--coral-600)" : "var(--coral-500)") : active ? "var(--graphite-900)" : h ? "var(--surface-sunken)" : "var(--surface-card)", color: danger || active ? "var(--ivory-50)" : "var(--text-primary)", transition: "background var(--dur-fast) var(--ease-out)" }}>
        {children}
      </button>
      <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{label}</span>
    </div>
  );
}

const svgProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const I = {
  mic: <svg {...svgProps}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>,
  micOff: <svg {...svgProps}><path d="M2 2l20 20M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 5.1 2.1M19 10v1a7 7 0 0 1-1.2 3.9M5 10v1a7 7 0 0 0 11.3 5.5M12 18v4" /></svg>,
  end: <svg {...svgProps} width={22} height={22} strokeWidth={1.6}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  captions: <svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 15h4M13 15h4M7 11h10" /></svg>,
};

export function VoiceControls({ muted, onMute, captions, onCaptions, onEnd }: { muted: boolean; onMute: () => void; captions: boolean; onCaptions: () => void; onEnd: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 24 }}>
      <CtrlBtn label="Napisy" active={captions} onClick={onCaptions}>{I.captions}</CtrlBtn>
      <CtrlBtn label={muted ? "Włącz mikrofon" : "Wycisz"} active={muted} onClick={onMute}>{muted ? I.micOff : I.mic}</CtrlBtn>
      <CtrlBtn label="Zakończ" danger big onClick={onEnd}>{I.end}</CtrlBtn>
    </div>
  );
}

export function LiveCaption({ speaker, name, text }: { speaker: "you" | "client"; name: string; text: string }) {
  return (
    <div style={{ maxWidth: 560, textAlign: "center", display: "grid", gap: 6, animation: "ds-fade-up var(--dur-base) var(--ease-out)" }}>
      <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{speaker === "you" ? "Ty" : name}</span>
      <span style={{ font: "var(--type-body-l)", color: speaker === "you" ? "var(--text-secondary)" : "var(--text-primary)", textWrap: "pretty" }}>{text}</span>
    </div>
  );
}

export function Composer({ onSend, disabled, placeholder = "Napisz do pacjenta zamiast mówić…" }: { onSend: (text: string) => void; disabled?: boolean; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [focus, setFocus] = useState(false);
  const can = !disabled && value.trim().length > 0;
  const send = () => {
    if (!can) return;
    onSend(value);
    setValue("");
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: 6, paddingLeft: 18, width: "min(640px, 100%)", background: "var(--surface-card)", borderRadius: "var(--radius-xl)", border: `1px solid ${focus ? "var(--graphite-900)" : "var(--line-strong)"}`, transition: "border-color var(--dur-fast) var(--ease-out)" }}>
      <textarea rows={1} value={value} disabled={disabled} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        style={{ flex: 1, border: 0, outline: "none", resize: "none", background: "transparent", font: "var(--type-body)", color: "var(--text-primary)", padding: "10px 0", maxHeight: 120 }} />
      <button aria-label="Wyślij" disabled={!can} onClick={send}
        style={{ width: 40, height: 40, borderRadius: 20, border: 0, flexShrink: 0, display: "grid", placeItems: "center", cursor: can ? "pointer" : "default", background: can ? "var(--graphite-900)" : "var(--ivory-300)", transition: "background var(--dur-fast) var(--ease-out)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="var(--ivory-50)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}
