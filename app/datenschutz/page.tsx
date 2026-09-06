import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '../../components/LegalPage';
import { ProtectedContact } from '../../components/ProtectedContact';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  robots: { index: false, follow: true },
};

const EMAIL = ['kontakt', 'handpan.schule'];
const PHONE = ['4915', '1229', '64922'];

export default function DatenschutzPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Datenschutzerklärung" updated="September 2026">
      <p>
        Hier steht, was mit deinen Daten passiert, wenn du diese App nutzt. Die Erklärung gilt für{' '}
        <strong>lernen.handpan.schule</strong> und <strong>rhythmgym.io</strong>. Beide Adressen
        führen zur selben Anwendung mit derselben Datenbank und demselben Konto.
      </p>

      <h2>1. Wer verantwortlich ist</h2>
      <address>
        Nils Caspar Böhm · Handpan Schule des Lebens
        <br />
        Bahnhofstr. 39, 85386 Eching
        <br />
        E-Mail: <ProtectedContact kind="email" parts={EMAIL} />
        <br />
        Telefon: <ProtectedContact kind="tel" parts={PHONE} />
      </address>
      <p>
        Verantwortlicher im Sinne der DSGVO bin ich, Nils. Wenn du Fragen zu deinen Daten hast,
        schreib mir. Es gibt keinen Datenschutzbeauftragten, weil das Gesetz für einen Betrieb dieser
        Größe keinen verlangt.
      </p>

      <h2>2. Was ich in dieser App verarbeite</h2>
      <h3>Dein Konto</h3>
      <p>
        Wenn du ein Konto anlegst, speichere ich deine E-Mail-Adresse, dein Passwort (nur als Hash,
        nie im Klartext), deinen Namen, wenn du ihn angibst, und den Zeitpunkt der Anmeldung. Nach der
        Anmeldung bekommst du eine Bestätigungsmail. Rechtsgrundlage ist der Vertrag über die Nutzung
        der App (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
      <h3>Dein Üben</h3>
      <p>
        Die App merkt sich, was du in ihr tust: welche Kurstage du gesehen und abgeschlossen hast,
        deine Trainings-Einträge und Übungsserien, gespeicherte Patterns, dein Instrument (Skala und
        Stimmung) und eingelöste Zugangscodes samt Kurs-Einschreibungen. Ohne diese Daten kann die App
        deinen Fortschritt nicht anzeigen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <h3>Wenn du mir schreibst</h3>
      <p>
        Schreibst du mir per E-Mail, speichere ich deine Nachricht mit den darin enthaltenen Angaben,
        um dir zu antworten (Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO).
      </p>

      <h2>3. Cookies</h2>
      <p>
        Diese App setzt nur Cookies, die für den Betrieb nötig sind: die Sitzungs-Cookies deines
        Logins (von Supabase, siehe unten) und in Vorschau-Umgebungen ein Cookie, das die Marke der
        Oberfläche festlegt. Es gibt keine Werbe- oder Tracking-Cookies und darum auch keinen
        Cookie-Banner. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG und Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>4. Dienste, die ich einsetze</h2>
      <p>
        Ich betreibe keine eigenen Server. Die folgenden Dienstleister verarbeiten Daten in meinem
        Auftrag. Mit jedem besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.
      </p>

      <h3>Hosting: Vercel</h3>
      <p>
        Die App läuft bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. Beim Aufruf
        einer Seite verarbeitet Vercel technische Daten: IP-Adresse, Browsertyp, Betriebssystem,
        aufgerufene Adresse, Zeitpunkt. Diese Server-Logs braucht es, um die App auszuliefern und vor
        Angriffen zu schützen (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist unter dem EU-US Data Privacy
        Framework zertifiziert; zusätzlich gelten die Standardvertragsklauseln der EU-Kommission.{' '}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Vercel
        </a>
      </p>
      <h3>Reichweitenmessung: Vercel Web Analytics</h3>
      <p>
        Ich nutze Vercel Web Analytics, um zu sehen, welche Seiten wie oft geöffnet werden. Der Dienst
        setzt keine Cookies und erstellt keine geräteübergreifenden Profile. Aus IP-Adresse und
        Browserkennung wird ein Hash gebildet, der nach 24 Stunden verfällt; die IP-Adresse selbst wird
        nicht gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO, mein Interesse, die App zu
        verstehen und zu verbessern.
      </p>

      <h3>Datenbank und Login: Supabase</h3>
      <p>
        Konto, Login und alle in Abschnitt 2 genannten Daten liegen bei Supabase Inc., USA. Das
        Projekt ist in der Region Frankfurt (eu-central-1) angelegt; deine Daten werden also in der
        EU gespeichert. Supabase verschickt die Bestätigungsmail bei der Anmeldung und die Mail zum
        Zurücksetzen des Passworts.{' '}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Supabase
        </a>
      </p>

      <h3>Kursvideos: Bunny Stream</h3>
      <p>
        Die Videos der Kurse werden über Bunny Stream eingebettet, einen Dienst der BunnyWay d.o.o.,
        Cesta komandanta Staneta 4A, 1215 Medvode, Slowenien. Wenn du einen Kurstag öffnest, lädt dein
        Browser das Video von Bunny; dabei wird deine IP-Adresse an Bunny übermittelt. Ohne das kann
        das Video nicht abgespielt werden (Art. 6 Abs. 1 lit. b DSGVO).{' '}
        <a href="https://bunny.net/privacy/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Bunny
        </a>
      </p>

      <h3>Live-Termine: Zoom</h3>
      <p>
        Live-Trainings und Fragerunden finden über Zoom statt (Zoom Video Communications Inc., 55
        Almaden Blvd, San Jose, CA 95113, USA). Der Zoom-Link wird nur angezeigt, wenn du Zugang zu dem
        Termin hast; erst wenn du ihm folgst, verarbeitet Zoom deine Daten nach seinen eigenen
        Bestimmungen. Zoom ist unter dem EU-US Data Privacy Framework zertifiziert.{' '}
        <a href="https://explore.zoom.us/de/privacy/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Zoom
        </a>
      </p>

      <h3>Briefe aus der Schule: Brevo</h3>
      <p>
        Wenn du dich für meine Briefe einträgst, geschieht das nur mit deiner ausdrücklichen
        Einwilligung: über ein Formular oder über die eigens dafür gesetzte Checkbox beim Anlegen des
        Kontos. Die Checkbox ist nie vorangekreuzt. Deine Adresse wird erst nach Bestätigung
        aufgenommen (Double-Opt-in). Ich speichere dazu deine E-Mail-Adresse, den Zeitpunkt der
        Einwilligung, den Wortlaut, dem du zugestimmt hast, und die Bestätigung. Versand und Verwaltung
        übernimmt Brevo (Sendinblue SAS, 7 rue de Madrid, 75008 Paris, Frankreich). Brevo wertet aus,
        ob eine Mail geöffnet und welche Links geklickt wurden. Du kannst die Einwilligung jederzeit
        widerrufen, über den Abmeldelink in jeder Mail oder mit einer kurzen Nachricht an mich.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.{' '}
        <a href="https://www.brevo.com/de/legal/privacypolicy/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Brevo
        </a>
      </p>

      <h3>Bezahlung: Stripe</h3>
      <p>
        Kurse und Mitgliedschaften werden über Stripe abgerechnet (Stripe Payments Europe Ltd., 1
        Grand Canal Street Lower, Dublin 2, Irland). Stripe erhält dabei deinen Namen, deine
        E-Mail-Adresse und deine Zahlungsdaten. Ich selbst sehe keine Kartendaten, nur den
        Zahlungsstatus und eine Kundenkennung, mit der ich deinen Kauf deinem Konto zuordne.
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Rechnungsdaten bewahre ich auf, solange das
        Steuerrecht es verlangt (in der Regel zehn Jahre).{' '}
        <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Stripe
        </a>
      </p>

      <h2>5. Links nach draußen</h2>
      <p>
        Die App verlinkt auf die Website <a href="https://handpan.schule">handpan.schule</a> und,
        bis die Community hierher umzieht, auf die Plattform Skool. Wenn du solchen Links folgst,
        gelten die Datenschutzbestimmungen des jeweiligen Anbieters. Ich habe darauf keinen Einfluss.
      </p>

      <h2>6. Wie lange ich Daten behalte</h2>
      <p>
        Dein Konto und deine Übungsdaten bleiben, solange dein Konto besteht. Willst du es löschen,
        schreib mir eine kurze Mail; ich lösche Konto und Daten innerhalb von 14 Tagen, soweit keine
        gesetzliche Aufbewahrungspflicht entgegensteht (etwa für Rechnungen). Server-Logs bei Vercel
        werden nach kurzer Zeit automatisch gelöscht.
      </p>

      <h2>7. Deine Rechte</h2>
      <ul>
        <li>Auskunft darüber, welche Daten ich über dich gespeichert habe (Art. 15 DSGVO)</li>
        <li>Berichtigung falscher Daten (Art. 16)</li>
        <li>Löschung (Art. 17) und Einschränkung der Verarbeitung (Art. 18)</li>
        <li>Herausgabe deiner Daten in einem gängigen Format (Art. 20)</li>
        <li>Widerspruch gegen Verarbeitungen, die auf meinem berechtigten Interesse beruhen (Art. 21)</li>
        <li>Widerruf einer Einwilligung, jederzeit und mit Wirkung für die Zukunft (Art. 7 Abs. 3)</li>
      </ul>
      <p>
        Dafür genügt eine Mail an mich. Außerdem kannst du dich bei einer Aufsichtsbehörde beschweren.
        Zuständig ist das Bayerische Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach.
      </p>

      <h2>8. Sicherheit</h2>
      <p>
        Die Verbindung zur App ist durchgehend verschlüsselt (TLS). Passwörter werden nur als Hash
        gespeichert. Der Zugriff auf deine Daten in der Datenbank ist so eingerichtet, dass nur du
        selbst und ich als Betreiber ihn haben.
      </p>

      <p className="legal-note">
        Diese Erklärung ändert sich, wenn die App neue Funktionen bekommt. Die aktuelle Fassung findest
        du immer hier; das Datum oben zeigt den Stand. Zum <Link href="/impressum">Impressum</Link>.
      </p>
    </LegalPage>
  );
}
