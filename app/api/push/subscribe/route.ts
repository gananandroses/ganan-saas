import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json();
    if (!subscription || !userId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Upsert subscription (replace if same endpoint)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, subscription, updated_at: new Date().toISOString() },
        { onConflict: "user_id,endpoint" }
      );

    if (error) {
      // Try simple insert if upsert fails (table might not have endpoint column)
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);
      await supabase
        .from("push_subscriptions")
        .insert({ user_id: userId, subscription });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
