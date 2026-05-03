import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function israelNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hebrewDay(iso: string) {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return days[new Date(iso + "T00:00:00").getDay()];
}

function formatTime(t: string | null) {
  return (t ?? "").slice(0, 5);
}

// ── Send push notification ────────────────────────────────────────────────────
async function sendPush(
  subscription: Record<string, unknown>,
  title: string, body: string, url: string, tag: string
) {
  try {
    await webpush.sendNotification(
      subscription as unknown as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify({ title, body, url, tag })
    );
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode === 410) {
      await supabase.from("push_subscriptions")
        .delete().eq("subscription->>endpoint", (subscription as { endpoint: string }).endpoint);
    }
  }
}

// ── Send email via Resend ─────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "גנן Pro <reminders@mygananpro.com>",
        to,
        subject,
        html,
      }),
    });
  } catch {}
}

// ── Email templates ───────────────────────────────────────────────────────────
function dayBeforeEmailHtml(jobs: { customer_name: string; job_time: string | null; address: string | null }[], dateISO: string) {
  const day = hebrewDay(dateISO);
  const rows = jobs.map(j => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 16px;font-weight:600;color:#111827;">${j.customer_name}</td>
      <td style="padding:12px 16px;color:#6b7280;">${formatTime(j.job_time)}</td>
      <td style="padding:12px 16px;color:#6b7280;">${j.address ?? ""}</td>
    </tr>`).join("");

  return `
  <div style="font-family:sans-serif;direction:rtl;max-width:560px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:16px;">
    <div style="background:#16a34a;border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:20px;">🌿 גנן Pro — תזכורת ליום ${day}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">${jobs.length} עבודות מחר</p>
    </div>
    <table style="width:100%;background:white;border-radius:12px;border-collapse:collapse;overflow:hidden;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 16px;text-align:right;font-size:13px;color:#6b7280;font-weight:500;">לקוח</th>
          <th style="padding:10px 16px;text-align:right;font-size:13px;color:#6b7280;font-weight:500;">שעה</th>
          <th style="padding:10px 16px;text-align:right;font-size:13px;color:#6b7280;font-weight:500;">כתובת</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin-top:20px;">
      <a href="https://mygananpro.com/schedule" style="background:#16a34a;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
        פתח לוח זמנים
      </a>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">גנן Pro · mygananpro.com</p>
  </div>`;
}

function oneHourEmailHtml(job: { customer_name: string; job_time: string | null; address: string | null }) {
  return `
  <div style="font-family:sans-serif;direction:rtl;max-width:480px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:16px;">
    <div style="background:#2563eb;border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:20px;">⏰ עבודה בעוד שעה!</h1>
    </div>
    <div style="background:white;border-radius:12px;padding:20px 24px;">
      <p style="font-size:18px;font-weight:700;color:#111827;margin:0 0 8px;">${job.customer_name}</p>
      <p style="color:#6b7280;margin:0 0 4px;">🕐 שעה ${formatTime(job.job_time)}</p>
      ${job.address ? `<p style="color:#6b7280;margin:0 0 16px;">📍 ${job.address}</p>` : ""}
      ${job.address ? `
      <a href="https://waze.com/ul?q=${encodeURIComponent(job.address)}"
         style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
        נווט עם Waze
      </a>` : ""}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">גנן Pro · mygananpro.com</p>
  </div>`;
}

// ── Main cron handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = israelNow();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayISO = toISO(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = toISO(tomorrow);

  // Get all users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  if (!users || users.length === 0) return NextResponse.json({ sent: 0 });

  // Get all push subscriptions
  const { data: subs } = await supabase.from("push_subscriptions").select("user_id, subscription");

  let sent = 0;

  for (const user of users) {
    const userId = user.id;
    const email = user.email;
    const sub = subs?.find(s => s.user_id === userId);

    // ── Day-before reminder (20:00 Israel time) ──────────────────────────────
    if (currentHour === 20 && currentMinute < 30) {
      const { data: tomorrowJobs } = await supabase
        .from("jobs")
        .select("customer_name, job_time, address")
        .eq("user_id", userId)
        .eq("job_date", tomorrowISO)
        .neq("status", "cancelled")
        .order("job_time");

      if (tomorrowJobs && tomorrowJobs.length > 0) {
        const firstJob = tomorrowJobs[0];
        const count = tomorrowJobs.length;
        const msgBody = count === 1
          ? `מחר: ${firstJob.customer_name} בשעה ${formatTime(firstJob.job_time)}`
          : `מחר יש לך ${count} עבודות — הראשונה: ${firstJob.customer_name} בשעה ${formatTime(firstJob.job_time)}`;

        // Push
        if (sub) {
          await sendPush(sub.subscription, "🌿 תזכורת למחר", msgBody, "/schedule", `day-before-${tomorrowISO}`);
        }

        // Email
        if (email) {
          await sendEmail(
            email,
            `🌿 תזכורת: ${count} עבודות מחר (יום ${hebrewDay(tomorrowISO)})`,
            dayBeforeEmailHtml(tomorrowJobs, tomorrowISO)
          );
        }

        sent++;
      }
    }

    // ── 1-hour-before reminder ────────────────────────────────────────────────
    const nowMinutes = currentHour * 60 + currentMinute;
    const { data: todayJobs } = await supabase
      .from("jobs")
      .select("id, customer_name, job_time, address")
      .eq("user_id", userId)
      .eq("job_date", todayISO)
      .neq("status", "cancelled")
      .neq("status", "completed");

    if (todayJobs) {
      for (const job of todayJobs) {
        if (!job.job_time) continue;
        const [h, m] = (job.job_time as string).split(":").map(Number);
        const jobMinutes = h * 60 + m;
        if (jobMinutes >= nowMinutes + 55 && jobMinutes <= nowMinutes + 65) {
          const body = `${job.customer_name}${job.address ? ` — ${job.address}` : ""}`;

          // Push
          if (sub) {
            await sendPush(sub.subscription, "⏰ עבודה בעוד שעה", body, "/schedule", `one-hour-${job.id}`);
          }

          // Email
          if (email) {
            await sendEmail(
              email,
              `⏰ תזכורת: עבודה אצל ${job.customer_name} בעוד שעה`,
              oneHourEmailHtml(job)
            );
          }

          sent++;
        }
      }
    }
  }

  return NextResponse.json({ sent, time: now.toISOString() });
}
