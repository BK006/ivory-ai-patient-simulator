"use client";

// Ivory – report components. RecordingTimeline plays the real session audio when available.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export type Moment = {
  t: number;
  type: "strength" | "improve";
  title: string;
  text?: string;
  quote?: string;
  instead?: string;
  key?: boolean;
  badge?: string;
};

export type TimelineHandle = { seek: (s: number, play?: boolean) => void };

export const RecordingTimeline = forwardRef<TimelineHandle, { duration: number; moments: Moment[]; mood?: string; audioUrl?: string | null }>(
  function RecordingTimeline({ duration, moments, mood, audioUrl }, ref) {
    const audio = useRef<HTMLAudioElement>(null);
    const [t, setT] = useState(0);
    const [playing, setPlaying] = useState(false);
    const dur = Math.max(1, duration);

    const seek = (s: number, play = false) => {
      const v = Math.max(0, Math.min(dur, s));
      setT(v);
      if (audio.current) {
        audio.current.currentTime = v;
        if (play) void audio.current.play();
      }
    };
    useImperativeHandle(ref, () => ({ seek }));

    useEffect(() => {
      const a = audio.current;
      if (!a) return;
      const onTime = () => setT(a.currentTime);
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("play", onPlay);
      a.addEventListener("pause", onPause);
      a.addEventListener("ended", onPause);
      return () => {
        a.removeEventListener("timeupdate", onTime);
        a.removeEventListener("play", onPlay);
        a.removeEventListener("pause", onPause);
        a.removeEventListener("ended", onPause);
      };
    }, [audioUrl]);

    const pct = (s: number) => `${(Math.min(s, dur) / dur) * 100}%`;
    const up = moments.filter((m) => m.type === "strength");
    const down = moments.filter((m) => m.type !== "strength");
    const Chip = ({ m, below }: { m: Moment; below?: boolean }) => {
      const good = m.type === "strength";
      return (
        <button onClick={() => seek(m.t, true)} title={`${fmtTime(m.t)} · ${m.title}`}
          style={{ position: "absolute", left: pct(m.t), transform: m.t / dur > 0.7 ? "translateX(-100%)" : "translateX(-8px)", [below ? "top" : "bottom"]: 0, maxWidth: "34%", height: 26, padding: "0 10px", border: 0, borderRadius: "var(--radius-pill)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: good ? "var(--mint-50)" : "var(--score-low-soft)", color: good ? "var(--accent-text)" : "var(--negative-text)", font: "var(--type-caption)", fontWeight: 500 }}>
          {m.title}
        </button>
      );
    };
    return (
      <div style={{ display: "grid", gap: 16, padding: 24, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)", minWidth: 0 }}>
        {audioUrl && <audio ref={audio} src={audioUrl} preload="metadata" />}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Nagranie · przebieg rozmowy</span>
          <span style={{ flex: 1 }} />
          {mood && <span style={{ height: 26, padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-pill)", background: "var(--surface-sunken)", font: "var(--type-caption)", color: "var(--text-secondary)" }}>{mood}</span>}
          <span style={{ font: "var(--type-mono)", color: "var(--text-secondary)" }}>{fmtTime(t)} / {fmtTime(dur)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 0, height: 110 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 30 }}>{up.map((m, i) => <Chip key={i} m={m} />)}</div>
            <div onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * dur); }}
              style={{ position: "absolute", left: 0, right: 0, top: 49, height: 12, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <div style={{ position: "relative", width: "100%", height: 4, borderRadius: 2, background: "var(--ivory-300)" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(t), borderRadius: 2, background: "var(--graphite-900)" }} />
                {moments.map((m, i) => (
                  <span key={i} style={{ position: "absolute", left: pct(m.t), top: m.type === "strength" ? -18 : 4, width: 1, height: 14, background: "var(--line-strong)" }} />
                ))}
                {moments.map((m, i) => (
                  <span key={"d" + i} style={{ position: "absolute", left: pct(m.t), top: "50%", width: m.key ? 12 : 9, height: m.key ? 12 : 9, marginLeft: m.key ? -6 : -4.5, marginTop: m.key ? -6 : -4.5, borderRadius: "50%", background: m.type === "strength" ? "var(--mint-500)" : "var(--coral-500)", border: "2px solid var(--surface-card)" }} />
                ))}
                <span style={{ position: "absolute", left: pct(t), top: "50%", width: 2, height: 18, marginLeft: -1, marginTop: -9, borderRadius: 1, background: "var(--graphite-900)" }} />
              </div>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 30 }}>{down.map((m, i) => <Chip key={i} m={m} below />)}</div>
          </div>
          <button aria-label={playing ? "Pauza" : "Odtwórz"} disabled={!audioUrl}
            onClick={() => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); }}
            style={{ width: 52, height: 52, borderRadius: 26, border: 0, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--graphite-900)", cursor: audioUrl ? "pointer" : "not-allowed", opacity: audioUrl ? 1 : 0.35 }}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3.5" y="3" width="3" height="10" rx="1" fill="var(--ivory-50)" /><rect x="9.5" y="3" width="3" height="10" rx="1" fill="var(--ivory-50)" /></svg>
              : <svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 3v10l8-5z" fill="var(--ivory-50)" /></svg>}
          </button>
        </div>
        <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
          {moments.length} momentów z raportu na osi · kliknij, żeby {audioUrl ? "odsłuchać" : "przewinąć"}
        </span>
      </div>
    );
  },
);

