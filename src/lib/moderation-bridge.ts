import { supabase } from "@/integrations/supabase/client";
import { isNativeShell } from "@/lib/native-plugins";
import { PUBLISHED_ORIGIN } from "@/lib/oauth-origin";
import { moderateUploadedMedia, publishPost } from "@/lib/moderate.functions";

export type ModerationSurface =
  | "avatar"
  | "cover"
  | "chat_image"
  | "chat_video"
  | "comment_image"
  | "thumbnail"
  | "other";

async function callNative(payload: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You must be signed in");
  const res = await fetch(`${PUBLISHED_ORIGIN}/api/public/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as any)?.error ?? "Moderation failed");
  return json as any;
}

/** Publish a feed post through moderation (works on web and inside the native shell). */
export async function publishModeratedPost(data: Parameters<typeof publishPost>[0] extends never ? any : any) {
  if (isNativeShell()) return callNative({ action: "publish", ...data });
  return (await publishPost({ data })) as any;
}

/**
 * Screen an already-uploaded file (profile photo, cover, thumbnail, chat media).
 * Returns `{ safe: false, reason }` when the file was rejected — the file is
 * deleted server-side, so callers must NOT persist its URL in that case.
 */
export async function moderateMedia(input: {
  bucket: "media" | "message-media";
  path: string;
  mediaType: "image" | "video";
  surface: ModerationSurface;
  framePath?: string | null;
}): Promise<{ safe: boolean; reason?: string }> {
  if (isNativeShell()) return callNative({ action: "media", ...input });
  return (await moderateUploadedMedia({ data: input as any })) as any;
}

/** Friendly warning shown to the user when their upload is rejected. */
export function moderationWarning(reason?: string) {
  return `This ${"file"} was rejected by our safety filter${reason ? ` (${reason})` : ""}. Sexy, nude or otherwise inappropriate content is not allowed. Please choose a different photo or video.`;
}
