"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarList, Button, Card, EmptyState, LineChart, PageHead, ScorePill, Stat, Table } from "@/components/ivory/ui";
import { durationMin, fmtDate, listMySessions, type SessionSummary } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

type Competency = { label: string; value: number };

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);

  useEffect(() => {
    listMySessions()
      .then(async (list) => {
        setSessions(list);
        const ids = list.filter((s) => s.status === "evaluated").map((s) => s.id);
        if (!ids.length) return;
        const { data } = await supabase.from("scores").select("score_median, override_score, criteria(name, ord)").in("session_id", ids);
        const by = new Map<string, { ord: number; sum: number; n: number }>();
        for (const row of (data ?? []) as unknown as { score_median: number; override_score: number | null; criteria: { name: string; ord: number } }[]) {
          const v = row.override_score ?? row.score_median;
          const cur = by.get(row.criteria.name) ?? { ord: row.criteria.ord, sum: 0, n: 0 };
          by.set(row.criteria.name, { ord: cur.ord, sum: cur.sum + v, n: cur.n + 1 });
        }
        setCompetencies(
          [...by.entries()]
            .sort((a, b) => a[1].ord - b[1].ord)
            .map(([label, x]) => ({ label, value: Math.round(((x.sum / x.n - 1) / 3) * 100) })),
        );
      })
      .catch((err) => {
        console.error(err);
        setSessions([]);
      });
  }, []);

  const evaluated = (sessions ?? []).filter((s) => s.status === "evaluated" && s.overall_score != null);
  const scores = evaluated.map((s) => s.overall_score!);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const delta = scores.length >= 2 ? scores[0] - scores[1] : undefined;
  const minutes = evaluated.reduce((n, s) => n + (durationMin(s) ?? 0), 0);
  const trend = [...evaluated].reverse().map((s) => ({ label: fmtDate(s.created_at).split(",")[0], value: s.overall_score! }));

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <PageHead eyebrow="Dzień dobry" title="Twoje postępy"
        right={<Button href="/moduly" iconRight={<ArrowRight size={16} strokeWidth={1.5} />}>Rozpocznij sesję</Button>} />

      {sessions && !evaluated.length ? (
        <EmptyState title="Nie masz jeszcze żadnej sesji"
          text="Wybierz moduł, poznaj pacjenta i porozmawiaj z nim głosem. Po rozmowie dostaniesz ocenę z cytatami i konkretnymi wskazówkami."
          action={<Button href="/moduly" iconRight={<ArrowRight size={16} strokeWidth={1.5} />}>Wybierz moduł</Button>} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <Card><Stat label="Średni wynik" value={avg ?? "–"} delta={delta} hint="ze wszystkich sesji" /></Card>
            <Card><Stat label="Sesje" value={evaluated.length} hint="ocenione" /></Card>
            <Card><Stat label="Czas praktyki" value={minutes >= 60 ? (minutes / 60).toFixed(1).replace(".", ",") : minutes} unit={minutes >= 60 ? "h" : "min"} hint="łącznie" /></Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <Card style={{ display: "grid", gap: 16 }}>
              <span style={{ font: "var(--type-h4)" }}>Wynik w czasie</span>
              <LineChart data={trend} height={200} />
            </Card>
            <Card style={{ display: "grid", gap: 20, alignContent: "start" }}>
              <span style={{ font: "var(--type-h4)" }}>Kompetencje</span>
              <BarList data={competencies} />
            </Card>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <span style={{ font: "var(--type-h4)" }}>Ostatnie sesje</span>
            <Table
              onRowClick={(r) => router.push(`/raporty/${r.id}`)}
              rows={(sessions ?? []).slice(0, 8)}
              columns={[
                { key: "client", label: "Pacjent", render: (r) => `${r.scenarios.personas.name}, ${r.scenarios.personas.age}` },
                { key: "topic", label: "Moduł", render: (r) => r.scenarios.module },
                { key: "date", label: "Data", render: (r) => fmtDate(r.created_at) },
                { key: "duration", label: "Czas", render: (r) => (durationMin(r) ? `${durationMin(r)} min` : "–") },
                {
                  key: "score", label: "Wynik", align: "right",
                  render: (r) => (r.overall_score != null ? <ScorePill score={r.overall_score} /> : <span style={{ color: "var(--text-tertiary)" }}>{r.status === "failed" ? "błąd" : "ocenianie…"}</span>),
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
