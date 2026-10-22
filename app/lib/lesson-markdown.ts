// ─────────────────────────────────────────────────────────────────────────────
// Lektions-Text → Dialekt der vorhandenen MarkdownBody-Komponente.
//
// MarkdownBody (Rhythmus Fundament) ist bewusst kein allgemeiner Parser: es
// kennt `⸻` als Abschnittstrenner, `◆ **TITEL**` als Abschnittskopf, `▸` als
// Aufzählung und `**fett**`/`*kursiv*`. Die Skool-Texte sind normales
// Markdown (#-Überschriften, `-`-Listen). Diese reine Funktion übersetzt das
// eine ins andere, damit es nur einen Renderer gibt.
// ─────────────────────────────────────────────────────────────────────────────

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

export function toMarkdownBodyDialect(markdown: string | null | undefined): string {
  if (!markdown) return ''
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let seenContent = false

  for (const line of lines) {
    const trimmed = line.trim()
    const heading = trimmed.match(HEADING)

    if (heading) {
      // Die Hauptüberschrift steht schon im Seitenkopf — nicht doppeln.
      if (!seenContent && heading[1].length === 1) continue
      seenContent = true
      const text = heading[2].replace(/\*\*/g, '').trim()
      out.push('⸻', `◆ **${text}**`)
      continue
    }
    if (RULE.test(trimmed)) {
      out.push('⸻')
      continue
    }
    const bullet = line.match(BULLET)
    if (bullet) {
      seenContent = true
      out.push(`▸ ${bullet[1]}`)
      continue
    }
    if (trimmed) seenContent = true
    out.push(line)
  }

  // Führende Trenner/Leerzeilen weg, sonst entstünde eine leere Gruppe.
  // (Eine `## `-Zeile, die MarkdownBody als Banner ausblenden würde, bleibt
  // nicht übrig — alle Überschriften sind oben umgeschrieben.)
  while (out.length && (out[0].trim() === '' || out[0].trim() === '⸻')) out.shift()
  return out.join('\n')
}
