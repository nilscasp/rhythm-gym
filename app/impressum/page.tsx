import type { Metadata } from 'next';
import { LegalPage } from '../../components/LegalPage';
import { ProtectedContact } from '../../components/ProtectedContact';

export const metadata: Metadata = {
  title: 'Impressum',
  robots: { index: false, follow: true },
};

const EMAIL = ['kontakt', 'handpan.schule'];
const PHONE = ['4915', '1229', '64922'];

export default function ImpressumPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Impressum">
      <p>
        Dieses Impressum gilt für die Lern-App unter <strong>lernen.handpan.schule</strong> und{' '}
        <strong>rhythmgym.io</strong>. Beide sind dieselbe Anwendung.
      </p>

      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        Nils Caspar Böhm
        <br />
        Handpan Schule des Lebens
        <br />
        Bahnhofstr. 39
        <br />
        85386 Eching
      </address>

      <h3>Kontakt</h3>
      <p>
        Telefon: <ProtectedContact kind="tel" parts={PHONE} />
        <br />
        E-Mail: <ProtectedContact kind="email" parts={EMAIL} />
      </p>

      <h3>Berufsbezeichnung</h3>
      <p>Musiker, Künstler und Lehrer (freiberuflich), Bundesrepublik Deutschland</p>

      <h3>Umsatzsteuer</h3>
      <p>Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen.</p>

      <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
      <address>
        Nils Caspar Böhm
        <br />
        Bahnhofstr. 39
        <br />
        85386 Eching
      </address>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter bin ich gemäß § 7 Abs. 1 DDG für eigene Inhalte in dieser App nach den
        allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
        forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder
        Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        Eine Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
        Bei Bekanntwerden entsprechender Rechtsverletzungen entferne ich diese Inhalte umgehend.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Diese App enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss
        habe. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
        Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße geprüft;
        rechtswidrige Inhalte waren dabei nicht erkennbar. Bei Bekanntwerden von Rechtsverletzungen
        entferne ich derartige Links umgehend.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die von mir erstellten Inhalte und Werke in dieser App, insbesondere Kursvideos, Texte,
        Übungen und Pattern-Bibliothek, unterliegen dem deutschen Urheberrecht. Vervielfältigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts
        bedürfen meiner schriftlichen Zustimmung. Kopien sind nur für den privaten, nicht kommerziellen
        Gebrauch gestattet.
      </p>
    </LegalPage>
  );
}
