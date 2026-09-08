import type { SuggestionOptions } from "@tiptap/suggestion";

export interface MentionMember {
  id: string;
  display_name: string;
}

const ROW_BASE = "block w-full text-left px-3 py-1.5 text-sm rounded-md cursor-pointer";
const ROW_ACTIVE = " bg-primary/10 text-foreground";
const ROW_IDLE = " text-muted-foreground";

/**
 * Die Namensliste, die nach dem „@" aufklappt.
 *
 * Bewusst ohne Positionierungsbibliothek: Die Liste hängt an
 * `position: fixed` unter dem Cursor, das sind ein paar Zeilen statt eines
 * weiteren Pakets im Bundle. Bedient wird sie mit Pfeiltasten, Enter und
 * Escape – und mit der Maus, denn nicht jeder tippt sich durch Menüs.
 */
export function createMentionSuggestion(
  getMembers: () => MentionMember[]
): Omit<SuggestionOptions<MentionMember>, "editor"> {
  return {
    char: "@",
    // Ohne Leerzeichen davor gilt eine Mailadresse sonst als Erwähnung.
    allowSpaces: false,

    items: ({ query }) => {
      const q = query.trim().toLowerCase();
      return getMembers()
        .filter((m) => m.display_name && (q === "" || m.display_name.toLowerCase().includes(q)))
        .slice(0, 8);
    },

    render: () => {
      let box: HTMLDivElement | null = null;
      let rows: HTMLButtonElement[] = [];
      let items: MentionMember[] = [];
      let active = 0;
      let choose: (item: MentionMember) => void = () => undefined;
      let outside: ((event: MouseEvent) => void) | null = null;
      // Wurde die Liste per Klick daneben geschlossen, darf sie nicht beim
      // nächsten Tastendruck von selbst wieder auftauchen.
      let geschlossen = false;

      /** Nur die Hervorhebung umsetzen – ohne die Knöpfe neu anzulegen. */
      const highlight = () => {
        rows.forEach((row, i) => {
          row.className = ROW_BASE + (i === active ? ROW_ACTIVE : ROW_IDLE);
        });
      };

      const build = () => {
        if (!box) return;
        box.replaceChildren();
        rows = [];

        if (items.length === 0) {
          const empty = document.createElement("p");
          empty.className = "px-3 py-2 text-sm text-muted-foreground";
          empty.textContent = "Niemand gefunden";
          box.append(empty);
          return;
        }

        items.forEach((item, i) => {
          const row = document.createElement("button");
          row.type = "button";
          row.textContent = item.display_name;

          // mousedown statt click: Ein click käme erst nach dem Fokusverlust,
          // und dann ist die Liste schon wieder zu.
          row.addEventListener("mousedown", (event) => {
            event.preventDefault();
            choose(item);
          });

          // Hier NUR die Hervorhebung ändern. Die Liste dabei neu zu zeichnen
          // würde den Knopf unter dem Zeiger zerstören und neu anlegen – was
          // sofort wieder ein mouseenter auslöst. Diese Schleife hat die Liste
          // unbedienbar gemacht und den Browser blockiert.
          row.addEventListener("mouseenter", () => {
            if (active === i) return;
            active = i;
            highlight();
          });

          rows.push(row);
          box!.append(row);
        });

        highlight();
      };

      const place = (rect: DOMRect | null) => {
        if (!box || !rect) return;
        const width = 220;
        // Am rechten Rand nach innen rücken, sonst steht die Liste auf dem
        // Handy halb außerhalb.
        box.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
        box.style.width = `${width}px`;
        const below = window.innerHeight - rect.bottom;
        if (below < 200) {
          box.style.top = "auto";
          box.style.bottom = `${window.innerHeight - rect.top + 6}px`;
        } else {
          box.style.bottom = "auto";
          box.style.top = `${rect.bottom + 6}px`;
        }
      };

      const close = () => {
        if (outside) {
          document.removeEventListener("mousedown", outside, true);
          outside = null;
        }
        box?.remove();
        box = null;
        rows = [];
      };

      const gleicheListe = (next: MentionMember[]) =>
        next.length === items.length && next.every((m, i) => m.id === items[i]?.id);

      return {
        onStart: (props) => {
          geschlossen = false;
          items = props.items;
          active = 0;
          choose = (item) => props.command({ id: item.id, label: item.display_name });

          box = document.createElement("div");
          box.className =
            "fixed z-50 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md";
          // Auch ein Klick auf die Polsterung neben den Knöpfen darf den
          // Schreibcursor nicht aus dem Editor holen.
          box.addEventListener("mousedown", (event) => event.preventDefault());
          document.body.append(box);

          // Klick irgendwo anders hin: Liste schliessen. Ohne das bliebe sie
          // stehen, wenn der Editor den Fokus verliert – die Erweiterung
          // bekommt davon nichts mit.
          outside = (event: MouseEvent) => {
            if (box && !box.contains(event.target as Node)) {
              geschlossen = true;
              close();
            }
          };
          document.addEventListener("mousedown", outside, true);

          build();
          place(props.clientRect?.() ?? null);
        },

        onUpdate: (props) => {
          if (geschlossen || !box) return;
          choose = (item) => props.command({ id: item.id, label: item.display_name });

          if (!gleicheListe(props.items)) {
            items = props.items;
            active = 0;
            build();
          }
          place(props.clientRect?.() ?? null);
        },

        onKeyDown: (props) => {
          if (geschlossen) return false;

          if (props.event.key === "Escape") {
            geschlossen = true;
            close();
            return true;
          }
          if (items.length === 0) return false;

          if (props.event.key === "ArrowDown") {
            active = (active + 1) % items.length;
            highlight();
            rows[active]?.scrollIntoView?.({ block: "nearest" });
            return true;
          }
          if (props.event.key === "ArrowUp") {
            active = (active - 1 + items.length) % items.length;
            highlight();
            rows[active]?.scrollIntoView?.({ block: "nearest" });
            return true;
          }
          if (props.event.key === "Enter" || props.event.key === "Tab") {
            choose(items[active]);
            return true;
          }
          return false;
        },

        onExit: () => {
          geschlossen = false;
          close();
        },
      };
    },
  };
}
