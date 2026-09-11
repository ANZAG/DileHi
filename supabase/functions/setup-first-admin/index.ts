import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendeMail, seitenAdresse } from "../_shared/mail.ts";
import { marke } from "../_shared/einstellungen.ts";

/**
 * Das erste Konto einer frischen Installation.
 *
 * Ein Henne-Ei-Problem: Mitglieder werden über die Verwaltung eingeladen, in
 * die Verwaltung kommt nur, wer Rechte hat, und Rechte vergibt nur die
 * Verwaltung. In einer leeren Datenbank gibt es keinen Weg hinein – man müsste
 * von Hand eine Zeile in `user_roles` schreiben.
 *
 * Diese Funktion ist dieser eine Weg. Sie ist bewusst dreifach abgesichert,
 * denn wer sie missbraucht, bekommt die vollständige Kontrolle:
 *
 *   1. Sie braucht das Geheimnis SETUP_SECRET. Ist es nicht gesetzt, tut sie
 *      gar nichts – kein Standardwert, keine Ausnahme.
 *   2. Sie arbeitet nur, solange es KEIN einziges Konto mit Rollen gibt.
 *      Danach ist sie für immer stumm, ohne dass jemand sie abschalten muss.
 *   3. Sie vergibt keine frei gewählte Rolle, sondern die, die im
 *      Rechtekatalog `roles.manage` trägt. Gibt es die nicht, bricht sie ab
 *      statt sich etwas auszudenken.
 *
 * Nach dem ersten erfolgreichen Aufruf kann SETUP_SECRET gelöscht werden. Muss
 * es aber nicht: Punkt 2 hält auch ohne.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const antwort = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Wohin der Einladungslink zeigt.
 *
 * Sonst kommt die Adresse aus SITE_URL oder aus den Vereinsangaben. In einer
 * frischen Installation gibt es beides nicht: Die Website trägt man unter
 * Erscheinungsbild ein, und dahin kommt man erst mit dem Zugang, den diese
 * Funktion gerade anlegen soll. Der erste Anlauf brach genau hier ab.
 *
 * Also die Seite, von der aus /einrichtung aufgerufen wurde. Sie wird
 * zugleich in die Vereinsangaben geschrieben, damit auch die Einladungen
 * danach einen Link haben. Nur wenn dort noch nichts steht, und später
 * jederzeit unter Erscheinungsbild zu ändern.
 *
 * Die Herkunft einer Anfrage lässt sich fälschen. Hier schadet das nicht: Wer
 * sie fälscht, kennt das Geheimnis schon und schickt den Link an sich selbst.
 */
