// @ts-nocheck
/// <reference lib="deno.window" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoleRow } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRoleRow || caller.email === "admin@admin.com";
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden: not an admin" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, user_id, email, password, first_name, last_name, new_password } = await req.json();

    if (action === "toggle_report_role") {
      if (!user_id) throw new Error("user_id is required");
      // Check if user already has report_admin role
      const { data: reportRoleRow } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .eq("role", "report_admin")
        .maybeSingle();
      const hasRole = !!reportRoleRow;
      if (hasRole) {
        // Remove role
        const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id).eq("role", "report_admin");
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, has_report_role: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Add role
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id, role: "report_admin" });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, has_report_role: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "list") {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      // Fetch roles without enum-literal filters for backward compatibility.
      const { data: allRoles, error: rolesError } = await supabaseAdmin.from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;
      const reportAdminIds = new Set((allRoles || []).filter((r: any) => String(r.role) === "report_admin").map((r: any) => r.user_id));

      const userList = (users || []).map(u => ({
        id: u.id,
        email: u.email || "",
        first_name: u.user_metadata?.first_name || "",
        last_name: u.user_metadata?.last_name || "",
        created_at: u.created_at,
        has_report_role: reportAdminIds.has(u.id),
      }));

      return new Response(JSON.stringify({ users: userList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!user_id) throw new Error("user_id is required");
      if (user_id === caller.id) throw new Error("Kendinizi silemezsiniz");

      // Delete from auth (cascade will handle profiles)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      if (!email || !password) throw new Error("E-posta ve şifre gereklidir");
      if (password.length < 6) throw new Error("Şifre en az 6 karakter olmalıdır");

      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: (first_name || "").trim(),
          last_name: (last_name || "").trim(),
        },
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!user_id) throw new Error("user_id is required");

      const updateData: any = {};
      if (email && email.trim()) updateData.email = email.trim();
      const pwd = new_password || password;
      if (pwd) {
        if (pwd.length < 6) throw new Error("Şifre en az 6 karakter olmalıdır");
        updateData.password = pwd;
      }
      if (first_name !== undefined || last_name !== undefined) {
        updateData.user_metadata = {};
        if (first_name !== undefined) updateData.user_metadata.first_name = first_name.trim();
        if (last_name !== undefined) updateData.user_metadata.last_name = last_name.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, updateData);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Beklenmeyen bir hata oluştu" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
