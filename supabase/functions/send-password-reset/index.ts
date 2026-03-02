// @ts-nocheck
/// <reference lib="deno.window" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
class Resend {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  emails = {
    send: async (params: { from: string; to: string[]; subject: string; html: string }) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) { const text = await res.text(); return { error: new Error(text) }; }
      return { data: await res.json(), error: null };
    }
  };
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl } = await req.json();
    if (!email) throw new Error("E-posta adresi gerekli");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://refikkesifinsa.online/sifre-sifirla",
      },
    });

    if (error) throw error;

    const resetUrl = data?.properties?.action_link;
    if (!resetUrl) throw new Error("Sıfırlama bağlantısı oluşturulamadı");

    // Send email via Resend
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
    const expiresAtStr = expiresAt.toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const { error: emailError } = await resend.emails.send({
      from: "Refik Keşif <info@refikkesifinsa.online>",
      to: [email],
      subject: "Şifrenizi Sıfırlayın - Refik Keşif",
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Inter',Arial,sans-serif;">
            <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:hsl(220,20%,12%);margin-bottom:8px;">
                Şifre Sıfırlama
              </h1>
              <p style="font-size:15px;color:hsl(220,10%,46%);line-height:1.6;margin-bottom:24px;">
                Hesabınız için şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.
              </p>
              <a href="${resetUrl}" 
                 style="display:inline-block;background-color:hsl(235,35%,32%);color:hsl(40,20%,97%);text-decoration:none;padding:14px 32px;border-radius:0.75rem;font-size:15px;font-weight:600;">
                Şifremi Sıfırla
              </a>
              <p style="font-size:13px;color:hsl(220,10%,46%);line-height:1.6;margin-top:24px;">
                ⏳ Bu bağlantı <strong>${expiresAtStr}</strong> tarihine kadar geçerlidir (1 saat).
              </p>
              <p style="font-size:13px;color:hsl(220,10%,46%);line-height:1.6;margin-top:16px;">
                Bu isteği siz yapmadıysanız, bu e-postayı güvenle görmezden gelebilirsiniz.
              </p>
              <hr style="border:none;border-top:1px solid hsl(40,15%,88%);margin:32px 0 16px;" />
              <p style="font-size:12px;color:hsl(220,10%,46%);">
                Refik Keşif — refikkesifinsa.online
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) throw emailError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
