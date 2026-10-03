"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ModuleCard } from "@/components/ivory/session";
import { PageHead, SegmentedTabs } from "@/components/ivory/ui";
import { listMySessions, listScenarios, type ScenarioCard, type SessionSummary } from "@/lib/queries";

const LEVELS = ["Wszystkie", "Łatwe", "Średnie", "Trudne"] as const;
type Level = (typeof LEVELS)[number];
const LEVEL_NUM: Record<Level, number> = { Wszystkie: 0, "Łatwe": 1, "Średnie": 2, Trudne: 3 };

// Modules planned after the hackathon – shown as "w przygotowaniu", never startable.
const UPCOMING = [
  { name: "Kryzys samobójczy", difficulty: 3, description: "Rozmowa z osobą w ostrym kryzysie. Ocena ryzyka wprost i plan bezpieczeństwa.", skills: ["Ocena ryzyka", "Interwencja kryzysowa"] },
  { name: "Depresja", difficulty: 2, description: "Obniżony nastrój, wycofanie, brak energii. Wymaga cierpliwości i uważnego odzwierciedlania.", skills: ["Empatia", "Tolerowanie ciszy"] },
  { name: "Uzależnienie od alkoholu", difficulty: 3, description: "Klienci bagatelizujący problem, przychodzący pod presją bliskich lub pracodawcy.", skills: ["Dialog motywujący", "Praca z oporem"] },
];

export default function ModulesPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioCard[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [lvl, setLvl] = useState<Level>("Wszystkie");

  useEffect(() => {
    listScenarios().then(setScenarios).catch(console.error);
    listMySessions().then(setSessions).catch(console.error);
  }, []);

  const modules = useMemo(() => {
    const by = new Map<string, ScenarioCard[]>();
    for (const s of scenarios) by.set(s.module, [...(by.get(s.module) ?? []), s]);
    return [...by.entries()].map(([name, pool]) => {
      const done = sessions.filter((x) => pool.some((p) => p.id === x.scenario_id) && x.overall_score != null);
      return {
        name,
        pool,
        difficulty: Math.max(...pool.map((p) => p.difficulty)),
        description: pool[0].module_description ?? undefined,
        skills: [...new Set(pool.flatMap((p) => p.skills))].slice(0, 3),
        sessions: done.length,
        bestScore: done.length ? Math.max(...done.map((x) => x.overall_score!)) : null,
      };
    });
  }, [scenarios, sessions]);

  const visible = modules.filter((m) => !LEVEL_NUM[lvl] || m.difficulty === LEVEL_NUM[lvl]);
  const upcoming = UPCOMING.filter((m) => !LEVEL_NUM[lvl] || m.difficulty === LEVEL_NUM[lvl]);

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <PageHead eyebrow="Nowa sesja" title="Wybierz moduł" right={<SegmentedTabs items={[...LEVELS]} value={lvl} onChange={setLvl} />} />
      <p style={{ margin: "-16px 0 0", font: "var(--type-body)", color: "var(--text-secondary)", maxWidth: 560 }}>
        Pacjent jest losowany z puli modułu. Jego sytuację zobaczysz przed rozpoczęciem rozmowy głosowej.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {visible.map((m) => (
          <ModuleCard key={m.name} {...m}
            onClick={() => router.push(`/sesja/${m.pool[Math.floor(Math.random() * m.pool.length)].id}`)} />
        ))}
        {upcoming.map((m) => (
          <div key={m.name} style={{ opacity: 0.55 }} title="Moduł w przygotowaniu">
            <ModuleCard name={m.name} description={m.description} difficulty={m.difficulty} skills={m.skills} sessions={0} bestScore={null} />
          </div>
        ))}
      </div>
      {upcoming.length > 0 && (
        <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: -16 }}>
          Wyszarzone moduły są w przygotowaniu: każda persona przechodzi weryfikację kliniczną przed udostępnieniem.
        </span>
      )}
    </div>
  );
}
