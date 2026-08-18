import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import LogRocket from "logrocket";

if (typeof window !== "undefined") {
  LogRocket.init("p3epoj/vip-life-app", {
    // Default batching waits several seconds before shipping events, which made
    // sessions/errors show up in the dashboard with a long delay. Flush often.
    uploadTimeInterval: 1000,
    shouldDetectExceptions: true,
    network: { isEnabled: true },
    console: { isEnabled: true, shouldAggregateConsoleErrors: true },
    dom: { isEnabled: true },
  });
}


export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
