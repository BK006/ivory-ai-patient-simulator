"use client";

import { CalendarPlus, FileText, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  CriterionScore, KpiCard, MetricList, MomentTimeline, NeedsList, NextSteps, RecordingTimeline, TalkRatio, fmtTime,
  type Moment, type TimelineHandle,
} from "@/components/ivory/report";
import { Button, Dialog, LineChart, PageHead, ScorePill } from "@/components/ivory/ui";
import { durationMin, fmtDate, listMySessions, loadReport, type SessionSummary } from "@/lib/queries";
import type { SessionMetrics } from "@/lib/types";

type Report = Awaited<ReturnType<typeof loadReport>>;

const firstSentence = (s: string, max = 64) => {
  const t = s.split(/(?<=[.!?])\s/)[0];
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t.replace(/\.$/, "");
};

export default function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [list, setList] = useState<SessionSummary[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [wide, setWide] = useState(false);
  const timeline = useRef<TimelineHandle>(null);

  useEffect(() => {
    const f = () => setWide(window.innerWidth >= 1240);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  useEffect(() => {
    listMySessions().then(setList).catch(console.error);
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await loadReport(sessionId);
        if (stop) return;
        setReport(r);
        if (r.session && ["evaluating", "ended", "live", "created"].includes(r.session.status)) timer = setTimeout(tick, 3000);
        else listMySessions().then(setList).catch(console.error);
      } catch (err) {
        console.error(err);
      }
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  const view = useMemo(() => (report?.session?.status === "evaluated" ? buildView(report) : null), [report]);

  if (!report) return <div style={{ font: "var(--type-body-s)", color: "var(--text-tertiary)" }}>Ładowanie raportu…</div>;
  if (!report.session) return <PageHead eyebrow="Nie znaleziono" title="Ten raport nie istnieje" right={<Button href="/raporty">Raporty</Button>} />;

  const sc = report.session.scenarios as unknown as { title: string; module: string; personas: { name: string; age: number } };

  if (report.session.status !== "evaluated") {
    const failed = report.session.status === "failed";
    return (
      <div style={{ display: "grid", gap: 24, justifyItems: "center", textAlign: "center", padding: "96px 0" }}>
        <span style={{ width: 72, height: 72, borderRadius: 36, background: failed ? "var(--negative-soft)" : "var(--mint-50)", animation: failed ? undefined : "breath 2.4s var(--ease-breath) infinite" }} />
        <h1 style={{ margin: 0, font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)" }}>
          {failed ? "Nie udało się ocenić tej sesji" : `Analizuję rozmowę z ${sc.personas.name}…`}
        </h1>
        <p style={{ margin: 0, maxWidth: 520, font: "var(--type-body)", color: "var(--text-secondary)" }}>
          {failed
            ? "Spróbuj ponownie za chwilę albo rozpocznij nową sesję."
            : "Pobieram transkrypt, liczę metryki i trzy razy niezależnie oceniam rozmowę według rubryki. To zwykle trwa do minuty."}
        </p>
        <style>{`@keyframes breath { 0%,100% { transform: scale(0.85); opacity: .6 } 50% { transform: scale(1.1); opacity: 1 } }`}</style>
      </div>
    );
  }

  const v = view!;
  const s = report.session;
  const H2 = ({ children }: { children: React.ReactNode }) => <h2 style={{ margin: 0, font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)" }}>{children}</h2>;
  const seek = (t: number) => timeline.current?.seek(t, true);

  return (
    <div style={{ display: "grid", gridTemplateColumns: wide ? "280px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 32, alignItems: "start", margin: "0 -8px" }}>
      {wide && (
        <aside style={{ position: "sticky", top: 88, display: "grid", gap: 4 }}>
          <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-tertiary)", padding: "0 12px 8px" }}>Sesje</span>
          {list.map((x) => (
            <button key={x.id} onClick={() => router.push(`/raporty/${x.id}`)}
              style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", textAlign: "left", padding: 12, border: 0, borderRadius: "var(--radius-m)", cursor: "pointer", background: x.id === sessionId ? "var(--surface-card)" : "transparent", boxShadow: x.id === sessionId ? "inset 0 0 0 1px var(--line-subtle)" : "none" }}>
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ font: "var(--type-body)", fontWeight: 500 }}>{x.scenarios.personas.name}</span>
                <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.scenarios.module} · {fmtDate(x.created_at)}</span>
              </span>
              {x.overall_score != null ? <ScorePill score={x.overall_score} /> : <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>…</span>}
            </button>
          ))}
        </aside>
      )}
      <div style={{ display: "grid", gap: 32, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ font: "var(--type-body-s)", color: "var(--text-tertiary)" }}>{sc.title}</span>
            <h1 style={{ margin: 0, font: "var(--type-h1)", letterSpacing: "var(--tracking-display)" }}>{sc.personas.name}, {sc.personas.age}</h1>
            <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
              {(s as { kind?: string }).kind === "followup" ? "Kolejna wizyta" : "Pierwsza wizyta"} · {fmtDate(s.created_at)} · {fmtTime(v.duration)} min · {s.mode === "exam" ? "tryb egzaminu" : "tryb treningu"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" iconLeft={<FileText size={16} strokeWidth={1.5} />} onClick={() => setShowTranscript(true)}>Transkrypcja</Button>
            <Button variant="secondary" href={`/sesja/${s.scenario_id}`} iconLeft={<RotateCcw size={16} strokeWidth={1.5} />}>Powtórz od nowa</Button>
            <Button href={`/sesja/${s.scenario_id}?po=${s.id}`} iconLeft={<CalendarPlus size={16} strokeWidth={1.5} />}>Umów kolejną wizytę</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <KpiCard value={s.overall_score ?? 0} total={100} label="Wynik" hint={`próg zaliczenia 50 · ${(s.overall_score ?? 0) >= 50 ? "zaliczone" : "niezaliczone"}`} />
          <KpiCard value={v.needsFound} total={v.metrics.needs.length} label="Odkryte potrzeby" hint="ukryte potrzeby, do których pacjent się przyznał" />
          <KpiCard value={v.metrics.trust_end} total={100} label="Zaufanie na koniec" hint={`start ${v.metrics.trust_start} · najniżej ${v.metrics.trust_min}`} />
        </div>

        <RecordingTimeline ref={timeline} duration={v.duration} moments={v.moments} mood={v.mood} audioUrl={report.audioUrl} />

        <div style={{ display: "flex", flexWrap: "wrap-reverse", gap: 40, alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 48, minWidth: 0, flex: "999 1 440px" }}>
            <section style={{ display: "grid", gap: 16 }}>
              <h2 style={{ margin: 0, font: "var(--type-h2)", letterSpacing: "var(--tracking-heading)", textWrap: "pretty" }}>{v.headline}</h2>
              {v.summary && <p style={{ margin: 0, font: "var(--type-body-l)", color: "var(--text-secondary)", textWrap: "pretty" }}>{v.summary}</p>}
            </section>

            <section style={{ display: "grid", gap: 16 }}>
              <H2>Zaufanie pacjenta w czasie</H2>
              <div style={{ padding: 24, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)", display: "grid", gap: 12 }}>
                <LineChart data={v.trustChart} height={220} color="var(--stone-700)" />
                <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
                  Każdy punkt to Twoja wypowiedź. Zmiana wynika z wag przypisanych do technik (np. walidacja +6, ocenianie −12) – deterministycznie, nie z opinii modelu.
                </span>
              </div>
            </section>

            <section style={{ display: "grid", gap: 8 }}>
              <H2>Ocena według rubryki</H2>
              <div>
                {report.scores.map((c) => {
                  const ev = c.evidence.find((e) => e.verified);
                  const turn = ev ? report.turns.find((t) => t.idx === ev.turn_idx) : undefined;
                  return (
                    <CriterionScore key={c.id} name={c.criteria.name} score={c.override_score ?? c.score_median} max={4} spread={c.score_spread}
                      text={c.comment} quote={ev?.quote} verified={ev?.verified}
                      onQuote={turn?.t_start_s != null && report.audioUrl ? () => seek(turn.t_start_s!) : undefined} />
                  );
                })}
              </div>
            </section>

            <section style={{ display: "grid", gap: 24 }}>
              <H2>Przebieg rozmowy</H2>
              <MomentTimeline items={v.moments} onSeek={seek} />
            </section>

            {v.next.length > 0 && (
              <section style={{ display: "grid", gap: 20 }}>
                <H2>Na następne podejście</H2>
                <NextSteps items={v.next} />
              </section>
            )}
          </div>

          <div style={{ position: "sticky", top: 88, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, flex: "1 1 280px", minWidth: 0 }}>
            <NeedsList needs={v.metrics.needs} />
            {v.metrics.therapist_talk_pct != null && <TalkRatio you={v.metrics.therapist_talk_pct} target={40} />}
            <MetricList items={v.metricItems} note={`Liczone z kodowania każdej wypowiedzi. Oceny: mediana z ${v.metrics.eval_runs} niezależnych ocen AI; odrzucone niedosłowne cytaty: ${v.metrics.rejected_quotes}.`} />
          </div>
        </div>
      </div>

      <Dialog open={showTranscript} onClose={() => setShowTranscript(false)} title="Transkrypcja" width={720}>
        <div style={{ display: "grid", gap: 12, maxHeight: "60vh", overflowY: "auto", paddingRight: 8 }}>
          {report.turns.map((t) => (
            <div key={t.idx} style={{ display: "flex", flexDirection: "column", alignItems: t.speaker === "therapist" ? "flex-end" : "flex-start", gap: 4 }}>
              <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
                {t.speaker === "therapist" ? "Ty" : sc.personas.name} · <span style={{ fontFamily: "var(--font-mono)" }}>{fmtTime(t.t_start_s ?? 0)}</span>
              </span>
              <div style={{ maxWidth: "82%", padding: "10px 14px", font: "var(--type-body-s)", background: t.speaker === "therapist" ? "var(--graphite-900)" : "var(--surface-sunken)", color: t.speaker === "therapist" ? "var(--ivory-50)" : "var(--text-primary)", borderRadius: t.speaker === "therapist" ? "18px 18px 6px 18px" : "18px 18px 18px 6px" }}>
                {t.text}
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function buildView(r: Report) {
  const s = r.session!;
  const metrics = s.metrics as SessionMetrics;
  const timeOf = (idx: number) => r.turns.find((t) => t.idx === idx)?.t_start_s ?? 0;
  const lastT = Math.max(0, ...r.turns.map((t) => t.t_start_s ?? 0));
  const duration = Math.max(lastT + 8, durationMin(s) ? durationMin(s)! * 60 : 0, 30);

  const worst = r.coaching.reduce<number | null>((min, m) => (m.trust_delta != null && (min == null || m.trust_delta < min) ? m.trust_delta : min), null);
  const improve: Moment[] = r.coaching.map((m) => ({
    t: timeOf(m.turn_idx),
    type: "improve",
    title: firstSentence(m.what_happened),
    text: m.why_it_matters,
    quote: r.turns.find((t) => t.idx === m.turn_idx)?.text,
    instead: m.better_alternative,
    key: worst != null && worst < 0 && m.trust_delta === worst,
    badge: m.trust_delta ? `zaufanie ${m.trust_delta > 0 ? "+" : "−"}${Math.abs(m.trust_delta)}` : undefined,
  }));

  const seen = new Set(r.coaching.map((m) => m.turn_idx));
  const strengths: Moment[] = [];
  for (const c of r.scores) {
    for (const e of c.evidence) {
      if (!e.verified || e.better_alternative || seen.has(e.turn_idx) || strengths.length >= 3) continue;
      if (r.turns.find((t) => t.idx === e.turn_idx)?.speaker !== "therapist") continue;
      seen.add(e.turn_idx);
      strengths.push({ t: timeOf(e.turn_idx), type: "strength", title: c.criteria.name, quote: e.quote });
    }
  }
  const openings: Moment[] = metrics.needs
    .filter((n) => n.discovered && n.unlocked_at_s != null)
    .map((n) => ({ t: n.unlocked_at_s!, type: "strength", title: "Pacjent się otwiera", text: n.label, badge: "nowa potrzeba" }));

  const moments = [...improve, ...strengths, ...openings].sort((a, b) => a.t - b.t);
  const needsFound = metrics.needs.filter((n) => n.discovered).length;
  const trendWord = metrics.trust_end > metrics.trust_start + 5 ? "rośnie" : metrics.trust_end < metrics.trust_start - 5 ? "spada" : "bez zmian";

  const missed = metrics.needs.filter((n) => !n.discovered).map((n) => n.missed_hint);
  const next = [...missed, ...r.coaching.map((m) => `Zamiast tego, co padło w ${fmtTime(timeOf(m.turn_idx))}: ${m.better_alternative}`)].slice(0, 3);

  return {
    metrics,
    duration,
    moments,
    needsFound,
    mood: `Zaufanie pacjenta · ${trendWord}`,
    headline: s.summary ?? "Raport z sesji",
    summary: `Zaufanie pacjenta: ${metrics.trust_start} na starcie, ${metrics.trust_end} na koniec (najwyżej ${metrics.trust_max}). Odkryte ukryte potrzeby: ${needsFound} z ${metrics.needs.length}.`,
    trustChart: [
      { label: "0:00", value: metrics.trust_start },
      ...metrics.trust_timeline.map((p) => ({
        label: fmtTime(p.t_s ?? 0),
        value: p.trust,
        color: p.delta < 0 ? "var(--coral-400)" : p.delta > 0 ? "var(--mint-400)" : "var(--surface-card)",
      })),
    ],
    next,
    metricItems: [
      { label: "Pytania otwarte", value: metrics.open_questions },
      { label: "Pytania zamknięte", value: metrics.closed_questions },
      { label: "Odzwierciedlenia (złożone)", value: `${metrics.reflections} (${metrics.complex_reflections})` },
      { label: "Odzwierciedlenia : pytania", value: `${metrics.rq_ratio.toString().replace(".", ",")} : 1` },
      { label: "Przedwczesne rady", value: metrics.premature_advice },
      { label: "Ocenianie / spór z przekonaniem", value: metrics.judgments + metrics.argues_with_belief },
      { label: "Pytanie o ryzyko", value: metrics.risk_question_asked ? "tak" : "nie" },
    ],
  };
}
