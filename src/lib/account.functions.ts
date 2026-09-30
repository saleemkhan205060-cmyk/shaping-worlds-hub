import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Deletes the signed-in user's own account. Never accepts a userId from the client.
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const steps: Array<[string, string, string]> = [
      ["messages", "sender_id", uid],
      ["messages", "recipient_id", uid],
      ["follows", "follower_id", uid],
      ["follows", "following_id", uid],
      ["user_blocks", "blocker_id", uid],
      ["user_blocks", "blocked_id", uid],
      ["marriage_photos", "user_id", uid],
      ["marriage_profiles", "user_id", uid],
      ["product_reports", "reporter_id", uid],
    ];
    for (const [table, col, val] of steps) {
      const { error } = await db.from(table).delete().eq(col, val);
      if (error) {
        console.error(`deleteOwnAccount: ${table}.${col}`, error);
        throw new Error("Could not delete your account data. Please try again.");
      }
    }

    // Storage: every upload lives under "<userId>/..." in these buckets.
    for (const bucket of ["media", "message-media"]) {
      try {
        const paths: string[] = [];
        const walk = async (prefix: string, depth: number) => {
          if (depth > 5) return;
          let offset = 0;
          for (;;) {
            const { data, error } = await supabaseAdmin.storage
              .from(bucket)
              .list(prefix, { limit: 1000, offset });
            if (error || !data?.length) return;
            for (const item of data) {
              const full = `${prefix}/${item.name}`;
              if (item.id) paths.push(full);
              else await walk(full, depth + 1);
            }
            if (data.length < 1000) return;
            offset += 1000;
          }
        };
        await walk(uid, 0);
        for (let i = 0; i < paths.length; i += 500) {
          await supabaseAdmin.storage.from(bucket).remove(paths.slice(i, i + 500));
        }
      } catch (e) {
        console.error(`deleteOwnAccount: storage ${bucket}`, e);
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) {
      console.error("deleteOwnAccount: auth delete", error);
      throw new Error("Could not delete your account. Please try again.");
    }
    return { ok: true };
  });
