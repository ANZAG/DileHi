import type { SuggestionOptions } from "@tiptap/suggestion";

export interface MentionMember {
  id: string;
  display_name: string;
}

/**
 * Die Namensliste, die nach dem „@" aufklappt.
 *
 * Bewusst ohne Positionierungsbibliothek: Die Liste hängt an
 * `position: fixed` unter dem Cursor, das sind zwanzig Zeilen statt eines
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
      let items: MentionMember[] = [];
      let active = 0;
      let choose: (item: MentionMember) => void = () => undefined;

      const paint = () => {
        if (!box) return;
        box.replaceChildren();
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
          row.className =
            "block w-full text-left px-3 py-1.5 text-sm rounded-md " +
            (i === active ? "bg-primary/10 text-foreground" : "text-muted-foreground");
          // mousedown statt click: Ein click käme erst nach dem Fokusverlust,
          // und dann ist die Liste schon wieder zu.
          row.addEventListener("mousedown", (e) => {
            e.preventDefault();
            choose(item);
          });
          row.addEventListener("mouseenter", () => {
            active = i;
            paint();
          });
          box!.append(row);
        });
      };

      const place = (rect: DOMRect | null) => {
        if (!box || !rect) return;
        const width = 220;
        // Am rechten Rand nach innen rücken, sonst steht die Liste auf dem
        // Handy halb außerhalb.
        box.style.left = `${Math.min(rect.left, window.innerWidth - width - 8)}px`;
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

      return {
        onStart: (props) => {
          items = props.items;
          active = 0;
          choose = (item) => props.command({ id: item.id, label: item.display_name });
          box = document.createElement("div");
          box.className =
            "fixed z-50 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md";
          document.body.append(box);
          paint();
          place(props.clientRect?.() ?? null);
        },

        onUpdate: (props) => {
          items = props.items;
          if (active >= items.length) active = 0;
          choose = (item) => props.command({ id: item.id, label: item.display_name });
          paint();
          place(props.clientRect?.() ?? null);
        },

        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            box?.remove();
            box = null;
            return true;
          }
          if (items.length === 0) return false;
          if (props.event.key === "ArrowDown") {
            active = (active + 1) % items.length;
            paint();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            active = (active - 1 + items.length) % items.length;
            paint();
            return true;
          }
          if (props.event.key === "Enter" || props.event.key === "Tab") {
            choose(items[active]);
            return true;
          }
          return false;
        },

        onExit: () => {
          box?.remove();
          box = null;
        },
      };
    },
  };
}
