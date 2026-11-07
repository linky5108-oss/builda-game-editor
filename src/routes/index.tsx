import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Editor de mapas de píxeles y UI" },
      { name: "description", content: "Editor de mapas pixel art con terrenos, capas, objetos y UI en el navegador." },
      { property: "og:title", content: "Editor de mapas de píxeles y UI" },
      { property: "og:description", content: "Editor de mapas pixel art con terrenos, capas, objetos y UI en el navegador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/editor/地图编辑器.html"
      title="Editor de mapas"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
