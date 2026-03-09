import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaMsGraph, buildEmailWrapper } from "../_shared/ms-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!callerRole) throw new Error("Nur der Vorstand kann Mitglieder verwalten");

    const body = await req.json();
    const { action, userId, displayName, role, email, entryDate, exitDate, isActive } = body;

    if (action === "get_emails") {
      const userIds: string[] = body.userIds || [];
      const result: Record<string, string> = {};
      for (const uid of userIds) {
        const { data: u } = await adminClient.auth.admin.getUserById(uid);
        if (u?.user?.email) result[uid] = u.user.email;
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      if (!userId) throw new Error("userId erforderlich");
      if (displayName) {
        await adminClient.from("profiles").update({ display_name: displayName }).eq("id", userId);
      }
      if (email) {
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_membership") {
      if (!userId) throw new Error("userId erforderlich");
      const updates: Record<string, any> = {};
      if (entryDate !== undefined) updates.entry_date = entryDate;
      if (exitDate !== undefined) updates.exit_date = exitDate;
      if (isActive !== undefined) updates.is_active = isActive;
      if (Object.keys(updates).length > 0) {
        const { error } = await adminClient.from("profiles").update(updates).eq("id", userId);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      if (!userId || !role) throw new Error("userId und role erforderlich");
      if (!["mitglied", "vorstand", "herold", "schatzmeister"].includes(role)) throw new Error("Ungültige Rolle");
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const { error } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      if (!userId) throw new Error("userId erforderlich");
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
      if (userError || !userData?.user?.email) throw new Error("Benutzer nicht gefunden");

      const origin = Deno.env.get("SITE_URL") || "https://test.dilehi.de";
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: userData.user.email,
        options: {
          redirectTo: `${origin}/passwort-zuruecksetzen`,
        },
      });
      if (linkError) throw linkError;

      const tokenHash = linkData.properties?.hashed_token;
      const resetUrl = `${origin}/passwort-zuruecksetzen?token_hash=${tokenHash}&type=recovery`;

      const htmlBody = buildEmailWrapper(`
        <h2 style="color: #1a1a1a; margin: 0 0 16px;">Passwort zurücksetzen</h2>
        <p style="color: #555; line-height: 1.6;">
          Dein Passwort für den Mitgliederbereich von <strong>Die Lebendige Historie e.V.</strong> wurde zurückgesetzt.
        </p>
        <p style="color: #555; line-height: 1.6;">
          Klicke auf den folgenden Button, um ein neues Passwort zu setzen:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Neues Passwort setzen
          </a>
        </div>
        <p style="font-size: 13px; color: #999;">
          Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
          <a href="${resetUrl}" style="color: #666; word-break: break-all;">${resetUrl}</a>
        </p>
      `);

      try {
        await sendEmailViaMsGraph(userData.user.email, "Passwort zurücksetzen – Die Lebendige Historie e.V.", htmlBody);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }

      return new Response(JSON.stringify({ success: true, email: userData.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const reassignToUserId = body.reassignToUserId;
      if (!userId || !reassignToUserId) throw new Error("userId und reassignToUserId erforderlich");

      // Reassign all linked records to the target user
      const tablesToReassign = [
        { table: "announcements", column: "created_by" },
        { table: "announcement_replies", column: "created_by" },
        { table: "sources", column: "created_by" },
        { table: "source_folders", column: "created_by" },
        { table: "events", column: "created_by" },
        { table: "documents", column: "uploaded_by" },
        { table: "gallery_images", column: "created_by" },
        { table: "epoch_sources", column: "created_by" },
        { table: "election_groups", column: "created_by" },
        { table: "elections", column: "created_by" },
      ];

      for (const { table, column } of tablesToReassign) {
        await adminClient
          .from(table)
          .update({ [column]: reassignToUserId })
          .eq(column, userId);
      }

      // Delete user's own data that shouldn't be transferred
      await adminClient.from("event_attendees").delete().eq("user_id", userId);
      await adminClient.from("votes").delete().eq("voter_id", userId);
      await adminClient.from("group_members").delete().eq("user_id", userId);
      await adminClient.from("membership_files").delete().eq("user_id", userId);
      await adminClient.from("contributions").delete().eq("user_id", userId);

      // Remove roles
      await adminClient.from("user_roles").delete().eq("user_id", userId);

      // Delete profile
      await adminClient.from("profiles").delete().eq("id", userId);

      // Delete auth user
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteErr) throw deleteErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unbekannte Aktion");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
