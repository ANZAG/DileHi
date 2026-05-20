import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { sendEmailViaMsGraph, escapeHtml, buildEmailWrapper, buildButton } from "../_shared/ms-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Application = {
  id: string;
  salutation: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birthdate: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  membership_type: string;
  contribution_interval: string;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  statutes_accepted: boolean;
  data_processing_accepted: boolean;
  sepa_accepted: boolean;
  created_at: string;
};

const fmtDate = (d: string | null) => {
  if (!d) return "";
  try {
    const x = new Date(d);
    return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`;
  } catch {
    return d ?? "";
  }
};

// Replace common umlauts/special chars that the WinAnsi-encoded standard fonts cannot render.
const safe = (s: string | null | undefined) => (s ?? "").normalize("NFC");

async function buildApplicationPdf(app: Application): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = 800;

  const write = (text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    const f = opts.bold ? fontBold : font;
    page.drawText(safe(text), { x: margin, y, size, font: f, color: rgb(0, 0, 0) });
    y -= (opts.gap ?? size + 4);
  };

  const writeLabelValue = (label: string, value: string) => {
    page.drawText(safe(label), { x: margin, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(safe(value), { x: margin + 160, y, size: 10, font, color: rgb(0, 0, 0) });
    y -= 16;
  };

  // Header
  write("diu lebendec histOrje e. v.", { size: 11, bold: true, gap: 14 });
  write("An: Eric Müller (2. Officiatus)", { size: 9, gap: 11 });
  write("Am Schlosspark 17 – 65203 Wiesbaden", { size: 9, gap: 20 });

  write("Mitglied werden", { size: 16, bold: true, gap: 24 });

  // Personal data
  const anrede = app.salutation || "—";
  writeLabelValue("Anrede:", anrede);
  writeLabelValue("Name, Vorname:", `${app.last_name}, ${app.first_name}`);
  writeLabelValue("Straße und Hausnr.:", app.street ?? "");
  writeLabelValue("PLZ und Wohnort:", `${app.zip ?? ""} ${app.city ?? ""}`.trim());
  writeLabelValue("Geburtsdatum:", fmtDate(app.birthdate));
  writeLabelValue("E-Mail:", app.email);
  writeLabelValue("Telefon / Handy:", app.phone ?? "");

  y -= 8;
  const artLabel = app.membership_type === "foerder" ? "Fördermitglied" : "Aktives Mitglied";
  writeLabelValue("Art der Mitgliedschaft:", artLabel);

  y -= 6;
  write("Ja, ich will Mitglied bei Diu lebendec Histôrje e. V. werden und beantrage hiermit meine Aufnahme.", { size: 9, gap: 12 });
  write("Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins an.", { size: 9, gap: 12 });
  write("Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig ist. Der Jahresbeitrag beträgt 36,00 €.", { size: 9, gap: 16 });

  const interval = app.contribution_interval === "halbjaehrlich" ? "Halbjährlich (2 × 18,00 €)" : "Jährlich (36,00 €)";
  writeLabelValue("Beitragseinzug:", interval);

  y -= 8;
  write("SEPA-Lastschriftmandat", { size: 11, bold: true, gap: 16 });
  writeLabelValue("Kontoinhaber:", app.account_holder ?? "");
  writeLabelValue("IBAN:", app.iban ?? "");
  writeLabelValue("BIC:", app.bic ?? "");

  y -= 10;
  write("Einverständnis", { size: 11, bold: true, gap: 16 });
  const tick = (b: boolean) => (b ? "[x]" : "[ ]");
  write(`${tick(app.statutes_accepted)} Satzung anerkannt`, { size: 10, gap: 14 });
  write(`${tick(app.data_processing_accepted)} Datenverarbeitung gemäß Datenschutzerklärung zugestimmt`, { size: 10, gap: 14 });
  write(`${tick(app.sepa_accepted)} SEPA-Lastschriftmandat erteilt`, { size: 10, gap: 20 });

  write("Datenschutzhinweis: Die Angaben werden ausschließlich für die Mitgliederverwaltung verwendet", { size: 8, gap: 10 });
  write("und nicht an externe Dritte weitergegeben.", { size: 8, gap: 24 });

  // Signature
  const submitted = fmtDate(app.created_at);
  writeLabelValue("Eingangsdatum:", submitted);
  write("Digitale Antragstellung über das Mitgliedsformular auf www.dilehi.de.", { size: 8, gap: 10 });
  write("Das Eintrittsdatum ist das Datum der digitalen Antragstellung.", { size: 8, gap: 10 });

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is Vorstand
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "vorstand")
      .single();
    if (!callerRole) throw new Error("Nur der Vorstand kann Mitglieder einladen");

    const { email, role, applicationId } = await req.json();
    if (!email || !role) throw new Error("E-Mail und Rolle erforderlich");
    if (!["mitglied", "vorstand", "herold", "schatzmeister"].includes(role)) throw new Error("Ungültige Rolle");

    // Optional application context
    let app: Application | null = null;
    if (applicationId) {
      const { data: appData } = await adminClient
        .from("membership_applications")
        .select("*")
        .eq("id", applicationId)
        .single();
      app = appData as Application | null;
    }

    // Check if user already exists by email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;
    let isNewUser = false;
    let confirmUrl: string | null = null;

    const origin = Deno.env.get("SITE_URL") || "https://www.dilehi.de";

    if (existingUser) {
      userId = existingUser.id;
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const { error: roleError } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (roleError) throw roleError;
    } else {
      isNewUser = true;
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { display_name: app ? `${app.first_name} ${app.last_name}` : email.split("@")[0] },
          redirectTo: `${origin}/passwort-zuruecksetzen`,
        },
      });
      if (linkError) throw linkError;
      userId = linkData.user.id;
      const { error: roleError } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (roleError) throw roleError;
      const tokenHash = linkData.properties?.hashed_token;
      confirmUrl = `${origin}/passwort-zuruecksetzen?token_hash=${tokenHash}&type=invite`;
    }

    // If we have an application, pre-fill the profile and attach the generated PDF
    if (app) {
      // Profile update
      const today = new Date().toISOString().slice(0, 10);
      await adminClient.from("profiles").update({
        display_name: `${app.first_name} ${app.last_name}`,
        salutation: app.salutation,
        first_name: app.first_name,
        last_name: app.last_name,
        phone: app.phone,
        birthdate: app.birthdate,
        street: app.street,
        zip: app.zip,
        city: app.city,
        membership_type: app.membership_type,
        contribution_interval: app.contribution_interval,
        entry_date: today,
        is_active: true,
        exit_date: null,
      }).eq("id", userId);

      // Generate PDF and store
      try {
        const pdfBytes = await buildApplicationPdf(app);
        const fileName = `Mitgliedsantrag_${app.last_name}_${app.first_name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `membership/${userId}/${Date.now()}_${fileName}`;
        const { error: upErr } = await adminClient.storage
          .from("internal-files")
          .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
        if (!upErr) {
          await adminClient.from("membership_files").insert({
            user_id: userId,
            name: fileName,
            storage_path: storagePath,
            uploaded_by: user.id,
          });
        } else {
          console.error("PDF upload failed:", upErr.message);
        }
      } catch (pdfErr) {
        console.error("PDF generation failed:", pdfErr);
      }

      // Mark application as created_user_id
      await adminClient
        .from("membership_applications")
        .update({ created_user_id: userId })
        .eq("id", app.id);
    }

    const roleLabel: Record<string, string> = {
      mitglied: "Mitglied",
      vorstand: "Vorstand",
      herold: "Herold",
      schatzmeister: "Schatzmeister",
    };

    if (isNewUser && confirmUrl) {
      const htmlBody = buildEmailWrapper(`
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e;">Einladung</p>
        <p style="margin: 0 0 20px; font-size: 20px; font-family: Georgia, serif; color: #1c1917; font-weight: bold;">Willkommen im Mitgliederbereich</p>
        <p style="margin: 0 0 16px; line-height: 1.7;">
          Du wurdest als <strong>${escapeHtml(roleLabel[role] || role)}</strong> zum internen Bereich von
          Diu lebendec Histôrje e.V. eingeladen.
        </p>
        <p style="margin: 0 0 8px; line-height: 1.7;">
          Klicke auf den folgenden Button, um dein Konto zu aktivieren und ein Passwort zu setzen:
        </p>
        ${buildButton(confirmUrl, "Konto aktivieren")}
        <p style="font-size: 12px; color: #a8a29e; line-height: 1.6;">
          Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
          <a href="${confirmUrl}" style="color: #dd9933; word-break: break-all;">${escapeHtml(confirmUrl)}</a>
        </p>
      `);
      try {
        await sendEmailViaMsGraph(email, "Einladung – Diu lebendec Histôrje e.V.", htmlBody);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("invite-member error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
