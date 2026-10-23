import Link from 'next/link'
import { purchaseNoteSegments } from '../app/lib/legal-notes'

// Hinweiszeile über dem Kaufknopf (Mitgliedschaft, Kurs-Kauf). Text und
// Linkziele: app/lib/legal-notes.ts. Rein darstellend — läuft in Server- und
// Client-Komponenten.

export function PurchaseNote({ className = 'purchase-note' }: { className?: string }) {
  return (
    <p className={className}>
      {purchaseNoteSegments().map((s, i) =>
        s.href ? (
          <Link key={i} href={s.href}>
            {s.text}
          </Link>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      <style>{`
        .purchase-note {
          margin: 0 0 12px;
          max-width: 60ch;
          font-family: var(--font-body);
          font-size: 13px;
          line-height: 1.5;
          color: var(--muted);
        }
        .purchase-note a {
          color: var(--cream);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .purchase-note a:hover { color: var(--amber); }
      `}</style>
    </p>
  )
}
