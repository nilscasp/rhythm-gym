// Klangerzeugung mit Web Audio: Handpan-Ton aus Grundton + Oktave + Duodezime,
// dazu Tak (Perkussion) und Metronom-Klick. Kein Sample nötig.

export class Synth {
  ctx!: AudioContext;
  private master!: GainNode;
  private reverbIn!: GainNode;
  private noise!: AudioBuffer;

  private ensure() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.connect(this.ctx.destination);
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp);

    const conv = this.ctx.createConvolver();
    conv.buffer = this.impulse(2.4);
    this.reverbIn = this.ctx.createGain();
    this.reverbIn.gain.value = 0.28;
    this.reverbIn.connect(conv);
    conv.connect(comp);

    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  async resume() {
    this.ensure();
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  get now() {
    this.ensure();
    return this.ctx.currentTime;
  }

  /** Eigener Bus pro Wiedergabe, damit Stopp alles sanft ausblenden kann. */
  bus(): GainNode {
    this.ensure();
    const g = this.ctx.createGain();
    g.connect(this.master);
    g.connect(this.reverbIn);
    return g;
  }

  fadeOut(bus: GainNode, dur = 0.2) {
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + dur);
    setTimeout(() => bus.disconnect(), dur * 1000 + 100);
  }

  private impulse(sec: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(2, rate * sec, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
    }
    return buf;
  }

  note(freq: number, when: number, vel: number, out: AudioNode, opts: { ding?: boolean; pan?: number; muted?: boolean } = {}) {
    this.ensure();
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const panner = ctx.createStereoPanner();
    panner.pan.value = opts.pan ?? 0;
    panner.connect(out);
    const decay = opts.muted ? 0.35 : opts.ding ? 4.2 : 3.0;
    const partials: [number, number, number][] = [
      [1, 1, decay],
      [2, 0.32, decay * 0.45],
      [3, 0.13, decay * 0.22],
      [4.02, 0.04, decay * 0.1],
    ];
    for (const [mul, amp, dec] of partials) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mul;
      o.detune.value = (Math.random() - 0.5) * 4;
      const g = ctx.createGain();
      const peak = vel * amp * 0.32;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(panner);
      o.start(t);
      o.stop(t + dec + 0.05);
    }
    // weicher Anschlag
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = Math.min(freq * 6, 3000);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(lp).connect(ng).connect(panner);
    src.start(t);
    src.stop(t + 0.05);
  }

  tak(when: number, vel: number, out: AudioNode, pan = 0, tone = 2200, body = 240, len = 0.07) {
    this.ensure();
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(out);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = tone;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp).connect(g).connect(panner);
    src.start(t);
    src.stop(t + 0.09);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(body, t);
    o.frequency.exponentialRampToValueAtTime(body / 2, t + 0.08);
    const og = ctx.createGain();
    og.gain.setValueAtTime(vel * 0.35, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og).connect(panner);
    o.start(t);
    o.stop(t + 0.12);
  }

  /** Spielweisen ohne Ton: Ding-Schulter, Slap, Palm mute, Faust, Klopfen, Geisternote */
  perc(kind: string, when: number, vel: number, out: AudioNode, pan = 0) {
    switch (kind) {
      case "S": return this.tak(when, vel, out, pan);
      case "T": return this.tak(when, vel * 0.8, out, pan, 3200, 320, 0.05);
      case "P": return this.tak(when, vel * 0.7, out, pan, 600, 110, 0.12);
      case "F": return this.tak(when, vel * 0.9, out, pan, 300, 70, 0.18);
      case "K": return this.tak(when, vel * 0.7, out, pan, 4200, 500, 0.035);
      default: return this.tak(when, vel * 0.35, out, pan, 2600, 260, 0.03);
    }
  }

  click(when: number, accent: boolean, vol: number, out: AudioNode, sound: "klassisch" | "holz" = "klassisch") {
    this.ensure();
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const o = ctx.createOscillator();
    o.type = sound === "holz" ? "triangle" : "sine";
    o.frequency.value = sound === "holz" ? (accent ? 1100 : 800) : accent ? 1760 : 1180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001) * (accent ? 0.5 : 0.32), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (sound === "holz" ? 0.05 : 0.035));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.08);
  }
}
