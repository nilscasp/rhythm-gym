import Link from 'next/link';

export const metadata = {
  title: 'Schule — Rhythm Gym',
  description:
    'Wie Rhythm Gym funktioniert: die Handpan-Maschine, das Tagestraining, die Bibliothek. Eine Einführung von Nils Caspar.',
};

const STRIKES = [
  {
    symbol: '.',
    name: 'Pause',
    desc: 'Stille — kein Schlag. Hält das Zeitgerüst, klingt nicht.',
    bg: 'rgba(122,112,96,0.1)',
    color: 'var(--muted)',
  },
  {
    symbol: 'g',
    name: 'Ghostnote',
    desc: 'Leiser Stütz-Schlag, hält den Puls. Hörbar, aber unaufdringlich.',
    bg: 'rgba(213,204,184,0.35)',
    color: 'rgba(213,204,184,0.95)',
  },
  {
    symbol: 'T',
    name: 'Tonfeld',
    desc: 'Melodischer Schlag — ein klingendes Tonfeld auf der Handpan.',
    bg: 'rgba(156,169,138,0.55)',
    color: 'rgba(156,169,138,1)',
  },
  {
    symbol: 'S',
    name: 'Slap',
    desc: 'Perkussiver Akzent mit der ganzen Hand. Trägt die Phrase.',
    bg: 'rgba(245,166,35,0.7)',
    color: 'var(--amber)',
  },
  {
    symbol: 'D',
    name: 'Ding',
    desc: 'Tiefer Bass-Akzent in der Mitte der Pan. Setzt das Fundament.',
    bg: 'rgba(245,237,216,0.95)',
    color: 'var(--cream)',
  },
] as const;

// Demo pattern: shows all five strikes in a typical-feeling 16-step phrase.
const DEMO_PATTERN: (0 | 1 | 2 | 3 | 4)[] = [
  4, 1, 1, 1, 3, 1, 2, 1, 4, 1, 2, 1, 3, 1, 2, 1,
];

const COUNTING = [
  '1', 'e', 'und', 'de',
  '2', 'e', 'und', 'de',
  '3', 'e', 'und', 'de',
  '4', 'e', 'und', 'de',
];

const APP_SECTIONS = [
  {
    href: '/training',
    eyebrow: 'Tag-Player',
    title: 'Training',
    desc:
      'Das Herz für die Beta. Tag 12-22 aus Zyklus 2 — täglich ein anderer Rhythmus, mit Stufen-Variationen und Kombi-Übungen. Hier startest du nach dem Einstieg.',
  },
  {
    href: '/tool',
    eyebrow: 'Handpan-Maschine',
    title: 'Tool',
    desc:
      'Dein offener Canvas. Bau eigene Patterns, lade welche aus dem Training oder den Patterns mit einem Klick rein, spiel sie auf jedem Tempo.',
  },
  {
    href: '/patterns',
    eyebrow: 'Bibliothek',
    title: 'Patterns',
    desc:
      'Stöber durch 81 kuratierte Rhythmen, sortiert nach Archetyp und Charakter. Jeder lädt sich auf Wunsch direkt ins Tool.',
  },
  {
    href: '/bibliothek',
    eyebrow: 'Wissens-Hub',
    title: 'Bibliothek',
    desc:
      'Die sechs konzeptuellen Layer von Zeitbasis bis Praxis — Vokabular für alles, was du im Tool und Training hörst. Plus Vertiefung Breaks und Fills.',
  },
] as const;

