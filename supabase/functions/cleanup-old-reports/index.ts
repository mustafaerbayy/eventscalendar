// @ts-nocheck
/// <reference lib="deno.window" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoff = cutoffDate.toISOString().split("T")[0];

    // Get old reports
    const { data: oldReports, error: fetchError } = await supabaseAdmin
      .from("weekly_reports")
      .select("id, file_url")
      .lt("week_start", cutoff);

    if (fetchError) throw fetchError;
    if (!oldReports || oldReports.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete files from storage
    const filePaths: string[] = [];
    for (const r of oldReports) {
      if (r.file_url) {
        const parts = r.file_url.split("/weekly-reports/");
        if (parts[1]) filePaths.push(parts[1]);
      }
    }
    if (filePaths.length > 0) {
      await supabaseAdmin.storage.from("weekly-reports").remove(filePaths);
    }

    // Delete DB records
    const ids = oldReports.map(r => r.id);
    const { error: deleteError } = await supabaseAdmin
      .from("weekly_reports")
      .delete()
      .in("id", ids);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ deleted: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
