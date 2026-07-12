import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rook & Roll — Play Chess",
    short_name: "Rook & Roll",
    description:
      "A fast, modern place to play chess. Pass-and-play, bots, and online — original board, original pieces, no clutter.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e1117",
    theme_color: "#0e1117",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
