// One-click demo setup. Hit GET /api/setup-demo?token=YOUR_CRON_SECRET
// (or with Authorization: Bearer header) to:
//   1. Create the shared demo auth user if it doesn't exist
//   2. Wipe + reseed all of its data
//
// Idempotent — safe to call repeatedly. Used both for the initial setup and
// as a manual recovery if the nightly cron failed for some reason.
//
// Required environment variables (already configured for the rest of the
// project):
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY  (server-only; bypasses RLS + auth triggers)
//   - CRON_SECRET                (auth gate so this isn't a public reset button)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@mygananpro.com";
const DEMO_PASSWORD = "GananDemo2026!";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function authOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  // Convenience: accept ?token=... so you can fire it from the browser.
  const token = req.nextUrl.searchParams.get("token");
  return token === secret;
}

async function ensureDemoUser(): Promise<{ id: string; created: boolean } | { error: string }> {
  // Check if the user already exists (Admin API doesn't have getByEmail, so we list)
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listErr) return { error: listErr.message };

  const existing = list.users.find(u => u.email === DEMO_EMAIL);
  if (existing) return { id: existing.id, created: false };

  // Create — admin API skips email confirmation when email_confirm: true
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  // If creation failed because of a faulty handle_new_user trigger left over
  // from the original schema-v2.sql install, retry once after the trigger
  // has been dropped on the next call. We can't drop triggers from the JS
  // client, so we surface a clear actionable error.
  if (error || !data.user) {
    const msg = error?.message ?? "Failed to create demo user";
    if (/database error|trigger|handle_new_user/i.test(msg)) {
      return {
        error:
          "יצירת המשתמש נחסמה ע״י trigger ישן ב-DB. הרץ ב-Supabase SQL Editor:\n" +
          "drop trigger if exists on_auth_user_created on auth.users;\n" +
          "drop function if exists public.handle_new_user();",
      };
    }
    return { error: msg };
  }
  return { id: data.user!.id, created: true };
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Ensure demo user exists
  const userResult = await ensureDemoUser();
  if ("error" in userResult) {
    return NextResponse.json({ step: "ensure_user", error: userResult.error }, { status: 500 });
  }
  const uid = userResult.id;

  // 2. Wipe all rows owned by the demo user (FK-respecting order)
  const wipeOrder = [
    "personal_transactions",
    "transactions",
    "jobs",
    "projects",
    "inventory",
    "customers",
  ];
  const wipeWarnings: string[] = [];
  for (const table of wipeOrder) {
    const { error } = await supabase.from(table).delete().eq("user_id", uid);
    if (error) {
      // Soft-fail: a missing table just means a migration hasn't been run for
      // this environment. Note it in the response but keep going.
      wipeWarnings.push(`${table}: ${error.message}`);
    }
  }

  // 3. Reseed
  const today = new Date();
  const dayOffset = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const yearStart = `${today.getFullYear()}-01-01`;

  const customers = [
    { name: "משפחת כהן",   city: "רעננה",     address: "רחוב הורד 12, רעננה",      phone: "054-1234567", email: "cohen@example.com",  monthly_price: 600,  frequency: "פעמיים בחודש", status: "vip",      notes: "להיזהר מהכלב בכניסה",      tags: ["VIP","גינה גדולה","השקיה אוטומטית"], total_paid: 14400, balance: 0,    lat: 32.185, lng: 34.871, last_visit: dayOffset(-7),  next_visit: dayOffset(7),  join_date: dayOffset(-365) },
    { name: "דוד לוי",      city: "הרצליה",    address: "שד׳ בן גוריון 34, הרצליה",  phone: "052-9876543", email: null,                 monthly_price: 350,  frequency: "פעם בחודש",     status: "active",   notes: "מעדיף עבודה בשעות הבוקר",  tags: ["גינה קטנה","עצי פרי"],            total_paid: 4200,  balance: 350,  lat: 32.165, lng: 34.845, last_visit: dayOffset(-14), next_visit: dayOffset(16), join_date: dayOffset(-200) },
    { name: "שרה אברהם",   city: "כפר סבא",   address: "רחוב הגפן 8, כפר סבא",     phone: "050-5551234", email: "sarah@example.com",  monthly_price: 800,  frequency: "שבועי",         status: "vip",      notes: "ערוגת ורדים מיוחדת",      tags: ["VIP","ורדים","תאורה"],            total_paid: 22400, balance: 0,    lat: 32.175, lng: 34.906, last_visit: dayOffset(-4),  next_visit: dayOffset(3),  join_date: dayOffset(-540) },
    { name: "מלון פלאזה",   city: "נתניה",     address: "רחוב הרצל 1, נתניה",       phone: "09-8765432",  email: "plaza@hotel.com",    monthly_price: 4500, frequency: "שבועי x2",      status: "vip",      notes: "לקוח עסקי, חשבוניות חודשיות", tags: ["עסקי","VIP","גינה גדולה מאוד"],   total_paid: 162000,balance: 0,    lat: 32.332, lng: 34.856, last_visit: dayOffset(-3),  next_visit: dayOffset(4),  join_date: dayOffset(-730) },
    { name: "נועה שפירא",   city: "רמת גן",    address: "שד׳ ירושלים 22, רמת גן",   phone: "054-3334445", email: null,                 monthly_price: 400,  frequency: "פעמיים בחודש", status: "active",   notes: "הופנתה ע״י משפחת כהן",     tags: ["גינת גג"],                       total_paid: 2400,  balance: 0,    lat: 32.082, lng: 34.819, last_visit: dayOffset(-10), next_visit: dayOffset(5),  join_date: dayOffset(-90) },
    { name: "יורם בן דוד",  city: "תל אביב",   address: "רחוב דיזנגוף 45, תל אביב", phone: "050-1112222", email: "yoram@example.com",  monthly_price: 500,  frequency: "פעמיים בחודש", status: "active",   notes: "דירת גן עם בריכה",        tags: ["בריכה","דשא"],                    total_paid: 7500,  balance: 500,  lat: 32.075, lng: 34.781, last_visit: dayOffset(-8),  next_visit: dayOffset(7),  join_date: dayOffset(-180) },
    { name: "משפחת מזרחי", city: "פתח תקווה", address: "רחוב ז׳בוטינסקי 88",         phone: "052-3334444", email: null,                 monthly_price: 450,  frequency: "פעם בחודש",     status: "active",   notes: "גינת מתבגרים — אישור הורה", tags: ["חדש"],                            total_paid: 900,   balance: 450,  lat: 32.089, lng: 34.889, last_visit: dayOffset(-25), next_visit: dayOffset(5),  join_date: dayOffset(-60) },
    { name: "אילן רוזן",    city: "מודיעין",   address: "רחוב המתנדבים 14",           phone: "054-5556677", email: "ilan@example.com",   monthly_price: 300,  frequency: "פעם בחודש",     status: "inactive", notes: "הפסיק שירות זמנית",        tags: ["רדום"],                            total_paid: 1800,  balance: 0,    lat: 31.892, lng: 35.007, last_visit: dayOffset(-95), next_visit: null,          join_date: dayOffset(-270) },
  ].map(c => ({ ...c, user_id: uid }));

  const errors: string[] = [];

  const custRes = await supabase.from("customers").insert(customers);
  if (custRes.error) errors.push(`customers: ${custRes.error.message}`);

  const invRes = await supabase.from("inventory").insert([
    { user_id: uid, name: "דשן NPK 20-20-20",   category: "דשנים",    quantity: 12,  unit: "שק",   min_stock: 3,   price_per_unit: 85,  supplier: "אגרוקש",     last_used: dayOffset(-5) },
    { user_id: uid, name: "קוטל עשבים Roundup", category: "כימיקלים", quantity: 4,   unit: "ליטר", min_stock: 2,   price_per_unit: 120, supplier: "אדמה",       last_used: dayOffset(-12) },
    { user_id: uid, name: "שתילי ורדים",        category: "שתילים",   quantity: 18,  unit: "יח׳",  min_stock: 5,   price_per_unit: 35,  supplier: "משתלת אורן", last_used: dayOffset(-3) },
    { user_id: uid, name: "דשא סינטטי",         category: "דשא",      quantity: 2,   unit: "גליל", min_stock: 1,   price_per_unit: 450, supplier: "דשא דה-לוקס",last_used: dayOffset(-30) },
    { user_id: uid, name: "טפטפות",              category: "השקיה",    quantity: 250, unit: "יח׳",  min_stock: 100, price_per_unit: 1.5, supplier: "נטפים",      last_used: dayOffset(-8) },
  ]);
  if (invRes.error) errors.push(`inventory: ${invRes.error.message}`);

  const jobTypes = ["גיזום עצים","כיסוח דשא","השקיה ותחזוקה","שתילה","ריסוס"];
  const jobs: Record<string, unknown>[] = [];
  customers.filter(c => c.status !== "inactive").forEach((c, ci) => {
    for (let i = 1; i <= 4; i++) {
      jobs.push({
        user_id: uid,
        customer_name: c.name,
        address: c.address,
        job_date: dayOffset(-i * 14 - ci),
        job_time: `${9 + (i % 4)}:00`,
        duration: 2 + (i % 3),
        type: jobTypes[i % jobTypes.length],
        status: "completed",
        priority: ["low","medium","high"][i % 3],
        price: c.monthly_price,
      });
    }
  });
  customers.filter(c => c.status === "vip").forEach((c, i) => {
    jobs.push({
      user_id: uid,
      customer_name: c.name,
      address: c.address,
      job_date: dayOffset(i + 1),
      job_time: `${9 + (i % 5)}:00`,
      duration: 2,
      type: jobTypes[i % 3],
      status: "pending",
      priority: "medium",
      price: c.monthly_price,
    });
  });
  const jobsRes = await supabase.from("jobs").insert(jobs);
  if (jobsRes.error) errors.push(`jobs: ${jobsRes.error.message}`);

  const txs: Record<string, unknown>[] = jobs
    .filter(j => j.status === "completed")
    .map(j => {
      const dateStr = j.job_date as string;
      const dDays = Math.round((today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
      const status = dDays > 30 ? "paid" : dDays > 7 ? "paid" : "pending";
      return {
        user_id: uid,
        customer_name: j.customer_name,
        type: "income",
        amount: j.price,
        description: j.type,
        status,
        method: ["cash","credit","bit","transfer"][new Date(dateStr).getDate() % 4],
        transaction_date: dateStr,
      };
    });
  txs.push(
    { user_id: uid, type: "expense", amount: 850,  description: "דלק לחודש",                  status: "paid", method: "credit",   transaction_date: dayOffset(-25) },
    { user_id: uid, type: "expense", amount: 1200, description: "דשנים ושתילים — אגרוקש",     status: "paid", method: "credit",   transaction_date: dayOffset(-18) },
    { user_id: uid, type: "expense", amount: 450,  description: "תחזוקה למכסחת",              status: "paid", method: "cash",     transaction_date: dayOffset(-10) },
    { user_id: uid, type: "expense", amount: 320,  description: "אביזרי השקיה",               status: "paid", method: "transfer", transaction_date: dayOffset(-5) },
    { user_id: uid, type: "expense", amount: 720,  description: "דלק לחודש",                  status: "paid", method: "credit",   transaction_date: dayOffset(-55) },
    { user_id: uid, type: "expense", amount: 980,  description: "שתילים — משתלת אורן",        status: "paid", method: "credit",   transaction_date: dayOffset(-50) },
  );
  const txRes = await supabase.from("transactions").insert(txs);
  if (txRes.error) errors.push(`transactions: ${txRes.error.message}`);

  const projRes = await supabase.from("projects").insert([
    {
      user_id: uid,
      name: "שיפוץ גינת מלון פלאזה — קיץ 2026",
      customer_name: "מלון פלאזה",
      description: "שיפוץ גינה ראשית: גיזום עצים גדולים, החלפת מערכת השקיה, שתילת ורדים חדשים, התקנת תאורה",
      start_date: dayOffset(-14), end_date: dayOffset(21), budget: 28000, spent: 12500, progress: 45,
      status: "active",
      tasks: ["גיזום עצים","החלפת מערכת השקיה","שתילת ורדים","התקנת תאורה","גינון סופי"],
    },
    {
      user_id: uid,
      name: "גינת גג — נועה שפירא",
      customer_name: "נועה שפירא",
      description: "תכנון והקמה של גינת גג חדשה כולל אדניות, צמחיה ים-תיכונית ומערכת השקיה",
      start_date: dayOffset(-30), end_date: dayOffset(-5), budget: 8500, spent: 8500, progress: 100,
      status: "completed",
      tasks: ["תכנון","אדניות","שתילה","השקיה"],
    },
  ]);
  if (projRes.error) errors.push(`projects: ${projRes.error.message}`);

  const persRes = await supabase.from("personal_transactions").insert([
    { user_id: uid, type: "income",  category: "business",      amount: 12000, description: "משיכה חודשית מהעסק",         recurrence: "monthly",  start_date: yearStart, scope: "personal" },
    { user_id: uid, type: "expense", category: "housing",       amount: 4800,  description: "משכנתא",                     recurrence: "monthly",  start_date: yearStart, scope: "personal" },
    { user_id: uid, type: "expense", category: "car",           amount: 900,   description: "ליסינג",                     recurrence: "monthly",  start_date: yearStart, scope: "business" },
    { user_id: uid, type: "expense", category: "subscriptions", amount: 180,   description: "נטפליקס + ספוטיפיי + iCloud", recurrence: "monthly",  start_date: yearStart, scope: "personal" },
    { user_id: uid, type: "expense", category: "utilities",     amount: 420,   description: "חשמל + מים + ארנונה",         recurrence: "monthly",  start_date: yearStart, scope: "personal" },
    { user_id: uid, type: "expense", category: "insurance",     amount: 3600,  description: "ביטוח רכב שנתי",             recurrence: "yearly",   start_date: yearStart, scope: "business" },
    { user_id: uid, type: "expense", category: "groceries",     amount: 2400,  description: "קניות מזון",                 recurrence: "monthly",  start_date: yearStart, scope: "personal" },
    { user_id: uid, type: "expense", category: "dining",        amount: 380,   description: "אוכל בחוץ — סוף שבוע",       recurrence: "one_time", start_date: dayOffset(-3), scope: "personal" },
    { user_id: uid, type: "expense", category: "shopping",      amount: 650,   description: "נעלי עבודה חדשות",           recurrence: "one_time", start_date: dayOffset(-7), scope: "business" },
  ]);
  if (persRes.error) errors.push(`personal_transactions: ${persRes.error.message}`);

  return NextResponse.json({
    ok: errors.length === 0,
    user_created: userResult.created,
    user_id: uid,
    counts: {
      customers: customers.length,
      jobs: jobs.length,
      transactions: txs.length,
    },
    wipe_warnings: wipeWarnings.length > 0 ? wipeWarnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  });
}
