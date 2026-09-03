// Environment check: every external dependency the pipeline needs, verified before a long run.
import { existsSync, statfsSync } from 'node:fs'
import { WORKDIR, loadConfig, log, warn } from './config'
import { which } from './ffmpeg'
import { loadSources } from './sources'
import { clientFromConfig, isConnectionRefused } from './voicebox'

export async function doctor(): Promise<boolean> {
  const cfg = loadConfig()
  let ok = true
  const check = (name: string, good: boolean, detail: string) => {
    console.log(`  ${good ? '✓' : '✗'} ${name.padEnd(22)} ${detail}`)
    if (!good) ok = false
  }
  console.log(`dub doctor — workdir ${WORKDIR}`)

  for (const bin of ['ffmpeg', 'ffprobe', 'uvx']) {
    const p = await which(bin)
    check(bin, Boolean(p), p ?? 'NOT FOUND')
  }
  const whisperLocal = `${process.env.HOME}/Library/Python/3.9/bin/whisper`
  check('whisper (cpu fallback)', existsSync(whisperLocal) || Boolean(await which('whisper')), existsSync(whisperLocal) ? whisperLocal : 'PATH')

  try {
    const client = clientFromConfig(cfg)
    const h = await client.health()
    check('voicebox', h.status === 'healthy', `${cfg.voicebox.url} — ${h.status}, model ${h.model_size} ${h.model_loaded ? 'loaded' : 'NOT loaded'}, ${h.backend_type}/${h.gpu_type}`)
    const v = await client.openapiVersion()
    log(`  voicebox API version ${v}${v !== '0.5.0' ? ' (pipeline was written against 0.5.0 — check for API drift)' : ''}`)
    const profiles = await client.profiles()
    check('voice profiles', profiles.length > 0, profiles.map((p) => `${p.name} [${p.language}, ${p.sample_count} sample(s)] ${p.id}`).join(' | ') || 'none')
    check('configured profile', Boolean(cfg.tts.profileId) && profiles.some((p) => p.id === cfg.tts.profileId), cfg.tts.profileId || 'not set — run voice-test --choose')
  } catch (err) {
    check('voicebox', false, isConnectionRefused(err) ? `not reachable at ${cfg.voicebox.url} — open the Voicebox app` : String(err).slice(0, 160))
  }

  const sources = loadSources()
  const local = existsSync(`${WORKDIR}/sources`)
  check('sources', Object.keys(sources).length > 0 || local, `${Object.keys(sources).length} entries in sources.json, ${local ? 'sources/ dir present' : 'no sources/ dir'}`)

  try {
    const st = statfsSync(WORKDIR)
    const freeGb = (st.bsize * st.bavail) / 1e9
    check('disk space', freeGb > 20, `${freeGb.toFixed(0)} GB free`)
  } catch {
    warn('could not read disk space')
  }
  console.log(ok ? 'doctor: all good' : 'doctor: problems found (see ✗ above)')
  return ok
}
