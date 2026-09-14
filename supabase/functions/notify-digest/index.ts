import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mitMailversand, seitenAdresse } from "../_shared/mail.ts";
import { baueMail, escapeHtml } from "../_shared/vorlagen.ts";

/**
 * Tägliche Zusammenfassung ungelesener Benachrichtigungen.
 *
 * Die Glocke erreicht nur, wer die Seite ohnehin offen hat. Für alle anderen
 * ist die Mail am Abend der Grund, überhaupt vorbeizuschauen – und damit der
 * eigentliche Hebel gegen WhatsApp.
 *
 * Bewusst eine Sammelmail statt einer Mail je Ereignis: Zehn Einzelmails an
 * einem Abend führen dazu, dass Leute alles abbestellen.
 *
 * Wird von einer geplanten GitHub-Action aufgerufen und mit einem gemeinsamen
 * Geheimnis abgesichert – die Funktion ist ohne Anmeldung erreichbar, weil ein
 * Zeitplandienst keine Sitzung hat.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestItem {
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("DIGEST_SECRET");
  const provided = req.headers.get("x-digest-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Nicht berechtigt" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Erinnerungen an ablaufende Nachweise zuerst anlegen – dann stehen sie in
  // derselben Abendmail. Scheitert das, etwa weil das Modul noch nicht
  // eingespielt ist, geht die Zusammenfassung trotzdem raus.
  const { error: erinnerungsFehler } = await admin.rpc("certificate_reminders");
  if (erinnerungsFehler) console.error("certificate_reminders:", erinnerungsFehler.message);
  const { error: inventarFehler } = await admin.rpc("inventory_reminders");
  if (inventarFehler) console.error("inventory_reminders:", inventarFehler.message);
  const { error: fristenFehler } = await admin.rpc("club_deadline_reminders");
  if (fristenFehler) console.error("club_deadline_reminders:", fristenFehler.message);

  const { data: digests, error } = await admin.rpc("pending_digests");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const siteUrl = await seitenAdresse();
  const rows = (digests ?? []) as { user_id: string; display_name: string; items: DigestItem[] }[];

  let sent = 0;
  const failed: string[] = [];

  // Eine Verbindung fuer alle Empfaenger. Ueber `sendeMail` waere es bei SMTP
  // ein Verbindungsaufbau samt TLS-Handschlag je Mitglied – und viele Anbieter
  // begrenzen die Zahl der Verbindungen je Stunde schaerfer als die Zahl der
  // Nachrichten.
  await mitMailversand(async (sende) => {
    for (const row of rows) {
      // Die Adresse steht in auth.users, nicht im Profil.
      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const list = row.items
        .map(
          (i) => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e7e5e4;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #292524;">${escapeHtml(i.title)}</p>
              ${i.body ? `<p style="margin: 2px 0 0; font-size: 13px; color: #57534e;">${escapeHtml(i.body)}</p>` : ""}
            </td>
          </tr>`
        )
        .join("");

      const count = row.items.length;
      const neuigkeiten = count === 1 ? "eine Neuigkeit" : `${count} Neuigkeiten`;
      const neuigkeitenGross = neuigkeiten.charAt(0).toUpperCase() + neuigkeiten.slice(1);
      const block = `<table cellpadding="0" cellspacing="0" border="0" width="100%">${list}</table>`;

      const { betreff, html } = await baueMail(
        "zusammenfassung",
        { name: row.display_name || "", neuigkeiten, neuigkeitenGross, anzahl: String(count) },
        { block, knopfZiel: `${siteUrl}/intern/forum` }
      );

      try {
        await sende(email, betreff, html);
        // Zeitstempel erst nach erfolgreichem Versand – sonst gehen Meldungen
        // verloren, wenn der Mailversand ausfällt.
        await admin.from("profiles").update({ digest_sent_at: new Date().toISOString() }).eq("id", row.user_id);
        sent++;
      } catch (err) {
        failed.push(`${row.user_id}: ${(err as Error).message}`);
      }
    }
  });

  return new Response(JSON.stringify({ empfaenger: rows.length, versendet: sent, fehler: failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
