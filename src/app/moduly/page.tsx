"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { initials, ModuleCard } from "@/components/ivory/session";
import { PageHead, ScorePill } from "@/components/ivory/ui";
import { fmtDate, listMySessions, listScenarios, type ScenarioCard, type SessionSummary } from "@/lib/queries";

export default function ModulesPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioCard[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    listScenarios().then(setScenarios).catch(console.error);
    listMySessions().then(setSessions).catch(console.error);
  }, []);

  const first = useMemo(() => {
    const pool = scenarios.filter((s) => s.module === "Pierwsza wizyta");
    const done = sessions.filter((x) => x.kind === "first" && x.overall_score != null);
    return {
      pool,
      description: pool[0]?.module_description ?? undefined,
      // Only name and age – the psychologist must discover the rest in the conversation.
      patients: pool.map((p) => ({ name: p.personas.name, age: p.personas.age, tagline: "Nowy pacjent – nic o nim nie wiesz" })),
      skills: ["rozpoznanie potrzeby", "budowanie zaufania", "pytanie o ryzyko"],
      sessions: done.length,
      bestScore: done.length ? Math.max(...done.map((x) => x.overall_score!)) : null,
    };
  }, [scenarios, sessions]);

  // Latest evaluated visit per patient – each can be continued with a follow-up visit.
  const followups = useMemo(() => {
    const latest = new Map<string, SessionSummary>();
    for (const s of sessions) {
      if (s.status !== "evaluated") continue;
      const cur = latest.get(s.scenario_id);
      if (!cur || s.created_at > cur.created_at) latest.set(s.scenario_id, s);
    }
    return [...latest.values()];
  }, [sessions]);

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <PageHead eyebrow="Nowa sesja" title="Wybierz moduł" />
      <p style={{ margin: "-16px 0 0", font: "var(--type-body)", color: "var(--text-secondary)", maxWidth: 600 }}>
        Na pierwszej wizycie nic nie wiesz o pacjencie. Kolejną wizytę możesz umówić z każdym pacjentem, z którym już
        rozmawiałeś – pamięta, co sobie powiedzieliście.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16, alignItems: "start" }}>
        {first.pool.length > 0 && (
          <ModuleCard name="Pierwsza wizyta" {...first}
            onClick={() => router.push(`/sesja/${first.pool[Math.floor(Math.random() * first.pool.length)].id}`)} />
        )}

        <div style={{ display: "grid", gap: 16, padding: 24, minWidth: 0, background: "var(--surface-card)", borderRadius: "var(--radius-l)", border: "1px solid var(--line-subtle)" }}>
          <span style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-heading)" }}>Kolejna wizyta</span>
          <p style={{ margin: 0, font: "var(--type-body-s)", color: "var(--text-secondary)", textWrap: "pretty" }}>
            Ten sam pacjent, kolejne spotkanie. Pamięta poprzednią rozmowę, zaufanie przechodzi dalej, a to, co przemilczał, nadal trzeba z niego wydobyć.
          </p>
          {followups.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: "var(--radius-m)", background: "var(--surface-sunken)", font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
              <Lock size={16} strokeWidth={1.5} />
              Odblokuje się po pierwszej ocenionej rozmowie z pacjentem.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {followups.map((s) => (
                <Link key={s.id} href={`/sesja/${s.scenario_id}?po=${s.id}`}
                  style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto auto", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--radius-m)", border: "1px solid var(--line-subtle)" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 16, background: "var(--surface-sunken)", display: "grid", placeItems: "center", font: "var(--type-body-s)", color: "var(--stone-700)" }}>
                    {initials(s.scenarios.personas.name)}
                  </span>
                  <span style={{ display: "grid", minWidth: 0 }}>
                    <span style={{ font: "var(--type-body-s)", fontWeight: 500 }}>{s.scenarios.personas.name}, {s.scenarios.personas.age}</span>
                    <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
                      {s.kind === "followup" ? "Kolejna wizyta" : "Pierwsza wizyta"} · {fmtDate(s.created_at)}
                    </span>
                  </span>
                  {s.overall_score != null && <ScorePill score={s.overall_score} />}
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["ciągłość relacji", "nawiązanie do ustaleń", "pogłębianie"].map((t) => (
              <span key={t} style={{ height: 24, padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: "var(--radius-pill)", background: "var(--surface-sunken)", font: "var(--type-caption)", color: "var(--text-secondary)" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
