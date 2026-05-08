import Link from 'next/link';

export default function BibliothekPage() {
  return (
    <>
      <style>{BIBLIOTHEK_CSS}</style>

      <main className="lib-page">
        <div className="lib-wrap">

          {/* ── HERO ── */}
          <div className="lib-hero">
            <div className="lib-hero-kicker">Rhythm Gym · Wissen</div>
            <h1>RHYTHMUS<br /><em>BIBLIOTHEK</em></h1>
            <p className="lib-hero-sub">
              Alle Begriffe, Konzepte und Zusammenhänge an einem Ort.
              Von Puls bis Polyrhythmus — klar definiert, sauber getrennt, bereit zum Üben.
            </p>
          </div>

          {/* ── LAYER MAP ── */}
          <div className="lib-layer-map">
            <a href="#zeitbasis">
              <span className="lib-lm-num">01</span>
              <span className="lib-lm-label">Zeitbasis</span>
            </a>
            <a href="#aufloesung">
              <span className="lib-lm-num">02</span>
              <span className="lib-lm-label">Auflösung</span>
            </a>
            <a href="#gestaltung">
              <span className="lib-lm-num">03</span>
              <span className="lib-lm-label">Gestaltung</span>
            </a>
            <a href="#timing">
              <span className="lib-lm-num">04</span>
              <span className="lib-lm-label">Timing</span>
            </a>
            <a href="#mehrschicht">
              <span className="lib-lm-num">05</span>
              <span className="lib-lm-label">Mehrschichtigkeit</span>
            </a>
            <a href="#praxis">
              <span className="lib-lm-num">06</span>
              <span className="lib-lm-label">Praxis</span>
            </a>
          </div>

          {/* ── KERNIDEE ── */}
          <div className="lib-highlight-box">
            <div className="lib-hb-title">Die Kernidee</div>
            <p>
              Ein <strong>Puls</strong> kann in <strong>unterschiedlicher Auflösung</strong> gespielt werden (Subdivision).
              <strong>Rhythmus</strong> entsteht durch die Gestaltung dieser Zeit.
              <strong>Spannung</strong> entsteht durch Gegenrhythmus (Cross-Rhythmus).
              <strong>Mehrdimensionale Zeit</strong> entsteht erst durch gleichwertige Zeitordnungen (Polyrhythmus).
            </p>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 01 · ZEITBASIS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section className="lib-layer-section" id="zeitbasis">
            <div className="lib-layer-header">
              <div className="lib-layer-num">01</div>
              <div className="lib-layer-title">ZEITBASIS</div>
            </div>
            <p className="lib-layer-desc">
              Alles beginnt hier. Puls, Tempo und Metrum bilden das Fundament, auf dem jeder Rhythmus aufbaut.
            </p>

            <div className="lib-entries">

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Puls / Beat</div>
                  <div className="lib-entry-def">
                    Der gleichmäßige Grundschlag, auf dem alle rhythmischen Ereignisse beruhen. Fühlbar, nicht zwingend hörbar — wie ein innerer Herzschlag der Musik.
                  </div>
                  <Link className="lib-entry-tool" href="/tool">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Im Rhythm Tool üben
                  </Link>
                </div>
                <div className="lib-entry-tag">Fundament</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Tempo</div>
                  <div className="lib-entry-def">
                    Die Geschwindigkeit des Pulses, gemessen in <strong>BPM</strong> (Beats per Minute). Tempoänderung = die gesamte Zeit wird schneller oder langsamer.
                  </div>
                  <div className="lib-entry-example">z. B. 60 BPM = ein Schlag pro Sekunde · 120 BPM = zwei Schläge pro Sekunde</div>
                </div>
                <div className="lib-entry-tag">Geschwindigkeit</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Takt / Metrum</div>
                  <div className="lib-entry-def">
                    Periodische Gruppierung des Pulses in wiederkehrende Einheiten. Der Takt organisiert den Puls — <strong>Puls = gleichmäßig, Takt = strukturiert</strong>.
                  </div>
                  <div className="lib-entry-example">z. B. 4/4 = vier Viertelnoten pro Takt · 3/4 = drei Viertelnoten pro Takt</div>
                </div>
                <div className="lib-entry-tag">Ordnung</div>
              </div>

            </div>

            <div className="lib-highlight-box">
              <div className="lib-hb-title">Taktarten im Überblick</div>
              <table className="lib-comp-table">
                <tbody>
                  <tr><th>Typ</th><th>Beispiele</th><th>Charakter</th></tr>
                  <tr><td>Einfach</td><td>2/4 · 3/4 · 4/4</td><td>Marsch, Walzer, Pop/Rock — klare Betonungsmuster</td></tr>
                  <tr><td>Zusammengesetzt</td><td>6/8 · 9/8 · 12/8</td><td>Hauptschläge in Dreier-Gruppen — fließend, tänzerisch</td></tr>
                  <tr><td>Ungerade</td><td>5/4 · 7/8 · 11/8</td><td>Asymmetrische Gruppen (z. B. 3+2 oder 2+2+3) — spannend, unvorhersehbar</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="lib-section-rule" />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 02 · AUFLÖSUNG */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section className="lib-layer-section" id="aufloesung">
            <div className="lib-layer-header">
              <div className="lib-layer-num">02</div>
              <div className="lib-layer-title">AUFLÖSUNG</div>
            </div>
            <p className="lib-layer-desc">
              Subdivision teilt den Puls in kleinere Einheiten auf. Je feiner die Auflösung, desto mehr Möglichkeiten für rhythmische Gestaltung.
            </p>

            <div className="lib-entries">

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Subdivision</div>
                  <div className="lib-entry-def">
                    Gleichmäßige Aufteilung eines Pulses in kleinere Einheiten. Subdivision erzeugt <strong>keine neue Zeitordnung</strong> — sie verfeinert die bestehende.
                  </div>
                  <Link className="lib-entry-tool" href="/tool">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Im Rhythm Tool üben
                  </Link>
                </div>
                <div className="lib-entry-tag">Auflösung</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Subdivision-Wechsel</div>
                  <div className="lib-entry-def">
                    Wechsel der Unterteilung bei <strong>gleichbleibendem Puls, Tempo und Takt</strong> (z. B. Achtel → Sechzehntel). Kein Tempowechsel, keine neue Zeitordnung.
                  </div>
                </div>
                <div className="lib-entry-tag">Kontrolle</div>
              </div>

            </div>

            <div className="lib-highlight-box">
              <div className="lib-hb-title">Notenwerte &amp; Auflösung</div>
              <table className="lib-comp-table">
                <tbody>
                  <tr><th>Notenwert</th><th>Dauer (in 4/4)</th><th>Auflösung</th></tr>
                  <tr><td>Ganze</td><td>4 Schläge</td><td>1 pro Takt</td></tr>
                  <tr><td>Halbe</td><td>2 Schläge</td><td>2 pro Takt</td></tr>
                  <tr><td>Viertel</td><td>1 Schlag</td><td>4 pro Takt — der Puls</td></tr>
                  <tr><td>Achtel</td><td>½ Schlag</td><td>8 pro Takt</td></tr>
                  <tr><td>Sechzehntel</td><td>¼ Schlag</td><td>16 pro Takt</td></tr>
                  <tr><td>32tel</td><td>⅛ Schlag</td><td>32 pro Takt</td></tr>
                </tbody>
              </table>
            </div>

            <div className="lib-entries" style={{ marginTop: 16 }}>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Punktierung</div>
                  <div className="lib-entry-def">
                    Verlängert einen Notenwert um die Hälfte seiner Dauer. Eine punktierte Viertel = 1½ Schläge.
                  </div>
                </div>
                <div className="lib-entry-tag">Dauer</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Triolen &amp; Tuplets</div>
                  <div className="lib-entry-def">
                    <strong>Triole</strong> teilt einen Schlag in drei gleiche Teile statt zwei. Weitere Tuplets: Quintolen (5), Sextolen (6), Septolen (7) — sie brechen das binäre Raster auf.
                  </div>
                  <div className="lib-entry-example">Merkhilfe: „A-na-nas" = Triole</div>
                </div>
                <div className="lib-entry-tag">Unterteilung</div>
              </div>

            </div>
          </section>

          <hr className="lib-section-rule" />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 03 · GESTALTUNG */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section className="lib-layer-section" id="gestaltung">
            <div className="lib-layer-header">
              <div className="lib-layer-num">03</div>
              <div className="lib-layer-title">GESTALTUNG</div>
            </div>
            <p className="lib-layer-desc">
              Hier wird aus Zeitstruktur Musik. Patterns, Synkopen, Akzente und Betonungen formen den konkreten Rhythmus — das, was du hörst und spielst.
            </p>

            <div className="lib-entries">

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Rhythmus</div>
                  <div className="lib-entry-def">
                    Die konkrete Abfolge von Klang und Stille innerhalb von Puls und Takt. Rhythmus ist <strong>„was passiert"</strong> — die Gestaltung der Zeit.
                  </div>
                </div>
                <div className="lib-entry-tag">Kernelement</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Pattern</div>
                  <div className="lib-entry-def">
                    Ein wiederkehrendes rhythmisches Muster. Patterns können einfach sein (Viertelpuls) oder komplex (Sechzehntel-Kombinationen). Sie sind die Bausteine des rhythmischen Spiels.
                  </div>
                  <Link className="lib-entry-tool" href="/tool">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Im Rhythm Tool üben
                  </Link>
                </div>
                <div className="lib-entry-tag">Baustein</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Synkope</div>
                  <div className="lib-entry-def">
                    Betonung auf einer eigentlich <strong>unbetonten Zählzeit</strong>. Synkopen erzeugen Vorwärtsbewegung und überraschen das rhythmische Erwartungsmuster.
                  </div>
                </div>
                <div className="lib-entry-tag">Spannung</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Akzentverschiebung</div>
                  <div className="lib-entry-def">
                    Betonungen wandern bei gleicher Subdivision. Die <strong>Struktur bleibt, die Wirkung verändert sich</strong>. Eng verwandt mit Synkopierung, aber nicht identisch.
                  </div>
                </div>
                <div className="lib-entry-tag">Wahrnehmung</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Ostinato</div>
                  <div className="lib-entry-def">
                    Eine rhythmische (oder melodische) Figur, die sich beharrlich wiederholt und als „Boden" fungiert. Auf der Handpan oft die Grundlage für alles Weitere.
                  </div>
                </div>
                <div className="lib-entry-tag">Fundament</div>
              </div>

            </div>

            <div className="lib-highlight-box">
              <div className="lib-hb-title">Stilistische Pattern-Familien</div>
              <table className="lib-comp-table">
                <tbody>
                  <tr><th>Stil</th><th>Charakteristik</th><th>Typisches Merkmal</th></tr>
                  <tr><td>Rock / Pop</td><td>Backbeat — Betonung auf 2 und 4</td><td>Geradlinig, energetisch</td></tr>
                  <tr><td>Jazz</td><td>Swing-Rhythmus, Walking-Feel</td><td>Triolische Interpretation der Achtel</td></tr>
                  <tr><td>Latin</td><td>Clave-Pattern, Bossa Nova, Samba</td><td>Zyklisch, polyrhythmisch angelegt</td></tr>
                  <tr><td>Funk</td><td>Synkopierte Groove-Patterns</td><td>Sechzehntel-basiert, „in den Lücken"</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="lib-section-rule" />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 04 · TIMING & GROOVE */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section className="lib-layer-section" id="timing">
            <div className="lib-layer-header">
              <div className="lib-layer-num">04</div>
              <div className="lib-layer-title">TIMING &amp; GROOVE</div>
            </div>
            <p className="lib-layer-desc">
              Was einen Rhythmus lebendig macht: die Qualität der Platzierung. Hier trennt sich mechanisches Spielen von musikalischem Ausdruck.
            </p>

            <div className="lib-entries">

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Timing</div>
                  <div className="lib-entry-def">
                    Qualität und Präzision, mit der rhythmische Ereignisse relativ zum Puls platziert werden. <strong>Timing ≠ Tempo.</strong> Tempo ist die Geschwindigkeit, Timing ist die Genauigkeit.
                  </div>
                </div>
                <div className="lib-entry-tag">Platzierung</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Groove</div>
                  <div className="lib-entry-def">
                    Das Gefühl von fließender, organischer Zeit innerhalb eines rhythmischen Systems. Groove ist, was dich zum Bewegen bringt — er entsteht durch das Zusammenspiel aller Timing-Elemente.
                  </div>
                </div>
                <div className="lib-entry-tag">Gefühl</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Mikrotiming</div>
                  <div className="lib-entry-def">
                    Minimale Timing-Abweichungen vom mathematischen Raster im Millisekundenbereich. Diese Abweichungen machen Musik lebendig statt maschinell.
                  </div>
                </div>
                <div className="lib-entry-tag">Mikrorhythmik</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Laid Back / On Top</div>
                  <div className="lib-entry-def">
                    <strong>Laid Back</strong> = minimal hinter dem Beat (entspannt, breiter). <strong>On Top</strong> = minimal vor dem Beat (drängend, energisch). Beide sind bewusste Timing-Entscheidungen, keine Fehler.
                  </div>
                </div>
                <div className="lib-entry-tag">Platzierung</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Pocket</div>
                  <div className="lib-entry-def">
                    Der „Sweet Spot" — der gemeinsame Zeitkorridor, in dem alles sitzt. Wenn mehrere Musiker „in the pocket" spielen, entsteht maximaler Groove.
                  </div>
                </div>
                <div className="lib-entry-tag">Sweet Spot</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Human Feel</div>
                  <div className="lib-entry-def">
                    Natürliche Zeitbewegung statt Maschinenraster. Kein Mensch spielt mathematisch exakt — und genau das macht Musik menschlich.
                  </div>
                </div>
                <div className="lib-entry-tag">Ausdruck</div>
              </div>

            </div>
          </section>

          <hr className="lib-section-rule" />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 05 · MEHRSCHICHTIGKEIT */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section className="lib-layer-section" id="mehrschicht">
            <div className="lib-layer-header">
              <div className="lib-layer-num">05</div>
              <div className="lib-layer-title">MEHRSCHICHTIGKEIT</div>
            </div>
            <p className="lib-layer-desc">
              Wenn rhythmische Ebenen sich überlagern. Hier wird Zeit mehrdimensional — und die Unterscheidung der Konzepte besonders wichtig.
            </p>

            <div className="lib-entries">

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Cross-Rhythmus</div>
                  <div className="lib-entry-def">
                    Ein Rhythmus liegt <strong>quer zum dominanten Puls/Metrum</strong> und erzeugt Spannung. Entscheidend: der dominante Puls bleibt bestehen und bleibt spürbar.
                  </div>
                  <div className="lib-entry-example">z. B. eine 3er-Figur über einem 4/4-Puls</div>
                </div>
                <div className="lib-entry-tag">Reibung</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Polyrhythmus</div>
                  <div className="lib-entry-def">
                    Gleichzeitigkeit <strong>mehrerer unabhängiger Unterteilungen</strong> über denselben Zeitraum. Mehrere gleichwertige Zeitordnungen existieren nebeneinander — keine ist dominant.
                  </div>
                  <div className="lib-entry-example">z. B. 3:2 — drei gegen zwei Schläge im selben Zeitraum</div>
                  <Link className="lib-entry-tool" href="/tool">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Im Rhythm Tool üben
                  </Link>
                </div>
                <div className="lib-entry-tag">Koexistenz</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Hemiola</div>
                  <div className="lib-entry-def">
                    Vorübergehender Wechsel der metrischen Betonung. Die Wahrnehmung kippt kurzzeitig — z. B. fühlt sich 6/8 plötzlich wie 3/4 an (oder umgekehrt).
                  </div>
                </div>
                <div className="lib-entry-tag">Kippmoment</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Metrische Modulation</div>
                  <div className="lib-entry-def">
                    Eine Subdivision wird zur <strong>neuen Zeitbasis</strong> — der Puls selbst wird neu definiert. Das ist mehr als ein Subdivision-Wechsel: es ist eine Transformation der gesamten Zeitstruktur.
                  </div>
                  <div className="lib-entry-example">z. B. bisherige Achtel werden zum neuen Viertelpuls</div>
                </div>
                <div className="lib-entry-tag">Transformation</div>
              </div>

            </div>

            <div className="lib-highlight-box">
              <div className="lib-hb-title">Entscheidende Klarstellung</div>
              <p>
                <strong>4 + 8 + 16 = Subdivision</strong> — gleicher Puls, feinere Auflösung.<br />
                <strong>3 gegen 4 = Polyrhythmus</strong> — zwei gleichwertige Zeitordnungen.<br />
                <strong>3 über 4 = Cross-Rhythmus</strong> — Spannung gegen den dominanten Puls.
              </p>
            </div>
          </section>

          <hr className="lib-section-rule" />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 06 · PRAXIS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section className="lib-layer-section" id="praxis">
            <div className="lib-layer-header">
              <div className="lib-layer-num">06</div>
              <div className="lib-layer-title">PRAXIS</div>
            </div>
            <p className="lib-layer-desc">
              Rhythmus in der Anwendung: wie du zählst, wie Rhythmus in Musik wirkt, und welche Begriffe aus dem musikalischen Kontext wichtig sind.
            </p>

            <div className="lib-entries">

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Melodischer Rhythmus</div>
                  <div className="lib-entry-def">
                    Die rhythmische Gestaltung von Melodien und Phrasierung. Rhythmus und Melodie sind untrennbar — die gleichen Töne in anderem Rhythmus ergeben eine andere Melodie.
                  </div>
                </div>
                <div className="lib-entry-tag">Kontext</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Harmonischer Rhythmus</div>
                  <div className="lib-entry-def">
                    Die Geschwindigkeit, mit der Akkorde wechseln. Langsamer harmonischer Rhythmus = ruhig und offen. Schneller = dicht und treibend.
                  </div>
                </div>
                <div className="lib-entry-tag">Kontext</div>
              </div>

              <div className="lib-entry">
                <div className="lib-entry-main">
                  <div className="lib-entry-term">Riffs &amp; Licks</div>
                  <div className="lib-entry-def">
                    Wiedererkennbare rhythmisch-melodische Motive. <strong>Riff</strong> = tragendes Element (wiederholt sich). <strong>Lick</strong> = kürzere, oft improvisierte Figur.
                  </div>
                </div>
                <div className="lib-entry-tag">Motiv</div>
              </div>

            </div>

            <div className="lib-highlight-box">
              <div className="lib-hb-title">Zählweisen</div>
              <table className="lib-comp-table">
                <tbody>
                  <tr><th>Methode</th><th>System</th><th>Einsatz</th></tr>
                  <tr><td>Klassisch</td><td>1 – 2 – 3 – 4</td><td>Grundlage für alles</td></tr>
                  <tr><td>Achtel-Sub</td><td>1 und 2 und 3 und 4 und</td><td>Achtel-basierte Patterns</td></tr>
                  <tr><td>16tel-Sub</td><td>1 e + a 2 e + a</td><td>Sechzehntel-Figuren, Funk</td></tr>
                  <tr><td>Silben</td><td>Ta-Ka-Di-Mi</td><td>Indisches System, sehr intuitiv</td></tr>
                  <tr><td>Wortbasiert</td><td>„A-na-nas" (Triole)</td><td>Merkhilfe für Unterteilungen</td></tr>
                  <tr><td>Körperbasiert</td><td>Schritt + Stimme</td><td>Zeit in den Körper legen</td></tr>
                  <tr><td>Gruppen</td><td>3+2 · 2+2+3</td><td>Ungerade Taktarten (5er, 7er)</td></tr>
                  <tr><td>Phrasen</td><td>Über mehrere Takte fühlen</td><td>Große Bögen, Form</td></tr>
                  <tr><td>Hand-Wechsel</td><td>Links/Rechts als Zeitstruktur</td><td>Sehr handpan-nah</td></tr>
                </tbody>
              </table>
            </div>

            <div className="lib-highlight-box" style={{ marginTop: 12 }}>
              <div className="lib-hb-title">Pragmatisch</div>
              <p>
                Zählen ist ein Trainingsrad. Ziel ist, dass du es irgendwann nicht mehr brauchst — weil der <strong>Puls im Körper sitzt</strong>.
              </p>
            </div>
          </section>

          {/* ── QUICK REF ── */}
          <div className="lib-quick-ref">
            <div className="lib-qr-title">LEHRTAFEL — 7 KERNBEGRIFFE</div>
            <div className="lib-quick-ref-grid">
              <div className="lib-qr-item">
                <div className="lib-qr-num">1</div>
                <div className="lib-qr-label">Puls</div>
                <div className="lib-qr-val">Gleichmäßiger Grundschlag</div>
              </div>
              <div className="lib-qr-item">
                <div className="lib-qr-num">2</div>
                <div className="lib-qr-label">Subdivision</div>
                <div className="lib-qr-val">Unterteilung (4→8→16)</div>
              </div>
              <div className="lib-qr-item">
                <div className="lib-qr-num">3</div>
                <div className="lib-qr-label">Sub-Wechsel</div>
                <div className="lib-qr-val">Gleicher Puls, andere Auflösung</div>
              </div>
              <div className="lib-qr-item">
                <div className="lib-qr-num">4</div>
                <div className="lib-qr-label">Rhythmus</div>
                <div className="lib-qr-val">Die gespielte Struktur</div>
              </div>
              <div className="lib-qr-item">
                <div className="lib-qr-num">5</div>
                <div className="lib-qr-label">Timing</div>
                <div className="lib-qr-val">Wie präzise du platzierst</div>
              </div>
              <div className="lib-qr-item">
                <div className="lib-qr-num">6</div>
                <div className="lib-qr-label">Cross-Rhythmus</div>
                <div className="lib-qr-val">Spannung gegen den Puls</div>
              </div>
              <div className="lib-qr-item">
                <div className="lib-qr-num">7</div>
                <div className="lib-qr-label">Polyrhythmus</div>
                <div className="lib-qr-val">Zeitordnungen gleichzeitig</div>
              </div>
            </div>
          </div>

          {/* ── VERTIEFUNG ── */}
          <Link href="/bibliothek/breaks-und-fills" className="lib-vertiefung">
            <div className="lib-vertiefung-kicker">Vertiefung</div>
            <div className="lib-vertiefung-title">Breaks und Fills →</div>
            <div className="lib-vertiefung-desc">
              Wie du rhythmische Pausen, Übergänge und Auffüllungen gestaltest — der nächste Schritt nach den Grundbegriffen.
            </div>
          </Link>

          {/* ── POEM ── */}
          <div className="lib-poem">
            Am Ende finde ich dich,<br />
            pulsierend wie das Leuchten der Sterne,<br />
            mitten in mir, in allem was ist.<br />
            Auf deiner Melodie spielt meine Seele.
            <div className="lib-poem-author">— Nils Caspar</div>
          </div>

        </div>
      </main>
    </>
  );
}

