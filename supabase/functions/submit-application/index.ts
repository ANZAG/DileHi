import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Minimum time (ms) a real human needs to fill out the form.
// Submissions faster than this are almost certainly bots.
const MIN_FILL_MS = 3000;

const BodySchema = z.object({
  // Honeypot field – must stay empty. Bots tend to fill every input.
  website: z.string().optional().default(""),
  // Client timestamp (ms) of when the form was rendered.
  rendered_at: z.number().optional(),
  salutation: z.string().max(20).optional().nullable(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  birthdate: z.string().max(20).optional().nullable(),
  street: z.string().trim().min(1).max(200),
  zip: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
  membership_type: z.enum(["aktiv", "foerder"]),
  contribution_interval: z.enum(["jaehrlich", "halbjaehrlich"]),
  statutes_accepted: z.literal(true),
  data_processing_accepted: z.literal(true),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Bitte fülle alle Pflichtfelder korrekt aus." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const data = parsed.data;

    // ── Bot checks ──────────────────────────────────────────────
    // 1) Honeypot: hidden field must be empty.
    if (data.website && data.website.trim().length > 0) {
      // Pretend success so bots don't learn the trick.
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Timing: form submitted suspiciously fast.
    if (typeof data.rendered_at === "number") {
      const elapsed = Date.now() - data.rendered_at;
      if (elapsed >= 0 && elapsed < MIN_FILL_MS) {
        return new Response(
          JSON.stringify({ error: "Bitte versuche es gleich noch einmal." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("membership_applications").insert({
      salutation: data.salutation || null,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      birthdate: data.birthdate || null,
      street: data.street.trim(),
      zip: data.zip.trim(),
      city: data.city.trim(),
      membership_type: data.membership_type,
      contribution_interval: data.contribution_interval,
      statutes_accepted: data.statutes_accepted,
      data_processing_accepted: data.data_processing_accepted,
      status: "pending",
    });

    if (error) {
      console.error("Insert failed:", error);
      return new Response(
        JSON.stringify({ error: "Antrag konnte nicht gespeichert werden." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: "Unbekannter Fehler." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
