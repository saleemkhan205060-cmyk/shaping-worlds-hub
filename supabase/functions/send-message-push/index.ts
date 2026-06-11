// Sends an FCM HTTP v1 push notification to all device tokens of a message recipient.
// Triggered by a Postgres AFTER INSERT trigger on public.messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  message_id: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

// ----- Google OAuth token from service account JSON -----

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth token failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

// ----- Handler -----

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Authenticate the caller. This function is triggered by a Postgres webhook
  // that sends `Authorization: Bearer <SERVICE_ROLE_KEY>`. Reject anything else
  // so the endpoint cannot be abused to spam push notifications.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  const expectedAuth = serviceRoleKey ? `Bearer ${serviceRoleKey}` : "";
  const authOk =
    (expectedAuth && authHeader === expectedAuth) ||
    (webhookSecret && providedSecret === webhookSecret);
  if (!authOk) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  try {
    const { message_id } = (await req.json()) as Payload;
    if (!message_id) return new Response("missing message_id", { status: 400, headers: corsHeaders });


    const serviceJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const fcmProjectId =
      Deno.env.get("FCM_PROJECT_ID") || (serviceJson ? (JSON.parse(serviceJson).project_id as string) : "");
    if (!serviceJson || !fcmProjectId) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "FCM not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    // Load the message
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .select("id, sender_id, recipient_id, content")
      .eq("id", message_id)
      .maybeSingle();
    if (msgErr || !msg) {
      return new Response(JSON.stringify({ ok: false, error: msgErr?.message || "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load recipient tokens
    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", msg.recipient_id);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sender display name
    const { data: sender } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", msg.sender_id)
      .maybeSingle();

    const title =
      (sender?.display_name as string | undefined) ||
      (sender?.username as string | undefined) ||
      "New message";
    const rawBody = (msg.content || "").trim();
    const body = rawBody.length > 140 ? `${rawBody.slice(0, 137)}…` : rawBody || "You received a new message";

    const accessToken = await getAccessToken(JSON.parse(serviceJson) as ServiceAccount);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;

    let sent = 0;
    const stale: string[] = [];

    await Promise.all(
      tokens.map(async (t) => {
        const fcmMessage = {
          message: {
            token: t.token,
            notification: { title, body },
            android: {
              priority: "HIGH",
              notification: {
                channel_id: "messages",
                sound: "notification",
                click_action: "FCM_PLUGIN_ACTIVITY",
                tag: `msg-${msg.sender_id}`,
              },
            },
            data: {
              type: "message",
              sender_id: msg.sender_id,
              message_id: msg.id,
              url: "/messages",
            },
          },
        };

        const r = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmMessage),
        });

        if (r.ok) {
          sent += 1;
          return;
        }
        const text = await r.text();
        // Clean up invalid / unregistered tokens
        if (
          r.status === 404 ||
          r.status === 400 ||
          text.includes("UNREGISTERED") ||
          text.includes("INVALID_ARGUMENT") ||
          text.includes("registration-token-not-registered")
        ) {
          stale.push(t.token);
        }
        console.error("FCM send failed", r.status, text);
      }),
    );

    if (stale.length) {
      await admin.from("push_tokens").delete().in("token", stale);
    }

    return new Response(JSON.stringify({ ok: true, sent, removed: stale.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