const TOOL_FEATURES = [
  {
    title: 'BPM-Slider',
    desc:
      'Tempo zwischen 20 und 160. Voreinstellungen bei 40, 60, 90 und 120 — ein Klick reicht. Während der Wiedergabe änderbar, ohne dass der Loop stoppt.',
  },
  {
    title: 'Handsatz',
    desc:
      'Drei Optionen aus der Course-Welt: Wechselschlag R-L, Wechselschlag L-R, frei. Unter dem Pattern-Grid siehst du eine zweite Reihe, die dir die Hand pro Schritt anzeigt — rot = rechts, amber = links.',
  },
  {
    title: 'Metronom',
    desc:
      'Klingt auf jeder Hauptzählzeit (1, 2, 3, 4) als kurzer Holz-Klick. Default ein — du kannst ihn ausschalten, wenn die Ghostnotes den Puls für dich tragen.',
  },
  {
    title: 'Sub-Klick',
    desc:
      'Ein sehr leiser Sechzehntel-Klick auf jeder Position. Hilft, wenn dein Pattern dünn ist und du das Raster noch nicht im Körper hast. Default aus.',
  },
  {
    title: 'Reset & Copy',
    desc:
      'Reset leert das ganze Grid. Copy legt deinen Pattern als Notation (`.gTSD`-String) in die Zwischenablage — du kannst ihn dir notieren oder mit anderen teilen.',
  },
] as const;

const TRAINING_STEPS = [
  {
    n: '01',
    title: 'Wähle einen Tag',
    desc:
      'Links in der Sidebar siehst du Tag 12 bis Tag 22. Jeder Tag hat Titel und Untertitel — meistens fokussiert auf einen bestimmten Takt oder eine Stufe.',
  },
  {
    n: '02',
    title: 'Pattern anhören',
    desc:
      'In der Mitte erscheinen alle Patterns des Tages: meistens ein Basisrhythmus plus mehrere Stufen-Variationen (perkussiv und melodisch). Klick auf Play unter dem Pattern, das du hören willst.',
  },
  {
    n: '03',
    title: 'Im Tool öffnen',
    desc:
      'Neben dem Play-Button findest du „Im Tool öffnen → ". Damit landet der Pattern komplett im Handpan-Tool — inklusive BPM und Handsatz vom Tag. Du kannst ihn dort verändern, langsamer abspielen oder als Ausgangspunkt für eigene Variationen nutzen.',
  },
  {
    n: '04',
    title: 'Spacebar',
    desc:
      'Wenn ein Pattern läuft, stoppt die Leertaste ihn (und startet ihn auch wieder). Funktioniert nur, wenn kein Textfeld fokussiert ist.',
  },
] as const;

