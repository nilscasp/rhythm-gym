#!/usr/bin/env bun
// English dubbing pipeline for the Rhythmus Fundament course videos.
// Usage: bun scripts/dub/dub.ts <step> [--day N | --days 2-40] [flags]
// Steps: doctor · voice-test · sources · extract · separate · transcribe · script · tts · fit · mix · mux · qa · ab
// Composites: prep (extract→separate→transcribe→script) · render (tts→fit→mix→mux→qa) · batch <prep|render> · status
import { parseArgs } from 'node:util'
import { existsSync } from 'node:fs'
import { WORKDIR, dayPaths, ensureWorkdir, loadConfig, log, readJson, warn } from './config'
import { doctor } from './doctor'
import { extract } from './extract'
import { fit } from './fit'
import { mix } from './mix'
import { mux } from './mux'
import { ab, qa } from './qa'
import { parseScript, scriptReady, writeScript } from './script'
import { separate } from './separate'
import { downloadFromBunny, loadSources, saveSources, scanSources } from './sources'
import { invalidateFrom, loadState } from './state'
import { transcribe } from './transcribe'
import { tts } from './tts'
import { chooseVoice, listVoiceTests, voiceTest } from './voiceTest'
import { cleanSample } from './cleanSample'
import type { Engine, FitFile, ScriptFile } from './types'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    day: { type: 'string' },
    days: { type: 'string' },
    force: { type: 'boolean', default: false },
    refresh: { type: 'boolean', default: false },
    lint: { type: 'boolean', default: false },
    profile: { type: 'string' },
    engine: { type: 'string' },
    label: { type: 'string' },
    choose: { type: 'string' },
    list: { type: 'boolean', default: false },
    seed: { type: 'string' },
    only: { type: 'string' },
    at: { type: 'string' },
    len: { type: 'string', default: '30' },
    play: { type: 'boolean', default: false },
    scan: { type: 'string' },
    bunny: { type: 'boolean', default: false },
    set: { type: 'string' },
    'audio-stream': { type: 'string' },
    'allow-overflow': { type: 'boolean', default: false },
    'only-ready': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

const HELP = `dub — English voice-over pipeline for Rhythmus Fundament

  bun scripts/dub/dub.ts <step> [flags]

Steps
  doctor                        check ffmpeg, uvx, whisper, Voicebox, sources, disk
  clean-sample --profile <id|name>
                                Denoise a reference sample and clone a new profile from it.
                                CAUTION: aggressive cleaning destabilises the clone (drones
                                instead of speech). Denoising the generated output is the
                                safer fix and is on by default. Listen before you rely on it.
  voice-test                    generate the 30 s English test paragraph
                                --profile <id|name> --engine <qwen|chatterbox|…> --label <name>
                                --list            show previous tests
                                --choose <label>  adopt that voice and calibrate words/sec
  sources                       --scan <dir>      find "Tag N …" files and record them
                                --bunny --day N   download the 1080p fallback MP4 from Bunny
                                --set <path> --day N   point a day at a specific file
  extract    --day N            audio → 01-audio/orig.48k.wav
  separate   --day N            Demucs stems (music bed + vocals for ASR)
  transcribe --day N            German words with timestamps → 02-asr/segments.json
  script     --day N            write 03-script/dub-script.md   (--refresh keeps your English)
                                --lint parses it back and warns about budget/digits
  tts        --day N            generate the English clips via Voicebox (cached)
  fit        --day N            fit each clip into its slot
  mix        --day N            build the English audio bed (--allow-overflow for a preview)
  mux        --day N            mux into 08-out/tag-NN.en.mp4
  qa         --day N            SRT + fit report
  ab         --day N --at 120   cut a German/English comparison (--play to hear it)

Composites
  prep       --day N            extract → separate → transcribe → script
  render     --day N            script --lint → tts → fit → mix → mux → qa
  batch prep|render --days 2-40 [--only-ready]
  status     [--day N]          what is done per day

Workdir: ${WORKDIR}  (override with DUB_WORKDIR)`

function dayArg(): number {
  if (!values.day) throw new Error('missing --day N')
  const n = Number(values.day)
  if (!Number.isInteger(n) || n < 1 || n > 44) throw new Error(`--day must be 1..44, got "${values.day}"`)
  return n
}

function daysArg(): number[] {
  if (values.day) return [dayArg()]
  if (!values.days) throw new Error('missing --days 2-40 (or --day N)')
  const out = new Set<number>()
  for (const part of values.days.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/)
    if (!m) throw new Error(`bad --days segment "${part}"`)
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    for (let i = a; i <= b; i++) out.add(i)
  }
  return [...out].sort((x, y) => x - y)
}

async function prep(day: number): Promise<void> {
  await extract(day, { force: values.force, audioStream: values['audio-stream'] ? Number(values['audio-stream']) : undefined })
  await separate(day, { force: values.force })
  await transcribe(day, { force: values.force })
  writeScript(day, { refresh: true })
}

async function render(day: number): Promise<void> {
  parseScript(day, { lint: true })
  await tts(day, { force: values.force, only: values.only?.split(',').map((x: string) => x.trim()) })
  await fit(day)
  await mix(day, { allowOverflow: values['allow-overflow'] })
  await mux(day)
  qa(day)
}

