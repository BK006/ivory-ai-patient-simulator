"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, PageHead, SegmentedTabs } from "@/components/ivory/ui";
import { guessGender, loadProfile, saveProfile, type Gender } from "@/lib/profile";

const FORMS = ["Pani", "Pan"] as const;
type Form = (typeof FORMS)[number];
const toForm = (g: Gender): Form => (g === "k" ? "Pani" : "Pan");
const toGender = (f: Form): Gender => (f === "Pani" ? "k" : "m");

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [manual, setManual] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile()
      .then((p) => {
        if (p.display_name) setName(p.display_name);
        if (p.gender) {
          setForm(toForm(p.gender));
          setManual(true);
        }
      })
      .catch(console.error);
  }, []);

  // Until the user picks a form by hand, follow the name.
  useEffect(() => {
    if (manual) return;
    const g = guessGender(name);
    setForm(g ? toForm(g) : null);
  }, [name, manual]);

  const first = name.trim().split(/\s+/)[0] ?? "";
  const canSave = first.length > 1 && form !== null && state !== "saving";

  const save = async () => {
    if (!canSave || !form) return;
    setState("saving");
    setError(null);
    try {
      await saveProfile(name.trim(), toGender(form));
      setState("saved");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    }
  };

  return (
    <div style={{ display: "grid", gap: 32, maxWidth: 640 }}>
      <PageHead eyebrow="Konto" title="Ustawienia" />
      <div style={{ display: "grid", gap: 24, padding: 32, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-xl)" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)" }}>Jak pacjent ma się do Ciebie zwracać</span>
          <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
            Pacjent wie, z kim rozmawia: używa Twojego imienia i form zgodnych z Twoją płcią („Pani Anno, mówiła Pani…”).
          </span>
        </div>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ font: "var(--type-body-s)", fontWeight: 500 }}>Imię</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setState("idle"); }} placeholder="np. Anna" maxLength={60}
            style={{ height: "var(--control-h)", padding: "0 16px", font: "var(--type-body)", color: "var(--text-primary)", background: "var(--surface-card)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-s)", outline: "none" }} />
        </label>
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ font: "var(--type-body-s)", fontWeight: 500 }}>Forma zwracania się</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <SegmentedTabs items={[...FORMS]} value={form ?? ("" as Form)} onChange={(f) => { setForm(f); setManual(true); setState("idle"); }} />
            <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
              {manual ? "Ustawione ręcznie." : form ? "Rozpoznane automatycznie z imienia – możesz zmienić." : "Wpisz imię."}
            </span>
          </div>
        </div>
        {form && first.length > 1 && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-s)", background: "var(--surface-sunken)", font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
            Pacjent zwróci się do Ciebie per „{form}” i czasem po imieniu ({first}, w poprawnym wołaczu).
          </div>
        )}
        {error && <span style={{ font: "var(--type-body-s)", color: "var(--negative-text)" }}>{error}</span>}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={save} disabled={!canSave}>{state === "saving" ? "Zapisywanie…" : "Zapisz"}</Button>
          {state === "saved" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-body-s)", color: "var(--accent-text)" }}>
              <Check size={16} strokeWidth={1.5} />Zapisano – obowiązuje od następnej rozmowy.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
