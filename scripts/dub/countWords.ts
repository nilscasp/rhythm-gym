// Beat-accurate counting.
//
// Nils counts and calls hands while he plays ("die eins und die zwei", "rechts, links"). Dubbing
// such a line as one clip cannot work: the words have to land on the strokes, and a single clip
// drifts within a few seconds — one line on day 1 holds 92 calls over ten seconds.
//
// Whisper gives a timestamp for every word, so instead each count word is generated ONCE, and a copy
// is placed at the exact time its German counterpart is spoken. Across the whole course that is
// 13,464 spoken words drawn from a vocabulary of fifteen, so the whole bank costs fifteen
// generations and every video reuses it.
import { copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { WORKDIR, log } from './config'
import { durationSec, trimAndResample } from './ffmpeg'
import type { Config, Segment } from './types'
import { VoiceboxClient } from './voicebox'

/** German counting/hand vocabulary → what an English-speaking drummer says. */
const COUNT_VOCAB: Record<string, string> = {
  '1': 'one', eins: 'one', ein: 'one', eine: 'one', einen: 'one', erste: 'first',
  '2': 'two', zwei: 'two', zweite: 'second',
  '3': 'three', drei: 'three', dritte: 'third',
  '4': 'four', vier: 'four', vierte: 'fourth',
  '5': 'five', fünf: 'five', '6': 'six', sechs: 'six',
  '7': 'seven', sieben: 'seven', '8': 'eight', acht: 'eight',
  und: 'and', links: 'left', rechts: 'right',
  slap: 'slap', ding: 'ding', ghost: 'ghost',
}

/**
 * German puts an article before the count ("die eins und die zwei"); English drummers do not
 * ("one and two"). These are dropped rather than voiced.
 */
const DROP = new Set(['die', 'der', 'das', 'dem', 'den', 'auf', 'wir', 'jetzt', 'zeit', 'hände'])

export function normaliseToken(raw: string): string {
  return raw.toLowerCase().replace(/[^\wäöüß]/g, '')
}

/** The English word for a German count token, or null when it should not be voiced at all. */
export function mapCountWord(raw: string): string | null {
  const t = normaliseToken(raw)
  if (!t || DROP.has(t)) return null
  return COUNT_VOCAB[t] ?? null
}

/** Longest a single counting word may be before it starts colliding with the next beat. */
export const MAX_WORD_SEC = 0.75

export interface WordPlacement {
  /** Seconds into the video where this word is spoken in the original. */
  at: number
  word: string
  clip: string
  /**
   * How long this word may sound before the next one starts. Without this cap the clips overlap and
   * sum: a first attempt peaked 23 dB above full scale and the whole mix had to be pulled down.
   */
  maxSec: number
}

/** What the dub script shows as the English of a counting line, so it is readable and editable. */
export function countLineText(seg: Segment): string {
  const words = seg.words.map((w) => mapCountWord(w.w)).filter((w): w is string => Boolean(w))
  return words.join(' ')
}

/**
 * True when a segment is counting or hand-calling and nothing else. Deliberately not tied to the
 * repetitive flag: "Eins, zwei, drei." is too short to look repetitive but is still counting, and it
 * needs the same beat-accurate treatment as a line of ninety calls.
 */
export function isCountLine(seg: Segment): boolean {
  const toks = seg.words.map((w) => normaliseToken(w.w)).filter(Boolean)
  if (!toks.length) return false
  const known = toks.filter((t) => DROP.has(t) || t in COUNT_VOCAB).length
  if (known / toks.length < 0.85) return false
  // Needs at least one word that is actually voiced; a line of nothing but articles is not counting.
  return seg.words.some((w) => mapCountWord(w.w) !== null)
}

function bankPath(cfg: Config, word: string): string {
  const safe = word.replace(/[^a-z]/g, '')
  return join(WORKDIR, 'tts-cache', `word-${cfg.tts.profileId.slice(0, 8)}-${cfg.tts.seed}-${safe}.wav`)
}

/**
 * Generates any missing word clips. Spoken in isolation the model tends to trail off, so each word
 * is requested on its own and then trimmed hard by trimAndResample.
 */
export async function ensureWordBank(client: VoiceboxClient, cfg: Config, words: Set<string>): Promise<Map<string, string>> {
  const bank = new Map<string, string>()
  let generated = 0
  for (const word of [...words].sort()) {
    const dest = bankPath(cfg, word)
    if (existsSync(dest)) {
      bank.set(word, dest)
      continue
    }
    // A count word has to be short: at a walking four count the gaps are under half a second. The
    // model sometimes draws a single word out for seconds, so the length is checked and re-rolled.
    const tmp = `${dest}.raw.wav`
    let best: { path: string; dur: number } | null = null
    for (let attempt = 1; attempt <= 4; attempt++) {
      const candidate = attempt === 1 ? dest : `${dest}.try${attempt}.wav`
      await client.generateToFile(
        {
          profile_id: cfg.tts.profileId,
          text: `${word}.`,
          language: cfg.tts.language,
          engine: cfg.tts.engine,
          model_size: cfg.tts.modelSize,
          seed: cfg.tts.seed + (attempt - 1) * 977,
          instruct: 'One single counting word, spoken short and crisp, as when counting a beat out loud.',
          max_chunk_chars: cfg.tts.maxChunkChars,
          crossfade_ms: cfg.tts.crossfadeMs,
          normalize: cfg.tts.normalize,
        },
        tmp,
        1.5,
      )
      await trimAndResample(tmp, candidate, cfg.tts.denoise.enabled ? cfg.tts.denoise.outputChain : undefined)
      const d = await durationSec(candidate)
      if (!best || d < best.dur) best = { path: candidate, dur: d }
      if (d <= MAX_WORD_SEC) break
      log(`count: "${word}" came out ${d.toFixed(2)}s, too long for a beat — re-rolling`)
    }
    if (best && best.path !== dest) {
      copyFileSync(best.path, dest)
      unlinkSync(best.path)
    }
    const d = await durationSec(dest)
    if (d > MAX_WORD_SEC) log(`count: keeping "${word}" at ${d.toFixed(2)}s — it will be trimmed to fit each beat`)
    else log(`count: generated "${word}" (${d.toFixed(2)}s)`)
    bank.set(word, dest)
    generated++
  }
  if (generated) log(`count: word bank now holds ${bank.size} words (${generated} new)`)
  return bank
}

/** Every English word a day's counting lines will need. */
export function wordsNeeded(segs: Segment[]): Set<string> {
  const out = new Set<string>()
  for (const seg of segs) {
    if (!isCountLine(seg)) continue
    for (const w of seg.words) {
      const en = mapCountWord(w.w)
      if (en) out.add(en)
    }
  }
  return out
}

/** Places one English word at each German word's own start time. */
export function placementsFor(seg: Segment, bank: Map<string, string>): WordPlacement[] {
  const voiced = seg.words
    .map((w) => ({ w, en: mapCountWord(w.w) }))
    .filter((x): x is { w: (typeof seg.words)[number]; en: string } => x.en !== null)
  const out: WordPlacement[] = []
  for (let i = 0; i < voiced.length; i++) {
    const { w, en } = voiced[i]
    const clip = bank.get(en)
    if (!clip) continue
    const next = voiced[i + 1]?.w.s ?? seg.slotEnd
    // Leave a sliver of silence before the next beat so consecutive words stay separate.
    const gap = Math.max(0.08, (next - w.s) * 0.92)
    out.push({ at: w.s, word: en, clip, maxSec: Math.min(MAX_WORD_SEC, gap) })
  }
  return out
}
