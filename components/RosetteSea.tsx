'use client'

import { useEffect, useRef } from 'react'
import { MOODS, SeaWeather } from '../app/lib/sea-weather'

// Hintergrund der Schul-Anmeldung: Das Logo liegt vielfach als kleine
// Partikel auf einer Meeresfläche und läuft in ruhigen Wellen durch. Dazu
// wandert ein Lichtschimmer langsam über das Wasser (wie das Netz auf
// handpan.schule). Nur Marke „schule“; bei reduzierter Bewegung ein Standbild.
//
// Technik: das Logo (public/handpan-schule/logo.svg) wird einmal als Bild vorgezeichnet und dann pro Bild
// mehrere hundert Mal per drawImage gesetzt. Die Fläche ist eine einfache
// Perspektive (Horizont oben, nahe Reihen unten größer). Die Höhe jedes
// Punkts liefert das Wellenwetter (app/lib/sea-weather.ts): wechselnde
// Stimmungen mit weicher Überblendung, dazu Tropfen mit Ringen.

const FPS = 30

const LOGO_SRC = '/handpan-schule/logo.svg'
/** Linien im Partikel dicker als im Original (0,75 px), sonst verschwinden sie klein. */
const STROKE_BOLD = 'stroke-width:1.5px'
/**
 * Logo-Breite im Verhältnis zum Netzabstand. Die vier Blätter liegen bei 0,24
 * der Logobreite von der Mitte (gemessen an logo.svg); im Abstand 2 × 0,24
 * teilen sich Nachbarn ihre Blätter, und das Netz schließt sich.
 */
const LOGO_SPAN = 1 / 0.48

/**
 * Partikel-Fassung des Logos: Linien kräftiger, und die vier großen äußeren
 * Bögen (die Kleeblatt-Umrandung) fallen weg. Im Netz laufen sie sonst über
 * die Nachbarn und verwischen das Muster. Gemessen wird im DOM (getBBox),
 * darum nur im Browser.
 */
function particleSvg(svgText: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement
  const vb = (svg.getAttribute('viewBox') || '0 0 262 269').split(/\s+/).map(Number)
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:262px;height:269px;visibility:hidden'
  host.appendChild(document.importNode(svg, true))
  document.body.appendChild(host)
  const live = host.querySelectorAll<SVGGraphicsElement>('path, ellipse')
  const drop: number[] = []
  live.forEach((el, i) => {
    const b = el.getBBox()
    if (Math.max(b.width, b.height) > vb[2] * 0.4) drop.push(i)
  })
  host.remove()
  const all = svg.querySelectorAll('path, ellipse')
  drop.forEach((i) => all[i]?.remove())
  return new XMLSerializer().serializeToString(svg).replace(/stroke-width:[0-9.]+px/g, STROKE_BOLD)
}

/** Logo einmal in ein quadratisches Bild zeichnen (Seitenverhältnis 262 × 269). */
function makeSprite(img: HTMLImageElement, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')
  if (!g) return c
  const h = px
  const w = (px * 262) / 269
  g.drawImage(img, (px - w) / 2, 0, w, h)
  return c
}

