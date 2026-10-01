import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Flashcards",
    short_name: "Flashcards",
    description: "Flashcards com repetição espaçada (FSRS).",
    lang: "pt-PT",
    start_url: "/decks",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [{ name: "Rever tudo", url: "/review/all", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
