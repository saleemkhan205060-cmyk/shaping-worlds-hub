import { createFileRoute } from "@tanstack/react-router";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.lovable.vip_life.twa";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: PLAY_STORE_URL,
      },
    });
  },
  component: () => null,
});
