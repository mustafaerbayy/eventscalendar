// @ts-nocheck
/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Offset definitions: key matches profile column, value is offset in milliseconds
const OFFSETS: Record<string, { ms: number; label: string }> = {
  reminder_2h: { ms: 2 * 60 * 60 * 1000, label: "2 saat" },
  reminder_1d: { ms: 24 * 60 * 60 * 1000, label: "1 gün" },
  reminder_2d: { ms: 2 * 24 * 60 * 60 * 1000, label: "2 gün" },
  reminder_3d: { ms: 3 * 24 * 60 * 60 * 1000, label: "3 gün" },
  reminder_1w: { ms: 7 * 24 * 60 * 60 * 1000, label: "1 hafta" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(RESEND_API_KEY);

    const now = new Date();
    let totalSent = 0;
    let totalFailed = 0;

    // Get all future events with their RSVPs (attending only)
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, date, time, description, cities(name), venues(name)")
      .gte("date", now.toISOString().split("T")[0]);

    if (eventsError) throw new Error("Failed to fetch events: " + eventsError.message);
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events", sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const event of events) {
      // Build event datetime in Turkey timezone (UTC+3)
      // Events are stored in local Turkey time, so we need to parse them as Turkey time
      const eventDateTime = new Date(`${event.date}T${event.time}+03:00`);
      const msUntilEvent = eventDateTime.getTime() - now.getTime();

      // Skip past events
      if (msUntilEvent < 0) continue;

      // Get RSVPs for this event (attending only)
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "attending");

      if (!rsvps || rsvps.length === 0) continue;

      const userIds = rsvps.map((r) => r.user_id);

      // Get profiles with reminder preferences
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, reminder_2h, reminder_1d, reminder_2d, reminder_3d, reminder_1w")
        .in("id", userIds);

      if (!profiles || profiles.length === 0) continue;

      // Check each offset
      for (const [offsetKey, { ms: offsetMs, label }] of Object.entries(OFFSETS)) {
        // Check if we're within the reminder window (offset ± 30 min tolerance)
        const tolerance = 30 * 60 * 1000; // 30 minutes
        const targetMs = msUntilEvent;

        if (Math.abs(targetMs - offsetMs) > tolerance) continue;

        // Filter users who have this reminder enabled
        const eligibleProfiles = profiles.filter(
          (p) => p[offsetKey as keyof typeof p] === true
        );

        for (const profile of eligibleProfiles) {
          // Check if already sent
          const { data: existingLog } = await supabase
            .from("reminder_logs")
            .select("id")
            .eq("user_id", profile.id)
            .eq("event_id", event.id)
            .eq("offset_type", offsetKey)
            .maybeSingle();

          if (existingLog) continue; // Already sent

          // Get user email
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
          if (!userData?.user?.email) continue;

          const cityName = (event.cities as any)?.name || "";
          const venueName = (event.venues as any)?.name || "";
          const locationStr = [venueName, cityName].filter(Boolean).join(", ");

          try {
            await resend.emails.send({
              from: "Refik Keşif <noreply@refik.online>",
              to: [userData.user.email],
              subject: `Hatırlatma: ${event.title} - ${label} sonra`,
              html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
                  <h1 style="color: #2d3561; font-size: 24px; margin-bottom: 8px;">⏰ Etkinlik Hatırlatması</h1>
                  <p style="color: #666; font-size: 14px; margin-bottom: 24px;">${label} sonra başlayacak bir etkinliğiniz var</p>
                  
                  <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h2 style="color: #2d3561; font-size: 20px; margin: 0 0 12px 0;">${event.title}</h2>
                    <p style="color: #555; font-size: 14px; margin: 4px 0;">📅 ${event.date} — 🕐 ${event.time}</p>
                    ${locationStr ? `<p style="color: #555; font-size: 14px; margin: 4px 0;">📍 ${locationStr}</p>` : ""}
                    ${event.description ? `<p style="color: #666; font-size: 14px; margin: 12px 0 0 0;">${event.description}</p>` : ""}
                  </div>
                  
                  <p style="color: #333; font-size: 14px;">Merhaba ${profile.first_name}, bu etkinliğe katılacağınızı biliyoruz. Hazır olun! 🎉</p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="color: #999; font-size: 12px;">Bu e-posta Refik, Keşif ve İnşa platformu tarafından gönderilmiştir. Hatırlatıcı tercihlerinizi profil sayfanızdan değiştirebilirsiniz.</p>
                </div>
              `,
            });

            // Log successful send
            await supabase.from("reminder_logs").insert({
              user_id: profile.id,
              event_id: event.id,
              offset_type: offsetKey,
              status: "sent",
            });

            totalSent++;
            console.log(`Reminder sent: ${userData.user.email} for ${event.title} (${offsetKey})`);
          } catch (emailErr) {
            console.error(`Failed to send reminder to ${userData.user.email}:`, emailErr);

            await supabase.from("reminder_logs").insert({
              user_id: profile.id,
              event_id: event.id,
              offset_type: offsetKey,
              status: "failed",
            });

            totalFailed++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
