import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendeMail, seitenAdresse } from "../_shared/mail.ts";
import { baueMail } from "../_shared/vorlagen.ts";
import { requirePermission, requireValidRole } from "../_shared/authz.ts";

// Mitglieder aus einer Liste anlegen.
//
// Die Oberfläche liest und prüft die Datei; hier entstehen nur die Konten.
// Anders als „Einladen" für eine einzelne Person:
//   * Wer schon ein Konto hat, wird übersprungen – nicht umgerollt. Eine
//     Liste vom Kassenwart soll niemandem die Vorstandsrolle nehmen.
//   * Keine Willkommensmail je Person mit Kopie an den Vorstand – bei hundert
//     Zeilen wären das hundert Mails im Vereinspostfach.
//   * Die Einladung per Mail ist wählbar. Ohne sie setzen Mitglieder ihr
//     Passwort über „Passwort vergessen", sobald der Verein Bescheid gibt.
// Höchstens 50 Zeilen je Aufruf, damit kein Aufruf in die Zeitgrenze läuft;
// die Oberfläche schickt die Liste in Teilen.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOECHSTENS = 50;
const TEXTFELDER = ["salutation", "first_name", "last_name", "street", "zip", "city", "phone"] as const;
const DATUMSFELDER = ["birthdate", "entry_date"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Zeile = Partial<Record<(typeof TEXTFELDER)[number] | (typeof DATUMSFELDER)[number] | "membership_type", string | null>> & {
  email?: string;
};

type Ergebnis =
  | { email: string; status: "created"; userId: string; warning?: string }
  | { email: string; status: "exists" }
  | { email: string; status: "error"; message: string };

const antwort = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await requirePermission(adminClient, user.id, "members.manage", "Keine Berechtigung, Mitglieder zu importieren");

    const { rows, role, invite } = (await req.json()) as { rows?: Zeile[]; role?: string; invite?: boolean };
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Keine Zeilen übergeben");
    if (rows.length > HOECHSTENS) throw new Error(`Höchstens ${HOECHSTENS} Zeilen je Aufruf`);
    if (!role) throw new Error("Rolle erforderlich");
    await requireValidRole(adminClient, role);

    // Alle vorhandenen Adressen auf einmal – statt einer Anfrage je Zeile.
    const vorhanden = new Set<string>();
    for (let seite = 1; seite <= 20; seite++) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: seite, perPage: 1000 });
      if (error) throw error;
      for (const u of data?.users ?? []) if (u.email) vorhanden.add(u.email.toLowerCase());
      if ((data?.users ?? []).length < 1000) break;
    }

    const { data: arten } = await adminClient.from("contribution_categories").select("key");
    const mitgliedsarten = new Set((arten ?? []).map((a: { key: string }) => a.key));

    let rollenName = role;
    let origin = "";
    if (invite) {
      origin = await seitenAdresse();
      const { data: katalog } = await adminClient.from("role_catalog").select("label").eq("key", role).maybeSingle();
      rollenName = (katalog as { label?: string } | null)?.label || role;
    }

    const ergebnisse: Ergebnis[] = [];
    for (const z of rows) {
      const email = String(z.email ?? "").trim().toLowerCase();
      try {
        if (!EMAIL.test(email)) throw new Error("Keine gültige E-Mail-Adresse");
        if (vorhanden.has(email)) {
          ergebnisse.push({ email, status: "exists" });
          continue;
        }

        const name = [z.first_name, z.last_name].map((s) => String(s ?? "").trim()).filter(Boolean).join(" ") || email.split("@")[0];
        let userId: string;
        let link: string | null = null;

        if (invite) {
          const { data, error } = await adminClient.auth.admin.generateLink({
            type: "invite",
            email,
            options: { data: { display_name: name }, redirectTo: `${origin}/passwort-zuruecksetzen` },
          });
          if (error) throw error;
          userId = data.user.id;
          link = `${origin}/passwort-zuruecksetzen?token_hash=${data.properties?.hashed_token}&type=invite`;
        } else {
          const { data, error } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { display_name: name },
          });
          if (error) throw error;
          userId = data.user.id;
        }
        vorhanden.add(email);

        const { error: rollenFehler } = await adminClient.from("user_roles").insert({ user_id: userId, role });
        if (rollenFehler) throw rollenFehler;

        // Das Profil legt ein Trigger beim Anlegen des Kontos an.
        const profil: Record<string, unknown> = { display_name: name, is_active: true };
        for (const f of TEXTFELDER) {
          const w = z[f];
          if (typeof w === "string" && w.trim()) profil[f] = w.trim().slice(0, 500);
        }
        for (const f of DATUMSFELDER) {
          const w = z[f];
          if (typeof w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w)) profil[f] = w;
        }
        if (typeof z.membership_type === "string" && mitgliedsarten.has(z.membership_type)) {
          profil.membership_type = z.membership_type;
        }

        const warnungen: string[] = [];
        const { error: profilFehler } = await adminClient.from("profiles").update(profil).eq("id", userId);
        if (profilFehler) warnungen.push(`Profilangaben nicht übernommen: ${profilFehler.message}`);

        if (link) {
          try {
            const { betreff, html } = await baueMail("einladung", { rolle: rollenName }, { knopfZiel: link });
            await sendeMail(email, betreff, html);
          } catch (mailFehler) {
            console.error("import-members: Einladung nicht verschickt", mailFehler);
            warnungen.push("Einladung nicht verschickt");
          }
        }

        ergebnisse.push({ email, status: "created", userId, ...(warnungen.length ? { warning: warnungen.join("; ") } : {}) });
      } catch (fehler) {
        ergebnisse.push({ email, status: "error", message: fehler instanceof Error ? fehler.message : String(fehler) });
      }
    }

    return antwort({ results: ergebnisse });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("import-members error:", message);
    return antwort({ error: message }, 400);
  }
});
