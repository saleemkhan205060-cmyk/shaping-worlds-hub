import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Helper: throw if not admin
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden: admin only");
}

async function assertModOrAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);
  if (error) throw new Error("Role check failed");
  if (!data || data.length === 0) throw new Error("Forbidden: moderator/admin only");
}

async function logAction(
  supabase: any,
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
) {
  await supabase.from("admin_activity_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    details: details ?? null,
  });
}

// =================== CHECK ADMIN ===================
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r: any) => r.role);
    return { isAdmin: roles.includes("admin"), isModerator: roles.includes("moderator") };
  });

// =================== DASHBOARD STATS ===================
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      users, posts, photos, videos, comments, likes, reports, marriage,
      activeUsers, productReports, msgReports, hidden, suspended, banned,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("*", { count: "exact", head: true }).eq("media_type", "image"),
      supabaseAdmin.from("posts").select("*", { count: "exact", head: true }).eq("media_type", "video"),
      supabaseAdmin.from("post_comments").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("post_likes").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("post_reports").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("marriage_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("user_id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabaseAdmin.from("product_reports").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("message_reports").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("*", { count: "exact", head: true }).eq("is_hidden", true),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("is_suspended", true),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
    ]);
    return {
      totalUsers: users.count ?? 0,
      activeUsers: activeUsers.count ?? 0,
      totalPosts: posts.count ?? 0,
      totalPhotos: photos.count ?? 0,
      totalVideos: videos.count ?? 0,
      totalComments: comments.count ?? 0,
      totalLikes: likes.count ?? 0,
      totalReports: (reports.count ?? 0) + (productReports.count ?? 0) + (msgReports.count ?? 0),
      totalMarriage: marriage.count ?? 0,
      hiddenPosts: hidden.count ?? 0,
      suspendedUsers: suspended.count ?? 0,
      bannedUsers: banned.count ?? 0,
    };
  });

// =================== USERS ===================
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 0;
    const size = data.pageSize ?? 20;
    let q = supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * size, page * size + size - 1);
    if (data.search) q = q.ilike("display_name", `%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;

    // Attach roles
    const ids = (rows ?? []).map((r: any) => r.id);
    const { data: roles } = ids.length
      ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, roles: roleMap.get(r.id) ?? ["user"] })),
      count: count ?? 0,
    };
  });

export const updateUserFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    userId: string;
    is_verified?: boolean;
    is_suspended?: boolean;
    is_banned?: boolean;
    suspended_until?: string | null;
  }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Record<string, unknown> = {};
    if (data.is_verified !== undefined) update.is_verified = data.is_verified;
    if (data.is_suspended !== undefined) update.is_suspended = data.is_suspended;
    if (data.is_banned !== undefined) update.is_banned = data.is_banned;
    if (data.suspended_until !== undefined) update.suspended_until = data.suspended_until;
    const { error } = await supabaseAdmin.from("profiles").update(update as any).eq("id", data.userId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "update_user_flag", "user", data.userId, update);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "user" | "moderator" | "admin" }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Remove existing role rows, then add the new one (single role per user model)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (data.role !== "user") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error) throw error;
    }
    await logAction(supabaseAdmin, context.userId, "set_role", "user", data.userId, { role: data.role });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "delete_user", "user", data.userId);
    return { ok: true };
  });

export const deleteAllUserContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot wipe your own content");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cascades clean up likes/comments/shares/reports for posts.
    const results = await Promise.all([
      supabaseAdmin.from("posts").delete().eq("user_id", data.userId),
      supabaseAdmin.from("post_comments").delete().eq("user_id", data.userId),
      supabaseAdmin.from("post_likes").delete().eq("user_id", data.userId),
      supabaseAdmin.from("post_shares").delete().eq("user_id", data.userId),
      supabaseAdmin.from("marriage_profiles").delete().eq("user_id", data.userId),
      supabaseAdmin.from("market_products").delete().eq("seller_id", data.userId),
    ]);
    const firstErr = results.find((r: any) => r.error)?.error;
    if (firstErr) throw firstErr;
    await logAction(supabaseAdmin, context.userId, "delete_all_content", "user", data.userId);
    return { ok: true };
  });

// =================== POSTS / VIDEOS / PHOTOS ===================
export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    search?: string;
    mediaType?: "all" | "image" | "video" | "text";
    filter?: "all" | "hidden" | "pinned" | "reported";
    page?: number;
    pageSize?: number;
  }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 0;
    const size = data.pageSize ?? 20;
    let q = supabaseAdmin
      .from("posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * size, page * size + size - 1);
    if (data.mediaType && data.mediaType !== "all") q = q.eq("media_type", data.mediaType);
    if (data.filter === "hidden") q = q.eq("is_hidden", true);
    if (data.filter === "pinned") q = q.eq("is_pinned", true);
    if (data.search) q = q.ilike("caption", `%${data.search}%`);
    let { data: rows, count, error } = await q;
    if (error) throw error;

    if (data.filter === "reported") {
      const { data: reportedIds } = await supabaseAdmin.from("post_reports").select("post_id");
      const ids = new Set((reportedIds ?? []).map((r: any) => r.post_id));
      rows = (rows ?? []).filter((r: any) => ids.has(r.id));
    }

    // Manually attach profiles (no FK declared between posts.user_id and profiles)
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const out = (rows ?? []).map((r: any) => ({ ...r, profiles: pmap.get(r.user_id) ?? null }));
    return { rows: out, count: count ?? 0 };
  });


export const updatePostFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string; is_hidden?: boolean; is_pinned?: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Record<string, unknown> = {};
    if (data.is_hidden !== undefined) update.is_hidden = data.is_hidden;
    if (data.is_pinned !== undefined) update.is_pinned = data.is_pinned;
    const { error } = await supabaseAdmin.from("posts").update(update as any).eq("id", data.postId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "update_post_flag", "post", data.postId, update);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("posts").delete().eq("id", data.postId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "delete_post", "post", data.postId);
    return { ok: true };
  });

// =================== COMMENTS ===================
export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 0;
    const size = data.pageSize ?? 20;
    let q = supabaseAdmin
      .from("post_comments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * size, page * size + size - 1);
    if (data.search) q = q.ilike("content", `%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return { rows: (rows ?? []).map((r: any) => ({ ...r, profiles: pmap.get(r.user_id) ?? null })), count: count ?? 0 };
  });


