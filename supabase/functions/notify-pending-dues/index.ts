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
    "authorization, x-client-info, apikey, content-type",
};

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read request body to check if recipientIds override is passed
    let recipientIds: string[] | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.clone().json();
        if (body && Array.isArray(body.recipientIds)) {
          recipientIds = body.recipientIds;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(RESEND_API_KEY);

    // 1. Fetch pending transactions
    const { data: pendingTx, error: pendingError } = await supabase
      .from("pending_dues_transactions")
      .select("id, user_id, month, year, amount, action_type, created_at")
      .eq("status", "pending");

    if (pendingError) throw new Error("Failed to fetch pending transactions: " + pendingError.message);

    // If no pending transactions, exit early
    if (!pendingTx || pendingTx.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending transactions, no email sent.", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get user profiles for the pending transactions
    const userIds = [...new Set(pendingTx.map((tx) => tx.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    const profileMap: Record<string, { first_name: string; last_name: string }> = {};
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = { first_name: p.first_name || "", last_name: p.last_name || "" };
      }
    }

    // 3. Find budget admins: users with 'admin' or 'manage_budget' role
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "manage_budget"]);

    const adminUserIds = new Set<string>();
    if (adminRoles) {
      for (const r of adminRoles) {
        adminUserIds.add(r.user_id);
      }
    }

    // Also check for admin@admin.com user
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    if (allUsers?.users) {
      for (const u of allUsers.users) {
        if (u.email === "admin@admin.com") {
          adminUserIds.add(u.id);
        }
      }
    }

    // Filter adminUserIds if manual recipient list is provided
    if (recipientIds) {
      const filtered = new Set<string>();
      for (const id of recipientIds) {
        if (adminUserIds.has(id)) {
          filtered.add(id);
        }
      }
      adminUserIds.clear();
      filtered.forEach(id => adminUserIds.add(id));
    }

    if (adminUserIds.size === 0) {
      return new Response(
        JSON.stringify({ message: "No budget admins found.", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get admin emails
    const adminRecipients: { id: string; email: string; name: string }[] = [];
    for (const adminId of adminUserIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(adminId);
      if (userData?.user?.email) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", adminId)
          .maybeSingle();
        adminRecipients.push({
          id: adminId,
          email: userData.user.email,
          name: adminProfile ? `${adminProfile.first_name || ""} ${adminProfile.last_name || ""}`.trim() : "Admin",
        });
      }
    }

    if (adminRecipients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin emails found.", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Build the email HTML
    const siteUrl = "https://www.refik.online";
    const txCount = pendingTx.length;

    const transactionRows = pendingTx.map((tx) => {
      const p = profileMap[tx.user_id];
      const userName = p ? `${p.first_name} ${p.last_name}`.trim() : "Bilinmeyen Kullanıcı";
      const monthName = monthNames[tx.month - 1] || tx.month;
      const actionLabel = tx.action_type === "mark_paid" ? "Ödendi İşaretleme" : "Ödeme Kaldırma";
      const actionColor = tx.action_type === "mark_paid" ? "#10b981" : "#ef4444";
      const createdDate = new Date(tx.created_at).toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      });

      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333;">
            <strong>${userName}</strong>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #555;">
            ${monthName} ${tx.year}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #555;">
            ₺${Number(tx.amount).toLocaleString("tr-TR")}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: ${actionColor}; background: ${actionColor}15;">
              ${actionLabel}
            </span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #999;">
            ${createdDate}
          </td>
        </tr>
      `;
    }).join("");

    const emailHtml = `
      <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 800;">
            ⏳ Bekleyen Aidat İşlemleri
          </h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">
            Onayınızı bekleyen <strong>${txCount}</strong> adet işlem bulunmaktadır
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 30px; border: 1px solid #f0f0f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            Merhaba, aidat takip sisteminde onay bekleyen işlemler bulunmaktadır. Lütfen aşağıdaki işlemleri inceleyerek onaylayın veya reddedin.
          </p>

          <!-- Transactions Table -->
          <div style="overflow-x: auto; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #fafafa;">
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0;">Kullanıcı</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0;">Dönem</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0;">Tutar</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0;">İşlem</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0;">Tarih</th>
                </tr>
              </thead>
              <tbody>
                ${transactionRows}
              </tbody>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${siteUrl}/butce" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 800; text-decoration: none; border-radius: 12px; font-size: 15px; letter-spacing: 0.3px;">
              İşlemleri İncele ve Onayla
            </a>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Bu işlemleri <a href="${siteUrl}/butce" style="color: #f59e0b; text-decoration: none; font-weight: 600;">Bütçe Yönetimi</a> sayfasından yönetebilirsiniz.
          </p>

          <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 28px 0 16px 0;" />
          <p style="color: #bbb; font-size: 11px; text-align: center; margin: 0;">
            Bu e-posta Refik, Keşif ve İnşa platformu tarafından otomatik olarak gönderilmiştir.
          </p>
        </div>
      </div>
    `;

    // 6. Send emails to all budget admins
    let totalSent = 0;
    let totalFailed = 0;

    for (const admin of adminRecipients) {
      try {
        await resend.sendEmail({
          from: "Refik Keşif <noreply@refik.online>",
          to: [admin.email],
          subject: `⏳ ${txCount} Bekleyen Aidat İşlemi — Onayınız Bekleniyor`,
          html: emailHtml,
        });
        totalSent++;
        console.log(`Pending dues notification sent to: ${admin.email}`);
      } catch (emailErr) {
        console.error(`Failed to send to ${admin.email}:`, emailErr);
        totalFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pendingCount: txCount,
        sent: totalSent,
        failed: totalFailed,
        recipients: adminRecipients.map(a => a.email),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-pending-dues:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
