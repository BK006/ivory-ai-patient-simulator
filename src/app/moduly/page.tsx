"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ModuleCard } from "@/components/ivory/session";
import { PageHead } from "@/components/ivory/ui";
import { listMySessions, listScenarios, type ScenarioCard, type SessionSummary } from "@/lib/queries";

// Fixed order of the two MVP modules; conditions (depression, insomnia…) live in the personas.
const MODULE_ORDER = ["Pierwsza wizyta", "Wizyta regularnego klienta"];

export default function ModulesPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioCard[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    listScenarios().then(setScenarios).catch(console.error);
    listMySessions().then(setSessions).catch(console.error);
  }, []);

  const modules = useMemo(() => {
    const by = new Map<string, ScenarioCard[]>();
    for (const s of scenarios) by.set(s.module, [...(by.get(s.module) ?? []), s]);
    return [...by.entries()]
      .sort(([a], [b]) => MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b))
      .map(([name, pool]) => {
        const done = sessions.filter((x) => pool.some((p) => p.id === x.scenario_id) && x.overall_score != null);
        return {
          name,
          pool,
          description: pool[0].module_description ?? undefined,
          patients: pool.map((p) => ({ name: p.personas.name, age: p.personas.age, tagline: p.personas.tagline })),
          skills: [...new Set(pool.flatMap((p) => p.skills))].slice(0, 4),
          sessions: done.length,
          bestScore: done.length ? Math.max(...done.map((x) => x.overall_score!)) : null,
        };
      });
  }, [scenarios, sessions]);

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <PageHead eyebrow="Nowa sesja" title="Wybierz moduł" />
      <p style={{ margin: "-16px 0 0", font: "var(--type-body)", color: "var(--text-secondary)", maxWidth: 560 }}>
        Pacjent jest losowany z puli modułu. Jego sytuację zobaczysz przed rozpoczęciem rozmowy głosowej.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {modules.map((m) => (
          <ModuleCard key={m.name} {...m}
            onClick={() => router.push(`/sesja/${m.pool[Math.floor(Math.random() * m.pool.length)].id}`)} />
        ))}
      </div>
    </div>
  );
}
