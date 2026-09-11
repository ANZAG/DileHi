import { afterEach, describe, expect, it, vi } from "vitest";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction, readFunctionError } from "@/lib/functionError";

/**
 * Was jemand sieht, wenn eine Edge Function scheitert.
 *
 * Die Fehlerobjekte sind die echten aus supabase-js, nicht nachgebaut: Ob die
 * Antwort in `context` steckt, entscheidet die Bibliothek, und genau darauf
 * verlässt sich readFunctionError.
 */

const answer = (status: number, body: unknown) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.restoreAllMocks());

// `supabase.functions` baut bei jedem Zugriff einen neuen Client. Ein Nachbau
// am einzelnen Objekt griffe also nie; er muss an den gemeinsamen Prototyp.
const functionsClient = Object.getPrototypeOf(supabase.functions) as { invoke: (...a: unknown[]) => unknown };

describe("readFunctionError", () => {
  it("liest die Meldung der Funktion statt „non-2xx“", async () => {
    expect(await readFunctionError(new FunctionsHttpError(answer(500, { error: "Keine Web-Adresse hinterlegt." }))))
      .toBe("Keine Web-Adresse hinterlegt.");
    expect(await readFunctionError(new FunctionsHttpError(answer(400, { ok: false, fehler: "535 Anmeldung abgelehnt" }))))
      .toBe("535 Anmeldung abgelehnt");
  });

  it("sagt es auf Deutsch, wenn im Rumpf nichts steht oder gar keine Antwort kam", async () => {
    expect(await readFunctionError(new FunctionsHttpError(answer(502, "Bad Gateway"))))
      .toBe("Der Server hat einen Fehler gemeldet (502).");
    const offline = await readFunctionError(new FunctionsFetchError(new TypeError("Failed to fetch")));
    expect(offline).toMatch(/nicht erreichbar/);
    expect(offline).not.toMatch(/fetch|Edge Function/i);
  });
});

describe("invokeFunction", () => {
  it("bricht mit der Meldung ab, statt { error } zurückzugeben", async () => {
    vi.spyOn(functionsClient, "invoke").mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(answer(400, { error: "userId erforderlich" })),
    } as never);
    await expect(invokeFunction("manage-member")).rejects.toThrow("userId erforderlich");
  });

  it("nimmt auch { error } in einer Antwort mit Status 200 ernst", async () => {
    vi.spyOn(functionsClient, "invoke").mockResolvedValue({ data: { error: "Beitrag zu alt" }, error: null } as never);
    await expect(invokeFunction("push-notify")).rejects.toThrow("Beitrag zu alt");
  });

  it("gibt die Daten zurück, wenn alles gut ging", async () => {
    vi.spyOn(functionsClient, "invoke").mockResolvedValue({ data: { publicKey: "abc" }, error: null } as never);
    expect(await invokeFunction<{ publicKey: string }>("push-notify")).toEqual({ publicKey: "abc" });
  });
});

describe("Aufrufe von Edge Functions", () => {
  it("prüfen ihr Ergebnis – kein Aufruf ohne Blick auf den Fehler", async () => {
    // Direkt aufrufen dürfen nur diese, jede aus einem Grund:
    //   notify-contact, confirm-registration – Beiwerk; die Nachricht bzw. die
    //     Anmeldung ist schon gespeichert, eine fehlende Mail darf das nicht
    //     rückgängig machen.
    //   send-reset-email – sagt absichtlich nie, ob eine Adresse existiert.
    //   mail-test – zeigt die Meldung des Mailservers selbst an.
    // Wer hier eine neue Zeile ergänzen will, braucht einen ebenso guten Grund.
    const { readFileSync } = await import("node:fs");
    const { globSync } = await import("node:fs");
    const files = globSync("src/**/*.{ts,tsx}").filter((f) => !/[\\/]test[\\/]/.test(f) && !f.endsWith("functionError.ts"));
    expect(files.length).toBeGreaterThan(50);
    const direct = files.flatMap((f) =>
      (readFileSync(f, "utf-8").match(/supabase\.functions\.invoke\([^)]*?["'`]([\w-]+)["'`]/g) ?? []).map(
        (m) => `${f.replace(/\\/g, "/")}: ${m.match(/["'`]([\w-]+)["'`]/)![1]}`
      )
    );
    expect(direct.sort()).toEqual([
      "src/components/admin/ErscheinungsbildAdmin.tsx: mail-test",
      "src/components/kontakt/KontaktFelder.tsx: notify-contact",
      "src/components/kontakt/VeranstalterFelder.tsx: notify-contact",
      "src/pages/EventRegistration.tsx: confirm-registration",
      "src/pages/Login.tsx: send-reset-email",
    ]);
  });
});
