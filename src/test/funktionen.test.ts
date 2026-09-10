// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Lassen sich die Edge Functions überhaupt bündeln?
 *
 * Die Typprüfung sieht nur src/. Die Funktionen unter supabase/functions
 * laufen in Deno und fielen bisher durch jedes Raster — bis zum Ausrollen.
 * Dort scheiterte invite-member daran, dass bei einem Umbau aus einem "\n"
 * ein echter Zeilenumbruch geworden war. Die Datei war seit Tagen kaputt, und
 * niemand hatte es gesehen.
 *
 * Geprüft wird, was Deno beim Bündeln zuerst tut: jede Datei lesen und jedem
 * relativen Import folgen. Typen prüft das nicht; dafür bräuchte es Deno.
 */

const WURZEL = "supabase/functions";

const alle = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? alle(join(ordner, e.name))
      : /\.tsx?$/.test(e.name)
        ? [join(ordner, e.name)]
        : []
  );

const DATEIEN = alle(WURZEL);

const lies = (f: string) =>
  ts.createSourceFile(f, readFileSync(f, "utf-8"), ts.ScriptTarget.Latest, true);

describe("Edge Functions", () => {
  it("findet sie überhaupt", () => {
    expect(DATEIEN.length).toBeGreaterThan(15);
  });

  it("hat keinen Syntaxfehler", () => {
    const fehler = DATEIEN.flatMap((f) => {
      const q = lies(f) as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] };
      return q.parseDiagnostics.map((d) => {
        const { line } = q.getLineAndCharacterOfPosition(d.start ?? 0);
        return `${relative(WURZEL, f)}:${line + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
      });
    });
    expect(fehler).toEqual([]);
  });

  it("importiert nur Dateien, die es gibt", () => {
    const fehlend = DATEIEN.flatMap((f) => {
      const q = lies(f);
      return q.statements
        .filter((s): s is ts.ImportDeclaration | ts.ExportDeclaration =>
          (ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) && !!s.moduleSpecifier)
        .map((s) => (s.moduleSpecifier as ts.StringLiteral).text)
        .filter((p) => p.startsWith("."))
        .filter((p) => !existsSync(join(dirname(f), p)))
        .map((p) => `${relative(WURZEL, f)} → ${p}`);
    });
    expect(fehlend).toEqual([]);
  });

  it("hat zu jedem Ordner einen Einstieg", () => {
    // Ohne index.ts bündelt `supabase functions deploy` den Ordner nicht.
    const ordner = readdirSync(WURZEL, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .map((e) => e.name);
    expect(ordner.filter((o) => !existsSync(join(WURZEL, o, "index.ts")))).toEqual([]);
  });
});