const BIBLIOTHEK_CSS = `
/* ── Ambient background (scoped to this page) ── */
.lib-page {
  position: relative;
  color: var(--text);
}
.lib-page::before {
  content: '';
  position: fixed;
  top: -200px; left: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(245,166,35,0.04), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.lib-page::after {
  content: '';
  position: fixed;
  bottom: -100px; right: -100px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,107,53,0.03), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.lib-wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px 120px;
  position: relative;
  z-index: 1;
}

/* ── HERO ── */
.lib-hero {
  padding: 72px 0 48px;
  text-align: center;
}
.lib-hero-kicker {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 16px;
}
.lib-hero h1 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(36px, 6vw, 64px);
  letter-spacing: 2px;
  color: var(--cream);
  line-height: 1.1;
  margin-bottom: 20px;
}
.lib-hero h1 em {
  font-style: normal;
  color: var(--amber);
}
.lib-hero-sub {
  color: var(--muted2, #9A9080);
  max-width: 60ch;
  margin: 0 auto;
  font-size: 17px;
  line-height: 1.7;
}

/* ── LAYER MAP ── */
.lib-layer-map {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin: 48px 0 56px;
  border-radius: 6px;
  overflow: hidden;
}
.lib-layer-map a {
  text-decoration: none;
  padding: 16px 8px;
  text-align: center;
  background: var(--card);
  border: 1px solid transparent;
  transition: all 0.25s;
  position: relative;
}
.lib-layer-map a::after {
  content: '';
  position: absolute;
  bottom: 0; left: 20%; right: 20%;
  height: 2px;
  background: var(--amber);
  opacity: 0;
  transition: opacity 0.25s;
}
.lib-layer-map a:hover {
  background: var(--card2, #242016);
  border-color: var(--border2, #3A3428);
}
.lib-layer-map a:hover::after { opacity: 1; }
.lib-layer-map .lib-lm-num {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  color: var(--amber);
  display: block;
  line-height: 1;
  margin-bottom: 6px;
}
.lib-layer-map .lib-lm-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
}

/* ── SECTIONS ── */
.lib-layer-section {
  margin-bottom: 64px;
  scroll-margin-top: 70px;
}
.lib-layer-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.lib-layer-num {
  font-family: 'Anton', sans-serif;
  font-size: 42px;
  color: var(--amber);
  line-height: 1;
  opacity: 0.3;
}
.lib-layer-title {
  font-family: 'Anton', sans-serif;
  font-size: clamp(22px, 3vw, 30px);
  letter-spacing: 1px;
  color: var(--cream);
}
.lib-layer-desc {
  color: var(--muted2, #9A9080);
  margin: 12px 0 24px;
  max-width: 70ch;
  font-size: 15px;
}

/* ── ENTRY CARDS ── */
.lib-entries {
  display: grid;
  gap: 12px;
}
.lib-entry {
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
.lib-entry:hover {
  border-color: var(--border2, #3A3428);
  background: var(--card2, #242016);
}
.lib-entry-main { min-width: 0; }
.lib-entry-term {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--cream);
  margin-bottom: 4px;
}
.lib-entry-def {
  color: var(--muted2, #9A9080);
  font-size: 15px;
  line-height: 1.6;
}
.lib-entry-def strong { color: var(--text); font-weight: 500; }
.lib-entry-example {
  margin-top: 8px;
  font-size: 13px;
  color: var(--muted);
  font-style: italic;
}
.lib-entry-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--amber);
  background: var(--amber-dim, rgba(245,166,35,0.12));
  padding: 4px 10px;
  border-radius: 3px;
  white-space: nowrap;
  align-self: center;
}

/* ── TOOL LINK (active) ── */
.lib-entry-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--amber);
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s;
}
.lib-entry-tool:hover {
  opacity: 0.85;
  transform: translateX(2px);
}
.lib-entry-tool svg { width: 14px; height: 14px; }

/* ── HIGHLIGHT BOX ── */
.lib-highlight-box {
  background: linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.03));
  border: 1px solid rgba(245,166,35,0.2);
  border-radius: 6px;
  padding: 24px;
  margin: 24px 0;
}
.lib-highlight-box .lib-hb-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 10px;
}
.lib-highlight-box p {
  color: var(--text);
  font-size: 15px;
  line-height: 1.7;
}
.lib-highlight-box p strong { color: var(--cream); font-weight: 600; }

/* ── COMPARISON TABLE ── */
.lib-comp-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
.lib-comp-table th {
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
.lib-comp-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(46,42,30,0.5);
  font-size: 14px;
  vertical-align: top;
}
.lib-comp-table td:first-child {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  color: var(--cream);
  white-space: nowrap;
  letter-spacing: 0.3px;
}
.lib-comp-table tr:last-child td { border-bottom: none; }

/* ── PILL ROW ── */
.lib-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.lib-pill {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
  transition: border-color 0.2s;
}
.lib-pill:hover { border-color: var(--border2, #3A3428); }
.lib-pill strong {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--cream);
}
.lib-pill span {
  font-size: 13px;
  color: var(--muted);
}

/* ── SECTION DIVIDER ── */
.lib-section-rule {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border2, #3A3428), transparent);
  margin: 0 0 64px;
}

/* ── QUICK REF ── */
.lib-quick-ref {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 28px;
  margin: 48px 0;
}
.lib-quick-ref .lib-qr-title {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  letter-spacing: 1px;
  color: var(--cream);
  margin-bottom: 20px;
}
.lib-quick-ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.lib-qr-item {
  text-align: center;
  padding: 16px 8px;
  background: rgba(10,9,7,0.5);
  border-radius: 4px;
  border: 1px solid rgba(46,42,30,0.4);
}
.lib-qr-item .lib-qr-num {
  font-family: 'Anton', sans-serif;
  font-size: 28px;
  color: var(--amber);
  line-height: 1;
}
.lib-qr-item .lib-qr-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 4px;
}
.lib-qr-item .lib-qr-val {
  font-size: 13px;
  color: var(--muted2, #9A9080);
  margin-top: 2px;
}

/* ── VERTIEFUNG (link to deeper article) ── */
.lib-vertiefung {
  display: block;
  background: linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.03));
  border: 1px solid rgba(245,166,35,0.2);
  border-radius: 6px;
  padding: 28px;
  margin: 32px 0 16px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s, background 0.2s;
}
.lib-vertiefung:hover {
  border-color: var(--amber);
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(245,166,35,0.10), rgba(255,107,53,0.05));
}
.lib-vertiefung-kicker {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 8px;
}
.lib-vertiefung-title {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  letter-spacing: 1px;
  color: var(--cream);
  margin-bottom: 8px;
}
.lib-vertiefung-desc {
  color: var(--muted2, #9A9080);
  font-size: 14px;
  line-height: 1.6;
  max-width: 60ch;
}

/* ── POEM ── */
.lib-poem {
  text-align: center;
  padding: 48px 24px;
  color: var(--muted);
  font-style: italic;
  font-size: 16px;
  line-height: 2.2;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin: 48px 0;
}
.lib-poem-author {
  margin-top: 16px;
  font-style: normal;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
}

/* ── RESPONSIVE ── */
@media (max-width: 700px) {
  .lib-layer-map { grid-template-columns: repeat(3, 1fr); }
  .lib-entry { grid-template-columns: 1fr; }
  .lib-entry-tag { justify-self: start; }
  .lib-quick-ref-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 500px) {
  .lib-layer-map { grid-template-columns: repeat(2, 1fr); }
  .lib-quick-ref-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