export function RosetteSea() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (document.documentElement.dataset.brand !== 'schule') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let sprite: HTMLCanvasElement | null = null
    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0
    let last = 0
    const t0 = performance.now()
    // ?meer=wind (duenung, kreuzsee, wind, stille, ringe) wählt die erste Stimmung — zum Ansehen
    const asked = MOODS.findIndex((m) => m.name === new URLSearchParams(window.location.search).get('meer'))
    const weather = new SeaWeather(Math.random, asked >= 0 ? asked : 0)
    let lightPhase = 0
    let lastT = 0

    function resize() {
      if (!canvas) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }

    function draw(t: number) {
      if (!ctx || !sprite || !W || !H) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      // überlagerte Linien leuchten auf, statt sich zu verdecken
      ctx.globalCompositeOperation = 'lighter'

      const small = W < 640
      const gapPx = small ? 46 : 60 // Netzabstand vorne in Pixeln
      const minGap = small ? 5 : 4.5 // ab hier (Horizont) wird nicht mehr gezeichnet
      // fester Horizont: das Meer bleibt beim Scrollen, wie es ist
      const horizon = H * 0.3
      const f = Math.max(W, H) * 0.9 // Brennweite in Pixeln
      const hc = 1 // Augenhöhe über dem Wasser
      // vorderste Reihe knapp unter dem unteren Rand
      const z0 = (f * hc) / (H * 1.04 - horizon)
      const sp = (gapPx * z0) / f // Netzabstand in Welt-Einheiten
      const logo = sp * LOGO_SPAN // Logo-Breite in Welt-Einheiten
      const hScale = sp * 0.55 // Wellenhöhe in Welt-Einheiten je Wetter-Einheit
      const zNear = z0 / sp
      const sea = weather.frame(t, {
        xMax: (W / 2 / f) * (zNear + 60),
        zMin: zNear + 4,
        zMax: zNear + 60,
      })
      // Lichtschimmer: ein breites Band, das (je nach Stimmung) etwa alle 14 s übers Wasser zieht
      lightPhase += (Math.max(0, t - lastT) * sea.light) / 14
      lastT = t
      const band = (lightPhase % 1) * 2.4 - 1.2
      const e = 0.2 // Schritt für die Neigung, Netz-Einheiten

      for (let j = -1; j < 400; j++) {
        const z = z0 + j * sp
        if ((f * sp) / z < minGap) break
        const depthFade = Math.min(1, ((f * sp) / z - minGap) / 10)
        const halfX = ((W / 2) * z) / f + logo
        const n = Math.ceil(halfX / sp)
        for (let i = -n; i <= n; i++) {
          const x = i * sp
          const gx = i
          const gz = z / sp
          const hw = sea.height(gx, gz)
          const h = hScale * hw
          const dhdx = (0.55 * (sea.height(gx + e, gz) - hw)) / e
          const dhdz = (0.55 * (sea.height(gx, gz + e) - hw)) / e
          const sx = W / 2 + (f * x) / z
          const sy = horizon + (f * (hc - h)) / z
          const reach = (f * logo) / z
          if (sx < -reach || sx > W + reach || sy < -reach || sy > H + reach) continue

          const crest = Math.min(1, Math.max(0, (hw / sea.amp + 1) / 2)) // 0 Tal … 1 Kamm
          const light = Math.exp(-(((sx / W) * 2 - 1 - band) ** 2) / 0.08)
          const alpha = depthFade * (0.08 + 0.26 * crest * crest + 0.16 * light * crest)
          if (alpha < 0.01) continue

          // Abbildung des flach liegenden Logos: Spalten = Bild von u (quer)
          // und v (in die Tiefe, Bild-unten = näher). Exakte Ableitung der
          // Perspektive am Mittelpunkt, Wellenneigung eingerechnet.
          const L = logo / sprite.width
          const ax = (f * L) / z
          const ay = (-f * dhdx * L) / z
          const bx = (f * x * L) / (z * z)
          const by = (f * (hc - h) * L) / (z * z) + (f * dhdz * L) / z
          ctx.globalAlpha = Math.min(0.5, alpha)
          ctx.setTransform(dpr * ax, dpr * ay, dpr * bx, dpr * Math.max(by, 0.02 * ax), dpr * sx, dpr * sy)
          ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2)
        }
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (now - last < 1000 / FPS) return
      last = now
      draw((now - t0) / 1000)
    }

    function onVisibility() {
      cancelAnimationFrame(raf)
      if (!document.hidden && !still) raf = requestAnimationFrame(frame)
    }

    resize()
    const img = new Image()
    let alive = true
    let blobUrl = ''
    img.onload = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      if (!alive) return
      sprite = makeSprite(img, 192)
      draw(still ? 4 : 0)
      if (!still) raf = requestAnimationFrame(frame)
    }
    fetch(LOGO_SRC)
      .then((r) => r.text())
      .then((svg) => {
        const bold = particleSvg(svg)
        blobUrl = URL.createObjectURL(new Blob([bold], { type: 'image/svg+xml' }))
        img.src = blobUrl
      })
      .catch(() => {
        img.src = LOGO_SRC
      })

    const ro = new ResizeObserver(() => {
      resize()
      if (still) draw(4)
    })
    ro.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} className="rosette-sea" aria-hidden="true" />
}