async function adresseDerSeite(
  admin: ReturnType<typeof createClient>,
  req: Request
): Promise<string> {
  try {
    return await seitenAdresse();
  } catch {
    // weiter unten
  }

  const herkunft = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  let adresse: URL;
  try {
    adresse = new URL(herkunft);
  } catch {
    throw new Error(
      "Keine Web-Adresse bekannt. SITE_URL setzen oder die Einrichtung über die Website aufrufen."
    );
  }
  const lokal = adresse.hostname === "localhost" || adresse.hostname === "127.0.0.1";
  if (adresse.protocol !== "https:" && !lokal) {
    throw new Error("Die Einrichtung geht nur über https.");
  }

  await admin
    .from("app_settings")
    .update({ website_url: adresse.origin })
    .eq("id", true)
    .is("website_url", null);

  return adresse.origin;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const geheimnis = Deno.env.get("SETUP_SECRET");
    if (!geheimnis) {
      // Kein Geheimnis hinterlegt heisst: Diese Installation wünscht den Weg
      // nicht. Absichtlich dieselbe Antwort wie bei falschem Geheimnis –
      // sonst verrät die Antwort, ob es überhaupt eingerichtet ist.
      return antwort(403, { error: "Nicht möglich." });
    }

    const { email, secret, name } = await req.json().catch(() => ({}));
    if (secret !== geheimnis) return antwort(403, { error: "Nicht möglich." });
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return antwort(400, { error: "E-Mail-Adresse fehlt." });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── Nur solange niemand da ist ──────────────────────────────────────────
    const { count, error: zaehlFehler } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if (zaehlFehler) throw zaehlFehler;
    if ((count ?? 0) > 0) {
      return antwort(409, {
        error:
          "Es gibt bereits Mitglieder mit Rollen. Weitere Konten legt die Verwaltung an.",
      });
    }

    // ── Welche Rolle darf Rechte vergeben? ──────────────────────────────────
    //
    // Nicht „vorstand" fest im Code: In einer Installation, die ihre Rollen
    // selbst benennt, gibt es die vielleicht gar nicht. Massgeblich ist, wer
    // `roles.manage` hat – ohne dieses Recht käme man aus der ersten
    // Einrichtung nicht wieder heraus.
    const { data: rechte, error: rechteFehler } = await admin
      .from("role_permissions")
      .select("role")
      .eq("permission", "roles.manage")
      .eq("granted", true);
    if (rechteFehler) throw rechteFehler;

    const kandidaten = [...new Set((rechte ?? []).map((r) => r.role as string))];
    if (kandidaten.length === 0) {
      return antwort(500, {
        error:
          "Keine Rolle hat das Recht „roles.manage“. Die Startdaten der Datenbank sind unvollständig.",
      });
    }

    // Bei mehreren die im Katalog oberste – dieselbe Reihenfolge, die auch die
    // Verwaltung anzeigt.
    const { data: katalog } = await admin
      .from("role_catalog")
      .select("key, label, sort_order")
      .in("key", kandidaten)
      .order("sort_order");
    const rolle = katalog?.[0]?.key ?? kandidaten[0];

    // ── Konto anlegen und einladen ──────────────────────────────────────────
    const { data: vorhandene } = await admin.auth.admin.listUsers();
    const schonDa = vorhandene?.users?.find((u) => u.email === email);

    const ziel = await adresseDerSeite(admin, req);
    let userId: string;
    let einladung: string | null = null;

    if (schonDa) {
      // Kann vorkommen: Jemand hat sich registriert, bevor Rollen vergeben
      // wurden. Dann fehlt nur die Rolle.
      userId = schonDa.id;
    } else {
      const { data: link, error: linkFehler } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { display_name: name || email.split("@")[0] },
          redirectTo: `${ziel}/passwort-zuruecksetzen`,
        },
      });
      if (linkFehler) throw linkFehler;
      userId = link.user.id;
      einladung = `${ziel}/passwort-zuruecksetzen?token_hash=${link.properties?.hashed_token}&type=invite`;
    }

    const { error: rolleFehler } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: rolle });
    if (rolleFehler) throw rolleFehler;

    // ── Bescheid geben ──────────────────────────────────────────────────────
    //
    // Der Mailweg ist in einer frischen Installation oft noch nicht
    // eingerichtet. Deshalb steht der Einladungslink auch in der Antwort: Wer
    // die Funktion aufruft, kann ihn von Hand weitergeben.
    let mailVersandt = false;
    if (einladung) {
      try {
        const m = await marke();
        await sendeMail(
          email,
          `${m.org_short_name}: Zugang einrichten`,
          `<p>Für dich wurde der erste Verwaltungszugang zu ${m.org_name} eingerichtet.</p>` +
            `<p><a href="${einladung}">Passwort festlegen und anmelden</a></p>` +
            `<p>Der Link gilt einmalig.</p>`
        );
        mailVersandt = true;
      } catch {
        // Kein Abbruch: Das Konto steht, nur die Nachricht ging nicht raus.
        mailVersandt = false;
      }
    }

    return antwort(200, {
      ok: true,
      rolle,
      mailVersandt,
      einladung,
      hinweis: mailVersandt
        ? "Einladung verschickt."
        : "Mailversand nicht möglich – gib den Link von Hand weiter.",
    });
  } catch (e) {
    return antwort(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
