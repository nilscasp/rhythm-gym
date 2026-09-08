import Image from 'next/image';
import Link from 'next/link';
import { BriefeForm } from '../../components/BriefeForm';
import { getMessages } from '../../messages/server';
import { localizeHref } from '../lib/locale';
import { LANDING_CSS } from '../_landing/landing-css';

/* Landingpage der Schul-Marke (lernen.handpan.schule).
   Die .lp-* Klassen kommen aus LANDING_CSS; SCHULE_CSS übersteuert nur,
   was die Schule anders braucht, und ergänzt die neuen Abschnitte.
   Nur Tokens und die drei Font-Variablen — keine Farb- oder Font-Literale.

   Sprache: die Landing-Texte bleiben vorerst deutsch (Phasenplan v2 — die
   Extraktion der Landing-Copy ist ein eigener Schritt). Übersetzt ist hier
   nur, was `messages/*` schon kennt: das Briefe-Formular. Und die interne
   Adresse zu den Terminen läuft durch `localizeHref`, damit sie unter /en
   nicht aus der Sprache herausführt. */

const karten = [
  {
    titel: 'Kurse',
    text: 'Rhythmus Fundament und Von Anfang an spielen: Tag für Tag, Video für Video, in deinem Konto. Kurse kaufst du einzeln.',
  },
  {
    titel: 'Werkzeug',
    text: 'Die Rhythmus-Werkstatt: Patterns hören, bauen, verlangsamen, auf deine eigene Pan stimmen.',
  },
  {
    titel: 'Termine',
    text: 'Live-Trainings und Fragerunden. Die Zoom-Tür hängt direkt am Termin.',
    href: '/termine',
    linkText: 'Kommende Termine ansehen',
  },
];

/* Wörtliche Nachrichten von Teilnehmerinnen des Rhythmus-Fundaments,
   von Nils am 9.7.2026 zur Veröffentlichung mit Vornamen freigegeben.
   Quelle: handpan-website-github/images/testimonials/stimme-1|4|6.webp */
const stimmen = [
  {
    name: 'Anja',
    text: 'Ich finde die Schule trägt zurecht den Namen Handpan Schule des Lebens … jetzt kann das Atmen beginnen.',
  },
  {
    name: 'Claudia',
    text: 'Ich bin total glücklich mit dem Kurs, es ist eine Mischung aus: ahhh, das ist leicht! Und: jessasna, ich muß durchatmen und einfach machen, auch wenns herausfordernd ist.',
  },
  {
    name: 'Sonja',
    text: 'Dies führt zu einem Wunsch zu spielen und zu üben, auch wenn es nicht immer gleich läuft. Aus den fünfzehn Minuten werden manchmal eine Stunde manchmal auch zweimal eine Stunde am Tag.',
  },
];

const fragen: { frage: string; antwort: React.ReactNode }[] = [
  {
    frage: 'Brauche ich eine eigene Handpan?',
    antwort: (
      <>
        Für die Kurse ja. Zum Reinhören und für die Werkstatt nicht. Wenn du noch suchst: Auf
        handpan.schule gibt es eine ehrliche{' '}
        <a href="https://handpan.schule/kaufberatung/">Kaufberatung</a>.
      </>
    ),
  },
  {
    frage: 'Ich habe keine Vorerfahrung.',
    antwort: <>Dann ist Von Anfang an spielen dein Weg. Der Kurs beginnt bei null, Schlag für Schlag.</>,
  },
  {
    frage: 'Wie viel Zeit brauche ich?',
    antwort: (
      <>
        Zehn bis fünfzehn Minuten am Tag tragen weiter als zwei Stunden am Wochenende.
        Regelmäßigkeit schlägt Intensität.
      </>
    ),
  },
  {
    frage: 'Was kostet das Konto?',
    antwort: <>Nichts. Kurse haben eigene Preise, dein Konto bleibt frei.</>,
  },
  {
    frage: 'Wo trifft sich die Community?',
    antwort: (
      <>
        Auf Skool. Dort laufen die Live-Sessions und der Austausch dazwischen, kostenlos und
        offen. Hier findest du die Kurse, das Werkzeug und die Termine.
      </>
    ),
  },
  {
    frage: 'Kann ich mein Konto löschen?',
    antwort: (
      <>
        Jederzeit. Eine kurze Mail an kontakt@handpan.schule genügt, ich lösche Konto und Daten.
      </>
    ),
  },
];

