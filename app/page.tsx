import Link from 'next/link';
import { Waveform } from '../components/Waveform';

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

export default function LandingPage() {
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
            <Link href="/training" className="lp-btn-primary">
              Kostenlos starten
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
              <Link href="/training" className="lp-btn-outline">
                Kostenlos starten
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
              <Link href="/training" className="lp-btn-filled">
                Jetzt Mitglied werden
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
              href="/training"
              className="lp-btn-primary"
              style={{ display: 'inline-flex' }}
            >
              Training beginnen
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

const LANDING_CSS = `
.lp { color: var(--text); }

/* ─── HERO ─── */
.lp-hero {
  min-height: 70vh;
  display: flex; flex-direction: column;
  justify-content: center;
  padding: 80px 24px 60px;
  position: relative;
  overflow: hidden;
}
.lp-hero::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.lp-hero::after {
  content: '';
  position: absolute;
  top: -200px; right: -200px;
  width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.lp-hero-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 24px;
  display: flex; align-items: center; gap: 12px;
  animation: fade-up 0.7s ease both;
}
.lp-hero-eyebrow::before {
  content: '';
  display: block; width: 32px; height: 1px;
  background: var(--amber);
}
.lp-hero h1 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(56px, 10vw, 140px);
  line-height: 0.92;
  letter-spacing: -1px;
  color: var(--cream);
  max-width: 900px;
  position: relative; z-index: 1;
  animation: fade-up 0.7s ease both;
}
.lp-hero h1 em { font-style: normal; color: var(--amber); display: block; }
.lp-hero-sub {
  margin-top: 36px;
  font-size: 18px;
  font-weight: 300;
  line-height: 1.65;
  color: var(--muted);
  max-width: 480px;
  position: relative; z-index: 1;
  animation: fade-up 0.7s 0.15s ease both;
}
.lp-hero-sub strong { color: var(--text); font-weight: 600; }
.lp-hero-actions {
  margin-top: 48px;
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  position: relative; z-index: 1;
  animation: fade-up 0.7s 0.3s ease both;
}

.lp-btn-primary {
  background: var(--amber);
  color: var(--black);
  padding: 16px 36px;
  border-radius: 2px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  text-decoration: none;
  transition: all 0.2s;
  display: inline-flex; align-items: center; gap: 10px;
}
.lp-btn-primary:hover {
  background: var(--cream);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(245,166,35,0.3);
}
.lp-btn-secondary {
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px; letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  padding-bottom: 2px;
  transition: color 0.2s, border-color 0.2s;
}
.lp-btn-secondary:hover { color: var(--amber); border-color: var(--amber); }

/* ─── WAVEFORM ─── */
.lp-waveform-section { padding: 0 24px 80px; position: relative; z-index: 1; }
.lp-waveform-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 16px;
}
.lp-waveform-container { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
.lp-beat-labels { display: flex; gap: 6px; margin-top: 8px; }
.lp-beat-labels span {
  flex: 1; text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px; color: var(--border);
}
.lp-beat-labels span.show { color: var(--muted); }

/* ─── TICKER ─── */
.lp-ticker {
  overflow: hidden;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 12px 0;
  background: var(--dark);
}
.lp-ticker-inner {
  display: flex;
  white-space: nowrap;
  animation: ticker-scroll 30s linear infinite;
}
.lp-ticker-item {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px; letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 40px;
  display: flex; align-items: center; gap: 16px;
}
.lp-ticker-item::after { content: '◆'; color: var(--amber); font-size: 8px; }

/* ─── STATS ─── */
.lp-stats {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 32px 24px;
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0;
}
.lp-stat { padding: 0 16px; border-right: 1px solid var(--border); }
.lp-stat:first-child { padding-left: 0; }
.lp-stat:last-child { border-right: none; }
.lp-stat-number {
  font-family: 'Anton', sans-serif;
  font-size: 48px; line-height: 1;
  color: var(--cream);
}
.lp-stat-label {
  font-size: 12px; color: var(--muted);
  margin-top: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 1px; text-transform: uppercase;
}

/* ─── SECTION (WHAT IS) ─── */
.lp-section { padding: 100px 24px; }
.lp-section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px; letter-spacing: 4px;
  text-transform: uppercase; color: var(--amber);
  margin-bottom: 20px;
}
.lp-section h2,
.lp-pricing h2 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 0.95; color: var(--cream);
  max-width: 700px;
}
.lp-section h2 em,
.lp-pricing h2 em { font-style: normal; color: var(--amber); }
.lp-two-col {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 80px; margin-top: 60px; align-items: start;
}
.lp-section-body { font-size: 17px; line-height: 1.75; color: var(--muted); }
.lp-section-body strong { color: var(--text); font-weight: 600; }
.lp-section-body p + p { margin-top: 20px; }

.lp-pillars { display: flex; flex-direction: column; gap: 2px; }
.lp-pillar {
  background: var(--card); border: 1px solid var(--border);
  padding: 28px 32px;
  display: flex; align-items: flex-start; gap: 20px;
  transition: border-color 0.2s, transform 0.2s;
}
.lp-pillar:hover { border-color: var(--amber); transform: translateX(4px); }
.lp-pillar-num {
  font-family: 'Anton', sans-serif;
  font-size: 32px; color: var(--border);
  line-height: 1; min-width: 40px;
  transition: color 0.2s;
}
.lp-pillar:hover .lp-pillar-num { color: var(--amber); }
.lp-pillar-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 18px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase;
  color: var(--cream); margin-bottom: 8px;
}
.lp-pillar-desc { font-size: 14px; color: var(--muted); line-height: 1.6; }

/* ─── PRICING ─── */
.lp-pricing {
  padding: 100px 24px;
  background: var(--dark);
  border-top: 1px solid var(--border);
}
.lp-pricing-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 2px; margin-top: 60px; max-width: 800px;
}
.lp-price-card {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 40px;
  position: relative;
}
.lp-featured { border-color: var(--amber); }
.lp-price-badge {
  position: absolute; top: -1px; right: 28px;
  background: var(--amber); color: var(--black);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  padding: 5px 12px;
}
.lp-price-tier {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px; letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--muted); margin-bottom: 20px;
}
.lp-price-amount {
  font-family: 'Anton', sans-serif;
  font-size: 56px; line-height: 1;
  color: var(--cream);
}
.lp-price-amount span {
  font-family: 'Barlow', sans-serif;
  font-size: 20px; font-weight: 300;
  color: var(--muted);
}
.lp-price-desc {
  font-size: 14px; color: var(--muted);
  margin: 16px 0 28px; line-height: 1.6;
}
.lp-price-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
.lp-price-features li {
  font-size: 14px; color: var(--text);
  display: flex; align-items: center; gap: 10px;
}
.lp-price-features li::before {
  content: '→'; color: var(--amber);
  font-size: 12px; min-width: 16px;
}
.lp-price-features li.muted { color: var(--muted); }
.lp-price-features li.muted::before { color: var(--border); }
.lp-btn-outline {
  display: block; text-align: center;
  border: 1px solid var(--border); color: var(--muted);
  padding: 13px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px; letter-spacing: 2px;
  text-transform: uppercase; text-decoration: none;
  transition: all 0.2s; border-radius: 2px;
}
.lp-btn-outline:hover { border-color: var(--amber); color: var(--amber); }
.lp-btn-filled {
  display: block; text-align: center;
  background: var(--amber); color: var(--black);
  padding: 13px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  text-decoration: none;
  transition: all 0.2s; border-radius: 2px;
}
.lp-btn-filled:hover { background: var(--cream); }

/* ─── MANIFESTO ─── */
.lp-manifesto {
  padding: 120px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.lp-manifesto::before {
  content: 'RHYTHM';
  position: absolute;
  font-family: 'Anton', sans-serif;
  font-size: 300px;
  color: rgba(245,166,35,0.03);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  pointer-events: none;
  letter-spacing: -10px;
}
.lp-manifesto-quote {
  font-family: 'Anton', sans-serif;
  font-size: clamp(28px, 4vw, 54px);
  line-height: 1.1; color: var(--cream);
  max-width: 800px; margin: 0 auto;
  position: relative; z-index: 1;
}
.lp-manifesto-quote em { font-style: normal; color: var(--amber); }
.lp-manifesto-sub {
  margin-top: 28px;
  font-size: 16px; color: var(--muted);
  position: relative; z-index: 1;
}

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .lp-hero { padding: 60px 20px 40px; min-height: 60vh; }
  .lp-section, .lp-pricing { padding: 60px 20px; }
  .lp-two-col { grid-template-columns: 1fr; gap: 40px; }
  .lp-stats { grid-template-columns: repeat(2, 1fr); padding: 24px 20px; }
  .lp-stat { padding: 16px; border-bottom: 1px solid var(--border); }
  .lp-stat:nth-child(2n) { border-right: none; }
  .lp-stat:nth-last-child(-n+2) { border-bottom: none; }
  .lp-stat-number { font-size: 36px; }
  .lp-pricing-grid { grid-template-columns: 1fr; }
  .lp-manifesto { padding: 80px 20px; }
}
`;
