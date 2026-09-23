import { describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useEffect, useState } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

// Auf der Themenseite kam ForumEditor beim ersten Durchgang ein schon
// abgebauter Tiptap-Editor unter: useEditor baut einen neuen Editor nach einer
// Millisekunde wieder ab, wenn die Komponente bis dahin nicht eingehängt ist,
// und der erste Aufbau mit allen Beiträgen dauert länger. Die Effekte riefen
// darauf getHTML() auf, das Schema war weg, und die ganze Seite fiel in die
// Fehlerseite. Im Test rendert React synchron, der Zeitablauf lässt sich so
// nicht nachstellen – deshalb bekommt der Editor den abgebauten Editor hier
// direkt, genau wie im Browser: erst den toten, gleich danach einen frischen.

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/components/forum/forumImages", () => ({
  signForumImages: async () => ({}),
  uploadForumImage: async () => ({ path: "", url: "" }),
}));
vi.mock("@tiptap/react", async (importOriginal) => {
  const echt = await importOriginal<typeof import("@tiptap/react")>();
  return {
    ...echt,
    useEditor: (...args: Parameters<typeof echt.useEditor>) => {
      const frisch = echt.useEditor(...args);
      const [tot] = useState(() => {
        const e = new Editor({ extensions: [StarterKit] });
        e.destroy();
        return e;
      });
      const [erster, setErster] = useState(true);
      useEffect(() => setErster(false), []);
      return erster ? tot : frisch;
    },
  };
});

import ForumEditor from "@/components/forum/ForumEditor";

// Das Zitat setzt den Cursor ans Ende, und ProseMirror misst dafür die
// Position. jsdom kann nicht messen; ein leeres Ergebnis genügt.
const leer = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
const nullRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} }) as DOMRect;
Element.prototype.getClientRects ??= leer;
Range.prototype.getClientRects ??= leer;
Range.prototype.getBoundingClientRect ??= nullRect;

describe("ForumEditor mit abgebautem Editor", () => {
  it("wirft nicht, wenn der erste Durchgang einen abgebauten Editor bekommt", async () => {
    const geworfen: unknown[] = [];
    const fang = (e: ErrorEvent) => {
      geworfen.push(e.error);
      e.preventDefault();
    };
    window.addEventListener("error", fang);
    try {
      await act(async () => {
        render(<ForumEditor value="" onChange={() => {}} insert={{ html: "<p>Zitat</p>", nonce: 1 }} compact />);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
    } finally {
      window.removeEventListener("error", fang);
    }
    expect(geworfen).toEqual([]);
    // Mit dem frischen Editor ist das Eingabefeld da.
    expect(document.querySelector(".ProseMirror")).not.toBeNull();
  });
});
