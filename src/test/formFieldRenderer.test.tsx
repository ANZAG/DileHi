import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FormFieldRenderer from "@/components/event-forms/FormFieldRenderer";
import type { FormField } from "@/components/event-forms/types";

/**
 * Zeilen zum Ankreuzen.
 *
 * Ausser bei den Helferaufgaben stand die Beschriftung früher ohne Bezug zum
 * Häkchen da: Sie sah anklickbar aus, war es aber nicht – man musste das
 * kleine Kästchen treffen. Auf dem Handy ist das der Unterschied zwischen
 * „geht" und „geht nicht", und man merkt es beim Entwickeln nicht, weil man
 * mit der Maus genau zielt.
 */

function feld(overrides: Partial<FormField>): FormField {
  return {
    id: "f1",
    label: "Testfrage",
    type: "multi_select",
    required: false,
    order_index: 0,
    ...overrides,
  } as FormField;
}

describe("Ankreuzen über die Beschriftung", () => {
  it("Mehrfachauswahl: Klick auf den Text wählt aus", () => {
    const onChange = vi.fn();
    render(
      <FormFieldRenderer
        field={feld({ options: ["Reise mit eigenem PKW an", "Kann einen Anhänger stellen"] })}
        value={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("Reise mit eigenem PKW an"));
    expect(onChange).toHaveBeenCalledWith(["Reise mit eigenem PKW an"]);
  });

  it("Mehrfachauswahl: nochmal klicken nimmt die Auswahl zurück", () => {
    const onChange = vi.fn();
    render(
      <FormFieldRenderer
        field={feld({ options: ["Kochen", "Einkaufen"] })}
        value={["Kochen"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("Kochen"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("Einzelnes Ankreuzfeld: Klick auf den Text schaltet um", () => {
    const onChange = vi.fn();
    render(
      <FormFieldRenderer
        field={feld({ type: "checkbox", label: "Ich habe die Satzung gelesen" })}
        value={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("Ich habe die Satzung gelesen"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("Helferaufgaben: Klick auf den Text wählt aus", () => {
    const onChange = vi.fn();
    render(
      <FormFieldRenderer
        field={feld({
          type: "helper_tasks",
          label: "Wobei kannst du helfen?",
          settings: { tasks: [{ key: "kochen", label: "Kochen" }] },
        })}
        value={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("Kochen"));
    expect(onChange).toHaveBeenCalledWith(["kochen"]);
  });

  it("Helferaufgaben stehen ohne Rahmen da – wie alle anderen Zeilen auch", () => {
    const { container } = render(
      <FormFieldRenderer
        field={feld({
          type: "helper_tasks",
          label: "Wobei kannst du helfen?",
          settings: { tasks: [{ key: "kochen", label: "Kochen" }] },
        })}
        value={[]}
        onChange={vi.fn()}
      />
    );

    const zeile = container.querySelector("label");
    expect(zeile?.className).not.toMatch(/\bborder\b/);
  });
});
