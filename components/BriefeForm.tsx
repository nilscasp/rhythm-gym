'use client';

import { useState } from 'react';

/* Anmeldeformular für die Briefe aus der Schule.
   Markenfrei: nur Tokens und die drei Font-Variablen, keine Brand-Logik.
   Der Aufrufer entscheidet über `source`, wo die Adresse herkommt. */

const FEHLER_TEXT =
  'Das hat gerade nicht geklappt. Versuch es gleich noch einmal oder schreib mir.';

type Status = 'idle' | 'sending' | 'done' | 'error';

export function BriefeForm({ source }: { source: string }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [fehler, setFehler] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setFehler('');

    try {
      const res = await fetch('/api/briefe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source, consent: true, website }),
      });

      if (res.ok) {
        setStatus('done');
        return;
      }

      const body: unknown = await res.json().catch(() => null);
      const meldung =
        body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error
          : FEHLER_TEXT;
      setFehler(meldung);
      setStatus('error');
    } catch {
      setFehler(FEHLER_TEXT);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <>
        <style>{BRIEFE_CSS}</style>
        <p className="briefe-done" role="status">
          Fast geschafft: Schau in dein Postfach und klick den Bestätigungslink. Dann öffnet sich
          Tag 1.
        </p>
      </>
    );
  }

  return (
    <>
      <style>{BRIEFE_CSS}</style>
      <form className="briefe-form" onSubmit={onSubmit}>
        <label className="briefe-label" htmlFor="briefe-email">
          Deine E-Mail
        </label>
        <input
          id="briefe-email"
          className="briefe-input"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          placeholder="du@beispiel.de"
        />

        <div className="briefe-hp" aria-hidden="true">
          <label htmlFor="briefe-website">Website</label>
          <input
            id="briefe-website"
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <label className="briefe-consent" htmlFor="briefe-consent">
          <input
            id="briefe-consent"
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            Ja, schick mir Briefe aus der Schule: Impulse zu Handpan und Bewusstsein, Termine und
            Einladungen zu Kursen. Abmelden geht in jeder Mail. Mehr in der{' '}
            <a href="/datenschutz">Datenschutzerklärung</a>.
          </span>
        </label>

        <button className="briefe-btn" type="submit" disabled={status === 'sending'}>
          Tag 1 holen
        </button>

        {status === 'error' && (
          <p className="briefe-fehler" role="alert">
            {fehler}
          </p>
        )}
      </form>
    </>
  );
}

const BRIEFE_CSS = `
.briefe-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 520px;
  margin-top: 28px;
}
.briefe-label {
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.briefe-input {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.4;
  color: var(--text);
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 2px;
  padding: 14px 16px;
  width: 100%;
}
.briefe-input::placeholder { color: var(--muted2); }
.briefe-input:focus {
  outline: none;
  border-color: var(--amber);
}
.briefe-hp {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.briefe-consent {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
  cursor: pointer;
}
.briefe-consent input {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  accent-color: var(--amber);
}
.briefe-consent a { color: var(--amber); text-decoration: underline; }
.briefe-btn {
  align-self: flex-start;
  background: var(--amber);
  color: var(--black);
  border: none;
  border-radius: 2px;
  padding: 15px 32px;
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.2s;
}
.briefe-btn:hover { background: var(--cream); }
.briefe-btn:disabled { opacity: 0.6; cursor: default; }
.briefe-fehler,
.briefe-done {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  max-width: 520px;
  margin-top: 28px;
}
.briefe-fehler { color: var(--warm); margin-top: 0; }

@media (max-width: 480px) {
  .briefe-btn { align-self: stretch; width: 100%; }
}
`;
