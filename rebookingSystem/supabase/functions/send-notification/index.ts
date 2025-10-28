// Supabase Edge Function: send-notification
// Deno runtime
// Sends Expo push notifications to a user or staff group using stored Expo push tokens in Supabase
// Expected tables (SQL examples below):
// - device_tokens(id uuid pk, user_id text, expo_push_token text, is_active boolean, platform text, updated_at timestamptz)
// - notification_preferences(user_id text pk, push_enabled boolean, booking_confirmed_enabled boolean, booking_rejected_enabled boolean, new_booking_staff_enabled boolean)
// - accounts(id text pk, role int, branch int, branch_name text)
// - notification_records(id uuid pk, user_id text, booking_id text, notification_type text, title text, body text, data jsonb, delivered_at timestamptz, created_at timestamptz)
//
// Deploy with:
// supabase functions deploy send-notification --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Use allowed env names (Supabase forbids setting custom secrets starting with SUPABASE_)
  const supabaseUrl = Deno.env.get("EDGE_SUPABASE_URL")
    ?? Deno.env.get("SUPABASE_URL"); // fallback if platform exposes built-in var
  const supabaseKey = Deno.env.get("EDGE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_ANON_KEY"); // last resort (limited perms)
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Missing server env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch },
    auth: { persistSession: false },
  });

  // Optional: shared secret header for basic auth hardening
  const requiredSecret = Deno.env.get("FUNCTION_SECRET");
  if (requiredSecret) {
    const provided = req.headers.get("x-function-secret");
    if (provided !== requiredSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  type Payload = {
    target: "user" | "staff";
    userId?: string;
    branchId?: number;
    branchName?: string;
    notificationType: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { target, userId, branchId, branchName, notificationType, title, body, data } = payload;
  if (!target || !notificationType || !title || !body) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  try {
    let tokens: string[] = [];
    let userIds: string[] = [];

    if (target === "user") {
      if (!userId) return new Response(JSON.stringify({ error: "userId required for target=user" }), { status: 400 });

      // Check preferences (push + type-specific)
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("push_enabled, booking_confirmed_enabled, booking_rejected_enabled")
        .eq("user_id", userId)
        .maybeSingle();

      if (prefs) {
        // Global push disabled
        if (prefs.push_enabled === false) {
          return new Response(JSON.stringify({ message: "User has push disabled", sent: 0 }), { status: 200 });
        }
        // Type-specific toggles
        if (
          (notificationType === "booking_confirmed" && prefs.booking_confirmed_enabled === false) ||
          ((notificationType === "booking_rejected" || notificationType === "booking_cancelled") && prefs.booking_rejected_enabled === false)
        ) {
          return new Response(JSON.stringify({ message: "User has disabled this notification type", sent: 0 }), { status: 200 });
        }
      }

      const { data: trows } = await supabase
        .from("device_tokens")
        .select("expo_push_token")
        .eq("user_id", userId)
        .eq("is_active", true);

      tokens = (trows || []).map((r: any) => r.expo_push_token).filter(Boolean);
      userIds = [userId];
  } else if (target === "staff") {
      // Find staff accounts (role 1/2/3) and optional branch filter
      let q = supabase
        .from("accounts")
        .select("id")
        .in("role", [1, 2, 3]);

      if (typeof branchId === "number") q = q.eq("branch", branchId);
      if (branchName) q = q.eq("branch_name", branchName);

      const { data: staff } = await q;
      if (!staff || staff.length === 0) {
        return new Response(JSON.stringify({ message: "No staff found", sent: 0 }), { status: 200 });
      }

      const staffIds = staff.map((s: any) => s.id);

      // Notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id, push_enabled, new_booking_staff_enabled");

      const prefsMap = new Map<string, any>((prefs || []).map((p: any) => [p.user_id, p]));

      // Get active tokens for these users in chunks of 100 (SQL 'in' limits vary)
      const chunks = chunk(staffIds, 100);
      for (const ids of chunks) {
        const { data: dts } = await supabase
          .from("device_tokens")
          .select("user_id, expo_push_token")
          .in("user_id", ids)
          .eq("is_active", true);

        for (const row of dts || []) {
          const p = prefsMap.get(row.user_id);
          if (p && p.push_enabled !== false && p.new_booking_staff_enabled !== false) {
            tokens.push(row.expo_push_token);
            userIds.push(row.user_id);
          }
        }
      }

      if (tokens.length === 0) {
        return new Response(JSON.stringify({ message: "No staff with notifications enabled", sent: 0 }), { status: 200 });
      }
    }

    // Send via Expo Push API (chunked)
    const tokenChunks = chunk(tokens, 100);
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const c of tokenChunks) {
      const messages = c.map((to) => ({
        to,
        sound: "default",
        title,
        body,
        data: data || {},
        priority: "high",
        channelId: target === "staff" ? "staff" : notificationType === "new_booking" ? "staff" : "bookings",
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Expo push error", res.status, text);
        totalFailed += c.length;
      } else {
        const json: any = await res.json().catch(() => null);
        if (json && Array.isArray(json.data)) {
          // crude count
          const successes = json.data.filter((d: any) => d.status === "ok").length;
          totalSuccess += successes;
          totalFailed += c.length - successes;
        } else {
          totalSuccess += c.length; // assume ok
        }
      }
    }

    // Log notification records (best effort)
    if (userIds.length > 0) {
      const records = userIds.map((uid) => ({
        user_id: uid,
        booking_id: (data as any)?.bookingId ?? null,
        notification_type: notificationType,
        title,
        body,
        data: data || {},
        delivered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));
      await supabase.from("notification_records").insert(records);
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSuccess, failed: totalFailed }),
      { status: 200 },
    );
  } catch (err) {
    console.error("send-notification error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
