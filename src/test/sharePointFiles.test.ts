// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { CHUNK, chunkRanges, uploadToSharePoint } from "@/lib/sharePointFiles";
import { CHUNK as SERVER_CHUNK, fileInFolder, isInFolder, safeFileName } from "../../supabase/functions/_shared/sharepoint";

/**
 * Dateien der Quellensammlung in SharePoint.
 *
 * Zwei Stellen, an denen ein Fehler still bliebe: Stücke, die Graph nicht
 * annimmt (dann scheitert nur jede grosse Datei, die kleinen gehen durch),
 * und eine Ordnerprüfung, die mehr durchlässt als die Quellensammlung (dann
 * liesse sich über eine erfundene Kennung jede Datei der Website abrufen).
 */

afterEach(() => vi.restoreAllMocks());

const functionsClient = Object.getPrototypeOf(supabase.functions) as { invoke: (...a: unknown[]) => unknown };

describe("Stücke beim Hochladen", () => {
  it("sind ein Vielfaches von 320 KiB, im Browser wie auf dem Server", () => {
    expect(CHUNK % (320 * 1024)).toBe(0);
    expect(SERVER_CHUNK).toBe(CHUNK);
  });

  it("decken jede Datei lückenlos ab", () => {
    for (const total of [1, CHUNK - 1, CHUNK, CHUNK + 1, 466 * 1024 * 1024]) {
      const r = chunkRanges(total);
      expect(r[0][0]).toBe(0);
      expect(r[r.length - 1][1]).toBe(total - 1);
      for (let i = 1; i < r.length; i++) expect(r[i][0]).toBe(r[i - 1][1] + 1);
      // Alle ausser dem letzten haben volle Grösse – Graph verlangt das.
      for (const [s, e] of r.slice(0, -1)) expect(e - s + 1).toBe(CHUNK);
    }
    expect(chunkRanges(0)).toEqual([]);
  });
});

describe("Hochladen", () => {
  const datei = (bytes: number) => new File([new Uint8Array(bytes)], "Urkunde 1455.pdf", { type: "application/pdf" });

  it("lädt in Stücken, ohne Anmeldung an die Hochladeadresse, und liefert die Datei", async () => {
    vi.spyOn(functionsClient, "invoke").mockResolvedValue({ data: { uploadUrl: "https://sp.example/up" }, error: null } as never);
    const aufrufe: { range: string; auth: boolean }[] = [];
    const total = CHUNK * 2 + 5;
    const fake = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = init!.headers as Record<string, string>;
      aufrufe.push({ range: headers["Content-Range"], auth: "Authorization" in headers });
      const last = headers["Content-Range"].endsWith(`${total - 1}/${total}`);
      return last
        ? new Response(JSON.stringify({ id: "ITEM1", name: "Urkunde 1455.pdf" }), { status: 201 })
        : new Response("{}", { status: 202 });
    });
    const fortschritt: number[] = [];

    const item = await uploadToSharePoint(datei(total), "mittelalter", (f) => fortschritt.push(f), fake as typeof fetch);

    expect(item.id).toBe("ITEM1");
    expect(aufrufe.map((a) => a.range)).toEqual([
      `bytes 0-${CHUNK - 1}/${total}`,
      `bytes ${CHUNK}-${2 * CHUNK - 1}/${total}`,
      `bytes ${2 * CHUNK}-${total - 1}/${total}`,
    ]);
    expect(aufrufe.some((a) => a.auth)).toBe(false);
    expect(fortschritt[fortschritt.length - 1]).toBe(1);
  });

  it("schickt ein gescheitertes Stück noch einmal", async () => {
    vi.useFakeTimers();
    vi.spyOn(functionsClient, "invoke").mockResolvedValue({ data: { uploadUrl: "https://sp.example/up" }, error: null } as never);
    let versuche = 0;
    const fake = vi.fn(async () => {
      versuche++;
      return versuche === 1
        ? new Response("busy", { status: 503 })
        : new Response(JSON.stringify({ id: "ITEM2", name: "x" }), { status: 200 });
    });
    const laeuft = uploadToSharePoint(datei(10), "wk1", () => undefined, fake as unknown as typeof fetch);
    await vi.runAllTimersAsync();
    expect((await laeuft).id).toBe("ITEM2");
    expect(versuche).toBe(2);
    vi.useRealTimers();
  });

  it("gibt bei einer Ablehnung eine Meldung, statt weiterzumachen", async () => {
    vi.spyOn(functionsClient, "invoke").mockResolvedValue({ data: { uploadUrl: "https://sp.example/up" }, error: null } as never);
    const fake = vi.fn(async () => new Response("nein", { status: 413 }));
    await expect(uploadToSharePoint(datei(10), "wk1", () => undefined, fake as unknown as typeof fetch))
      .rejects.toThrow(/abgelehnt \(413\)/);
  });
});