export async function LandingSchule({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { locale, t } = await getMessages();

  return (
    <>
      <style>{LANDING_CSS}</style>
      <style>{SCHULE_CSS}</style>
      <main className="lp">
        {/* 1 — HERO */}
        <section className="lp-hero">
          <div className="lp-hero-eyebrow">Handpan Schule des Lebens</div>
          <h1>Dein Ort zum Üben.</h1>
          <p className="lp-hero-sub">
            Kurse, Termine und Werkzeuge der Schule an einem Ort. Du übst in deinem Tempo, ich gehe
            den Weg mit dir.
          </p>
          <div className="lp-hero-actions">
            <Link
              href={isAuthenticated ? '/training' : '/auth/login?mode=signup'}
              className="lp-btn-primary"
            >
              {isAuthenticated ? 'Zu deinen Kursen' : 'Kostenloses Konto'}
            </Link>
            {!isAuthenticated && (
              <Link href="/auth/login" className="lp-btn-secondary">
                Einloggen
              </Link>
            )}
          </div>
          <p className="schule-kleinzeile">Kein Abo, keine Karte. Ein Konto, und du bist drin.</p>
        </section>

        {/* 2 — WAS DICH HIER ERWARTET */}
        <section className="schule-section">
          <h2 className="schule-h2">Was dich hier erwartet</h2>
          <div className="schule-cards">
            {karten.map((k) => (
              <div key={k.titel} className="schule-card">
                <h3>{k.titel}</h3>
                <p>{k.text}</p>
                {k.href && (
                  <Link href={localizeHref(k.href, locale)} className="schule-card-link">
                    {k.linkText} →
                  </Link>
                )}
              </div>
            ))}
          </div>
          <p className="schule-leise">Bald: Nachrichten mit mir und deinen Mitspielern.</p>
        </section>

        {/* 3 — FÜR WEN */}
        <section className="schule-section">
          <h2 className="schule-h2">Für wen die Schule ist</h2>
          <p className="schule-text">
            Für dich, wenn du seit Wochen oder Jahren spielst und spürst: Es geht nicht um mehr
            Patterns, sondern um Boden unter dem Spiel. Wenn du bereit bist, regelmäßig zu üben,
            auch zehn Minuten am Tag. Und wenn die Handpan für dich kein Trick ist, sondern ein Weg.
          </p>
          <p className="schule-leise">
            Nicht für dich, wenn du in vier Wochen ein Konzert spielen willst.
          </p>
        </section>

        {/* 4 — WER HIER SCHREIBT */}
        <section className="schule-section">
          <h2 className="schule-h2">Wer hier schreibt</h2>
          <div className="schule-autor">
            <Image
              className="schule-portrait"
              src="/handpan-schule/nils.webp"
              alt="Nils Caspar, Gründer der Handpan Schule des Lebens"
              width={480}
              height={320}
              loading="lazy"
              sizes="(max-width: 640px) 160px, 240px"
            />
            <div>
              <p className="schule-text">
                Ich bin Nils, Musiker und Künstler aus München. Seit Jahren unterrichte ich Handpan:
                Workshops, Einzelstunden, live. Dabei habe ich gesehen, dass fast niemand mehr weiß,
                wie man wirklich lernt. Nicht aus Mangel an Information, sondern aus Überfluss.
                Diese Schule ist meine Antwort.
              </p>
              <p className="schule-signatur">Nils Caspar · Musiker &amp; Künstler</p>
            </div>
          </div>
        </section>

        {/* 5 — STIMMEN */}
        <section className="schule-section">
          <h2 className="schule-h2">Stimmen aus der Schule</h2>
          <div className="schule-stimmen">
            {stimmen.map((s) => (
              <figure key={s.name} className="schule-stimme">
                <blockquote>{s.text}</blockquote>
                <figcaption>{s.name} · Rhythmus Fundament</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 6 — WAS ES KOSTET */}
        <section className="schule-section">
          <h2 className="schule-h2">Was es kostet</h2>
          <p className="schule-text">
            Dein Konto ist kostenlos. Kurse sind eigene Wege mit eigenem Preis.
          </p>
        </section>

        {/* 7 — FRAGEN */}
        <section className="schule-section">
          <h2 className="schule-h2">Fragen, die oft gestellt werden</h2>
          <div className="schule-fragen">
            {fragen.map((f) => (
              <details key={f.frage} className="schule-frage">
                <summary>{f.frage}</summary>
                <p>{f.antwort}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 8 — DEIN ERSTER TAG */}
        <section className="schule-section" id="briefe">
          <h2 className="schule-h2">Dein erster Tag, geschenkt.</h2>
          <p className="schule-text">
            Ein Tag aus dem Rhythmus-Fundament: ein Video, eine Übung, eine Frage für den Weg. Trag
            deine E-Mail ein, bestätige den Link, und Tag 1 ist offen.
          </p>
          <BriefeForm
            source="landing"
            messages={t.briefe}
            privacyHref={localizeHref('/datenschutz', locale)}
          />
          <p className="schule-leise">
            <Link href="/auth/login?mode=signup">Oder gleich ein Konto anlegen.</Link>
          </p>
        </section>
      </main>
    </>
  );
}

const SCHULE_CSS = `
[data-brand="schule"] .lp-hero::before {
  background-image:
    linear-gradient(var(--amber-glow) 1px, transparent 1px),
    linear-gradient(90deg, var(--amber-glow) 1px, transparent 1px);
}
[data-brand="schule"] .lp-hero::after {
  background: radial-gradient(circle, var(--amber-dim) 0%, transparent 70%);
}
[data-brand="schule"] .lp-hero h1 { text-transform: none; letter-spacing: -0.01em; }
[data-brand="schule"] .lp-btn-primary,
[data-brand="schule"] .lp-btn-secondary { text-transform: none; letter-spacing: 0.5px; font-size: 15px; }

.schule-kleinzeile {
  margin-top: 20px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
  position: relative;
  z-index: 1;
}

/* ─── ABSCHNITTE ─── */
.schule-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px 72px;
}
.schule-h2 {
  font-family: var(--font-display);
  font-size: clamp(28px, 6vw, 44px);
  line-height: 1.15;
  color: var(--cream);
  margin-bottom: 24px;
}
.schule-text {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.75;
  color: var(--text);
  max-width: 640px;
}
.schule-text + .schule-leise { margin-top: 16px; }
.schule-leise {
  margin-top: 20px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
  max-width: 640px;
}
.schule-leise a { color: var(--amber); text-decoration: underline; }

/* ─── KARTEN ─── */
.schule-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.schule-card {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 24px;
}
.schule-card-link {
  display: inline-block;
  margin-top: 12px;
  font-family: var(--font-ui);
  font-size: 13px;
  letter-spacing: 1px;
  color: var(--amber);
  text-decoration: none;
  border-bottom: 1px solid var(--border2);
  padding-bottom: 2px;
}
.schule-card-link:hover {
  border-color: var(--amber);
}
.schule-card h3 {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--cream);
  margin-bottom: 8px;
}
.schule-card p {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--muted);
  line-height: 1.6;
}

/* ─── WER HIER SCHREIBT ─── */
.schule-autor {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}
.schule-portrait {
  width: 240px;
  height: auto;
  border-radius: 14px;
  border: 1px solid var(--border2);
  flex: 0 0 auto;
}
.schule-signatur {
  margin-top: 16px;
  font-family: var(--font-ui);
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
}

/* ─── STIMMEN ─── */
.schule-stimmen {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.schule-stimme {
  margin: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-left: 2px solid var(--amber);
  padding: 22px 24px;
}
.schule-stimme blockquote {
  margin: 0;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.7;
  color: var(--text);
}
.schule-stimme figcaption {
  margin-top: 12px;
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}

/* ─── FRAGEN ─── */
.schule-fragen {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.schule-frage {
  background: var(--card);
  border: 1px solid var(--border);
}
.schule-frage summary {
  font-family: var(--font-ui);
  font-size: 16px;
  color: var(--cream);
  padding: 18px 20px;
  cursor: pointer;
  list-style: none;
}
.schule-frage summary::-webkit-details-marker { display: none; }
.schule-frage summary::after {
  content: '+';
  float: right;
  color: var(--amber);
}
.schule-frage[open] summary::after { content: '–'; }
.schule-frage p {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--muted);
  padding: 0 20px 20px;
  margin: 0;
}
.schule-frage a { color: var(--amber); text-decoration: underline; }

/* ─── MOBIL ─── */
@media (max-width: 640px) {
  .schule-cards { grid-template-columns: 1fr; }
  .schule-section { padding: 0 20px 56px; }
  .schule-autor { flex-direction: column; gap: 20px; }
  .schule-portrait { width: 160px; }
}
@media (max-width: 480px) {
  [data-brand="schule"] .lp-hero-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  [data-brand="schule"] .lp-btn-primary {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  [data-brand="schule"] .lp-btn-secondary {
    width: 100%;
    text-align: center;
    padding-bottom: 6px;
  }
}
`;
