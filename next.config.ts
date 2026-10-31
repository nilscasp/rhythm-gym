import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Das RF-1.5-Begleit-PDF wird zur Laufzeit gelesen (nur für Eingeschriebene),
  // liegt also nicht in public/ — ohne diesen Eintrag fehlt es im Vercel-Bundle.
  outputFileTracingIncludes: {
    '/training/rhythmusfundament-1-5/fingerpyramide': ['./content/rhythmusfundament-1-5/**'],
  },
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
