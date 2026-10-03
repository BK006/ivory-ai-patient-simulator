"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { loadProfile } from "@/lib/profile";
import { TopBar } from "./ivory/ui";

const NAV = [
  { key: "dashboard", href: "/", label: "Pulpit" },
  { key: "modules", href: "/moduly", label: "Moduły" },
  { key: "reports", href: "/raporty", label: "Raporty" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const load = () => loadProfile().then((p) => setName(p.display_name)).catch(() => {});
    load();
    window.addEventListener("profile-changed", load);
    return () => window.removeEventListener("profile-changed", load);
  }, []);
  const initials = name ? name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "Ty";
  const active = path.startsWith("/moduly") || path.startsWith("/sesja") ? "modules" : path.startsWith("/raporty") ? "reports" : "dashboard";
  return (
    <div>
      <TopBar brand="Ivory" items={NAV} active={active}
        right={
          <Link href="/ustawienia" title={name ? `${name} – ustawienia` : "Ustawienia konta"}
            style={{ height: 36, padding: name ? "0 14px 0 4px" : 0, width: name ? undefined : 36, borderRadius: 18, background: "var(--surface-sunken)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, font: "var(--type-body-s)", fontWeight: 500 }}>
            {name ? (
              <>
                <span style={{ width: 28, height: 28, borderRadius: 14, background: "var(--surface-card)", display: "grid", placeItems: "center", font: "var(--type-caption)", fontWeight: 600 }}>{initials}</span>
                {name.split(/\s+/)[0]}
              </>
            ) : "Ty"}
          </Link>
        } />
      <main style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "32px 32px" }}>{children}</main>
      <footer style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "8px 32px 40px", font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
        Trening komunikacji, nie terapia ani diagnoza. Persony i rubryka wymagają weryfikacji klinicznej przed użyciem w szkoleniu.
      </footer>
    </div>
  );
}
