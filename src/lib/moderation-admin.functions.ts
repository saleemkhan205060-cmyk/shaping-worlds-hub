import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);
  if (!data || data.length === 0) throw new Error("Forbidden: staff only");
}

// -------- List blocked / reviewed items --------
export const listModerationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: "blocked" | "approved" | "rejected" | "all"; page?: number }) => ({
    status: input?.status ?? "blocked",
    page: Math.max(0, input?.page ?? 0),
  }))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageSize = 20;
    let q = supabaseAdmin
      .from("moderation_logs")
      .select("*, profiles:user_id(display_name, avatar_url, username)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count } = await q;
    return { rows: rows ?? [], count: count ?? 0 };
  });

// -------- Approve: create the post from the log --------
export const approveModerationLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: log, error } = await supabaseAdmin
      .from("moderation_logs")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !log) throw new Error("Log not found");
    if (log.status === "approved") return { alreadyApproved: true, postId: log.published_post_id };

    const { data: post, error: insErr } = await supabaseAdmin
      .from("posts")
      .insert({
        user_id: log.user_id,
        media_url: log.media_url,
        media_type: log.media_type,
        title: log.title,
        caption: log.caption,
        category: log.category,
        is_private: log.is_private,
        thumbnail_url: log.thumbnail_url,
      } as any)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("moderation_logs")
      .update({
        status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        published_post_id: post?.id,
      })
      .eq("id", data.id);

    return { alreadyApproved: false, postId: post?.id };
  });

// -------- Reject: delete storage file, mark rejected --------
export const rejectModerationLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: log } = await supabaseAdmin
      .from("moderation_logs")
      .select("media_path")
      .eq("id", data.id)
      .single();
    if (log?.media_path) {
      try { await supabaseAdmin.storage.from("media").remove([log.media_path]); } catch {}
    }
    await supabaseAdmin
      .from("moderation_logs")
      .update({
        status: "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return { ok: true };
  });

// -------- Moderation rules CRUD --------
export const listModerationRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("moderation_rules")
      .select("*")
      .order("created_at", { ascending: false });
    return { rows: data ?? [] };
  });

export const upsertModerationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; rule: string; enabled?: boolean }) => {
    if (!input || typeof input.rule !== "string" || !input.rule.trim()) throw new Error("rule required");
    if (input.rule.length > 500) throw new Error("rule too long");
    return { id: input.id, rule: input.rule.trim(), enabled: input.enabled ?? true };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      await supabaseAdmin
        .from("moderation_rules")
        .update({ rule: data.rule, enabled: data.enabled })
        .eq("id", data.id);
    } else {
      await supabaseAdmin
        .from("moderation_rules")
        .insert({ rule: data.rule, enabled: data.enabled, created_by: context.userId });
    }
    return { ok: true };
  });

export const deleteModerationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("moderation_rules").delete().eq("id", data.id);
    return { ok: true };
  });
