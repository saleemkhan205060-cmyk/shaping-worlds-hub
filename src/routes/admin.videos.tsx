import { createFileRoute } from "@tanstack/react-router";
import { ContentTable } from "./admin.posts";
export const Route = createFileRoute("/admin/videos")({
  component: () => <ContentTable mediaType="video" title="Video Management" />,
});
