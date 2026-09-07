import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaMsGraph, buildEmailWrapper, buildButton } from "../_shared/ms-email.ts";
import { requirePermission, requireValidRole } from "../_shared/authz.ts";

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

    await requirePermission(
      adminClient,
      user.id,
      "members.manage",
      "Keine Berechtigung, Mitglieder zu verwalten"
    );

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
      // Toggle login access: ban deactivated users so they cannot log in
      if (isActive === false) {
        try {
          await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
        } catch (e) {
          console.error("ban_user failed:", e);
        }
      } else if (isActive === true) {
        try {
          await adminClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
        } catch (e) {
          console.error("unban_user failed:", e);
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      if (!userId || !role) throw new Error("userId und role erforderlich");
      await requireValidRole(adminClient, role);
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

      const origin = Deno.env.get("SITE_URL") || "https://www.dilehi.de";
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
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e;">Sicherheit</p>
        <p style="margin: 0 0 20px; font-size: 20px; font-family: Georgia, serif; color: #1c1917; font-weight: bold;">Passwort zurücksetzen</p>
        <p style="margin: 0 0 16px; line-height: 1.7;">
          Dein Passwort für den Mitgliederbereich von Diu lebendec Histôrje e.V. wurde zurückgesetzt.
        </p>
        <p style="margin: 0 0 8px; line-height: 1.7;">
          Klicke auf den folgenden Button, um ein neues Passwort zu setzen:
        </p>
        ${buildButton(resetUrl, "Neues Passwort setzen")}
        <p style="font-size: 12px; color: #a8a29e; line-height: 1.6;">
          Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
          <a href="${resetUrl}" style="color: #dd9933; word-break: break-all;">${resetUrl}</a>
        </p>
      `);

      try {
        await sendEmailViaMsGraph(userData.user.email, "Passwort zurücksetzen – Diu lebendec Histôrje e.V.", htmlBody);
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

      // Mitgliedsanträge des Nutzers (per created_user_id oder per E-Mail) löschen
      await adminClient.from("membership_applications").delete().eq("created_user_id", userId);
      try {
        const { data: u } = await adminClient.auth.admin.getUserById(userId);
        const email = u?.user?.email;
        if (email) {
          await adminClient
            .from("membership_applications")
            .delete()
            .ilike("email", email);
        }
      } catch (e) {
        console.error("application cleanup by email failed:", e);
      }

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
