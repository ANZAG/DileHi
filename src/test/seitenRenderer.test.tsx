import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SeitenRenderer, { type SeitenDaten } from "@/components/sitebuilder/SeitenRenderer";

// Die Bausteine fragen Bilder, Quellen und Highlights aus der Datenbank ab.
// Hier geht es nur um das Zusammensetzen der Seite, deshalb ein stiller Ersatz.
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
 * Der Seitenaufbau aus gespeicherten Daten.
 *
 * Die öffentliche Seite benutzt bewusst nicht Pucks eigenes Render – das hängt
 * am Bündel des Editors und wären 161 kB gepackt für jeden Besucher. Diese
 * Tests halten fest, dass die eigene, viel kleinere Fassung dasselbe leistet.
 */

function zeige(daten: SeitenDaten) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <SeitenRenderer daten={daten} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Seitenaufbau", () => {
  it("setzt Bausteine in der gespeicherten Reihenfolge zusammen", () => {
    zeige({
      content: [
        {
          type: "Titelbild",
          props: { id: "a", bildSchluessel: "hero-mittelalter", ueberschrift: "Spätmittelalter in Nassau", unterzeile: "Als Nassau den König stellte", hoehe: "mittel" },
        },
        {
          type: "Kennzahlen",
          props: { id: "b", eintraege: [{ titel: "Zeit", wert: "1290–1310" }] },
        },
      ],
    });

    expect(screen.getByRole("heading", { name: "Spätmittelalter in Nassau" })).toBeTruthy();
    expect(screen.getByText("Als Nassau den König stellte")).toBeTruthy();
    expect(screen.getByText("Zeit")).toBeTruthy();
    expect(screen.getByText("1290–1310")).toBeTruthy();
  });

  it("zeigt Fliesstext mit seinen Überschriften", () => {
    zeige({
      content: [
        {
          type: "Textabschnitt",
          props: { id: "a", breite: "schmal", inhalt: "<h2>Regionsbezug</h2><p>Wiesbaden um 1300.</p>" },
        },
      ],
    });
    expect(screen.getByRole("heading", { name: "Regionsbezug" })).toBeTruthy();
    expect(screen.getByText("Wiesbaden um 1300.")).toBeTruthy();
  });

  it("wirft Skripte aus dem Fliesstext heraus", () => {
    // Der Text stammt zwar von Leuten mit Bearbeitungsrecht – aber ein
    // übernommenes Konto soll nicht auf jeder öffentlichen Seite Code
    // ausführen können.
    const { container } = zeige({
      content: [
        {
          type: "Textabschnitt",
          props: { id: "a", breite: "schmal", inhalt: '<p onclick="alert(1)">Hallo</p><script>alert(1)</script>' },
        },
      ],
    });
    expect(container.innerHTML).not.toContain("<script");
    expect(container.innerHTML).not.toContain("onclick");
    expect(screen.getByText("Hallo")).toBeTruthy();
  });

  it("überspringt einen Baustein, den es nicht mehr gibt", () => {
    // Passiert, wenn ein Baustein umbenannt wurde und eine ältere Seite ihn
    // noch enthält. Die restliche Seite muss trotzdem stehen.
    zeige({
      content: [
        { type: "GibtEsNichtMehr", props: { id: "a" } },
        { type: "Kennzahlen", props: { id: "b", eintraege: [{ titel: "Region", wert: "Nassau" }] } },
      ],
    });
    expect(screen.getByText("Nassau")).toBeTruthy();
  });

  it("verträgt eine leere Seite", () => {
    const { container } = zeige({ content: [] });
    expect(container.textContent).toBe("");
  });

  it("verträgt fehlende Daten", () => {
    const client = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <SeitenRenderer daten={null} />
      </QueryClientProvider>
    );
    expect(container.textContent).toBe("");
  });
});
