import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flashcards",
    short_name: "Flashcards",
    description: "Flashcards com repetição espaçada (FSRS).",
    start_url: "/decks",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#4f46e5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