export default function SchulePage() {
  return (
    <>
      <style>{SCHULE_CSS}</style>

      <main className="sch-page">
        <div className="sch-wrap">
          {/* HERO */}
          <header className="sch-hero">
            <div className="sch-hero-kicker">Anleitung</div>
            <h1>
              SO FUNKTIONIERT
              <br />
              <em>RHYTHM GYM.</em>
            </h1>
            <p className="sch-hero-sub">
              Eine Einführung in das, was hinter der Anmeldung wartet — das Tool, das
              Tagestraining, die Bibliothek. Geschrieben für dich, bevor du loslegst,
              und für später, wenn du etwas nachschauen willst.
            </p>
          </header>

          {/* WAS IST DAS? */}
          <section className="sch-section">
            <div className="sch-section-eyebrow">Was ist das hier?</div>
            <h2>
              Ein <em>Gym</em> für dein Timing.
            </h2>
            <div className="sch-prose">
              <p>
                Rhythm Gym ist tägliches Rhythmus-Training — primär für Handpan-Spieler.
                Keine langen Theorie-Videos, kein Konsumieren von Stunden Content.
                Stattdessen ein Vokabular, ein Tool zum Spielen und Hören, und ein
                Tagesplan, der einen rhythmischen Gedanken nach dem nächsten in deinen
                Körper bringt.
              </p>
              <p>
                Du bist gerade in der <strong>Closed Beta</strong>. Das heißt: ich
                (Nils) habe das Tool und den Tag-für-Tag-Plan aus Zyklus 2 freigeschaltet,
                damit du es nutzt, kaputt machst und mir Feedback gibst. Auth, Stripe,
                Streaks und alles weitere kommen später — heute geht es ums Spielen.
              </p>
            </div>
          </section>

          {/* DIE 4 BEREICHE */}
          <section className="sch-section">
            <div className="sch-section-eyebrow">Übersicht</div>
            <h2>Die App in vier Bereichen.</h2>
            <div className="sch-app-grid">
              {APP_SECTIONS.map((a) => (
                <Link key={a.href} href={a.href} className="sch-app-card">
                  <div className="sch-app-eyebrow">{a.eyebrow}</div>
                  <div className="sch-app-title">{a.title}</div>
                  <div className="sch-app-desc">{a.desc}</div>
                  <div className="sch-app-cta">Öffnen →</div>
                </Link>
              ))}
            </div>
          </section>

          {/* DIE FÜNF SCHLÄGE */}
          <section className="sch-section" id="strikes">
            <div className="sch-section-eyebrow">Das Tool · Vokabular</div>
            <h2>
              Fünf Zustände pro Schritt — die <em>Notation</em>.
            </h2>
            <p className="sch-section-lead">
              Jeder der 16 Schritte im Tool kann einen von fünf Zuständen haben. Klick
              auf eine Zelle, um durchzucyclen: Pause → Ghostnote → Tonfeld → Slap →
              Ding → Pause. Die Farben und Symbole sind überall in der App gleich.
            </p>

            <ul className="sch-strike-list">
              {STRIKES.map((s) => (
                <li key={s.symbol} className="sch-strike">
                  <div
                    className="sch-strike-cell"
                    style={{
                      background: s.bg,
                      color: s.color,
                      border: `1px solid ${s.color === 'var(--muted)' ? 'var(--border)' : s.color}`,
                    }}
                    aria-hidden="true"
                  >
                    {s.symbol}
                  </div>
                  <div className="sch-strike-text">
                    <div className="sch-strike-name">
                      {s.name}{' '}
                      <span className="sch-strike-symbol-inline" style={{ color: s.color }}>
                        ({s.symbol})
                      </span>
                    </div>
                    <div className="sch-strike-desc">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="sch-demo">
              <div className="sch-demo-label">Demo · ein typischer 16-Schritte-Bogen</div>
              <div className="sch-demo-grid">
                {DEMO_PATTERN.map((v, i) => {
                  const s = STRIKES[v];
                  return (
                    <div
                      key={i}
                      className={i % 4 === 0 ? 'sch-demo-cell sch-demo-cell--main' : 'sch-demo-cell'}
                      style={{ background: s.bg, color: s.color }}
                      title={`Position ${i + 1} · ${s.name}`}
                    >
                      {s.symbol}
                    </div>
                  );
                })}
              </div>
              <div className="sch-demo-counting">
                {COUNTING.map((c, i) => (
                  <div
                    key={i}
                    className={
                      i % 4 === 0
                        ? 'sch-demo-counting-cell sch-demo-counting-cell--main'
                        : 'sch-demo-counting-cell'
                    }
                  >
                    {c}
                  </div>
                ))}
              </div>
              <p className="sch-demo-caption">
                Die deutsche Zählweise unter dem Grid: <strong>1 e und de · 2 e und de
                · 3 e und de · 4 e und de</strong>. Die Hauptzählzeiten (1, 2, 3, 4)
                sind amber hervorgehoben — der Rest ist die Sechzehntel-Untergliederung.
              </p>
            </div>
          </section>

          {/* WEITERE TOOL-FUNKTIONEN */}
          <section className="sch-section">
            <div className="sch-section-eyebrow">Das Tool · Steuerung</div>
            <h2>Was du außerdem regeln kannst.</h2>
            <div className="sch-features">
              {TOOL_FEATURES.map((f) => (
                <div key={f.title} className="sch-feature">
                  <div className="sch-feature-title">{f.title}</div>
                  <div className="sch-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
            <div className="sch-highlight">
              <div className="sch-highlight-kicker">Tipp</div>
              <p>
                Wenn dein Pattern noch nicht im Körper sitzt: start bei{' '}
                <strong>40 BPM</strong> mit eingeschaltetem <strong>Sub-Klick</strong>.
                Das gibt dir auf jedem Sechzehntel einen Anker. Sobald du den Bogen
                ohne Kleben spielst, schalte den Sub-Klick aus und zieh das Tempo
                schrittweise hoch.
              </p>
            </div>
          </section>

          {/* TRAINING */}
          <section className="sch-section">
            <div className="sch-section-eyebrow">Training · Tag für Tag</div>
            <h2>
              Wie du das <em>Tagestraining</em> nutzt.
            </h2>
            <p className="sch-section-lead">
              Das Training auf <Link href="/training" className="sch-inline-link">/training</Link>{' '}
              führt dich durch die elf Tage von Zyklus 2 (Tag 12 bis Tag 22) —
              Fill-Ins, Breaks, der Vier-Takt-Bogen, eigene Komposition. Jeder Tag hat
              seinen Fokus, seine Patterns und meistens eine Kombi-Übung.
            </p>

            <ol className="sch-steps">
              {TRAINING_STEPS.map((s) => (
                <li key={s.n} className="sch-step">
                  <div className="sch-step-num">{s.n}</div>
                  <div className="sch-step-body">
                    <div className="sch-step-title">{s.title}</div>
                    <div className="sch-step-desc">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="sch-highlight">
              <div className="sch-highlight-kicker">Kombi-Übungen</div>
              <p>
                Ab Tag 14 hat fast jeder Tag eine <strong>Kombi-Übung</strong> — eine
                Bogen-Sequenz aus mehreren Patterns. In der Beta zeigen wir dir die
                Sequenz, das Playback dafür kommt in der nächsten Version. Im Moment
                kannst du jeden Bogen einzeln im Tool aufrufen und so die Kombi
                manuell spielen.
              </p>
            </div>
          </section>

          {/* PATTERNS + BIBLIOTHEK */}
          <section className="sch-section">
            <div className="sch-section-eyebrow">Drumherum</div>
            <h2>Patterns &amp; Bibliothek.</h2>
            <div className="sch-prose">
              <p>
                <Link href="/patterns" className="sch-inline-link">/patterns</Link>{' '}
                ist die generische Pattern-Bibliothek — 81 Rhythmen in sechs Kategorien
                (Archetypen, Positionen, Mix, Clave, Latin, Funk). Such, filter, lad
                sie ins Tool. Gut, wenn du was außerhalb von Zyklus 2 üben willst.
              </p>
              <p>
                <Link href="/bibliothek" className="sch-inline-link">/bibliothek</Link>{' '}
                ist der Wissens-Hub. Sechs konzeptuelle Layer (Zeitbasis → Auflösung →
                Gestaltung → Timing &amp; Groove → Mehrschichtigkeit → Praxis) plus
                eine Vertiefung zu{' '}
                <Link href="/bibliothek/breaks-und-fills" className="sch-inline-link">
                  Breaks und Fills
                </Link>
                . Hier liegt das Vokabular für alles, was du im Tool und Training hörst.
              </p>
            </div>
          </section>

          {/* ERSTE SCHRITTE */}
          <section className="sch-section sch-section--cta">
            <div className="sch-section-eyebrow">Erste Schritte</div>
            <h2>Drei Klicks, los geht's.</h2>
            <ol className="sch-quickstart">
              <li>
                <span className="sch-qs-num">1</span>
                <span>
                  Geh auf{' '}
                  <Link href="/training" className="sch-inline-link">Training</Link>{' '}
                  → Tag 12 ist vorausgewählt.
                </span>
              </li>
              <li>
                <span className="sch-qs-num">2</span>
                <span>
                  Klick <strong>Play</strong> am Basisrhythmus, hör eine Runde, klick
                  <strong> Stop</strong>.
                </span>
              </li>
              <li>
                <span className="sch-qs-num">3</span>
                <span>
                  Klick <strong>„Im Tool öffnen → "</strong> — du landest mit
                  vorgeladenem Pattern im Tool und kannst BPM, Handsatz und Schritte
                  anpassen.
                </span>
              </li>
            </ol>
            <div className="sch-cta-row">
              <Link href="/training" className="sch-btn-primary">
                Loslegen mit Tag 12 →
              </Link>
              <Link href="/tool" className="sch-btn-secondary">
                Direkt ins Tool
              </Link>
            </div>
            <p className="sch-feedback">
              Stockt was, fühlt sich was falsch an, fehlt was? Schick mir eine Mail an{' '}
              <a href="mailto:kontakt@nilscaspar.de" className="sch-inline-link">
                kontakt@nilscaspar.de
              </a>{' '}
              — jede Rückmeldung aus der Beta hilft.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

const SCHULE_CSS = `
.sch-page {
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  font-weight: 300;
  line-height: 1.65;
  min-height: 100vh;
  padding: 24px 0 96px;
  position: relative;
}
.sch-page::before {
  content: '';
  position: fixed;
  top: -200px; left: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(245,166,35,0.04), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.sch-page::after {
  content: '';
  position: fixed;
  bottom: -100px; right: -100px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,107,53,0.03), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.sch-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

/* ── Hero ── */
.sch-hero { padding: 56px 0 32px; text-align: left; }
.sch-hero-kicker {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 16px;
}
.sch-hero h1 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(44px, 8vw, 88px);
  line-height: 0.95;
  letter-spacing: -1px;
  color: var(--cream);
}
.sch-hero h1 em { font-style: normal; color: var(--amber); }
.sch-hero-sub {
  margin-top: 28px;
  font-size: 18px;
  line-height: 1.7;
  color: var(--muted2);
  max-width: 62ch;
}

/* ── Section frame ── */
.sch-section { margin: 64px 0; }
.sch-section--cta {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 40px;
}
.sch-section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 12px;
}
.sch-section h2 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(28px, 4vw, 44px);
  letter-spacing: 1px;
  color: var(--cream);
  line-height: 1.1;
  margin-bottom: 8px;
}
.sch-section h2 em { font-style: normal; color: var(--amber); }
.sch-section-lead {
  margin-top: 16px;
  color: var(--muted2);
  font-size: 16px;
  max-width: 68ch;
}

.sch-prose p { margin: 16px 0; max-width: 68ch; color: var(--text); }
.sch-prose p strong { color: var(--cream); font-weight: 500; }

.sch-inline-link {
  color: var(--amber);
  text-decoration: none;
  border-bottom: 1px solid rgba(245,166,35,0.35);
  transition: border-color 0.15s ease;
}
.sch-inline-link:hover { border-bottom-color: var(--amber); }

/* ── App grid ── */
.sch-app-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 28px;
}
.sch-app-card {
  display: block;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.sch-app-card:hover {
  border-color: var(--amber);
  background: var(--card2, #242016);
  transform: translateY(-2px);
}
.sch-app-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.sch-app-title {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  color: var(--cream);
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.sch-app-desc { color: var(--muted2); font-size: 14px; line-height: 1.6; }
.sch-app-cta {
  margin-top: 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
}

/* ── Strikes list ── */
.sch-strike-list {
  list-style: none;
  margin: 28px 0 24px;
  padding: 0;
  display: grid;
  gap: 12px;
}
.sch-strike {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 18px;
  align-items: center;
  padding: 14px 18px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.sch-strike-cell {
  width: 52px;
  height: 52px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 22px;
  font-weight: 700;
}
.sch-strike-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--cream);
}
.sch-strike-symbol-inline {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  letter-spacing: 0;
  margin-left: 4px;
}
.sch-strike-desc {
  margin-top: 4px;
  color: var(--muted2);
  font-size: 14px;
}

/* ── Demo grid ── */
.sch-demo {
  margin-top: 32px;
  padding: 24px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.sch-demo-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 14px;
}
.sch-demo-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 4px;
}
.sch-demo-cell {
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
}
.sch-demo-cell--main {
  border-left: 2px solid rgba(245,166,35,0.4);
}
.sch-demo-counting {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 4px;
  margin-top: 8px;
}
.sch-demo-counting-cell {
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--muted);
}
.sch-demo-counting-cell--main {
  color: var(--amber);
  font-weight: 700;
  font-size: 14px;
}
.sch-demo-caption {
  margin-top: 18px;
  color: var(--muted2);
  font-size: 14px;
  line-height: 1.6;
}
.sch-demo-caption strong {
  color: var(--cream);
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

/* ── Features list ── */
.sch-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 24px;
}
.sch-feature {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 18px 22px;
}
.sch-feature-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--cream);
  margin-bottom: 6px;
}
.sch-feature-desc { color: var(--muted2); font-size: 14px; line-height: 1.6; }

/* ── Highlight box ── */
.sch-highlight {
  margin-top: 28px;
  background: linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.03));
  border: 1px solid rgba(245,166,35,0.2);
  border-radius: 6px;
  padding: 22px 26px;
}
.sch-highlight-kicker {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 8px;
}
.sch-highlight p { color: var(--text); font-size: 15px; line-height: 1.7; }
.sch-highlight p strong { color: var(--cream); font-weight: 500; }

/* ── Numbered steps ── */
.sch-steps {
  list-style: none;
  padding: 0;
  margin: 28px 0 0;
  display: grid;
  gap: 12px;
}
.sch-step {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 18px;
  padding: 18px 22px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: border-color 0.2s;
}
.sch-step:hover { border-color: var(--border2, #3A3428); }
.sch-step-num {
  font-family: 'Anton', sans-serif;
  font-size: 32px;
  color: var(--amber);
  opacity: 0.5;
  line-height: 1;
}
.sch-step-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--cream);
  margin-bottom: 6px;
}
.sch-step-desc { color: var(--muted2); font-size: 14px; line-height: 1.6; }

/* ── Quickstart + CTA ── */
.sch-quickstart {
  list-style: none;
  padding: 0;
  margin: 24px 0 28px;
  display: grid;
  gap: 10px;
}
.sch-quickstart li {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 14px;
  align-items: start;
  color: var(--text);
  font-size: 15px;
}
.sch-qs-num {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: var(--amber);
  line-height: 1;
}
.sch-quickstart strong { color: var(--cream); font-weight: 500; }

.sch-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.sch-btn-primary {
  background: var(--amber);
  color: var(--black);
  padding: 14px 28px;
  border-radius: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.2s, transform 0.2s;
  display: inline-flex;
  align-items: center;
}
.sch-btn-primary:hover {
  background: var(--cream);
  transform: translateY(-1px);
}
.sch-btn-secondary {
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 14px 24px;
  border-radius: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  transition: color 0.2s, border-color 0.2s;
  display: inline-flex;
  align-items: center;
}
.sch-btn-secondary:hover {
  color: var(--amber);
  border-color: var(--amber);
}
.sch-feedback {
  margin-top: 22px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

/* ── Responsive ── */
@media (max-width: 760px) {
  .sch-app-grid,
  .sch-features { grid-template-columns: 1fr; }
  .sch-demo-grid,
  .sch-demo-counting { grid-template-columns: repeat(8, 1fr); }
  .sch-demo-counting-cell:nth-child(n+9),
  .sch-demo-cell:nth-child(n+9) { /* second row */ }
  .sch-strike { grid-template-columns: 52px 1fr; gap: 14px; padding: 12px 14px; }
  .sch-strike-cell { width: 44px; height: 44px; font-size: 18px; }
  .sch-step { grid-template-columns: 44px 1fr; padding: 14px 16px; }
  .sch-step-num { font-size: 24px; }
  .sch-section--cta { padding: 28px 22px; }
}
@media (max-width: 480px) {
  .sch-demo-grid,
  .sch-demo-counting { grid-template-columns: repeat(8, 1fr); }
  .sch-cta-row { flex-direction: column; align-items: stretch; }
  .sch-btn-primary,
  .sch-btn-secondary { justify-content: center; }
}
`;
