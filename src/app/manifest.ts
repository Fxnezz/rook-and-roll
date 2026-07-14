import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sam's Arcade — Chess, Strategy & More",
    short_name: "Sam's Arcade",
    description:
      "Play chess online, challenge bots, train your skills, and explore a growing arcade of original games.",
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