function status(days: number[]): void {
  const order = ['extract', 'separate', 'transcribe', 'script', 'tts', 'fit', 'mix', 'mux']
  console.log(`day   ${order.map((s) => s.slice(0, 4).padEnd(5)).join('')} script  output`)
  for (const day of days) {
    const st = loadState(day)
    const p = dayPaths(day)
    const marks = order.map((s) => (st.steps[s]?.done ? '  ✓  ' : '  ·  ')).join('')
    let script = '—'
    if (existsSync(p.scriptJson)) {
      const s = readJson<ScriptFile>(p.scriptJson)
      const ready = s.entries.filter((e) => e.en || e.flags.includes('skip') || e.flags.includes('keep-de')).length
      script = `${ready}/${s.entries.length}`
    } else if (existsSync(p.scriptMd)) {
      script = 'md'
    }
    let out = '—'
    if (existsSync(p.fitJson)) {
      const f = readJson<FitFile>(p.fitJson)
      const ov = f.entries.filter((e) => e.status === 'overflow').length
      out = ov ? `${ov} overflow` : 'fit ok'
    }
    if (existsSync(p.outMp4)) out = 'mp4 ✓'
    console.log(`${String(day).padStart(3, ' ')}   ${marks} ${script.padEnd(7)} ${out}`)
  }
}

async function main(): Promise<void> {
  if (values.help || positionals.length === 0) {
    console.log(HELP)
    return
  }
  ensureWorkdir()
  const step = positionals[0]
  switch (step) {
    case 'doctor': {
      const ok = await doctor()
      if (!ok) process.exitCode = 1
      return
    }
    case 'voice-test': {
      if (values.list) {
        listVoiceTests()
        return
      }
      if (values.choose) {
        chooseVoice(values.choose)
        return
      }
      await voiceTest({
        profile: values.profile,
        engine: values.engine as Engine | undefined,
        label: values.label,
        seed: values.seed ? Number(values.seed) : undefined,
      })
      return
    }
    case 'clean-sample': {
      if (!values.profile) throw new Error('usage: clean-sample --profile <id|name> [--name "New name"] [--file <wav>]')
      await cleanSample(values.profile, { name: values.label, file: values.set })
      return
    }
    case 'sources': {
      if (values.scan) {
        scanSources(values.scan)
        return
      }
      if (values.set) {
        const map = loadSources()
        map[String(dayArg())] = values.set
        saveSources(map)
        log(`sources: day ${dayArg()} → ${values.set}`)
        return
      }
      if (values.bunny) {
        for (const d of daysArg()) await downloadFromBunny(d, values.force)
        return
      }
      const map = loadSources()
      for (const [d, f] of Object.entries(map)) console.log(`  ${d.padStart(3)}  ${f}`)
      if (!Object.keys(map).length) warn('sources.json is empty — use --scan <dir>, --set <path> --day N, or --bunny --day N')
      return
    }
    case 'extract':
      await extract(dayArg(), { force: values.force, audioStream: values['audio-stream'] ? Number(values['audio-stream']) : undefined })
      return
    case 'separate':
      await separate(dayArg(), { force: values.force })
      return
    case 'transcribe':
      await transcribe(dayArg(), { force: values.force })
      return
    case 'script':
      if (values.lint) parseScript(dayArg(), { lint: true })
      else writeScript(dayArg(), { force: values.force, refresh: values.refresh })
      return
    case 'tts':
      await tts(dayArg(), { force: values.force, only: values.only?.split(',').map((x: string) => x.trim()) })
      return
    case 'fit':
      await fit(dayArg())
      return
    case 'mix':
      await mix(dayArg(), { allowOverflow: values['allow-overflow'] })
      return
    case 'mux':
      await mux(dayArg())
      return
    case 'qa':
      qa(dayArg())
      return
    case 'ab':
      await ab(dayArg(), Number(values.at ?? 0), Number(values.len ?? 30), values.play)
      return
    case 'prep':
      await prep(dayArg())
      return
    case 'render':
      await render(dayArg())
      return
    case 'invalidate': {
      const from = positionals[1]
      if (!from) throw new Error('usage: invalidate <step> --day N')
      invalidateFrom(loadState(dayArg()), from)
      log(`invalidated ${from} and later steps for day ${dayArg()}`)
      return
    }
    case 'status':
      status(values.day || values.days ? daysArg() : Array.from({ length: 40 }, (_, i) => i + 1).filter((d) => existsSync(dayPaths(d).dir)))
      return
    case 'batch': {
      const what = positionals[1]
      if (what !== 'prep' && what !== 'render') throw new Error('usage: batch prep|render --days 2-40')
      const days = daysArg()
      const failures: { day: number; error: string }[] = []
      for (const day of days) {
        if (what === 'render' && values['only-ready'] && !scriptReady(day)) {
          log(`batch: day ${day} skipped (English not complete)`)
          continue
        }
        try {
          log(`batch: day ${day} ${what} …`)
          if (what === 'prep') await prep(day)
          else await render(day)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          warn(`batch: day ${day} failed: ${msg.slice(0, 300)}`)
          failures.push({ day, error: msg.slice(0, 300) })
          if (/Voicebox is not reachable|lost the connection/i.test(msg)) {
            warn('batch: stopping — Voicebox must stay open for the whole run')
            break
          }
        }
      }
      console.log(`batch: ${days.length - failures.length}/${days.length} days succeeded`)
      for (const f of failures) console.log(`  day ${f.day}: ${f.error}`)
      if (failures.length) process.exitCode = 1
      return
    }
    default:
      console.log(HELP)
      throw new Error(`unknown step "${step}"`)
  }
}

main().catch((err) => {
  console.error(`\nerror: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 2
})
