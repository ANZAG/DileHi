import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Einbindung nach außen: Veranstaltungen, Darstellungen und Galerie.
 *
 * Drei Ausgabeformen aus einer Funktion, weil Vereine sehr unterschiedlich
 * ausgestattet sind:
 *
 *   …/embed/events?format=json    für alle mit eigener Website-Technik
 *   …/embed/events?format=js      Script-Schnipsel, rendert in ein Div;
 *                                 übernimmt Schrift und Farben der Zielseite
 *                                 und hat kein iframe-Höhenproblem
 *   …/embed/events?format=html    für Baukastensysteme, die nur ein iframe
 *                                 zulassen (Jimdo, Wix, WordPress ohne Rechte)
 *
 * Ohne Anmeldung erreichbar. Ausgeliefert wird ausschließlich, was ohnehin
 * öffentlich ist: freigegebene Termine, freigegebene Darstellungen (ohne
 * Namen), Galeriebilder.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Resource = "events" | "personas" | "gallery";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Verhindert, dass ein Wert aus der Datenbank ein <script> beendet. */
const toJsonLiteral = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const formatDateRange = (start: string, end: string | null, allDay: boolean) => {
  const tz = Deno.env.get("CALENDAR_TIMEZONE") || "Europe/Berlin";
  const fmt = (iso: string, withTime: boolean) =>
    new Intl.DateTimeFormat("de-DE", {
      timeZone: tz,
      day: "numeric", month: "long", year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(iso));

  const from = fmt(start, !allDay);
  if (!end) return allDay ? from : `${from} Uhr`;
  const to = fmt(end, !allDay);
  if (from === to) return allDay ? from : `${from} Uhr`;
  return `${from} – ${to}${allDay ? "" : " Uhr"}`;
};

interface Item {
  title: string;
  subtitle?: string;
  text?: string;
  image?: string;
}

async function loadItems(
  supabase: SupabaseClient,
  resource: Resource,
  limit: number
): Promise<Item[]> {
  if (resource === "events") {
    const { data } = await supabase
      .from("events")
      .select("title, description, location, start_date, end_date, all_day")
      .eq("is_public", true)
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(limit);

    return (data ?? []).map((e) => ({
      title: e.title as string,
      subtitle: formatDateRange(e.start_date as string, e.end_date as string | null, !!e.all_day),
      text: [e.location, e.description].filter(Boolean).join(" · ") || undefined,
    }));
  }

  if (resource === "personas") {
    // Gibt bewusst keinen Personenbezug heraus – siehe get_public_personas.
    const { data } = await supabase.rpc("get_public_personas");
    const rows = (data ?? []) as {
      period: string; portrayal: string; expertise: string; images: string[];
    }[];
    return rows.slice(0, limit).map((p) => ({
      title: p.portrayal,
      subtitle: p.period,
      text: p.expertise || undefined,
      image: p.images?.[0]
        ? supabase.storage.from("gallery").getPublicUrl(p.images[0]).data.publicUrl
        : undefined,
    }));
  }

  const { data } = await supabase
    .from("gallery_images")
    .select("storage_path, alt_text, epoch")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((g) => ({
    title: (g.alt_text as string) || "Bild",
    subtitle: (g.epoch as string) || undefined,
    image: supabase.storage.from("gallery").getPublicUrl(g.storage_path as string).data.publicUrl,
  }));
}

const HEADINGS: Record<Resource, string> = {
  events: "Nächste Veranstaltungen",
  personas: "Unsere Darstellungen",
  gallery: "Eindrücke",
};

/** Markup, das sowohl im iframe als auch im Script-Einsatz verwendet wird. */
function renderList(items: Item[], resource: Resource): string {
  if (items.length === 0) {
    return `<p class="dlh-embed__empty">Zurzeit nichts angekündigt.</p>`;
  }
  return `<ul class="dlh-embed__list">` + items.map((i) => `
    <li class="dlh-embed__item">
      ${i.image ? `<img class="dlh-embed__img" src="${escapeHtml(i.image)}" alt="${escapeHtml(i.title)}" loading="lazy">` : ""}
      <div class="dlh-embed__body">
        ${i.subtitle ? `<p class="dlh-embed__meta">${escapeHtml(i.subtitle)}</p>` : ""}
        <p class="dlh-embed__title">${escapeHtml(i.title)}</p>
        ${i.text ? `<p class="dlh-embed__text">${escapeHtml(i.text)}</p>` : ""}
      </div>
    </li>`).join("") + `</ul>`;
}

/**
 * Bewusst sparsam und ohne feste Schriftart oder Farbe: Der Schnipsel soll sich
 * in fremde Seiten einfügen, nicht dagegen anarbeiten.
 */
const STYLE = `
.dlh-embed{font:inherit;color:inherit}
.dlh-embed__list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.dlh-embed__item{display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid rgba(128,128,128,.3);border-radius:8px}
.dlh-embed__img{width:88px;height:88px;object-fit:cover;border-radius:6px;flex:none}
.dlh-embed__body{min-width:0}
.dlh-embed__meta{margin:0 0 2px;font-size:.82em;opacity:.7}
.dlh-embed__title{margin:0;font-weight:600}
.dlh-embed__text{margin:4px 0 0;font-size:.9em;opacity:.85}
.dlh-embed__empty{opacity:.7;font-style:italic}
@media(max-width:480px){.dlh-embed__item{flex-direction:column}.dlh-embed__img{width:100%;height:140px}}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  // …/functions/v1/embed/<resource>[.js]
  const raw = (segments[segments.length - 1] ?? "").replace(/\.(js|json|html)$/, "");
  const resource: Resource =
    raw === "personas" || raw === "gallery" ? raw : "events";

  const format = url.searchParams.get("format")
    ?? (url.pathname.endsWith(".js") ? "js" : url.pathname.endsWith(".html") ? "html" : "json");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 3, 1), 24);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let items: Item[];
  try {
    items = await loadItems(supabase, resource, limit);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Eine Viertelstunde Zwischenspeicher: Termine ändern sich selten, und die
  // fremde Seite soll nicht bei jedem Besucher hier anfragen.
  const cache = "public, max-age=900, s-maxage=900";

  if (format === "json") {
    return new Response(JSON.stringify({ resource, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
    });
  }

  if (format === "js") {
    const script = `(function(){
  var d=document,s=d.currentScript;
  var target=s&&s.dataset.target?d.querySelector(s.dataset.target):null;
  var host=target||d.createElement("div");
  if(!target&&s&&s.parentNode)s.parentNode.insertBefore(host,s);
  host.className="dlh-embed";
  if(!d.getElementById("dlh-embed-style")){
    var st=d.createElement("style");st.id="dlh-embed-style";st.textContent=${toJsonLiteral(STYLE)};
    d.head.appendChild(st);
  }
  host.innerHTML=${toJsonLiteral(renderList(items, resource))};
})();`;
    return new Response(script, {
      headers: { ...corsHeaders, "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": cache },
    });
  }

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(HEADINGS[resource])}</title>
<style>body{margin:0;padding:12px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}${STYLE}</style>
</head><body><div class="dlh-embed">${renderList(items, resource)}</div></body></html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cache,
      // Einbetten ausdrücklich erlauben – das ist der Zweck.
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
});
