export type InstrumentId = 'chimes' | 'glass' | 'musicbox' | 'pad'

/** A voice builds its nodes, connects them to `out`, and schedules them at `t`. */
type Voice = (ac: AudioContext, out: AudioNode, freq: number, t: number, velocity: number) => void

function envelope(ac: AudioContext, t: number, peak: number, attack: number, release: number): GainNode {
  const g = ac.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0008, t + attack + release)
  return g
}

function osc(ac: AudioContext, type: OscillatorType, freq: number, t: number, stop: number, dest: AudioNode, gain = 1) {
  const o = ac.createOscillator()
  o.type = type
  o.frequency.value = freq
  if (gain === 1) o.connect(dest)
  else {
    const g = ac.createGain()
    g.gain.value = gain
    o.connect(g)
    g.connect(dest)
  }
  o.start(t)
  o.stop(stop)
}

const chimes: Voice = (ac, out, f, t, v) => {
  const env = envelope(ac, t, 0.2 * v, 0.012, 2.4)
  env.connect(out)
  osc(ac, 'sine', f, t, t + 2.5, env)
  osc(ac, 'triangle', f * 2, t, t + 2.5, env, 0.16)
  osc(ac, 'sine', f * 3.01, t, t + 2.5, env, 0.05)
}

const glass: Voice = (ac, out, f, t, v) => {
  const env = envelope(ac, t, 0.18 * v, 0.004, 3.2)
  env.connect(out)
  const carrier = ac.createOscillator()
  carrier.frequency.value = f
  const mod = ac.createOscillator()
  mod.frequency.value = f * 3.5
  const depth = ac.createGain()
  depth.gain.setValueAtTime(f * 2.2, t)
  depth.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.4)
  mod.connect(depth)
  depth.connect(carrier.frequency)
  carrier.connect(env)
  carrier.start(t)
  mod.start(t)
  carrier.stop(t + 3.3)
  mod.stop(t + 3.3)
}

const musicbox: Voice = (ac, out, f, t, v) => {
  const env = envelope(ac, t, 0.22 * v, 0.003, 0.9)
  env.connect(out)
  osc(ac, 'triangle', f * 2, t, t + 1, env)
  osc(ac, 'sine', f * 4, t, t + 0.4, env, 0.12)
}

const pad: Voice = (ac, out, f, t, v) => {
  const env = envelope(ac, t, 0.09 * v, 0.35, 2.8)
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(f * 6, t)
  lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 2.5)
  lp.connect(env)
  env.connect(out)
  osc(ac, 'sawtooth', f * 0.998, t, t + 3.3, lp, 0.5)
  osc(ac, 'sawtooth', f * 1.003, t, t + 3.3, lp, 0.5)
  osc(ac, 'sine', f / 2, t, t + 3.3, env, 0.6)
}

export const INSTRUMENTS: Record<InstrumentId, { label: string; voice: Voice }> = {
  chimes: { label: 'Chimes', voice: chimes },
  glass: { label: 'Glass bell', voice: glass },
  musicbox: { label: 'Music box', voice: musicbox },
  pad: { label: 'Soft pad', voice: pad },
}

/** A low, slow hum with harmonics so it is audible on phone speakers. */
export const planetVoice: Voice = (ac, out, f, t, v) => {
  const env = envelope(ac, t, 0.16 * v, 0.6, 3.5)
  env.connect(out)
  osc(ac, 'sine', f, t, t + 4.2, env)
  osc(ac, 'sine', f * 2, t, t + 4.2, env, 0.45)
  osc(ac, 'triangle', f * 3, t, t + 4.2, env, 0.12)
  osc(ac, 'sine', f * 1.005, t, t + 4.2, env, 0.5)
}
