import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LinkWithQr from "@/components/evaluation/LinkWithQr";

// Diese Komponente wird auf dem Anmeldungen-Reiter gerendert, und der bleibt
// auch auf dem Formular-Reiter eingehaengt. Wirft sie beim Laden, ist die
// gesamte Formularseite weiss - deshalb ein Test, der sie wirklich rendert.

describe("LinkWithQr", () => {
  it("laesst sich rendern, ohne dass der qrcode-Import stolpert", () => {
    render(
      <LinkWithQr
        label="Anmeldelink für Gäste"
        value="https://example.org/anmeldung/abc"
        readOnly
      />
    );
    expect(screen.getByDisplayValue("https://example.org/anmeldung/abc")).toBeInTheDocument();
  });

  it("rendert auch ohne Wert, ohne zu werfen", () => {
    // Der Gruppenlink ist anfangs leer – dieser Fall tritt bei jeder neuen
    // Veranstaltung auf.
    render(<LinkWithQr label="Gruppenlink" value="" placeholder="https://…" />);
    expect(screen.getByPlaceholderText("https://…")).toBeInTheDocument();
  });
});
