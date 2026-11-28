import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Karten, Knopf } from "@/components/sitebuilder/bausteine";
import { Hinweiskasten } from "@/components/sitebuilder/Hinweiskasten";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

/**
 * Die Bausteine selbst: Steht als Ziel ein Skript, darf keine Adresse daraus
 * werden (Sicherheitsprüfung 28.11.2026).
 */
function zeige(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{element}</QueryClientProvider>
    </MemoryRouter>
  );
}

const SKRIPT = "javascript:alert(document.cookie)";

function adressen(container: HTMLElement): string[] {
  return [...container.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
}

describe("Bausteine mit einem Skript als Ziel", () => {
  it("Knopf", () => {
    const { container } = zeige(<Knopf beschriftung="Los" ziel={SKRIPT} art="gefuellt" ausrichtung="links" />);
    expect(adressen(container).some((h) => /script:/i.test(h))).toBe(false);
  });

  it("Karten", () => {
    const { container } = zeige(<Karten spalten="zwei" karten={[{ titel: "Eins", text: "", ziel: SKRIPT }]} />);
    expect(adressen(container).some((h) => /script:/i.test(h))).toBe(false);
  });

  it("Hinweiskasten", () => {
    const { container } = zeige(<Hinweiskasten symbol="info" ueberschrift="Hinweis" inhalt="" knopf="Mehr" ziel={SKRIPT} />);
    expect(adressen(container).some((h) => /script:/i.test(h))).toBe(false);
  });

  it("lässt gewöhnliche Ziele stehen", () => {
    const { container } = zeige(<Knopf beschriftung="Los" ziel="https://example.org" art="gefuellt" ausrichtung="links" />);
    expect(adressen(container)).toContain("https://example.org");
  });
});
