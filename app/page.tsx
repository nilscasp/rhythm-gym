import Link from 'next/link';
import { headers } from 'next/headers';
import { Waveform } from '../components/Waveform';
import { createClient } from './lib/supabase/server';
import { BRAND_HEADER, DEFAULT_BRAND, isBrand } from './lib/brand';
import { LANDING_CSS } from './_landing/landing-css';
import { LandingSchule } from './_schule/LandingSchule';

const tickerItems = [
  'Daily Practice',
  '600+ Pattern',
  'Accountability System',
  'Live Group Calls',
  'Rhythm Fundament',
  'Handpan Training',
  'Spaced Repetition',
  'Community',
];

const pillars = [
  {
    n: '01',
    title: 'Daily Workouts',
    desc: '10–15 Minuten täglich. Strukturierte Übungsvideos die auf vorherigen aufbauen. Eigenes Tempo, jederzeit abrufbar.',
  },
  {
    n: '02',
    title: 'Pattern Library',
    desc: '600+ mathematisch generierte Rhythmus-Pattern, kuratiert nach Niveau und musikalischer Relevanz. Dein tägliches Equipment.',
  },
  {
    n: '03',
    title: 'Training Partner',
    desc: 'Ein Accountability-Partner schickt dir täglich eine kurze Sprachnachricht. Kein Call, kein Stress — nur gemeinsam dranbleiben.',
  },
  {
    n: '04',
    title: 'Live Sessions',
    desc: 'Monatliche Group Calls mit Nils. Alle aufgezeichnet. Fragen stellen, Fortschritt teilen, gemeinsam wachsen.',
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Logged-in CTAs jump straight into the hub; logged-out CTAs go to signup.
  const ctaHref = isAuthenticated ? '/training' : '/auth/login?mode=signup';
  const ctaHeroLabel = isAuthenticated ? 'Weiter zum Training' : 'Kostenlos starten';
  const ctaFreeLabel = isAuthenticated ? 'Zum Training' : 'Kostenlos starten';
  const ctaPremiumLabel = isAuthenticated ? 'Vollzugang öffnen' : 'Jetzt Mitglied werden';
  const ctaManifestoLabel = isAuthenticated ? 'Weiter zum Training' : 'Training beginnen';

  const brandHeader = (await headers()).get(BRAND_HEADER);
  const brand = isBrand(brandHeader) ? brandHeader : DEFAULT_BRAND;

  if (brand === 'schule') {
    return <LandingSchule isAuthenticated={isAuthenticated} />;
  }

  return (
    <>
      <style>{LANDING_CSS}</style>

      <main className="lp">
        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-eyebrow">Für Handpan-Spieler — von einem Drummer</div>
          <h1>
            TRAIN YOUR
            <br />
            <em>RHYTHM.</em>
          </h1>
          <p className="lp-hero-sub">
            Nicht noch ein Kurs. Ein <strong>tägliches Training</strong> — wie ein Gym für dein
            rhythmisches Verständnis. Pattern verstehen, nicht kopieren.
          </p>
          <div className="lp-hero-actions">
            <Link href={ctaHref} className="lp-btn-primary">
              {ctaHeroLabel}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h12M8 2l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <a href="#was-ist" className="lp-btn-secondary">
              Wie es funktioniert
            </a>
          </div>
        </section>

        {/* WAVEFORM */}
        <Waveform />

        {/* TICKER */}
        <div className="lp-ticker">
          <div className="lp-ticker-inner">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <div key={i} className="lp-ticker-item">
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="lp-stats">
          <div className="lp-stat">
            <div className="lp-stat-number">
              600<span style={{ color: 'var(--amber)' }}>+</span>
            </div>
            <div className="lp-stat-label">Pattern im Library</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-number">6</div>
            <div className="lp-stat-label">Wochen Transformation</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-number">
              15
              <span style={{ color: 'var(--amber)', fontSize: 28 }}>min</span>
            </div>
            <div className="lp-stat-label">Daily Training</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-number">
              9<span style={{ color: 'var(--amber)' }}>€</span>
            </div>
            <div className="lp-stat-label">Pro Monat</div>
          </div>
        </div>

        {/* WHAT IS IT */}
        <section className="lp-section" id="was-ist">
          <div className="lp-section-eyebrow">Was ist Rhythm Gym?</div>
          <h2>
            DAS GYM FÜR
            <br />
            DEIN <em>TIMING.</em>
          </h2>
          <div className="lp-two-col">
            <div className="lp-section-body">
              <p>
                Ein Fitnessstudio gehst du nicht einmal im Monat. Du gehst{' '}
                <strong>jeden Tag</strong> — kurz, fokussiert, konstant. Genau so funktioniert
                Rhythm Gym.
              </p>
              <p>
                Keine langen Theorie-Videos. Kein Konsumieren. Stattdessen:{' '}
                <strong>tägliche Trainingseinheiten</strong>, die dein rhythmisches Verständnis
                aufbauen wie Muskelgedächtnis.
              </p>
              <p>
                Als Drummer und Perkussionist habe ich eines gelernt: Rhythmus ist kein Talent.
                Es ist eine{' '}
                <strong>Fähigkeit — erlernbar, trainierbar, messbar.</strong>
              </p>
            </div>
            <div className="lp-pillars">
              {pillars.map((p) => (
                <div key={p.n} className="lp-pillar">
                  <div className="lp-pillar-num">{p.n}</div>
                  <div>
                    <div className="lp-pillar-title">{p.title}</div>
                    <div className="lp-pillar-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="lp-pricing">
          <div className="lp-section-eyebrow">Mitgliedschaft</div>
          <h2>
            WÄHLE DEIN
            <br />
            <em>LEVEL.</em>
          </h2>
          <div className="lp-pricing-grid">
            <div className="lp-price-card">
              <div className="lp-price-tier">Free Member</div>
              <div className="lp-price-amount">
                0 <span>€/Monat</span>
              </div>
              <div className="lp-price-desc">Rein schnuppern. Kein Kreditkartenzwang.</div>
              <ul className="lp-price-features">
                <li>50 Pattern aus dem Library</li>
                <li>Level 1 Training (Woche 1)</li>
                <li>Metronom-Tool</li>
                <li className="muted">Pattern-Speicherung</li>
                <li className="muted">Fortschritts-Tracking</li>
                <li className="muted">Community &amp; Group Calls</li>
              </ul>
              <Link href={ctaHref} className="lp-btn-outline">
                {ctaFreeLabel}
              </Link>
            </div>
            <div className="lp-price-card lp-featured">
              <div className="lp-price-badge">Empfohlen</div>
              <div className="lp-price-tier">Premium Member</div>
              <div className="lp-price-amount">
                9 <span>€/Monat</span>
              </div>
              <div className="lp-price-desc">
                Vollständiger Zugang. Täglich trainieren, dauerhaft wachsen.
              </div>
              <ul className="lp-price-features">
                <li>600+ Pattern — vollständig</li>
                <li>Alle Training-Level (1–5)</li>
                <li>16-Step Grid mit Speicherung</li>
                <li>Fortschritts-Tracking &amp; Streaks</li>
                <li>Accountability Partner Matching</li>
                <li>Monatliche Live-Session mit Nils</li>
              </ul>
              <Link href={ctaHref} className="lp-btn-filled">
                {ctaPremiumLabel}
              </Link>
            </div>
          </div>
        </section>

        {/* MANIFESTO */}
        <section className="lp-manifesto">
          <div className="lp-manifesto-quote">
            „Rythmik ist nicht was du fühlst.
            <br />
            Es ist was du <em>trainierst.</em>"
          </div>
          <div className="lp-manifesto-sub">— Nils Caspar, Drummer &amp; Gründer von Rhythm Gym</div>
          <div style={{ marginTop: 48 }}>
            <Link
              href={ctaHref}
              className="lp-btn-primary"
              style={{ display: 'inline-flex' }}
            >
              {ctaManifestoLabel}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ marginLeft: 10 }}
              >
                <path
                  d="M1 7h12M8 2l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
