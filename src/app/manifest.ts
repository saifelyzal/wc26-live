import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "World Cup 26 Live",
    short_name: "WC26 Live",
    description: "Live World Cup 26 scores, schedules, groups, bracket, and stats.",
    lang: "en",
    dir: "ltr",
    start_url: "/en",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#02261c",
    theme_color: "#053a2b",
    categories: ["sports", "news", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Live scores",
        short_name: "Live",
        url: "/en",
      },
      {
        name: "Match schedule",
        short_name: "Matches",
        url: "/en/matches",
      },
      {
        name: "Group standings",
        short_name: "Groups",
        url: "/en/groups",
      },
    ],
  };
}
