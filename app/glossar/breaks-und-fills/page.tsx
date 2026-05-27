import Link from 'next/link';

export default function BreaksUndFillsPage() {
  return (
    <>
      <style>{BF_CSS}</style>

      <div className="bf-page">
        <div className="bf-wrap">
          {/* Zurück zum Glossar */}
          <div className="bf-back">
            <Link href="/glossar">← Zurück zum Glossar</Link>
          </div>

          {/* HERO */}
          <div className="bf-hero">
            <div className="bf-hero-kicker">Rhythm Gym · Wissen</div>
            <h1>
              BREAKS
              <br />
              <em>&amp; FILLS</em>
            </h1>
            <p className="bf-hero-sub">
              Wann die Musik atmen muss — und wie du Spannung formst, indem du etwas weglässt oder
              verdichtest. Drei Ebenen derselben Bewegung, klar getrennt.
            </p>
          </div>

          {/* SECTION MAP */}
          <div className="bf-layer-map">
            <a href="#definition">
              <span className="bf-lm-num">01</span>
              <span className="bf-lm-label">Definition</span>
            </a>
            <a href="#funktion">
              <span className="bf-lm-num">02</span>
              <span className="bf-lm-label">Funktion</span>
            </a>
            <a href="#mikro">
              <span className="bf-lm-num">03</span>
              <span className="bf-lm-label">Mikro</span>
            </a>
            <a href="#meso">
              <span className="bf-lm-num">04</span>
              <span className="bf-lm-label">Meso</span>
            </a>
            <a href="#makro">
              <span className="bf-lm-num">05</span>
              <span className="bf-lm-label">Makro</span>
            </a>
            <a href="#praxis">
              <span className="bf-lm-num">06</span>
              <span className="bf-lm-label">Praxis</span>
            </a>
          </div>

          {/* KERNIDEE */}
          <div className="bf-highlight-box">
            <div className="bf-hb-title">Die Kernidee</div>
            <p>
              Ein <strong>Break</strong> ist eine bewusste Unterbrechung des Flusses — Stille oder
              Ausdünnung. Ein <strong>Fill</strong> ist das Gegenteil — Verdichtung, Aktivität.
              Beide markieren <strong>Phrasenenden</strong>, beide formen{' '}
              <strong>Spannung</strong> — aber mit umgekehrten Mitteln.
            </p>
          </div>

          {/* 01 · DEFINITION */}
          <section className="bf-layer-section" id="definition">
            <div className="bf-layer-header">
              <div className="bf-layer-num">01</div>
              <div className="bf-layer-title">DEFINITION</div>
            </div>
            <p className="bf-layer-desc">
              Was ein Break ist, was ein Fill ist — und warum die Begriffe verwandt, aber nicht
              austauschbar sind.
            </p>

            <div className="bf-entries">
              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Break</div>
                  <div className="bf-entry-def">
                    Bewusste Unterbrechung des musikalischen Flusses. Ein Moment, in dem die
                    laufende Bewegung pausiert, sich verdichtet oder kippt.{' '}
                    <strong>Wörtlich: ein Bruch im Geschehen.</strong>
                  </div>
                  <div className="bf-entry-example">
                    Kann ein einzelner Schlag Stille sein oder ein längerer Abschnitt
                  </div>
                </div>
                <div className="bf-entry-tag">Reduktion</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Fill / Fill-in</div>
                  <div className="bf-entry-def">
                    Verdichtung am Phrasenende. Mehr Noten, mehr Aktivität — am Übergang einer
                    4er- oder 8er-Phrase. Auf der Handpan ein melodisches Verzierungs-Motiv über
                    die letzten zwei Schläge.
                  </div>
                  <div className="bf-entry-example">z. B. Drum-Wirbel vor dem Refrain</div>
                </div>
                <div className="bf-entry-tag">Verdichtung</div>
              </div>
            </div>
          </section>

          <hr className="bf-section-rule" />

          {/* 02 · FUNKTION */}
          <section className="bf-layer-section" id="funktion">
            <div className="bf-layer-header">
              <div className="bf-layer-num">02</div>
              <div className="bf-layer-title">FUNKTION</div>
            </div>
            <p className="bf-layer-desc">
              Breaks und Fills erzeugen Kontrast. Da Musik vom Wechsel zwischen Spannung und Lösung
              lebt, wirkt ein Break wie ein Atemzug — alles, was danach kommt, klingt automatisch
              energetischer.
            </p>

            <div className="bf-entries">
              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Aufmerksamkeit lenken</div>
                  <div className="bf-entry-def">
                    Vor wichtigen Stellen — das Ohr wird scharfgestellt, der Hörer ist plötzlich
                    präsent. Die Musik signalisiert: <strong>jetzt aufpassen</strong>.
                  </div>
                </div>
                <div className="bf-entry-tag">Fokus</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Spannung aufbauen</div>
                  <div className="bf-entry-def">
                    Vor Drop oder Refrain — die Energie lädt sich auf. Was folgt, trifft mit voller
                    Wucht, weil der Hörer es <strong>vermisst hat</strong>.
                  </div>
                </div>
                <div className="bf-entry-tag">Energie</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Übergänge markieren</div>
                  <div className="bf-entry-def">
                    Zwischen Songteilen — Form wird hörbar. Strophe, Refrain, Bridge: Ohne
                    Übergangs-Marker zerläuft die Architektur.
                  </div>
                </div>
                <div className="bf-entry-tag">Struktur</div>
              </div>
            </div>
          </section>

          <hr className="bf-section-rule" />

          {/* 03 · MIKRO-EBENE */}
          <section className="bf-layer-section" id="mikro">
            <div className="bf-layer-header">
              <div className="bf-layer-num">03</div>
              <div className="bf-layer-title">MIKRO-EBENE</div>
            </div>
            <p className="bf-layer-desc">
              1–2 Schläge bis halber Takt — innerhalb der Phrase. Hier reden wir streng genommen
              von <strong>Fills</strong>, nicht Breaks. Beide markieren Phrasen, aber mit
              umgekehrten Mitteln.
            </p>

            <div className="bf-entries">
              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Fill</div>
                  <div className="bf-entry-def">
                    <strong>Verdichtung.</strong> Mehr Noten, mehr Aktivität, am Ende einer 4er-
                    oder 8er-Phrase. Drum-Wirbel vor dem Refrain — auf der Handpan ein melodisches
                    Verzierungs-Motiv über die letzten zwei Schläge.
                  </div>
                  <div className="bf-entry-example">↑ Energie rauf</div>
                </div>
                <div className="bf-entry-tag">Mehr</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Mikro-Break</div>
                  <div className="bf-entry-def">
                    <strong>Reduktion.</strong> Einzelner Schlag Stille. Der Groove fällt für einen
                    Moment weg — das Ohr hört das Fehlen.
                  </div>
                  <div className="bf-entry-example">↓ Energie runter</div>
                </div>
                <div className="bf-entry-tag">Weniger</div>
              </div>
            </div>

            <div className="bf-highlight-box">
              <div className="bf-hb-title">Entscheidende Klarstellung</div>
              <p>
                <strong>Fill = Energie rauf</strong> — das Arrangement füllt sich auf die
                Phrasengrenze hin.
                <br />
                <strong>Break = Energie runter</strong> — der Groove fällt weg, das Fehlen wird
                hörbar.
                <br />
                Beide haben dieselbe strukturelle Funktion, nur mit umgekehrten Mitteln.
              </p>
            </div>
          </section>

          <hr className="bf-section-rule" />

          {/* 04 · MESO-EBENE */}
          <section className="bf-layer-section" id="meso">
            <div className="bf-layer-header">
              <div className="bf-layer-num">04</div>
              <div className="bf-layer-title">MESO-EBENE</div>
            </div>
            <p className="bf-layer-desc">
              2–4 Takte — zwischen Songteilen. Trennt Strophe → Refrain, Verse → Bridge. Die
              klassischen Breaks der Bandmusik leben hier.
            </p>

            <div className="bf-entries">
              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Drum-Break</div>
                  <div className="bf-entry-def">
                    Das Arrangement reduziert sich auf Percussion. Klassiker:{' '}
                    <strong>Amen Break</strong> und James Browns <strong>Funky Drummer</strong> —
                    wurden zur Grundlage des Hip-Hop-Sampling.
                  </div>
                  <div className="bf-entry-example">Funk, Soul, Hip-Hop</div>
                </div>
                <div className="bf-entry-tag">Percussion</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Solo-Break</div>
                  <div className="bf-entry-def">
                    Band stoppt, eine Stimme spielt zwei Takte allein, dann setzt alles wieder ein.{' '}
                    <strong>Klassisch im Jazz und Swing</strong> — der Soloist bekommt den Moment
                    der Stille als Bühne.
                  </div>
                </div>
                <div className="bf-entry-tag">Solo</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Stop-Time Break</div>
                  <div className="bf-entry-def">
                    Alle Instrumente halten gemeinsam an, oft auf einem markanten Schlag.{' '}
                    <strong>Maximaler dramatischer Effekt</strong> durch kollektives Innehalten.
                  </div>
                </div>
                <div className="bf-entry-tag">Dramatik</div>
              </div>
            </div>
          </section>

          <hr className="bf-section-rule" />

          {/* 05 · MAKRO-EBENE */}
          <section className="bf-layer-section" id="makro">
            <div className="bf-layer-header">
              <div className="bf-layer-num">05</div>
              <div className="bf-layer-title">MAKRO-EBENE</div>
            </div>
            <p className="bf-layer-desc">
              16–32 Takte — strukturiert ganze Stücke. Hier wird der Break zum architektonischen
              Element.
            </p>

            <div className="bf-entries">
              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Breakdown</div>
                  <div className="bf-entry-def">
                    Längerer Abschnitt, in dem das Stück fast vollständig ausgedünnt wird, bevor
                    der nächste Drop kommt. <strong>Architektonische Form-Pause</strong> — typisch
                    in elektronischer Musik.
                  </div>
                  <div className="bf-entry-example">EDM, House, Techno, Trance</div>
                </div>
                <div className="bf-entry-tag">Form</div>
              </div>
            </div>

            {/* Übersicht aller Ebenen */}
            <div className="bf-quick-ref">
              <div className="bf-qr-title">DREI EBENEN IM ÜBERBLICK</div>
              <div className="bf-quick-ref-grid">
                <div className="bf-qr-item">
                  <div className="bf-qr-num">μ</div>
                  <div className="bf-qr-label">Mikro</div>
                  <div className="bf-qr-val">1–2 Schläge</div>
                </div>
                <div className="bf-qr-item">
                  <div className="bf-qr-num">M</div>
                  <div className="bf-qr-label">Meso</div>
                  <div className="bf-qr-val">2–4 Takte</div>
                </div>
                <div className="bf-qr-item">
                  <div className="bf-qr-num">∞</div>
                  <div className="bf-qr-label">Makro</div>
                  <div className="bf-qr-val">16–32 Takte</div>
                </div>
              </div>
            </div>
          </section>

          <hr className="bf-section-rule" />

          {/* 06 · PRAXIS */}
          <section className="bf-layer-section" id="praxis">
            <div className="bf-layer-header">
              <div className="bf-layer-num">06</div>
              <div className="bf-layer-title">PRAXIS</div>
            </div>
            <p className="bf-layer-desc">
              Wann setzt du was ein — und wie kombinierst du beide Werkzeuge, um maximale Wirkung
              zu erzeugen?
            </p>

            <div className="bf-entries">
              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Kombination Fill + Break</div>
                  <div className="bf-entry-def">
                    Drei Schläge Stille + ein Fill auf den letzten Schlag, bevor die nächste Phrase
                    beginnt. <strong>Auf der Handpan besonders wirkungsvoll</strong> — der Kontrast
                    zwischen Stille und plötzlicher Bewegung lässt sich direkt formen, weil das
                    Instrument von Natur aus weich und obertonreich klingt. Die Stille trägt den
                    Nachhall, der Fill setzt den Akzent.
                  </div>
                </div>
                <div className="bf-entry-tag">Werkzeug</div>
              </div>

              <div className="bf-entry">
                <div className="bf-entry-main">
                  <div className="bf-entry-term">Faustregel</div>
                  <div className="bf-entry-def">
                    Immer dann, wenn die Musik droht, vorhersehbar zu werden.{' '}
                    <strong>Nach 8, 16 oder 32 Takten Kontinuität fragen:</strong> Würde ein Break
                    oder Fill die Form atmen lassen?
                  </div>
                </div>
                <div className="bf-entry-tag">Methode</div>
              </div>
            </div>

            <div className="bf-highlight-box">
              <div className="bf-hb-title">Pragmatisch</div>
              <p>
                Breaks und Fills sind keine Verzierung — sie sind <strong>Architektur</strong>. Wer
                sie setzt, formt nicht nur den Moment, sondern macht die{' '}
                <strong>Form des Stücks hörbar</strong>. Ohne sie zerläuft selbst der beste Groove.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

const BF_CSS = `
/* ── Ambient background (scoped) ── */
.bf-page { position: relative; }
.bf-page::before {
  content: '';
  position: fixed;
  top: -200px; left: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(245,166,35,0.04), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.bf-page::after {
  content: '';
  position: fixed;
  bottom: -100px; right: -100px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,107,53,0.03), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.bf-wrap {
  max-width: var(--max, 1120px);
  margin: 0 auto;
  padding: 0 24px 120px;
  position: relative;
  z-index: 1;
}

/* ── Back link ── */
.bf-back {
  padding-top: 24px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.bf-back a {
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s;
}
.bf-back a:hover { color: var(--amber); }

/* ── HERO ── */
.bf-hero {
  padding: 56px 0 48px;
  text-align: center;
}
.bf-hero-kicker {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 16px;
}
.bf-hero h1 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(36px, 6vw, 64px);
  letter-spacing: 2px;
  color: var(--cream);
  line-height: 1.1;
  margin-bottom: 20px;
}
.bf-hero h1 em {
  font-style: normal;
  color: var(--amber);
}
.bf-hero-sub {
  color: var(--muted2);
  max-width: 60ch;
  margin: 0 auto;
  font-size: 17px;
  line-height: 1.7;
}

/* ── LAYER MAP (section nav) ── */
.bf-layer-map {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin: 48px 0 56px;
  border-radius: 6px;
  overflow: hidden;
}
.bf-layer-map a {
  text-decoration: none;
  padding: 16px 8px;
  text-align: center;
  background: var(--card);
  border: 1px solid transparent;
  transition: all 0.25s;
  position: relative;
}
.bf-layer-map a::after {
  content: '';
  position: absolute;
  bottom: 0; left: 20%; right: 20%;
  height: 2px;
  background: var(--amber);
  opacity: 0;
  transition: opacity 0.25s;
}
.bf-layer-map a:hover {
  background: var(--card2);
  border-color: var(--border2);
}
.bf-layer-map a:hover::after { opacity: 1; }
.bf-layer-map .bf-lm-num {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: var(--amber);
  display: block;
  line-height: 1;
  margin-bottom: 6px;
}
.bf-layer-map .bf-lm-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
}

/* ── SECTIONS ── */
.bf-layer-section {
  margin-bottom: 64px;
  scroll-margin-top: 70px;
}
.bf-layer-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.bf-layer-num {
  font-family: 'Anton', sans-serif;
  font-size: 42px;
  color: var(--amber);
  line-height: 1;
  opacity: 0.3;
}
.bf-layer-title {
  font-family: 'Anton', sans-serif;
  font-size: clamp(22px, 3vw, 30px);
  letter-spacing: 1px;
  color: var(--cream);
}
.bf-layer-desc {
  color: var(--muted2);
  margin: 12px 0 24px;
  max-width: 70ch;
  font-size: 15px;
}

/* ── ENTRY CARDS ── */
.bf-entries {
  display: grid;
  gap: 12px;
}
.bf-entry {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
  transition: all 0.2s;
}
.bf-entry:hover {
  border-color: var(--border2);
  background: var(--card2);
}
.bf-entry-main { min-width: 0; }
.bf-entry-term {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--cream);
  margin-bottom: 4px;
}
.bf-entry-def {
  color: var(--muted2);
  font-size: 15px;
  line-height: 1.6;
}
.bf-entry-def strong { color: var(--text); font-weight: 500; }
.bf-entry-example {
  margin-top: 8px;
  font-size: 13px;
  color: var(--muted);
  font-style: italic;
}
.bf-entry-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--amber);
  background: var(--amber-dim);
  padding: 4px 10px;
  border-radius: 3px;
  white-space: nowrap;
  align-self: center;
}

/* ── HIGHLIGHT BOX ── */
.bf-highlight-box {
  background: linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.03));
  border: 1px solid rgba(245,166,35,0.2);
  border-radius: 6px;
  padding: 24px;
  margin: 24px 0;
}
.bf-highlight-box .bf-hb-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 10px;
}
.bf-highlight-box p {
  color: var(--text);
  font-size: 15px;
  line-height: 1.7;
}
.bf-highlight-box p strong { color: var(--cream); font-weight: 600; }

/* ── COMPARISON TABLE ── */
.bf-comp-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
.bf-comp-table th {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.bf-comp-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(46,42,30,0.5);
  font-size: 14px;
  vertical-align: top;
}
.bf-comp-table td:first-child {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  color: var(--cream);
  white-space: nowrap;
  letter-spacing: 0.3px;
}
.bf-comp-table tr:last-child td { border-bottom: none; }

/* ── SECTION DIVIDER ── */
.bf-section-rule {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border2), transparent);
  margin: 0 0 64px;
}

/* ── QUICK REF ── */
.bf-quick-ref {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 28px;
  margin: 48px 0;
}
.bf-quick-ref .bf-qr-title {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  letter-spacing: 1px;
  color: var(--cream);
  margin-bottom: 20px;
}
.bf-quick-ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.bf-qr-item {
  text-align: center;
  padding: 16px 8px;
  background: rgba(10,9,7,0.5);
  border-radius: 4px;
  border: 1px solid rgba(46,42,30,0.4);
}
.bf-qr-item .bf-qr-num {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  color: var(--amber);
  line-height: 1;
}
.bf-qr-item .bf-qr-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 6px;
}
.bf-qr-item .bf-qr-val {
  font-size: 13px;
  color: var(--muted2);
  margin-top: 2px;
}

/* ── RESPONSIVE ── */
@media (max-width: 700px) {
  .bf-layer-map { grid-template-columns: repeat(3, 1fr); }
  .bf-entry { grid-template-columns: 1fr; }
  .bf-entry-tag { justify-self: start; }
  .bf-quick-ref-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .bf-layer-map { grid-template-columns: repeat(2, 1fr); }
}
`;
