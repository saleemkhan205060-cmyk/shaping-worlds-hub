import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    try {
      const { data, error } = await supabase.auth.getSession();

      if (!error) {
        token = data.session?.access_token;
      }
    } catch {
      // Auth must never block the RPC or freeze the UI.
      token = undefined;
    }

    return next({
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });
  },
);
```
