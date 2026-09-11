// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { transferFiles } from "../../scripts/transfer-files.mjs";

/**
 * Das Übertragen der Dateien gegen eine nachgebaute Ablage.
 *
 * Nachgebaut ist, woran der erste echte Umzug gescheitert ist: Eine Ablage
 * lehnt Dateien ab, die grösser sind als ihre Grenze oder einen Typ haben,
 * der nicht auf ihrer Liste steht – mit denselben Antworten wie Supabase.
 * Dazu die Grenze des ganzen Projekts, die sich nicht aufheben lässt.
 */

interface Bucket {
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

const PROJECT_LIMIT = 5000;
const KEY = "service-key";

let server: Server | undefined;
afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

const body = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve) => {
    const parts: Buffer[] = [];
    req.on("data", (c) => parts.push(c));
    req.on("end", () => resolve(Buffer.concat(parts)));
  });

/** Quelle und Ziel in einem: /src/<n> liefert Dateien, /storage/v1/… nimmt sie an. */
async function stage(buckets: Record<string, Bucket>, sources: Record<string, number>) {
  const stored = new Map<string, number>();
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://x");
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };

    if (url.pathname.startsWith("/src/")) {
      res.writeHead(200);
      res.end(Buffer.alloc(sources[url.pathname.slice(5)] ?? 0));
      return;
    }
    if (req.headers.authorization !== `Bearer ${KEY}`) return send(401, { message: "no" });

    const bucketMatch = url.pathname.match(/^\/storage\/v1\/bucket\/([^/]+)$/);
    if (bucketMatch) {
      const b = buckets[decodeURIComponent(bucketMatch[1])];
      if (!b) return send(404, { message: "Bucket not found" });
      if (req.method === "GET") return send(200, b);
      Object.assign(b, JSON.parse((await body(req)).toString()));
      return send(200, { message: "Successfully updated" });
    }

    const objectMatch = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (objectMatch && req.method === "POST") {
      const b = buckets[decodeURIComponent(objectMatch[1])];
      const data = await body(req);
      const type = String(req.headers["content-type"]);
      if (data.length > PROJECT_LIMIT || (b.file_size_limit !== null && data.length > b.file_size_limit)) {
        return send(400, { statusCode: "413", error: "Payload too large" });
      }
      if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) {
        return send(400, { statusCode: "415", error: "invalid_mime_type" });
      }
      stored.set(`${objectMatch[1]}/${decodeURIComponent(objectMatch[2])}`, data.length);
      return send(200, { Key: objectMatch[2] });
    }
    send(404, { message: "?" });
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  return { base, stored };
}

const strict = (): Record<string, Bucket> => ({
  "internal-files": { public: false, file_size_limit: 1000, allowed_mime_types: ["application/pdf"] },
  gallery: { public: true, file_size_limit: null, allowed_mime_types: null },
});

describe("Dateien übertragen", () => {
  it("trägt auch Dateien hinüber, die die Grenzen der Ablage heute nicht mehr erlauben", async () => {
    const buckets = strict();
    const { base, stored } = await stage(buckets, { gross: 3000, docm: 100, bild: 50 });
    const files = [
      { bucket: "internal-files", name: "sources/grosse quelle.pdf", mimetype: "application/pdf", size: 3000, url: `${base}/src/gross` },
      { bucket: "internal-files", name: "vorlagen/a.docm", mimetype: "application/vnd.ms-word.document.macroenabled.12", size: 100, url: `${base}/src/docm` },
      { bucket: "gallery", name: "x.jpg", mimetype: "image/jpeg", size: 50, url: `${base}/src/bild` },
    ];

    const lines: string[] = [];
    const result = await transferFiles(files, { target: base, key: KEY, log: (l: string) => lines.push(l) });

    expect(result.failures).toEqual([]);
    expect([...stored.keys()].sort()).toEqual([
      "gallery/x.jpg",
      "internal-files/sources/grosse quelle.pdf",
      "internal-files/vorlagen/a.docm",
    ]);
    // Danach gelten die Grenzen wieder wie vorher.
    expect(buckets).toEqual(strict());
    expect(result.restoreFailures).toEqual([]);
    // Kein Dateiname im Protokoll.
    expect(lines.join("\n")).not.toMatch(/quelle|vorlagen|x\.jpg/);
  });

  it("meldet, was über der Grenze des Projekts liegt, und stellt die Ablage trotzdem wieder her", async () => {
    const buckets = strict();
    const { base } = await stage(buckets, { riesig: PROJECT_LIMIT + 1 });
    const result = await transferFiles(
      [{ bucket: "internal-files", name: "a.pdf", mimetype: "application/pdf", size: PROJECT_LIMIT + 1, url: `${base}/src/riesig` }],
      { target: base, key: KEY, log: () => undefined }
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatch(/internal-files \(\.pdf, 0\.0 MB\): Ablegen: HTTP 400/);
    expect(buckets).toEqual(strict());
  });
});
