import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'Rhythm Gym — Train Your Rhythm',
  description:
    'Tägliches Rhythmus-Training für Handpan-Spieler. Bibliothek, Patterns und ein Tool zum Üben.',
  metadataBase: new URL('https://www.rhythmgym.io'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
