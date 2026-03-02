// @ts-nocheck
/// <reference lib="deno.window" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

class Resend {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async sendEmail(params: { from: string; to: string[]; subject: string; html: string }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json() };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Admin access required");

    const { subject, body, recipientIds } = await req.json();

    if (!subject || !body || !recipientIds?.length) {
      throw new Error("Missing required fields: subject, body, recipientIds");
    }

    // Get user emails from auth admin
    const recipients: { id: string; email: string }[] = [];
    for (const uid of recipientIds) {
      const { data } = await supabase.auth.admin.getUserById(uid);
      if (data?.user?.email) {
        recipients.push({ id: uid, email: data.user.email });
      }
    }

    if (recipients.length === 0) {
      throw new Error("No valid recipients found");
    }

    // Create announcement record
    const { data: announcement, error: annError } = await supabase
      .from("announcements")
      .insert({
        subject,
        body,
        sent_by: user.id,
        recipient_count: recipients.length,
      })
      .select("id")
      .single();

    if (annError) throw new Error("Failed to create announcement: " + annError.message);

    const resend = new Resend(RESEND_API_KEY);
    const results: { userId: string; email: string; status: string }[] = [];

    for (const recipient of recipients) {
      try {
        await resend.sendEmail({
          from: "Refik Keşif <noreply@refikkesifinsa.online>",
          to: [recipient.email],
          subject,
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
              <h1 style="color: #2d3561; font-size: 24px; margin-bottom: 20px;">${subject}</h1>
              <div style="color: #333; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${body}</div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">Bu e-posta Refik, Keşif ve İnşa platformu tarafından gönderilmiştir.</p>
            </div>
          `,
        });
        results.push({ userId: recipient.id, email: recipient.email, status: "sent" });
      } catch (err) {
        console.error(`Failed to send to ${recipient.email}:`, err);
        results.push({ userId: recipient.id, email: recipient.email, status: "failed" });
      }
    }

    // Log recipients
    const recipientLogs = results.map((r) => ({
      announcement_id: announcement.id,
      user_id: r.userId,
      email: r.email,
      status: r.status,
    }));

    await supabase.from("announcement_recipients").insert(recipientLogs);

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount, announcementId: announcement.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-announcement:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
