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
  statutes_accepted: boolean;
  data_processing_accepted: boolean;
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

// Helvetica nutzt WinAnsi und kann ä ö ü ß abbilden – nur normalisieren.
const safe = (s: string | null | undefined) => (s ?? "").normalize("NFC");

async function getCurrentRate(client: ReturnType<typeof createClient>): Promise<number> {
  try {
    const { data } = await client.rpc("get_current_contribution_rate");
    const n = typeof data === "number" ? data : Number(data);
    if (Number.isFinite(n) && n > 0) return n;
  } catch (_) {/* ignore */}
  return 36;
}

async function buildApplicationPdf(app: Application, rate: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const left = 56;
  const right = 539;
  let y = 800;

  const text = (s: string, opts: { x?: number; size?: number; font?: any; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    page.drawText(safe(s), {
      x: opts.x ?? left,
      y,
      size,
      font: opts.font ?? font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= opts.gap ?? size + 4;
  };

  const wrap = (s: string, size: number, f = font, maxWidth = right - left): string[] => {
    const words = safe(s).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (f.widthOfTextAtSize(t, size) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };

  const para = (s: string, size = 10, f = font, gap = 4) => {
    for (const ln of wrap(s, size, f)) text(ln, { size, font: f, gap: size + gap });
    y -= 2;
  };

  const labelValue = (label: string, value: string, gap = 18) => {
    page.drawText(safe(label), { x: left, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.12) });
    page.drawText(safe(value), { x: left + 150, y, size: 10, font, color: rgb(0.1, 0.1, 0.12) });
    y -= gap;
  };

  const box = (x: number, checked: boolean) => {
    page.drawRectangle({ x, y: y - 1, width: 9, height: 9, borderColor: rgb(0.2, 0.2, 0.22), borderWidth: 0.8 });
    if (checked) {
      page.drawText("x", { x: x + 1.7, y: y + 0.5, size: 9, font: bold, color: rgb(0.1, 0.1, 0.12) });
    }
  };

  const checkboxLine = (items: Array<{ label: string; checked: boolean }>) => {
    let cx = left;
    for (const it of items) {
      box(cx, it.checked);
      page.drawText(safe(it.label), { x: cx + 14, y, size: 10, font, color: rgb(0.1, 0.1, 0.12) });
      cx += 14 + font.widthOfTextAtSize(it.label, 10) + 24;
    }
    y -= 18;
  };

  // ── Header ────────────────────────────────────────────────────────────────
  page.drawText("Diu lebendec histOrje e. v.", { x: left, y, size: 14, font: bold, color: rgb(0.866, 0.6, 0.2) });
  y -= 18;
  text("An: Eric Müller (2. Officiatus)", { size: 9, gap: 12 });
  text("Am Schlosspark 17 – 65203 Wiesbaden", { size: 9, gap: 22 });

  // Trennlinie
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.6, color: rgb(0.85, 0.85, 0.88) });
  y -= 18;

  text("Mitglied werden", { size: 18, font: bold, gap: 24 });

  // ── Anrede ────────────────────────────────────────────────────────────────
  page.drawText("Anrede:", { x: left, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.12) });
  let cx = left + 60;
  for (const opt of ["Herr", "Frau"]) {
    box(cx, app.salutation === opt);
    page.drawText(opt, { x: cx + 14, y, size: 10, font, color: rgb(0.1, 0.1, 0.12) });
    cx += 14 + font.widthOfTextAtSize(opt, 10) + 24;
  }
  y -= 22;

  // ── Persönliche Daten ─────────────────────────────────────────────────────
  labelValue("Name, Vorname:", `${app.last_name}, ${app.first_name}`);
  labelValue("Straße und Hausnr.:", app.street ?? "");
  labelValue("PLZ und Wohnort:", `${app.zip ?? ""} ${app.city ?? ""}`.trim());
  labelValue("Geburtsdatum:", fmtDate(app.birthdate));
  text("(Die Mitgliedschaft ist ab 16 Jahren möglich.)", { x: left + 150, size: 8.5, font: italic, gap: 14 });
  labelValue("E-Mail:", app.email);
  labelValue("Telefon / Handy:", app.phone ?? "", 22);

  // ── Art der Mitgliedschaft ────────────────────────────────────────────────
  page.drawText("Art der Mitgliedschaft:", { x: left, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.12) });
  cx = left + 130;
  const types = [
    { label: "Aktives Mitglied", val: "aktiv" },
    { label: "Fördermitglied", val: "foerder" },
  ];
  for (const t of types) {
    box(cx, app.membership_type === t.val);
    page.drawText(t.label, { x: cx + 14, y, size: 10, font, color: rgb(0.1, 0.1, 0.12) });
    cx += 14 + font.widthOfTextAtSize(t.label, 10) + 24;
  }
  y -= 24;

  // ── Erklärung ─────────────────────────────────────────────────────────────
  para("Ja, ich will Mitglied bei Diu lebendec Histôrje e. V. werden und beantrage hiermit meine Aufnahme!", 10, font, 2);
  para("Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins Diu lebendec Histôrje e. V. an.", 10, font, 2);
  para("Mir ist bekannt, dass die Mitgliedschaft bei Diu lebendec Histôrje e. V. beitragspflichtig ist.", 10, font, 8);

  const rateStr = rate.toFixed(2).replace(".", ",");
  para(`Derzeit beträgt der jährliche Beitragssatz ${rateStr} €.`, 10, bold, 10);

  page.drawText("Der Einzug des Beitrags erfolgt dabei:", { x: left, y, size: 10, font, color: rgb(0.1, 0.1, 0.12) });
  y -= 18;
  checkboxLine([
    { label: "Jährlich", checked: app.contribution_interval === "jaehrlich" },
    { label: "Halbjährlich", checked: app.contribution_interval === "halbjaehrlich" },
  ]);
  y -= 6;

  para("Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig. Das Eintrittsdatum ist das Datum der Unterschrift.", 9, italic, 8);

  // ── Datenschutz ───────────────────────────────────────────────────────────
  para(
    "Der Schutz Deiner personenbezogenen Daten ist Diu lebendec Histôrje e. V. ein besonderes Anliegen. Wir verwenden die in diesem Aufnahmeantrag enthaltenen Angaben einschließlich eventueller Änderungen und Ergänzungen zu Deiner Person ausschließlich zur Erledigung aller im Zusammenhang mit der Mitgliedschaft stehenden Aufgaben im erforderlichen Umfang. Dies betrifft insbesondere die computergestützte Mitgliederbestandsverwaltung, die Mitgliederinformation sowie ggf. den Beitragseinzug. Deine Daten werden nicht an externe Dritte weitergegeben, sondern nur für interne Zwecke verarbeitet und genutzt.",
    8.5, font, 2,
  );
  y -= 8;

  // ── Einverständnis ────────────────────────────────────────────────────────
  const tick = (b: boolean) => (b ? "[x]" : "[ ]");
  text(`${tick(app.statutes_accepted)} Satzung anerkannt`, { size: 9.5, gap: 13 });
  text(`${tick(app.data_processing_accepted)} Datenverarbeitung gemäß Datenschutzerklärung zugestimmt`, { size: 9.5, gap: 22 });

  // ── Digitale Signatur ─────────────────────────────────────────────────────
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.4, color: rgb(0.85, 0.85, 0.88) });
  y -= 16;
  const submitted = fmtDate(app.created_at);
  labelValue("Eingangsdatum:", submitted, 14);
  para("Digitale Antragstellung über das Mitgliedsformular auf www.dilehi.de. Das Eintrittsdatum entspricht dem Datum dieses digitalen Antrags.", 8.5, italic, 2);

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
