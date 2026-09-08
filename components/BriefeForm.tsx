'use client';

import { useState } from 'react';
import type { Messages } from '../messages/de';

/* Anmeldeformular für die Briefe aus der Schule.
   Markenfrei: nur Tokens und die drei Font-Variablen, keine Brand-Logik.
   Der Aufrufer entscheidet über `source`, wo die Adresse herkommt.

   Sprachfrei ebenso: als Client Component kann das Formular `getMessages()`
   nicht aufrufen — der Header lebt auf dem Server. Also reicht der Aufrufer
   die fertigen Texte UND die schon lokalisierte Datenschutz-Adresse herein.
   Eine Sprachentscheidung im Client gäbe es sonst zweimal, und die zweite
   wäre die falsche. */

type Status = 'idle' | 'sending' | 'done' | 'error';

export function BriefeForm({
  source,
  messages,
  privacyHref,
}: {
  source: string;
  messages: Messages['briefe'];
  privacyHref: string;
}) {
  /* Der Zustimmungssatz nennt die Datenschutzerklärung beim Namen; das Wort
     selbst wird zum Link. Statt den Satz in drei Übersetzungsschlüssel zu
     zerlegen, wird er hier einmal um `privacyWord` herum aufgeteilt — so
     bleibt der Satz in `messages/*` ein lesbarer Satz. Fehlt das Wort im
     Text (Tippfehler in einer Übersetzung), steht der Satz ohne Link da,
     statt dass die Seite abstürzt. */
  const cut = messages.consent.indexOf(messages.privacyWord);
  const consentBefore = cut === -1 ? messages.consent : messages.consent.slice(0, cut);
  const consentAfter =
    cut === -1 ? '' : messages.consent.slice(cut + messages.privacyWord.length);

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
          : messages.error;
      setFehler(meldung);
      setStatus('error');
    } catch {
      setFehler(messages.error);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <>
        <style>{BRIEFE_CSS}</style>
        <p className="briefe-done" role="status">
          {messages.success}
        </p>
      </>
    );
  }

  return (
    <>
      <style>{BRIEFE_CSS}</style>
      <form className="briefe-form" onSubmit={onSubmit}>
        <label className="briefe-label" htmlFor="briefe-email">
          {messages.emailLabel}
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
            {consentBefore}
            {cut === -1 ? null : <a href={privacyHref}>{messages.privacyWord}</a>}
            {consentAfter}
          </span>
        </label>

        <button className="briefe-btn" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? messages.sending : messages.submit}
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
