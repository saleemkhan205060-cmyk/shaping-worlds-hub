import { createFileRoute } from "@tanstack/react-router";
import { ContentTable } from "./admin.posts";
export const Route = createFileRoute("/admin/photos")({
  component: () => <ContentTable mediaType="image" title="Photo Management" />,
});