export function KpiCard({ value, total, label, hint }: { value: ReactNode; total?: number; label: string; hint?: string }) {
  return (
    <div style={{ display: "grid", gap: 6, padding: 24, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ font: "var(--type-numeral-l)", letterSpacing: "var(--tracking-display)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {total != null && <span style={{ font: "var(--type-h4)", color: "var(--text-tertiary)", fontWeight: 400 }}>/{total}</span>}
      </div>
      <span style={{ font: "var(--type-body)", fontWeight: 500 }}>{label}</span>
      {hint && <span style={{ font: "var(--type-body-s)", color: "var(--text-tertiary)" }}>{hint}</span>}
    </div>
  );
}

export function TalkRatio({ you, target }: { you: number; target?: number }) {
  return (
    <div style={{ display: "grid", gap: 12, padding: 24, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)" }}>
      <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)" }}>Kto mówił</span>
      <div style={{ position: "relative", display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--ivory-300)" }}>
        <div style={{ width: `${you}%`, background: "var(--graphite-900)" }} />
        {target != null && <span style={{ position: "absolute", left: `${target}%`, top: -2, bottom: -2, width: 2, background: "var(--mint-400)" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-body-s)" }}>
        <span style={{ fontWeight: 500 }}>Ty {you}%</span><span style={{ color: "var(--text-secondary)" }}>pacjent {100 - you}%</span>
      </div>
      {target != null && <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>Cel: maks. {target}% — w sesji więcej mówi pacjent.</span>}
    </div>
  );
}

export function MetricList({ title = "Metryki rozmowy", items, note }: { title?: string; items: { label: string; value: ReactNode }[]; note?: string }) {
  return (
    <div style={{ display: "grid", gap: 8, padding: 24, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)" }}>
      <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)", marginBottom: 4 }}>{title}</span>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, font: "var(--type-body-s)" }}>
          <span style={{ color: "var(--text-secondary)" }}>{it.label}</span>
          <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{it.value}</span>
        </div>
      ))}
      {note && <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: 4 }}>{note}</span>}
    </div>
  );
}

