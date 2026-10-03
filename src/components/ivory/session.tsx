"use client";

// Ivory – session components: module card, client brief, live voice visualizer, controls, trust meter.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Difficulty } from "./ui";

const TINTS = ["#E7EEF0", "#E8EEE4", "#F2E9DC", "#F1E3DF", "#E8E6F0"];
export const initials = (name: string) => (name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2);
const tintFor = (name: string) => TINTS[(name || "").length % TINTS.length];

export function ModuleCard({ name, description, difficulty, sessions, bestScore, skills = [], onClick }: {
  name: string; description?: string; difficulty: number; sessions: number; bestScore: number | null; skills?: string[]; onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const band = bestScore == null ? null : bestScore >= 75 ? "var(--score-high)" : bestScore >= 50 ? "var(--score-mid)" : "var(--score-low)";
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 16, padding: 24, minWidth: 0, cursor: onClick ? "pointer" : "default", background: "var(--surface-card)", borderRadius: "var(--radius-l)", border: `1px solid ${hover && onClick ? "var(--line-strong)" : "var(--line-subtle)"}`, transition: "border-color var(--dur-fast) var(--ease-out)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ flex: 1, font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)", textWrap: "pretty" }}>{name}</span>
        <span style={{ paddingTop: 6 }}><Difficulty level={difficulty} /></span>
      </div>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        {description && <p style={{ margin: 0, font: "var(--type-body-s)", color: "var(--text-secondary)", textWrap: "pretty" }}>{description}</p>}
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
};

export function ClientBrief({ module, name, age, occupation, situation, reason, background, goal, unknown, compact }: BriefData & { compact?: boolean }) {
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
      <div>
        {situation && <BriefRow compact={compact} label="Sytuacja życiowa">{situation}</BriefRow>}
        {reason && <BriefRow compact={compact} label="Powód zgłoszenia">{reason}</BriefRow>}
        {background && <BriefRow compact={compact} label="Ważne w historii">{background}</BriefRow>}
        {unknown && unknown.length > 0 && <BriefRow compact={compact} label="Czego nie wiemy">{unknown.join(" · ")}</BriefRow>}
        {goal && <BriefRow compact={compact} label="Cel sesji">{goal}</BriefRow>}
      </div>
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

/** Live trust of the simulated patient (training mode). Number first, colour second. */
export function TrustMeter({ trust, delta, pulse }: { trust: number; delta: number | null; pulse?: boolean }) {
  const level = trust < 40 ? "Zamknięty" : trust < 65 ? "Ostrożnie się otwiera" : "Otwarty";
  const color = trust < 40 ? "var(--stone-500)" : trust < 65 ? "var(--amber-400)" : "var(--mint-500)";
  return (
    <div style={{ display: "grid", gap: 12, padding: 20, background: "var(--surface-card)", border: `1px solid ${pulse ? "var(--mint-300)" : "var(--line-subtle)"}`, borderRadius: "var(--radius-xl)", transition: "border-color var(--dur-slow) var(--ease-out)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Zaufanie pacjenta</span>
        {delta != null && delta !== 0 && (
          <span key={`${trust}-${delta}`} style={{ font: "var(--type-body-s)", fontWeight: 500, color: delta > 0 ? "var(--positive)" : "var(--negative-text)", animation: "ds-fade-up var(--dur-base) var(--ease-out)" }}>
            {delta > 0 ? "+" : "−"}{Math.abs(delta)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ font: "var(--type-numeral-l)", letterSpacing: "var(--tracking-display)", fontVariantNumeric: "tabular-nums" }}>{trust}</span>
        <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>{level}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--score-track)", overflow: "hidden" }}>
        <div style={{ width: `${trust}%`, height: "100%", borderRadius: 3, background: color, transition: "width var(--dur-slow) var(--ease-breath), background var(--dur-slow) var(--ease-out)" }} />
      </div>
      {pulse && <span style={{ font: "var(--type-caption)", color: "var(--accent-text)" }}>Pacjent jest gotów powiedzieć więcej.</span>}
    </div>
  );
}