export const updateCommentFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commentId: string; is_hidden: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("post_comments")
      .update({ is_hidden: data.is_hidden })
      .eq("id", data.commentId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "update_comment", "comment", data.commentId, { is_hidden: data.is_hidden });
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commentId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("post_comments").delete().eq("id", data.commentId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "delete_comment", "comment", data.commentId);
    return { ok: true };
  });

// =================== REPORTS ===================
export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason?: string; status?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 0;
    const size = data.pageSize ?? 20;
    let q = supabaseAdmin
      .from("post_reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * size, page * size + size - 1);
    if (data.reason) q = q.eq("reason", data.reason);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    const postIds = Array.from(new Set((rows ?? []).map((r: any) => r.post_id).filter(Boolean)));
    const reporterIds = Array.from(new Set((rows ?? []).map((r: any) => r.reporter_id).filter(Boolean)));
    const [{ data: posts }, { data: reporters }] = await Promise.all([
      postIds.length
        ? supabaseAdmin.from("posts").select("id, caption, media_url, media_type, user_id").in("id", postIds)
        : Promise.resolve({ data: [] as any[] } as any),
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("id, display_name").in("id", reporterIds)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);
    const pmap = new Map((posts ?? []).map((p: any) => [p.id, p]));
    const rmap = new Map((reporters ?? []).map((r: any) => [r.id, r]));
    return {
      rows: (rows ?? []).map((r: any) => ({
        ...r,
        posts: pmap.get(r.post_id) ?? null,
        reporter: rmap.get(r.reporter_id) ?? null,
      })),
      count: count ?? 0,
    };
  });


export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reportId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("post_reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.reportId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "resolve_report", "report", data.reportId);
    return { ok: true };
  });

// =================== MARRIAGE ===================
export const listMarriage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 0;
    const size = data.pageSize ?? 20;
    let q = supabaseAdmin
      .from("marriage_profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * size, page * size + size - 1);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return { rows: (rows ?? []).map((r: any) => ({ ...r, profiles: pmap.get(r.user_id) ?? null })), count: count ?? 0 };
  });


export const updateMarriageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string; status: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("marriage_profiles")
      .update({ status: data.status })
      .eq("id", data.profileId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "marriage_status", "marriage", data.profileId, { status: data.status });
    return { ok: true };
  });

export const deleteMarriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("marriage_profiles").delete().eq("id", data.profileId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "delete_marriage", "marriage", data.profileId);
    return { ok: true };
  });

// =================== CHAT MODERATION ===================
export const listMessageReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertModOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("message_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const msgIds = Array.from(new Set((data ?? []).map((r: any) => r.message_id).filter(Boolean)));
    const reporterIds = Array.from(new Set((data ?? []).map((r: any) => r.reporter_id).filter(Boolean)));
    const [{ data: msgs }, { data: reporters }] = await Promise.all([
      msgIds.length
        ? supabaseAdmin.from("messages").select("id, content, sender_id, recipient_id, created_at").in("id", msgIds)
        : Promise.resolve({ data: [] as any[] } as any),
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("id, display_name").in("id", reporterIds)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);
    const mmap = new Map((msgs ?? []).map((m: any) => [m.id, m]));
    const rmap = new Map((reporters ?? []).map((r: any) => [r.id, r]));
    return {
      rows: (data ?? []).map((r: any) => ({
        ...r,
        messages: mmap.get(r.message_id) ?? null,
        reporter: rmap.get(r.reporter_id) ?? null,
      })),
    };
  });


export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("messages").delete().eq("id", data.messageId);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "delete_message", "message", data.messageId);
    return { ok: true };
  });

// =================== NOTIFICATIONS ===================
export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; userIds?: string[]; broadcast: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_notifications").insert({
      title: data.title,
      body: data.body,
      target_user_ids: data.broadcast ? null : data.userIds ?? [],
      broadcast: data.broadcast,
      sent_by: context.userId,
    });
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "send_notification", "notification", undefined, {
      title: data.title,
      broadcast: data.broadcast,
      count: data.userIds?.length,
    });
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return { rows: data ?? [] };
  });

// =================== SETTINGS ===================
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ ...data, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", 1);
    if (error) throw error;
    await logAction(supabaseAdmin, context.userId, "update_settings", "settings", "1");
    return { ok: true };
  });

// =================== SECURITY / AUDIT ===================
export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number; pageSize?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 0;
    const size = data.pageSize ?? 50;
    const { data: rows, count } = await supabaseAdmin
      .from("admin_activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * size, page * size + size - 1);
    const adminIds = Array.from(new Set((rows ?? []).map((r: any) => r.admin_id).filter(Boolean)));
    const { data: admins } = adminIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", adminIds)
      : { data: [] as any[] };
    const amap = new Map((admins ?? []).map((a: any) => [a.id, a]));
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, admin: amap.get(r.admin_id) ?? null })),
      count: count ?? 0,
    };
  });

export const getLoginHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_login_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return { rows: (data ?? []).map((r: any) => ({ ...r, user: pmap.get(r.user_id) ?? null })) };
  });


export const getFailedLogins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_failed_logins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return { rows: data ?? [] };
  });