export function CriterionScore({ name, score, max, spread, text, quote, verified, onQuote }: {
  name: string; score: number; max: number; spread?: number; text?: string; quote?: string; verified?: boolean; onQuote?: () => void;
}) {
  const r = score / max;
  const color = r >= 0.75 ? "var(--accent-text)" : r >= 0.5 ? "#8A5A2B" : "var(--negative-text)";
  const shown = Number.isInteger(score) ? score : score.toFixed(1).replace(".", ",");
  return (
    <div style={{ display: "grid", gap: 10, padding: "20px 0", borderTop: "1px solid var(--line-subtle)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)" }}>{name}</span>
        <span style={{ font: "var(--type-body-s)", fontWeight: 500, color, fontVariantNumeric: "tabular-nums" }}>{shown} z {max} pkt</span>
        {spread != null && (
          <span title="Różnica między trzema niezależnymi ocenami AI" style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
            {spread === 0 ? "3 oceny AI zgodne" : `rozrzut ±${spread} (3 oceny AI)`}
          </span>
        )}
      </div>
      {text && <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-secondary)", textWrap: "pretty" }}>{text}</p>}
      {quote && (
        <button onClick={onQuote} disabled={!onQuote}
          style={{ display: "grid", gap: 6, textAlign: "left", margin: 0, padding: "12px 16px", border: 0, background: "var(--surface-sunken)", borderRadius: "var(--radius-s)", cursor: onQuote ? "pointer" : "default" }}>
          <span style={{ font: "var(--type-body-s)", fontStyle: "italic", color: "var(--text-primary)" }}>„{quote}”</span>
          {verified && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-caption)", color: "var(--accent-text)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Cytat zweryfikowany w transkrypcie{onQuote ? " · ▶ odsłuchaj" : ""}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export function MomentTimeline({ items, onSeek }: { items: Moment[]; onSeek?: (t: number) => void }) {
  return (
    <div style={{ display: "grid" }}>
      {items.map((m, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", justifyItems: "start" }}>
            <button onClick={() => onSeek?.(m.t)} style={{ border: 0, background: "transparent", padding: "2px 0", cursor: "pointer", font: "var(--type-mono)", fontWeight: 500, color: "var(--text-primary)" }}>{fmtTime(m.t)}</button>
            {i < items.length - 1 && <span style={{ width: 1, marginLeft: 18, marginTop: 8, background: "var(--line-strong)" }} />}
          </div>
          <div style={{ display: "grid", gap: 8, paddingBottom: 28, alignContent: "start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: m.type === "strength" ? "var(--mint-500)" : "var(--coral-500)" }} />
              <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)" }}>{m.title}</span>
              {m.badge && <span style={{ height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-pill)", background: m.type === "strength" ? "var(--mint-50)" : "var(--score-low-soft)", color: m.type === "strength" ? "var(--accent-text)" : "var(--negative-text)", font: "var(--type-caption)", fontWeight: 500 }}>{m.badge}</span>}
              {m.key && <span style={{ height: 22, padding: "0 8px", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-pill)", background: "var(--score-low-soft)", color: "var(--negative-text)", font: "var(--type-caption)", fontWeight: 500 }}>kluczowy</span>}
            </div>
            {m.text && <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-secondary)", textWrap: "pretty" }}>{m.text}</p>}
            {m.quote && <blockquote style={{ margin: 0, padding: "12px 16px", background: "var(--surface-sunken)", borderRadius: "var(--radius-s)", font: "var(--type-body-s)", fontStyle: "italic" }}>„{m.quote}”</blockquote>}
            {m.instead && (
              <div style={{ display: "grid", gap: 4, padding: "12px 16px", border: "1px solid var(--mint-200)", background: "var(--mint-50)", borderRadius: "var(--radius-s)" }}>
                <span style={{ font: "var(--type-caption)", color: "var(--accent-text)", fontWeight: 500 }}>Spróbuj zamiast tego</span>
                <span style={{ font: "var(--type-body-s)" }}>{m.instead}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NextSteps({ items }: { items: string[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 16 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: "grid", gridTemplateColumns: "32px minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          <span style={{ width: 32, height: 32, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--graphite-900)", color: "var(--ivory-50)", font: "var(--type-body-s)", fontWeight: 500 }}>{i + 1}</span>
          <span style={{ font: "var(--type-body-l)", paddingTop: 2, textWrap: "pretty" }}>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function NeedsList({ needs }: { needs: { id: string; label: string; discovered: boolean; unlocked_at_s: number | null; missed_hint: string }[] }) {
  const found = needs.filter((n) => n.discovered).length;
  return (
    <div style={{ display: "grid", gap: 12, padding: 24, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)" }}>Ukryte potrzeby</span>
        <span style={{ font: "var(--type-body-s)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{found}/{needs.length}</span>
      </div>
      {needs.map((n) => (
        <div key={n.id} style={{ display: "grid", gridTemplateColumns: "20px minmax(0,1fr)", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line-subtle)", opacity: n.discovered ? 1 : 0.85 }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, display: "grid", placeItems: "center", background: n.discovered ? "var(--mint-100)" : "var(--surface-sunken)", color: n.discovered ? "var(--accent-text)" : "var(--text-tertiary)", font: "var(--type-caption)" }}>
            {n.discovered ? "✓" : "–"}
          </span>
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ font: "var(--type-body-s)", fontWeight: 500, color: n.discovered ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {n.label}{n.discovered && n.unlocked_at_s != null ? ` · ${fmtTime(n.unlocked_at_s)}` : ""}
            </span>
            {!n.discovered && <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>Co mogło otworzyć: {n.missed_hint}</span>}
          </div>
        </div>
      ))}
      <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>Z logu stanu pacjenta, nie z opinii modelu.</span>
    </div>
  );
}
