"use client";

import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ivory/ui";
import { signIn } from "@/lib/supabase";

const inputStyle = {
  height: "var(--control-h)", padding: "0 16px", font: "var(--type-body)", color: "var(--text-primary)",
  background: "var(--surface-card)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-s)", outline: "none",
} as const;

// Demo account for the HackYeah jury – shown openly on purpose.
const DEMO = { email: "jury@ivory.demo", password: "hackhack12" };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password); // the shell redirects to the dashboard once the session exists
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zalogować.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, display: "grid", gap: 32 }}>
        <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
          <span style={{ font: "var(--type-h4)", letterSpacing: "var(--tracking-heading)", fontWeight: 500 }}>Ivory</span>
          <h1 style={{ margin: 0, font: "var(--type-h1)", letterSpacing: "var(--tracking-display)" }}>Zaloguj się</h1>
          <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-secondary)" }}>
            Przećwicz najtrudniejszą rozmowę, zanim odbędzie się naprawdę.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12, padding: 20, background: "var(--mint-50)", border: "1px solid var(--mint-100)", borderRadius: "var(--radius-l)" }}>
          <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--accent-text)" }}>Konto demo dla jury</span>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", font: "var(--type-body-s)" }}>
            <span style={{ color: "var(--text-secondary)" }}>E-mail</span><span style={{ font: "var(--type-mono)" }}>{DEMO.email}</span>
            <span style={{ color: "var(--text-secondary)" }}>Hasło</span><span style={{ font: "var(--type-mono)" }}>{DEMO.password}</span>
          </div>
          <Button variant="secondary" onClick={() => { setEmail(DEMO.email); setPassword(DEMO.password); }}>Wpisz dane demo</Button>
        </div>
        <form onSubmit={submit} style={{ display: "grid", gap: 20, padding: 32, background: "var(--surface-card)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-xl)" }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ font: "var(--type-body-s)", fontWeight: 500 }}>E-mail</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ font: "var(--type-body-s)", fontWeight: 500 }}>Hasło</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </label>
          {error && <span style={{ font: "var(--type-body-s)", color: "var(--negative-text)" }}>{error}</span>}
          <Button type="submit" size="l" fullWidth disabled={busy || !email || !password} iconRight={<ArrowRight size={18} strokeWidth={1.5} />}>
            {busy ? "Logowanie…" : "Zaloguj się"}
          </Button>
        </form>
        <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
          Trening komunikacji, nie terapia ani diagnoza.
        </span>
      </div>
    </div>
  );
}
