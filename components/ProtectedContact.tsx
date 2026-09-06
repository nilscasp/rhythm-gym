'use client';

import { useSyncExternalStore } from 'react';

/**
 * Setzt E-Mail-Adresse bzw. Telefonnummer erst im Browser zusammen,
 * damit sie nicht als Klartext im ausgelieferten HTML stehen —
 * dasselbe Muster wie `.protected-email` / `.protected-phone` auf handpan.schule.
 */
export function ProtectedContact({
  kind,
  parts,
}: {
  kind: 'email' | 'tel';
  /** E-Mail: [local, domain] · Telefon: Ziffernblöcke ohne Leerzeichen */
  parts: string[];
}) {
  // Server-Snapshot: false → im SSR-HTML steht nur der Platzhalter.
  // Client-Snapshot: true → nach der Hydration wird die Adresse zusammengesetzt.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  if (!hydrated) return <span>wird geladen…</span>;

  if (kind === 'email') {
    const address = `${parts[0]}@${parts[1]}`;
    return <a href={`mailto:${address}`}>{address}</a>;
  }

  const digits = parts.join('');
  const label = `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return <a href={`tel:+${digits}`}>{label}</a>;
}

function subscribeNoop() {
  return () => {};
}
