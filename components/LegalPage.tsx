import type { ReactNode } from 'react';

/**
 * Gemeinsamer Rahmen für Impressum und Datenschutzerklärung.
 * Rein Token-basiert: färbt sich unter `[data-brand]` automatisch
 * für Gym und Schule, ohne eigene Markenlogik.
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <>
      <style>{LEGAL_CSS}</style>
      <main className="legal">
        <header className="legal-head">
          <div className="legal-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          {updated && <p className="legal-updated">Stand: {updated}</p>}
        </header>
        <article className="legal-body">{children}</article>
      </main>
    </>
  );
}

const LEGAL_CSS = `
.legal {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 20px 40px;
  color: var(--text);
}
.legal-head { margin-bottom: 40px; }
.legal-eyebrow {
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 14px;
}
.legal h1 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(30px, 6vw, 44px);
  line-height: 1.15;
  margin: 0 0 12px;
}
.legal-updated {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}
.legal-body {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.7;
}
.legal-body h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 24px;
  line-height: 1.25;
  margin: 44px 0 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.legal-body h3 {
  font-family: var(--font-ui);
  font-weight: 500;
  font-size: 15px;
  letter-spacing: 0.04em;
  margin: 26px 0 8px;
  color: var(--cream);
}
.legal-body p { margin: 0 0 14px; }
.legal-body ul { margin: 0 0 14px; padding-left: 20px; }
.legal-body li { margin-bottom: 6px; }
.legal-body a { color: var(--amber); text-decoration: underline; text-underline-offset: 3px; }
.legal-body a:hover { color: var(--amber2); }
.legal-body address { font-style: normal; margin: 0 0 14px; }
.legal-body .legal-note {
  font-size: 14px;
  color: var(--muted);
  border-left: 2px solid var(--border2);
  padding-left: 14px;
  margin: 18px 0;
}
@media (max-width: 480px) {
  .legal { padding-top: 36px; }
  .legal-body { font-size: 15px; }
  .legal-body h2 { font-size: 21px; }
}
`;
