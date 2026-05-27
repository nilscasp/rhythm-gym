import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { ChromeGate } from '../components/ChromeGate';
import { createClient } from './lib/supabase/server';

export const metadata: Metadata = {
  title: 'Rhythm Gym — Train Your Rhythm',
  description:
    'Tägliches Rhythmus-Training für Handpan-Spieler. Bibliothek, Patterns und ein Tool zum Üben.',
  metadataBase: new URL('https://www.rhythmgym.io'),
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Barlow+Condensed:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ChromeGate hideOn={['/auth']}>
          <Nav isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
        </ChromeGate>
        {children}
        <ChromeGate hideOn={['/auth']}>
          <Footer />
        </ChromeGate>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
