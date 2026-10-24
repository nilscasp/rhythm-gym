// ─────────────────────────────────────────────────────────────────────────────
// Rechtliche Hinweiszeilen — eine Quelle für alle Kaufstellen.
//
// PURCHASE_NOTE steht über dem Kaufknopf auf /mitgliedschaft und im
// Kurs-Kauf (LockedPanel in app/training/_course/views.tsx). Wortlaut ist ein
// ENTWURF (docs/recht-entwurf.md) — vor dem Livegang prüft Nils bzw. eine
// Fachperson. AGB freigegeben und verlinkt seit 24.10.2026.
// ─────────────────────────────────────────────────────────────────────────────

export const PURCHASE_NOTE = {
  text:
    'Mit dem Kauf gelten die AGB, bezahlt wird über Stripe. Was mit deinen Daten passiert, steht in der Datenschutzerklärung – Handynummern werden im Miteinander nur getauscht, wenn beide zustimmen.',
  links: {
    agb: { word: 'AGB', href: '/agb' },
    datenschutz: { word: 'Datenschutzerklärung', href: '/datenschutz' },
  },
} as const satisfies { text: string; links: Record<string, { word: string; href: string | null }> }

export interface NoteSegment {
  text: string
  href?: string
}

/** Zerlegt den Hinweis in Text- und Link-Stücke (erstes Vorkommen je Linkwort). */
export function purchaseNoteSegments(text: string = PURCHASE_NOTE.text): NoteSegment[] {
  const links: { word: string; href: string | null }[] = Object.values(PURCHASE_NOTE.links)
  const hits = links
    .map((l) => ({ ...l, at: text.indexOf(l.word) }))
    .filter((l) => l.at >= 0)
    .sort((a, b) => a.at - b.at)

  const out: NoteSegment[] = []
  let pos = 0
  for (const hit of hits) {
    if (hit.at < pos) continue
    if (hit.at > pos) out.push({ text: text.slice(pos, hit.at) })
    out.push(hit.href ? { text: hit.word, href: hit.href } : { text: hit.word })
    pos = hit.at + hit.word.length
  }
  if (pos < text.length) out.push({ text: text.slice(pos) })
  return out
}
