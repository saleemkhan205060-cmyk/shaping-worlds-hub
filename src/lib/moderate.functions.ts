import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The single, atomic publish path. Moderates the media, then either inserts a post
 * or logs a blocked entry for admin review. All uploads MUST go through this — the
 * client cannot bypass moderation because it does not insert into `posts` directly.
 * (The native shell calls the same engine over `/api/public/moderate`.)
 */
export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    mediaPath: string;
    mediaType: "image" | "video";
    moderationImageUrl: string; // image URL, or captured frame URL for videos
    title?: string | null;
    caption?: string | null;
    category?: string | null;
    isPrivate?: boolean;
    thumbnailUrl?: string | null;
    thumbnailTitle?: string | null;
  }) => {
    if (!input || typeof input.mediaPath !== "string") throw new Error("Missing mediaPath");
    if (input.mediaType !== "image" && input.mediaType !== "video") throw new Error("Invalid mediaType");
    if (!/^https?:\/\//i.test(input.moderationImageUrl)) throw new Error("Invalid moderationImageUrl");
    return {
      mediaPath: input.mediaPath.slice(0, 500),
      mediaType: input.mediaType,
      moderationImageUrl: input.moderationImageUrl.slice(0, 2000),
      title: (input.title ?? "").slice(0, 200) || null,
      caption: (input.caption ?? "").slice(0, 2000) || null,
      category: (input.category ?? "").slice(0, 60) || null,
      isPrivate: !!input.isPrivate,
      thumbnailUrl: (input.thumbnailUrl ?? "") || null,
      thumbnailTitle: (input.thumbnailTitle ?? "").slice(0, 200) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { runPublishPost } = await import("@/lib/moderation-core.server");
    return runPublishPost(context.supabase as any, context.userId, data);
  });

/**
 * Moderate an image that a user just uploaded to a storage bucket for a surface
 * OTHER than a feed post (avatar, cover photo, post thumbnail, chat attachment).
 * On an unsafe verdict the file is deleted from storage and logged for admin
 * review, so it can never be shown to other users. Callers MUST NOT persist the
 * URL/path anywhere user-facing until this returns `{ safe: true }`.
 */
export const moderateUploadedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    bucket: "media" | "message-media";
    path: string;
    mediaType: "image" | "video";
    surface: "avatar" | "cover" | "chat_image" | "chat_video" | "comment_image" | "thumbnail" | "other";
    /** For videos in private buckets, callers upload a captured frame to the
     *  same bucket and pass its path here so we can moderate the frame. */
    framePath?: string | null;
  }) => {
    if (!input || typeof input.path !== "string" || !input.path) throw new Error("Missing path");
    if (input.bucket !== "media" && input.bucket !== "message-media") throw new Error("Invalid bucket");
    if (input.mediaType !== "image" && input.mediaType !== "video") throw new Error("Invalid mediaType");
    const surfaces = ["avatar", "cover", "chat_image", "chat_video", "comment_image", "thumbnail", "other"] as const;
    if (!surfaces.includes(input.surface as any)) throw new Error("Invalid surface");
    return {
      bucket: input.bucket,
      path: input.path.slice(0, 500),
      mediaType: input.mediaType,
      surface: input.surface,
      framePath: input.framePath ? input.framePath.slice(0, 500) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { runModerateUploadedMedia } = await import("@/lib/moderation-core.server");
    return runModerateUploadedMedia(context.supabase as any, context.userId, data);
  });
