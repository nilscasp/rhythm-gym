import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '../../components/LegalPage';

// Allgemeine Geschäftsbedingungen für Kurse und Mitgliedschaft.
// Wortlaut aus docs/recht-entwurf.md (Bausteine B1–B7), freigegeben von
// Nils am 24.10.2026. Die Stellen in <Offen> klärt eine Fachperson; sie werden
// nicht angezeigt und nicht erfunden, bis der Text dafür da ist.

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  robots: { index: false, follow: true },
};

/** Merkposten für die Fachperson — wird nicht gerendert. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Offen(_: { children: React.ReactNode }) {
  return null;
}

export default function AgbPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Allgemeine Geschäftsbedingungen" updated="24. Oktober 2026">
      <h2>1. Geltung</h2>
      <p>
        Diese Bedingungen gelten für Kurse und Mitgliedschaften (Abos) der Handpan Schule des Lebens
        auf lernen.handpan.schule. Anbieter: Nils Caspar Böhm, Anschrift laut{' '}
        <Link href="/impressum">Impressum</Link>.
      </p>

      <h2>2. Mitgliedschaft (Abo)</h2>
      <ol>
        <li>
          Das Abo läuft monatlich oder jährlich, je nach Wahl beim Kauf, und verlängert sich jeweils um
          denselben Zeitraum.
        </li>
        <li>
          Du kannst jederzeit über das Kundenportal („Abo verwalten“) kündigen. Die Kündigung wirkt zum
          Ende des laufenden Zeitraums; bis dahin bleibt dein Zugang offen.
        </li>
        <li>
          Schlägt eine Abbuchung fehl, ist der Zugang ab diesem Tag gesperrt und öffnet sich wieder,
          sobald die Zahlung erfolgreich nachgeholt ist. Gelingt das innerhalb der
          Wiederholungsversuche des Zahlungsdienstleisters nicht, endet das Abo.
        </li>
        <li>
          Das Jahresabo kann auf Anfrage in Raten per Überweisung gezahlt werden. Die Raten werden im
          Einzelfall schriftlich vereinbart.
        </li>
      </ol>
      <Offen>Widerrufsrecht bei digitalen Inhalten und Dienstleistungen, Hinweis zum vorzeitigen Erlöschen, Preisänderungen.</Offen>

      <h2>3. Kurse</h2>
      <ol>
        <li>Mit dem Kauf erhältst du Zugang zu den Lektionen des Kurses im angegebenen Umfang.</li>
        <li>
          Zum Kurs gehört eine WhatsApp-Gruppe. Mit dem Beitritt wird deine Handynummer für die anderen
          in der Gruppe sichtbar. Der Beitritt ist freiwillig.
        </li>
      </ol>
      <Offen>Dauer des Zugangs zu gekauften Kursen.</Offen>

      <h2>4. Miteinander und Nummerntausch</h2>
      <ol>
        <li>
          Handynummern werden im Miteinander nur getauscht, wenn beide Seiten der Verbindung zugestimmt
          haben.
        </li>
        <li>
          Du verwendest Nummern anderer nur für den persönlichen Austausch rund um die Schule und gibst
          sie nicht weiter.
        </li>
      </ol>

      <h2>5. Verhaltensregeln</h2>
      <ol>
        <li>
          Keine Werbung, keine Verkaufsangebote, keine Kettennachrichten – weder auf der Plattform noch
          über getauschte Nummern.
        </li>
        <li>
          Niemanden bedrängen: Ein „Nein“ oder keine Antwort auf eine Anfrage ist zu respektieren. Keine
          wiederholten Anfragen an dieselbe Person.
        </li>
        <li>
          Respektvoller Umgangston; keine beleidigenden, diskriminierenden oder rechtswidrigen Inhalte.
        </li>
      </ol>

      <h2>6. Rechte der Schule</h2>
      <p>
        Die Schule darf Einträge (Challenges, Treffen, Profile, Anfragen) schließen oder ausblenden und
        Personen vom Miteinander oder von der Plattform sperren, wenn gegen diese Regeln verstoßen wird
        oder es zum Schutz anderer nötig ist.
      </p>
      <Offen>Folgen einer Sperre für ein laufendes Abo, anteilige Erstattung ja oder nein.</Offen>

      <h2>7. Treffen und Challenges</h2>
      <p>
        Treffen und Challenges im Miteinander werden von Mitgliedern selbst organisiert. Sie sind keine
        Veranstaltungen der Schule. Die Schule beaufsichtigt sie nicht und haftet nicht für ihren
        Ablauf oder für Schäden, die dabei entstehen, außer bei Vorsatz oder grober Fahrlässigkeit.
      </p>
      <Offen>Haftungsklausel AGB-fest formulieren (Leben, Körper, Gesundheit).</Offen>

      <p className="legal-note">
        Was mit deinen Daten passiert, steht in der{' '}
        <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </LegalPage>
  );
}
