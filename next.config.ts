import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Backward-compat redirects nach Route-Rename (Schule → Anleitung, Bibliothek → Glossar).
  // Permanent (308) damit Suchmaschinen + Bookmarks die neuen URLs übernehmen.
  async redirects() {
    return [
      { source: '/schule', destination: '/anleitung', permanent: true },
      { source: '/bibliothek', destination: '/glossar', permanent: true },
      { source: '/bibliothek/:path*', destination: '/glossar/:path*', permanent: true },
    ]
  },
};

export default nextConfig;
