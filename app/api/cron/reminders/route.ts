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

// Israel timezone offset (UTC+3 summer, UTC+2 winter — we use +2 conservatively)
function israelNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function sendPush(subscription: Record<string, unknown>, title: string, body: string, url: string, tag: string) {
  try {
    await webpush.sendNotification(
      subscription as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify({ title, body, url, tag })
    );
  } catch (e: unknown) {
    // Subscription expired — remove it
    if ((e as { statusCode?: number }).statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("subscription->>endpoint", (subscription as { endpoint: string }).endpoint);
    }
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = israelNow();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayISO = toISO(now);

  // Tomorrow's date
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = toISO(tomorrow);

  // Fetch all subscriptions
  const { data: subs } = await supabase.from("push_subscriptions").select("user_id, subscription");
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const sub of subs) {
    const userId = sub.user_id;
    const subscription = sub.subscription;

    // ── Day-before reminder (send between 19:50–20:10 Israel time) ──────────
    if (currentHour === 20 && currentMinute < 15) {
      const { data: tomorrowJobs } = await supabase
        .from("jobs")
        .select("customer_name, job_time, address")
        .eq("user_id", userId)
        .eq("job_date", tomorrowISO)
        .neq("status", "cancelled")
        .order("job_time");

      if (tomorrowJobs && tomorrowJobs.length > 0) {
        const count = tomorrowJobs.length;
        const firstJob = tomorrowJobs[0];
        const body =
          count === 1
            ? `מחר: ${firstJob.customer_name} בשעה ${(firstJob.job_time ?? "").slice(0, 5)}`
            : `מחר יש לך ${count} עבודות — הראשונה: ${firstJob.customer_name} בשעה ${(firstJob.job_time ?? "").slice(0, 5)}`;

        await sendPush(subscription, "🌿 תזכורת למחר", body, "/schedule", `day-before-${tomorrowISO}`);
        sent++;
      }
    }

    // ── 1-hour-before reminder ────────────────────────────────────────────────
    // Current time in minutes from midnight
    const nowMinutes = currentHour * 60 + currentMinute;
    // Target window: jobs starting in 55–65 minutes
    const windowStart = nowMinutes + 55;
    const windowEnd = nowMinutes + 65;

    const { data: soonJobs } = await supabase
      .from("jobs")
      .select("id, customer_name, job_time, address")
      .eq("user_id", userId)
      .eq("job_date", todayISO)
      .neq("status", "cancelled")
      .neq("status", "completed");

    if (soonJobs) {
      for (const job of soonJobs) {
        if (!job.job_time) continue;
        const [h, m] = (job.job_time as string).split(":").map(Number);
        const jobMinutes = h * 60 + m;
        if (jobMinutes >= windowStart && jobMinutes <= windowEnd) {
          const body = `${job.customer_name}${job.address ? ` — ${job.address}` : ""}`;
          await sendPush(subscription, "⏰ עבודה בעוד שעה", body, "/schedule", `one-hour-${job.id}`);
          sent++;
        }
      }
    }
  }

  return NextResponse.json({ sent, time: now.toISOString() });
}
