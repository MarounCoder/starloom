import { clamp } from '../rng'
import { INSTRUMENTS, planetVoice, type InstrumentId } from './instruments'

interface PlayOptions {
  pan?: number
  velocity?: number
  /** Seconds from now. */
  when?: number
  instrument?: InstrumentId
}

/** One shared audio graph: voices → panner → dry + small hall reverb → master. */
class AudioEngine {
  private ac: AudioContext | null = null
  private master: GainNode | null = null
  private wet: ConvolverNode | null = null
  muted = false
  instrument: InstrumentId = 'chimes'

  /** Must be called from a user gesture the first time. */
  ensure(): AudioContext | null {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume()
      return this.ac
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ac = new Ctor()
    const master = ac.createGain()
    master.gain.value = 0.55
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    master.connect(comp)
    comp.connect(ac.destination)

    const wet = ac.createConvolver()
    wet.buffer = this.impulse(ac, 2.8)
    const wetGain = ac.createGain()
    wetGain.gain.value = 0.42
    wet.connect(wetGain)
    wetGain.connect(master)

    this.ac = ac
    this.master = master
    this.wet = wet
    return ac
  }

  private impulse(ac: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ac.sampleRate * seconds)
    const buf = ac.createBuffer(2, len, ac.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    return buf
  }

  private output(ac: AudioContext, pan: number): AudioNode {
    const bus = ac.createGain()
    let out: AudioNode = bus
    if (ac.createStereoPanner) {
      const p = ac.createStereoPanner()
      p.pan.value = clamp(pan, -0.8, 0.8)
      bus.connect(p)
      out = p
    }
    out.connect(this.master!)
    out.connect(this.wet!)
    return bus
  }

  play(freq: number, opts: PlayOptions = {}) {
    if (this.muted) return
    const ac = this.ensure()
    if (!ac) return
    const voice = INSTRUMENTS[opts.instrument ?? this.instrument].voice
    voice(ac, this.output(ac, opts.pan ?? 0), freq, ac.currentTime + (opts.when ?? 0), opts.velocity ?? 0.8)
  }

  planet(freq: number, pan = 0) {
    if (this.muted) return
    const ac = this.ensure()
    if (!ac) return
    planetVoice(ac, this.output(ac, pan), freq, ac.currentTime, 0.9)
  }
}

export const audio = new AudioEngine()
