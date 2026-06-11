import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory makes Next infer the wrong
  // workspace root; pin it to this app.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "crests.football-data.org" }],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
