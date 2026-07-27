import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "app.lovable.vip_life.twa",
      sha256_cert_fingerprints: [
        "FB:CA:01:19:41:8D:7B:48:F2:64:C4:4C:B8:C2:1B:30:51:3F:22:F0:6C:36:D6:86:8F:B7:A9:4E:2E:82:23:28",
      ],
    },
  },
];

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(ASSETLINKS, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
