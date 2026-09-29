// Beschriftung einer Tagesgrafik aus ihrem Dateinamen, z. B.
//   overview_tag21_uebung_b_vier_mal_zwei.png → „Übung B · Vier mal Zwei"
//   overview_tag26_teil_1_v1.png              → „Teil 1"
// Rein, damit sie ohne Seite testbar ist (tests/grafik-caption.test.ts).

// ae/oe/ue → Umlaut, außer nach e/a/q (neue, Frauen, Quelle): trifft die
// Dateinamen der Kursgrafiken, ohne ein Wörterbuch zu brauchen.
function umlauts(word: string): string {
  return word.replace(/(^|[^eaq])(ae|oe|ue)/g, (_, pre: string, pair: string) =>
    pre + ({ ae: 'ä', oe: 'ö', ue: 'ü' } as Record<string, string>)[pair],
  )
}

const capitalize = (w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w)

// Dateinamen sind klein geschrieben; Substantive groß, kleine Wörter klein
// (Titelschreibung wie auf den Grafiken selbst).
const SMALL = new Set([
  'und', 'oder', 'mal', 'im', 'in', 'am', 'an', 'auf', 'aus', 'zum', 'zur', 'vom', 'von', 'mit',
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'ist', 'was', 'wie', 'neue', 'neuen',
  'wirklich', 'geblieben', 'wandern', 'dieses', 'dieser', 'für', 'bis', 'nach', 'vor', 'über', 'unter',
])
const titleCase = (words: string[]) =>
  words.map((w, i) => (i === 0 || !SMALL.has(w) ? capitalize(w) : w)).join(' ')

export function grafikCaption(src: string): string {
  const name = (src.split('/').pop() ?? src).replace(/\.[a-z]+$/i, '')
  const words = name
    .replace(/^(overview|lowerthird)_/, '')
    .split('_')
    .filter((w) => !/^tag\d+$/.test(w) && !/^v\d+$/.test(w) && w !== '')
    .map(umlauts)

  // „Übung B" / „Teil 1" / „Stufe 2" als Kopf, der Rest nach einem Punkt.
  const head: string[] = []
  const rest = [...words]
  if (rest[0] && /^(übung|teil|stufe|station|phase|bogen)$/.test(rest[0])) {
    head.push(capitalize(rest.shift() as string))
    if (rest[0] && /^([a-z]|\d+)$/.test(rest[0])) head.push(rest.shift()!.toUpperCase())
  }
  const tail = titleCase(rest)
  if (head.length && tail) return `${head.join(' ')} · ${tail}`
  return head.length ? head.join(' ') : tail
}
