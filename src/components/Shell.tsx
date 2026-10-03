"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TopBar } from "./ivory/ui";

const NAV = [
  { key: "dashboard", href: "/", label: "Pulpit" },
  { key: "modules", href: "/moduly", label: "Moduły" },
  { key: "reports", href: "/raporty", label: "Raporty" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = path.startsWith("/moduly") || path.startsWith("/sesja") ? "modules" : path.startsWith("/raporty") ? "reports" : "dashboard";
  return (
    <div>
      <TopBar brand="Ivory" items={NAV} active={active}
        right={<span title="Konto anonimowe" style={{ width: 36, height: 36, borderRadius: 18, background: "var(--surface-sunken)", display: "grid", placeItems: "center", font: "var(--type-body-s)", fontWeight: 500 }}>Ty</span>} />
      <main style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "32px 32px" }}>{children}</main>
      <footer style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "8px 32px 40px", font: "var(--type-caption)", color: "var(--text-tertiary)" }}>
        Trening komunikacji, nie terapia ani diagnoza. Persony i rubryka wymagają weryfikacji klinicznej przed użyciem w szkoleniu.
      </footer>
    </div>
  );
}
