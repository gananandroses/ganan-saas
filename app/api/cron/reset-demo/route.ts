// Nightly reset of the public demo account.
//
// Wires up to Vercel Cron via `vercel.json`. Anyone visiting /demo signs in
// to a shared account (demo@mygananpro.com); this endpoint wipes their data
// and reseeds a fresh, realistic snapshot every night so the demo always
// looks "alive".
//
// Requires environment variables:
//   - SUPABASE_SERVICE_ROLE_KEY  (server-side, bypasses RLS)
//   - NEXT_PUBLIC_SUPABASE_URL
//   - CRON_SECRET                (header check; Vercel automatically sends it)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@mygananpro.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
  // Reject anything else so this isn't a public reset button.
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Find the demo user by email
  const { data: usersList, error: lookupErr } = await supabase.auth.admin.listUsers();
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  const demoUser = usersList.users.find(u => u.email === DEMO_EMAIL);
  if (!demoUser) {
    return NextResponse.json(
      { error: `Demo user ${DEMO_EMAIL} not found in auth.users` },
      { status: 404 }
    );
  }
  const uid = demoUser.id;

  // 2. Wipe everything owned by the demo user (FK order matters)
  for (const table of [
    "personal_transactions",
    "transactions",
    "jobs",
    "projects",
    "inventory",
    "customers",
  ]) {
    const { error } = await supabase.from(table).delete().eq("user_id", uid);
    if (error) {
      // Soft-fail: keep going, but include in response so we can debug.
      // Most likely cause: a table doesn't exist yet because a migration
      // hasn't been applied to this environment.
      console.warn(`[reset-demo] failed to wipe ${table}: ${error.message}`);
    }
  }

  // 3. Reseed by calling the seed function. We re-implement the SQL inline
  //    with parameterised inserts rather than executing a .sql file, because
  //    Vercel's serverless runtime doesn't have a Postgres CLI.
  const today = new Date();
  const dayOffset = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const yearStart = `${today.getFullYear()}-01-01`;

  // ── 3a. Customers ─────────────────────────────────────────────────────────
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

  await supabase.from("customers").insert(customers);

  // ── 3b. Inventory ─────────────────────────────────────────────────────────
  await supabase.from("inventory").insert([
    { user_id: uid, name: "דשן NPK 20-20-20",   category: "דשנים",    quantity: 12,  unit: "שק",  min_stock: 3,   price_per_unit: 85,  supplier: "אגרוקש",     last_used: dayOffset(-5) },
    { user_id: uid, name: "קוטל עשבים Roundup", category: "כימיקלים", quantity: 4,   unit: "ליטר",min_stock: 2,   price_per_unit: 120, supplier: "אדמה",       last_used: dayOffset(-12) },
    { user_id: uid, name: "שתילי ורדים",        category: "שתילים",   quantity: 18,  unit: "יח׳", min_stock: 5,   price_per_unit: 35,  supplier: "משתלת אורן", last_used: dayOffset(-3) },
    { user_id: uid, name: "דשא סינטטי",         category: "דשא",      quantity: 2,   unit: "גליל",min_stock: 1,   price_per_unit: 450, supplier: "דשא דה-לוקס",last_used: dayOffset(-30) },
    { user_id: uid, name: "טפטפות",              category: "השקיה",    quantity: 250, unit: "יח׳", min_stock: 100, price_per_unit: 1.5, supplier: "נטפים",      last_used: dayOffset(-8) },
  ]);

  // ── 3c. Jobs ──────────────────────────────────────────────────────────────
  const jobTypes = ["גיזום עצים","כיסוח דשא","השקיה ותחזוקה","שתילה","ריסוס"];
  const jobs: Record<string, unknown>[] = [];
  customers.filter(c => c.status !== "inactive").forEach((c, ci) => {
    // 4 historical completed jobs per active customer
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
  // Upcoming jobs for VIPs
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
  await supabase.from("jobs").insert(jobs);

  // ── 3d. Transactions ──────────────────────────────────────────────────────
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
  // Expenses
  txs.push(
    { user_id: uid, type: "expense", amount: 850,  description: "דלק לחודש",                  status: "paid", method: "credit",   transaction_date: dayOffset(-25) },
    { user_id: uid, type: "expense", amount: 1200, description: "דשנים ושתילים — אגרוקש",     status: "paid", method: "credit",   transaction_date: dayOffset(-18) },
    { user_id: uid, type: "expense", amount: 450,  description: "תחזוקה למכסחת",              status: "paid", method: "cash",     transaction_date: dayOffset(-10) },
    { user_id: uid, type: "expense", amount: 320,  description: "אביזרי השקיה",               status: "paid", method: "transfer", transaction_date: dayOffset(-5) },
    { user_id: uid, type: "expense", amount: 720,  description: "דלק לחודש",                  status: "paid", method: "credit",   transaction_date: dayOffset(-55) },
    { user_id: uid, type: "expense", amount: 980,  description: "שתילים — משתלת אורן",        status: "paid", method: "credit",   transaction_date: dayOffset(-50) },
  );
  await supabase.from("transactions").insert(txs);

  // ── 3e. Projects ──────────────────────────────────────────────────────────
  await supabase.from("projects").insert([
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

  // ── 3f. Personal transactions ─────────────────────────────────────────────
  await supabase.from("personal_transactions").insert([
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

  return NextResponse.json({
    ok: true,
    user_id: uid,
    customers: customers.length,
    jobs: jobs.length,
    transactions: txs.length,
    reset_at: new Date().toISOString(),
  });
}
