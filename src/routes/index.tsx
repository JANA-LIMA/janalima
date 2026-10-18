import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
  head: () => ({
    meta: [
      { title: "Banda Jana Lima" },
      { name: "description", content: "Repertório, blocos de VS, shows e ensaios da banda de Jana Lima." },
      { property: "og:title", content: "Banda Jana Lima" },
      { property: "og:description", content: "Repertório, blocos de VS, shows e ensaios da banda de Jana Lima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
