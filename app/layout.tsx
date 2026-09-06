import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { ChromeGate } from '../components/ChromeGate';
import { createClient } from './lib/supabase/server';
import { BRAND_HEADER, BRAND_META, DEFAULT_BRAND, isBrand, type Brand } from './lib/brand';

/** Liest die Marke, die `proxy.ts` als Request-Header mitgeschickt hat. */
async function currentBrand(): Promise<Brand> {
  const value = (await headers()).get(BRAND_HEADER);
  return isBrand(value) ? value : DEFAULT_BRAND;
}

export async function generateMetadata(): Promise<Metadata> {
  const meta = BRAND_META[await currentBrand()];
  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL(meta.origin),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const brand = await currentBrand();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Admin-Flag aus dem Profil ziehen — nur dann zeigt die Nav den /coach Link.
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = !!profile?.is_admin;
  }

  return (
    <html lang="de" data-brand={brand}>
      <head>
        {/* Gym-Fonts kommen weiter vom Google-CDN. Die Schule bringt ihre
            eigenen woff2 mit (app/fonts-schule.css) — kein Fremd-Request. */}
        {brand === 'schule' && (
          <>
            <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/schule/fraunces-regular-latin.woff2" />
            <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="/fonts/schule/spectral-regular-300-latin.woff2" />
          </>
        )}
        {brand === 'gym' && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
              href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Barlow+Condensed:wght@300;400;600;700&display=swap"
              rel="stylesheet"
            />
          </>
        )}
      </head>
      <body>
        <ChromeGate hideOn={['/auth']}>
          <Nav isAuthenticated={isAuthenticated} isAdmin={isAdmin} brand={brand} />
        </ChromeGate>
        {children}
        <ChromeGate hideOn={['/auth']}>
          <Footer brand={brand} />
        </ChromeGate>
        <Analytics />
      </body>
    </html>
  );
}
