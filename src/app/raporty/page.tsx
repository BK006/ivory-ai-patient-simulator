"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, EmptyState, PageHead } from "@/components/ivory/ui";
import { listMySessions } from "@/lib/queries";

/** Opens the most recent report, or shows an empty state. */
export default function ReportsIndex() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    listMySessions()
      .then((list) => (list.length ? router.replace(`/raporty/${list[0].id}`) : setEmpty(true)))
      .catch(() => setEmpty(true));
  }, [router]);
  if (!empty) return <div style={{ font: "var(--type-body-s)", color: "var(--text-tertiary)" }}>Ładowanie…</div>;
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <PageHead eyebrow="Raporty" title="Brak raportów" />
      <EmptyState title="Raport pojawi się po pierwszej sesji"
        text="Każda rozmowa kończy się oceną według rubryki, wykresem zaufania pacjenta i momentami do poprawy."
        action={<Button href="/moduly" iconRight={<ArrowRight size={16} strokeWidth={1.5} />}>Wybierz moduł</Button>} />
    </div>
  );
}