describe("Ordnerprüfung der Edge Function", () => {
  it("lässt die Quellensammlung und ihre Unterordner durch", () => {
    expect(isInFolder("/drives/b!abc/root:/Quellensammlung")).toBe(true);
    expect(isInFolder("/drives/b!abc/root:/Quellensammlung/mittelalter")).toBe(true);
    expect(isInFolder("/drives/b!abc/root:/Quellensammlung/mittelalter/Unterordner")).toBe(true);
  });

  it("lässt nichts anderes durch", () => {
    for (const pfad of [
      "/drives/b!abc/root:",
      "/drives/b!abc/root:/Vorstand",
      "/drives/b!abc/root:/QuellensammlungPrivat",
      "/drives/b!abc/root:/Vorstand/Quellensammlung",
      "",
      undefined,
    ]) {
      expect(isInFolder(pfad), String(pfad)).toBe(false);
    }
  });

  it("macht aus einem Dateinamen einen, den SharePoint annimmt – mit Umlauten", () => {
    expect(safeFileName('Urkunde "Mainz": 1455?.pdf')).toBe("Urkunde _Mainz__ 1455_.pdf");
    expect(safeFileName("Brief an Großherzog Adolph.pdf")).toBe("Brief an Großherzog Adolph.pdf");
    expect(safeFileName(" .. ")).toBe("Datei");
  });
});

describe("Download-Adresse", () => {
  /*
   * Die Adresse zum Herunterladen ist keine Eigenschaft der Datei, sondern
   * eine Anmerkung an der Antwort. Wer sie in eine Auswahlliste schreibt,
   * bekommt sie nicht – ohne Fehler, ohne Hinweis, einfach ohne Adresse.
   * Genau daran scheiterten Vorschau und Herunterladen.
   */
  it("wird ohne Auswahlliste abgefragt", async () => {
    const adressen: string[] = [];
    vi.stubGlobal("Deno", { env: { get: () => "geheim" } });
    vi.stubGlobal("fetch", vi.fn(async (adresse: string) => {
      adressen.push(String(adresse));
      if (String(adresse).includes("login.microsoftonline.com")) {
        return new Response(JSON.stringify({ access_token: "abc", expires_in: 3600 }), { status: 200 });
      }
      return new Response(JSON.stringify({
        id: "17",
        name: "Codex Manesse.pdf",
        parentReference: { path: "/drives/b!abc/root:/Quellensammlung/mittelalter" },
        "@microsoft.graph.downloadUrl": "https://tenant.sharepoint.com/abholen",
      }), { status: 200 });
    }));

    const datei = await fileInFolder(
      { siteId: "s", siteName: "Vereinsablage", driveId: "b!abc", driveName: "Dokumente" },
      "17"
    );

    expect(datei["@microsoft.graph.downloadUrl"]).toBe("https://tenant.sharepoint.com/abholen");
    const abfrage = adressen.find((a) => a.includes("/items/"));
    expect(abfrage).toBeTruthy();
    expect(abfrage).not.toContain("$select");
  });
});
