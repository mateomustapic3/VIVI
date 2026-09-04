import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { TurntableScene } from './TurntableScene'
import walnutPreview from './assets/previews/walnut.jpg'
import lightOakPreview from './assets/previews/light-oak.jpg'
import ebonyPreview from './assets/previews/ebony.jpg'
import metalPreview from './assets/previews/gunmetal.jpg'
import concretePreview from './assets/previews/concrete.jpg'
import leavesPreview from './assets/previews/leaves.jpg'
import './styles.css'

// Keep the full-resolution surfaces out of the first UI paint. Vite still
// fingerprints them for production, but the browser fetches only the active
// background; the appearance picker uses tiny preview images instead.
const walnutBackground = new URL('./assets/angled-walnut-tabletop-v2.png', import.meta.url).href
const lightOakBackground = new URL('./assets/light-oak-tabletop.jpg', import.meta.url).href
const ebonyBackground = new URL('./assets/ebony-wood-tabletop.jpg', import.meta.url).href
const metalBackground = new URL('./assets/brushed-gunmetal.jpg', import.meta.url).href
const concreteBackground = new URL('./assets/dark-concrete.jpg', import.meta.url).href
const leavesBackground = new URL('./assets/forest-leaves.jpg', import.meta.url).href

type DeckGraph = {
  pitch: ScriptProcessorNode
  eq: BiquadFilterNode[]
  ageHighpass: BiquadFilterNode
  ageLowpass: BiquadFilterNode
  filter: BiquadFilterNode
  saturation: WaveShaperNode
  saturationDrive: number
  level: GainNode
  reverb: ConvolverNode
  reverbGain: GainNode
}

const eqFrequencies = [60, 170, 500, 1000, 3500, 10000, 16000]
const eqPresets = {
  Flat: [0, 0, 0, 0, 0, 0, 0],
  Rock: [4, 3, 1, -1, -2, 1, 3],
  Jazz: [3, 2, 1, 2, 2, 2, 3],
  Pop: [-1, 2, 4, 5, 2, -1, -2],
  Vocal: [-3, -2, 0, 4, 5, 3, 1],
  Orchestral: [4, 2, 1, 2, 3, 4, 3],
  'Bass boosted': [8, 6, 3, 0, -2, -2, -2],
  'Treble boosted': [-2, -2, -1, 0, 2, 5, 8],
} as const

type EqPreset = keyof typeof eqPresets | 'Custom'

const accentChoices = [
  { id: 'orange', label: 'Orange', color: '#d76537' },
  { id: 'pink', label: 'Pink', color: '#f05a9b' },
  { id: 'green', label: 'Green', color: '#59cf8c' },
  { id: 'blue', label: 'Blue', color: '#5daeff' },
  { id: 'yellow', label: 'Yellow', color: '#f0c84b' },
  { id: 'red', label: 'Red', color: '#ed5a57' },
  { id: 'purple', label: 'Purple', color: '#aa78ed' },
  { id: 'white', label: 'White', color: '#f5f0e8' },
] as const

type AccentId = (typeof accentChoices)[number]['id']

const backgroundChoices = [
  { id: 'walnut', label: 'Dark walnut', image: walnutBackground, preview: walnutPreview },
  { id: 'oak', label: 'Light oak', image: lightOakBackground, preview: lightOakPreview },
  { id: 'ebony', label: 'Black wood', image: ebonyBackground, preview: ebonyPreview },
  { id: 'metal', label: 'Gunmetal', image: metalBackground, preview: metalPreview },
  { id: 'concrete', label: 'Concrete', image: concreteBackground, preview: concretePreview },
  { id: 'leaves', label: 'Forest leaves', image: leavesBackground, preview: leavesPreview },
  { id: 'black', label: 'Full black', image: null, preview: null },
] as const

type BackgroundId = (typeof backgroundChoices)[number]['id'] | 'custom'

type KnobProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  valueLabel?: string
}

function Knob({ label, value, min, max, onChange, valueLabel }: KnobProps) {
  const drag = useRef<{ value: number; y: number } | null>(null)
  const amount = (value - min) / (max - min)
  const angle = -135 + amount * 270
  const setValue = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next))))
  const begin = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { value, y: event.clientY }
  }
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return
    setValue(drag.current.value + (drag.current.y - event.clientY) * (max - min) / 110)
  }
  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }
  useEffect(() => {
    // Pointer capture normally delivers the release back to the knob, but a
    // release outside the Electron window can bypass that event. Always
    // discard the drag state in that case so the next hover never edits it.
    const cancelDrag = () => { drag.current = null }
    window.addEventListener('pointerup', cancelDrag, true)
    window.addEventListener('pointercancel', cancelDrag, true)
    window.addEventListener('blur', cancelDrag)
    return () => {
      window.removeEventListener('pointerup', cancelDrag, true)
      window.removeEventListener('pointercancel', cancelDrag, true)
      window.removeEventListener('blur', cancelDrag)
    }
  }, [])
  const key = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); setValue(value + 1) }
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); setValue(value - 1) }
  }
  return <div className="knob-control">
    <button
      type="button"
      className="knob"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueLabel ?? `${value} of ${max}`}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={key}
      style={{ '--knob-angle': `${angle}deg` } as CSSProperties}
    ><i /><b>{valueLabel ?? value}</b></button>
    <span>{label}</span>
  </div>
}

const createPitchShifter = (context: AudioContext, getSemitones: () => number) => {
  const processor = context.createScriptProcessor(2048, 2, 2)
  const ringSize = 16_384
  const ring = [new Float32Array(ringSize), new Float32Array(ringSize)]
  let writeIndex = 0
  let phase = 0
  let smoothRatio = 1
  const read = (buffer: Float32Array, index: number) => {
    const wrapped = ((index % ringSize) + ringSize) % ringSize
    const lower = Math.floor(wrapped)
    return buffer[lower] + (buffer[(lower + 1) % ringSize] - buffer[lower]) * (wrapped - lower)
  }
  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer
    const output = event.outputBuffer
    const inputChannels = [
      input.getChannelData(0),
      input.getChannelData(Math.min(1, input.numberOfChannels - 1)),
    ]
    const outputChannels = [output.getChannelData(0), output.getChannelData(1)]
    const targetRatio = Math.pow(2, getSemitones() / 12)
    // A short block-level glide avoids discontinuities without the expensive
    // four-grain loop that could cause audible buffer underruns on Electron.
    smoothRatio += (targetRatio - smoothRatio) * .18
    const shifted = Math.abs(smoothRatio - 1) > .004
    const phaseStep = (1 - smoothRatio) / 2_048
    for (let sample = 0; sample < output.length; sample += 1) {
      for (let channel = 0; channel < 2; channel += 1) {
        ring[channel][writeIndex] = inputChannels[channel][sample] ?? 0
      }
      if (shifted) {
        phase = (phase + phaseStep + 1) % 1
        const phaseB = (phase + .5) % 1
        const delayA = 256 + phase * 2_048
        const delayB = 256 + phaseB * 2_048
        const gainA = Math.sin(Math.PI * phase)
        const gainB = Math.sin(Math.PI * phaseB)
        const normalise = 1 / Math.max(gainA + gainB, .0001)
        for (let channel = 0; channel < 2; channel += 1) {
          outputChannels[channel][sample] = (
            read(ring[channel], writeIndex - delayA) * gainA +
            read(ring[channel], writeIndex - delayB) * gainB
          ) * normalise
        }
      } else {
        for (let channel = 0; channel < 2; channel += 1) outputChannels[channel][sample] = ring[channel][writeIndex]
      }
      writeIndex = (writeIndex + 1) % ringSize
    }
  }
  return processor
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

function App() {
  const deckA = useRef<HTMLAudioElement>(null)
  const deckB = useRef<HTMLAudioElement>(null)
  const loadedPaths = useRef({ a: '', b: '' })
  const crossfadeFrame = useRef<number | null>(null)
  const crossfadeActive = useRef(false)
  const crossfadeNextIndex = useRef<number | null>(null)
  const crossfadeAmount = useRef(0)
  const tapeFrame = useRef<number | null>(null)
  const tapeSafetyTimer = useRef<number | null>(null)
  const scratchInertiaFrame = useRef<number | null>(null)
  const recordFrame = useRef<number | null>(null)
  const recordRotationRef = useRef(0)
  const rpmRatioRef = useRef(1)
  const rpmFrame = useRef<number | null>(null)
  const tapeFactorRef = useRef(1)
  const loFiRateRef = useRef(1)
  const loFiWowFrame = useRef<number | null>(null)
  const pitchSemitonesRef = useRef(0)
  const tapeStopping = useRef(false)
  const audioContext = useRef<AudioContext | null>(null)
  const deckGraphs = useRef<DeckGraph[] | null>(null)
  const masterGain = useRef<GainNode | null>(null)
  const noiseGain = useRef<GainNode | null>(null)
  const crackleTimer = useRef<number | null>(null)
  const scratchState = useRef<{ lastAngle: number; lastTime: number; lastMoveAt: number; lastGrainAt: number; lastVelocity: number; wasPlaying: boolean } | null>(null)
  const scratchBuffers = useRef<{ path: string; forward: AudioBuffer; reverse: AudioBuffer } | null>(null)
  const scratchLoadingPath = useRef('')
  const isScratchingRef = useRef(false)
  const isSeeking = useRef(false)
  const transportHoldTimer = useRef<number | null>(null)
  const transportSeekFrame = useRef<number | null>(null)
  const transportHolding = useRef(false)
  const suppressTransportClick = useRef(false)
  const tonearmDrag = useRef<{ wasPlaying: boolean; outsideRecord: boolean } | null>(null)
  const deckPitchDragging = useRef(false)
  const customBackgroundInput = useRef<HTMLInputElement>(null)
  const customBackgroundUrl = useRef<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeDeck, setActiveDeck] = useState<'a' | 'b'>('a')
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [masterVolume, setMasterVolume] = useState(0.8)
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(0)
  const [isCrossfading, setIsCrossfading] = useState(false)
  const [vinylAmount, setVinylAmount] = useState(20)
  const [loFiAmount, setLoFiAmount] = useState(10)
  const [crackleAmount, setCrackleAmount] = useState(80)
  const [reverbAmount, setReverbAmount] = useState(0)
  const [eqGains, setEqGains] = useState<number[]>([...eqPresets.Flat])
  const [eqPreset, setEqPreset] = useState<EqPreset>('Flat')
  const [rpm, setRpm] = useState(33)
  const [pitchSemitones, setPitchSemitones] = useState(0)
  const [isTapeStopping, setIsTapeStopping] = useState(false)
  const [isScratching, setIsScratching] = useState(false)
  const [isScratchInertia, setIsScratchInertia] = useState(false)
  const [tonearmRested, setTonearmRested] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const [accentId, setAccentId] = useState<AccentId>('orange')
  const [backgroundId, setBackgroundId] = useState<BackgroundId>('walnut')
  const [customBackground, setCustomBackground] = useState<string | null>(null)
  const [isLightBackground, setIsLightBackground] = useState(false)
  const [queueDragIndex, setQueueDragIndex] = useState<number | null>(null)
  const [queueDropIndex, setQueueDropIndex] = useState<number | null>(null)

  const activeAccent = accentChoices.find((choice) => choice.id === accentId) ?? accentChoices[0]
  const activeBackground = backgroundChoices.find((choice) => choice.id === backgroundId) ?? backgroundChoices[0]
  const backgroundImage = backgroundId === 'custom' ? customBackground : activeBackground.image
  const activeBackgroundLabel = backgroundId === 'custom' ? 'Custom image' : activeBackground.label
  const accentStyle = { '--accent': activeAccent.color } as CSSProperties
  const turntablePanelStyle = {
    '--turntable-background': backgroundImage ? `url("${backgroundImage}")` : 'linear-gradient(#050505, #050505)',
  } as CSSProperties

  const current = tracks[currentIndex]
  const displayTitle = current?.name.replace(/^\d{1,3}[.\s_-]+/, '') ?? 'Drop some music in your library'
  // The needle is mapped only across the playable grooves: 0% at the outer
  // edge and 100% just outside the centre label, never over the label itself.
  const trackProgress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0
  const outerGrooveAngle = -8
  const innerGrooveAngle = 12
  const armAngle = current
    ? `${outerGrooveAngle + trackProgress * (innerGrooveAngle - outerGrooveAngle)}deg`
    : '-33deg'

  useEffect(() => {
    if (current) setTonearmRested(false)
  }, [current?.path])

  useEffect(() => () => {
    if (customBackgroundUrl.current) URL.revokeObjectURL(customBackgroundUrl.current)
  }, [])

  useEffect(() => {
    if (!backgroundImage) {
      setIsLightBackground(false)
      return
    }

    let cancelled = false
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return
        context.drawImage(image, 0, 0, size, size)
        const pixels = context.getImageData(0, 0, size, size).data
        let luminance = 0
        for (let index = 0; index < pixels.length; index += 4) {
          const linear = (channel: number) => {
            const value = channel / 255
            return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4)
          }
          luminance += .2126 * linear(pixels[index]) + .7152 * linear(pixels[index + 1]) + .0722 * linear(pixels[index + 2])
        }
        // This is deliberately based on the actual selected bitmap so custom
        // images receive the same treatment as the built-in surfaces.
        if (!cancelled) setIsLightBackground(luminance / (pixels.length / 4) > .27)
      } catch {
        if (!cancelled) setIsLightBackground(false)
      }
    }
    image.onerror = () => {
      if (!cancelled) setIsLightBackground(false)
    }
    image.src = backgroundImage

    return () => { cancelled = true }
  }, [backgroundImage])

  const getDeck = (deck: 'a' | 'b') => deck === 'a' ? deckA.current : deckB.current
  const inactiveDeck = activeDeck === 'a' ? 'b' : 'a'
  const rpmLabel = rpm < 28 ? 'Slow' : rpm > 40 ? 'Fast' : 'Normal'
  const vinylLabel = vinylAmount === 0 ? 'Off' : vinylAmount < 35 ? 'Light' : vinylAmount < 70 ? 'Warm' : 'Heavy'
  const loFiLabel = loFiAmount === 0 ? 'New' : loFiAmount < 30 ? 'Light wear' : loFiAmount < 65 ? 'Worn' : 'Aged'
  const crackleLabel = crackleAmount === 0 ? 'Off' : crackleAmount < 35 ? 'Rare' : crackleAmount < 70 ? 'Occasional' : 'Frequent'

  const rotateRecord = (degrees: number) => {
    recordRotationRef.current += degrees
  }

  const applyPlaybackRate = (factor = tapeFactorRef.current) => {
    const rate = rpmRatioRef.current * factor * loFiRateRef.current
    for (const deck of [deckA.current, deckB.current]) {
      if (!deck) continue
      deck.playbackRate = rate
      deck.preservesPitch = false
    }
  }

  const stopTapeRamp = () => {
    if (tapeFrame.current !== null) cancelAnimationFrame(tapeFrame.current)
    if (tapeSafetyTimer.current !== null) window.clearTimeout(tapeSafetyTimer.current)
    tapeFrame.current = null
    tapeSafetyTimer.current = null
    tapeStopping.current = false
  }

  const rampTape = (target: number, durationMs: number, onComplete?: () => void) => {
    if (tapeFrame.current !== null) cancelAnimationFrame(tapeFrame.current)
    if (tapeSafetyTimer.current !== null) window.clearTimeout(tapeSafetyTimer.current)
    tapeFrame.current = null
    tapeSafetyTimer.current = null
    const start = tapeFactorRef.current
    const startedAt = performance.now()
    let completed = false
    const complete = () => {
      if (completed) return
      completed = true
      if (tapeFrame.current !== null) cancelAnimationFrame(tapeFrame.current)
      if (tapeSafetyTimer.current !== null) window.clearTimeout(tapeSafetyTimer.current)
      tapeFrame.current = null
      tapeSafetyTimer.current = null
      tapeFactorRef.current = target
      applyPlaybackRate(target)
      onComplete?.()
    }
    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const factor = start + (target - start) * eased
      tapeFactorRef.current = factor
      applyPlaybackRate(factor)
      if (progress < 1) tapeFrame.current = requestAnimationFrame(step)
      else complete()
    }
    tapeFrame.current = requestAnimationFrame(step)
    // Some first-load media events can interrupt Chromium's animation clock.
    // This guard guarantees that a deck can never remain at the low start
    // pitch after its turntable-start effect should have finished.
    tapeSafetyTimer.current = window.setTimeout(complete, durationMs + 180)
  }

  const prepareTapeStart = () => {
    stopTapeRamp()
    tapeFactorRef.current = .16
    applyPlaybackRate(.16)
  }

  const startScratchInertia = (initialVelocity: number) => {
    if (scratchInertiaFrame.current !== null) cancelAnimationFrame(scratchInertiaFrame.current)
    if (Math.abs(initialVelocity) < .02) return
    let velocity = initialVelocity
    setIsScratchInertia(true)
    const step = () => {
      rotateRecord(-velocity * 16 * 1.25)
      velocity *= .88
      if (Math.abs(velocity) > .006) scratchInertiaFrame.current = requestAnimationFrame(step)
      else { scratchInertiaFrame.current = null; setIsScratchInertia(false) }
    }
    scratchInertiaFrame.current = requestAnimationFrame(step)
  }

  const loadScratchBuffers = async () => {
    const context = audioContext.current
    if (!context || !current || scratchBuffers.current?.path === current.path || scratchLoadingPath.current === current.path) return
    scratchLoadingPath.current = current.path
    try {
      const response = await fetch(current.url)
      const forward = await context.decodeAudioData(await response.arrayBuffer())
      const reverse = context.createBuffer(forward.numberOfChannels, forward.length, forward.sampleRate)
      for (let channel = 0; channel < forward.numberOfChannels; channel += 1) {
        const source = forward.getChannelData(channel)
        const target = reverse.getChannelData(channel)
        for (let index = 0; index < source.length; index += 1) target[source.length - 1 - index] = source[index]
      }
      if (scratchLoadingPath.current === current.path) scratchBuffers.current = { path: current.path, forward, reverse }
    } catch {
      // Scratching still moves the record even if a source cannot be decoded.
    } finally {
      if (scratchLoadingPath.current === current.path) scratchLoadingPath.current = ''
    }
  }

  const playScratchGrain = (position: number, direction: number, velocity: number) => {
    const context = audioContext.current
    const buffers = scratchBuffers.current
    // A loose tonearm can move the platter but cannot reproduce scratch audio.
    if (!context || !buffers || !current || tonearmRested || buffers.path !== current.path) return
    const grainLength = .055
    const source = context.createBufferSource()
    const output = context.createGain()
    const isReverse = direction < 0
    source.buffer = isReverse ? buffers.reverse : buffers.forward
    source.playbackRate.value = Math.min(Math.max(.75 + Math.abs(velocity) * .028, .7), 2.5)
    output.gain.value = volume * .82
    const start = isReverse
      ? Math.max(0, buffers.forward.duration - position - grainLength)
      : Math.min(position, Math.max(0, buffers.forward.duration - grainLength))
    source.connect(output).connect(masterGain.current ?? context.destination)
    source.start(0, start, grainLength)
  }

  const makeSaturationCurve = (amount: number) => {
    const samples = 2048
    const curve = new Float32Array(samples)
    // Unit gain around the centre: warmth softens peaks instead of making the
    // whole song louder as the slider rises.
    const drive = 1 + amount * 1.1
    for (let index = 0; index < samples; index += 1) {
      const input = (index * 2) / (samples - 1) - 1
      curve[index] = Math.tanh(input * drive) / drive
    }
    return curve
  }

  const updateVinylSound = () => {
    const context = audioContext.current
    const graphs = deckGraphs.current
    if (!context || !graphs) return
    const amount = vinylAmount / 100
    const age = loFiAmount / 100
    const now = context.currentTime
    for (const graph of graphs) {
      graph.eq.forEach((band, index) => band.gain.setTargetAtTime(eqGains[index] ?? 0, now, .03))
      // Vinyl age narrows the usable spectrum much more noticeably at the
      // top of the range, without falling back to a digital bitrate effect.
      graph.ageHighpass.frequency.setTargetAtTime(22 + age * 500, now, .06)
      graph.ageHighpass.Q.setTargetAtTime(.24 + age * .82, now, .06)
      graph.ageLowpass.frequency.setTargetAtTime(20_000 - age * 17_800, now, .06)
      graph.ageLowpass.Q.setTargetAtTime(.2 + age * .72, now, .06)
      graph.filter.frequency.setTargetAtTime(20_000 - amount * 9_500, now, .04)
      graph.filter.Q.setTargetAtTime(.2 + amount * .45, now, .04)
      const drive = Math.max(amount, age * 1.5)
      if (graph.saturationDrive !== drive) {
        graph.saturation.curve = drive > 0 ? makeSaturationCurve(drive) : null
        graph.saturationDrive = drive
      }
      graph.level.gain.setTargetAtTime(1 - age * .06, now, .04)
      graph.reverbGain.gain.setTargetAtTime(reverbAmount / 100 * .55, now, .04)
    }
    noiseGain.current?.gain.setTargetAtTime(playing ? amount * .018 : 0, now, .04)
  }

  const stopCrackle = () => {
    if (crackleTimer.current !== null) window.clearTimeout(crackleTimer.current)
    crackleTimer.current = null
  }

  const scheduleCrackle = () => {
    stopCrackle()
    const context = audioContext.current
    if (!context || !playing || crackleAmount === 0) return
    const amount = crackleAmount / 100
    const minimumDelay = 380
    const maximumDelay = 6_500 - amount * 5_000
    const delay = minimumDelay + Math.random() * Math.max(maximumDelay - minimumDelay, 150)
    crackleTimer.current = window.setTimeout(() => {
      const character = Math.random()
      const isPop = character < .1
      const isCluster = character >= .1 && character < .46
      const clickLength = Math.floor(context.sampleRate * (isPop ? .065 + Math.random() * .05 : isCluster ? .028 + Math.random() * .052 : .045 + Math.random() * .09))
      const clickBuffer = context.createBuffer(1, clickLength, context.sampleRate)
      const clickData = clickBuffer.getChannelData(0)
      let colouredNoise = 0
      const textureLevel = isPop ? .045 : isCluster ? .11 : .2
      for (let index = 0; index < clickLength; index += 1) {
        const envelope = Math.pow(1 - index / clickLength, 1.35)
        colouredNoise = colouredNoise * .76 + (Math.random() * 2 - 1) * .24
        clickData[index] = colouredNoise * textureLevel * envelope
      }
      const pulseCount = isPop ? 1 : isCluster ? 3 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 2)
      for (let pulse = 0; pulse < pulseCount; pulse += 1) {
        const offset = Math.floor((pulse / pulseCount + Math.random() * .18) * clickLength)
        const pulseLength = Math.min(Math.floor(context.sampleRate * (.001 + Math.random() * .006)), clickLength - offset)
        const polarity = Math.random() < .5 ? -1 : 1
        const pulseLevel = (isPop ? 1.15 : isCluster ? .5 + Math.random() * .45 : .16 + Math.random() * .22) / pulseCount
        for (let index = 0; index < pulseLength; index += 1) {
          const envelope = Math.exp(-index / Math.max(pulseLength * .2, 1))
          const texture = polarity * envelope + (Math.random() * 2 - 1) * envelope * .28
          clickData[offset + index] += texture * pulseLevel
        }
      }
      const source = context.createBufferSource()
      const highpass = context.createBiquadFilter()
      const lowpass = context.createBiquadFilter()
      const output = context.createGain()
      source.buffer = clickBuffer
      highpass.type = 'highpass'
      highpass.frequency.value = isPop ? 250 : isCluster ? 750 + Math.random() * 800 : 420 + Math.random() * 550
      lowpass.type = 'lowpass'
      lowpass.frequency.value = isPop ? 2_200 + Math.random() * 1_400 : isCluster ? 4_000 + Math.random() * 3_500 : 2_800 + Math.random() * 2_300
      // A little louder than the continuous surface hiss so individual pops
      // remain present even in a dense, mastered track.
      output.gain.value = .055 + amount * .22
      source.connect(highpass).connect(lowpass).connect(output).connect(masterGain.current ?? context.destination)
      source.start()
      scheduleCrackle()
    }, delay)
  }

  const ensureAudioEngine = async () => {
    if (audioContext.current) {
      await audioContext.current.resume()
      updateVinylSound()
      void loadScratchBuffers()
      return
    }
    const firstDeck = deckA.current
    const secondDeck = deckB.current
    if (!firstDeck || !secondDeck) return

    const context = new AudioContext()
    const master = context.createGain()
    master.gain.value = masterVolume
    master.connect(context.destination)
    masterGain.current = master
    const connectDeck = (deck: HTMLAudioElement) => {
      const source = context.createMediaElementSource(deck)
      const pitch = createPitchShifter(context, () => pitchSemitonesRef.current)
      const eq = eqFrequencies.map((frequency, index) => {
        const band = context.createBiquadFilter()
        band.type = index === 0 ? 'lowshelf' : index === eqFrequencies.length - 1 ? 'highshelf' : 'peaking'
        band.frequency.value = frequency
        band.Q.value = 1.1
        return band
      })
      const ageHighpass = context.createBiquadFilter()
      const ageLowpass = context.createBiquadFilter()
      const filter = context.createBiquadFilter()
      const saturation = context.createWaveShaper()
      const level = context.createGain()
      const reverb = context.createConvolver()
      const reverbGain = context.createGain()
      const impulseLength = Math.floor(context.sampleRate * 1.8)
      const impulse = context.createBuffer(2, impulseLength, context.sampleRate)
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel)
        for (let index = 0; index < impulseLength; index += 1) {
          const decay = Math.pow(1 - index / impulseLength, 2.7)
          data[index] = (Math.random() * 2 - 1) * decay
        }
      }
      reverb.buffer = impulse
      reverbGain.gain.value = 0
      ageHighpass.type = 'highpass'
      ageLowpass.type = 'lowpass'
      filter.type = 'lowpass'
      saturation.oversample = '2x'
      source.connect(pitch).connect(eq[0])
      for (let index = 0; index < eq.length - 1; index += 1) eq[index].connect(eq[index + 1])
      eq[eq.length - 1].connect(ageHighpass).connect(ageLowpass).connect(filter).connect(saturation).connect(level).connect(master)
      level.connect(reverb).connect(reverbGain).connect(master)
      return { pitch, eq, ageHighpass, ageLowpass, filter, saturation, saturationDrive: Number.NaN, level, reverb, reverbGain }
    }

    deckGraphs.current = [connectDeck(firstDeck), connectDeck(secondDeck)]
    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let index = 0; index < noiseData.length; index += 1) noiseData[index] = Math.random() * 2 - 1
    const noise = context.createBufferSource()
    const noiseOutput = context.createGain()
    noiseOutput.gain.value = 0
    noise.buffer = noiseBuffer
    noise.loop = true
    noise.connect(noiseOutput).connect(master)
    noise.start()
    audioContext.current = context
    noiseGain.current = noiseOutput
    await context.resume()
    updateVinylSound()
    scheduleCrackle()
    void loadScratchBuffers()
  }

  const stopCrossfade = () => {
    if (crossfadeFrame.current !== null) cancelAnimationFrame(crossfadeFrame.current)
    crossfadeFrame.current = null
    crossfadeActive.current = false
    crossfadeNextIndex.current = null
    crossfadeAmount.current = 0
    setIsCrossfading(false)
    const secondary = getDeck(inactiveDeck)
    if (secondary) { secondary.pause(); secondary.currentTime = 0; secondary.volume = volume }
    const primary = getDeck(activeDeck)
    if (primary) primary.volume = volume
  }

  const startCrossfade = async () => {
    if (crossfadeActive.current || crossfadeSeconds === 0 || tracks.length < 2) return
    const nextIndex = (currentIndex + 1) % tracks.length
    if (nextIndex === currentIndex) return
    const primary = getDeck(activeDeck)
    const secondary = getDeck(inactiveDeck)
    const nextTrack = tracks[nextIndex]
    if (!primary || !secondary || !nextTrack) return

    crossfadeActive.current = true
    crossfadeNextIndex.current = nextIndex
    crossfadeAmount.current = 0
    loadedPaths.current[inactiveDeck] = nextTrack.path
    secondary.pause()
    secondary.src = nextTrack.url
    secondary.currentTime = 0
    secondary.volume = 0
    secondary.playbackRate = rpmRatioRef.current * tapeFactorRef.current
    secondary.preservesPitch = false
    secondary.load()

    try {
      await secondary.play()
      setIsCrossfading(true)
      const startedAt = performance.now()
      const fade = (now: number) => {
        const amount = Math.min((now - startedAt) / (crossfadeSeconds * 1000), 1)
        crossfadeAmount.current = amount
        primary.volume = volume * (1 - amount)
        secondary.volume = volume * amount
        if (amount < 1 && crossfadeActive.current) crossfadeFrame.current = requestAnimationFrame(fade)
      }
      crossfadeFrame.current = requestAnimationFrame(fade)
    } catch {
      stopCrossfade()
    }
  }

  useEffect(() => {
    const player = getDeck(activeDeck)
    if (!player || !current) return
    if (loadedPaths.current[activeDeck] !== current.path) {
      player.pause()
      player.src = current.url
      player.load()
      player.volume = volume
      player.playbackRate = rpmRatioRef.current * tapeFactorRef.current
      player.preservesPitch = false
      loadedPaths.current[activeDeck] = current.path
      setPosition(0)
      setDuration(0)
      setPlaybackError('')
    }
    if (playing) player.play().catch(() => { setPlaying(false); setPlaybackError('This audio file could not be played.') })
  }, [currentIndex, tracks, activeDeck])

  useEffect(() => {
    const player = getDeck(activeDeck)
    if (!player || !current) return
    if (playing) player.play().catch(() => { setPlaying(false); setPlaybackError('This audio file could not be played.') })
    // During the short tape-stop ramp the UI has already switched to Play,
    // but the media must keep running until the slowdown reaches zero.
    else if (!isTapeStopping) { deckA.current?.pause(); deckB.current?.pause() }
  }, [playing, current, activeDeck, isTapeStopping])

  useEffect(() => {
    const primary = getDeck(activeDeck)
    const secondary = getDeck(inactiveDeck)
    if (crossfadeActive.current && primary && secondary) {
      primary.volume = volume * (1 - crossfadeAmount.current)
      secondary.volume = volume * crossfadeAmount.current
    } else if (primary) primary.volume = volume
  }, [volume, activeDeck])

  useEffect(() => {
    const context = audioContext.current
    if (!context || !masterGain.current) return
    masterGain.current.gain.setTargetAtTime(masterVolume, context.currentTime, .025)
  }, [masterVolume])

  useEffect(() => {
    if (rpmFrame.current !== null) cancelAnimationFrame(rpmFrame.current)
    const startRatio = rpmRatioRef.current
    const targetRatio = rpm / 33
    if (Math.abs(targetRatio - startRatio) < .0001) {
      rpmRatioRef.current = targetRatio
      applyPlaybackRate()
      return
    }
    const durationMs = 520 + Math.abs(targetRatio - startRatio) * 780
    const startedAt = performance.now()
    const ramp = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      // The motor builds speed progressively; braking settles more gradually
      // before reaching the new speed.
      const eased = targetRatio > startRatio ? 1 - Math.pow(1 - progress, 3) : progress * progress
      rpmRatioRef.current = startRatio + (targetRatio - startRatio) * eased
      applyPlaybackRate()
      if (progress < 1) rpmFrame.current = requestAnimationFrame(ramp)
      else rpmFrame.current = null
    }
    rpmFrame.current = requestAnimationFrame(ramp)
    return () => {
      if (rpmFrame.current !== null) cancelAnimationFrame(rpmFrame.current)
      rpmFrame.current = null
    }
  }, [rpm])

  // Keep the artwork in the same clock as the tape ramp. CSS animations restart
  // when their duration changes, which caused the record to snap backwards on
  // pause; this preserves its exact last angle instead.
  useEffect(() => {
    if ((!playing && !isTapeStopping) || isScratching || isScratchInertia) return
    let lastFrameAt = performance.now()
    const spin = (now: number) => {
      const elapsedSeconds = (now - lastFrameAt) / 1000
      lastFrameAt = now
      // In this camera angle the physical platter turns counter-clockwise.
      rotateRecord(-360 * (33 / 60) * rpmRatioRef.current * tapeFactorRef.current * elapsedSeconds)
      recordFrame.current = requestAnimationFrame(spin)
    }
    recordFrame.current = requestAnimationFrame(spin)
    return () => {
      if (recordFrame.current !== null) cancelAnimationFrame(recordFrame.current)
      recordFrame.current = null
    }
  }, [playing, isTapeStopping, isScratching, isScratchInertia])

  useEffect(() => { updateVinylSound() }, [vinylAmount, loFiAmount, reverbAmount, eqGains, playing])

  useEffect(() => {
    if (loFiWowFrame.current !== null) cancelAnimationFrame(loFiWowFrame.current)
    const age = loFiAmount / 100
    // Severe wear introduces an unstable drive motor only in the final 8% of
    // the control. This is the existing pitch/wow behaviour, intentionally
    // kept out of lower Lo-Fi values so they remain useful for simple ageing.
    const wobbleAmount = Math.max(0, (age - .92) / .08)
    if (!playing || wobbleAmount <= 0) {
      loFiRateRef.current = 1
      applyPlaybackRate()
      return
    }
    const wobble = (now: number) => {
      const seconds = now / 1_000
      // Mechanical wow is slow; flutter is the smaller, quicker component.
      const movement = Math.sin(seconds * .78) * .74 + Math.sin(seconds * 4.6) * .18 + Math.sin(seconds * 8.1) * .08
      loFiRateRef.current = 1 + movement * (.002 + wobbleAmount * .028)
      applyPlaybackRate()
      loFiWowFrame.current = requestAnimationFrame(wobble)
    }
    loFiWowFrame.current = requestAnimationFrame(wobble)
    return () => {
      if (loFiWowFrame.current !== null) cancelAnimationFrame(loFiWowFrame.current)
      loFiWowFrame.current = null
      loFiRateRef.current = 1
      applyPlaybackRate()
    }
  }, [loFiAmount, playing, rpm])

  useEffect(() => { scheduleCrackle() }, [crackleAmount, playing])

  useEffect(() => () => {
    if (crossfadeFrame.current !== null) cancelAnimationFrame(crossfadeFrame.current)
    stopTapeRamp()
    if (scratchInertiaFrame.current !== null) cancelAnimationFrame(scratchInertiaFrame.current)
    if (recordFrame.current !== null) cancelAnimationFrame(recordFrame.current)
    if (rpmFrame.current !== null) cancelAnimationFrame(rpmFrame.current)
    if (loFiWowFrame.current !== null) cancelAnimationFrame(loFiWowFrame.current)
    if (transportHoldTimer.current !== null) window.clearTimeout(transportHoldTimer.current)
    if (transportSeekFrame.current !== null) cancelAnimationFrame(transportSeekFrame.current)
    stopCrackle()
    audioContext.current?.close()
  }, [])

  const addTracks = (incoming: Track[]) => {
    if (!incoming.length) return
    setTracks((existing) => [...existing, ...incoming.filter((track) => !existing.some((item) => item.path === track.path))])
  }

  const clearQueueDrag = () => {
    setQueueDragIndex(null)
    setQueueDropIndex(null)
  }

  const beginQueueDrag = (event: ReactDragEvent<HTMLDivElement>, index: number) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
    setQueueDragIndex(index)
    setQueueDropIndex(index)
  }

  const allowQueueDrop = (event: ReactDragEvent<HTMLDivElement>, index: number) => {
    if (queueDragIndex === null || queueDragIndex === index) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setQueueDropIndex(index)
  }

  const reorderTracks = (fromIndex: number, targetIndex: number) => {
    if (fromIndex < 0 || targetIndex < 0 || fromIndex >= tracks.length || targetIndex > tracks.length || fromIndex === targetIndex) return
    const nextTracks = [...tracks]
    const [moved] = nextTracks.splice(fromIndex, 1)
    const insertionIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex
    nextTracks.splice(insertionIndex, 0, moved)
    setTracks(nextTracks)
    if (current) setCurrentIndex(nextTracks.findIndex((track) => track.path === current.path))
  }

  const dropQueueTrack = (event: ReactDragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault()
    const fromIndex = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isInteger(fromIndex)) reorderTracks(fromIndex, targetIndex)
    clearQueueDrag()
  }

  const removeTrack = (index: number) => {
    const removed = tracks[index]
    if (!removed) return
    const nextTracks = tracks.filter((track) => track.path !== removed.path)
    const removingCurrent = index === currentIndex
    if (removingCurrent) {
      stopCrossfade()
      stopTapeRamp()
      deckA.current?.pause()
      deckB.current?.pause()
      setPlaying(false)
      setIsTapeStopping(false)
      setPosition(0)
      setDuration(0)
      setTonearmRested(true)
    }
    setTracks(nextTracks)
    setCurrentIndex((activeIndex) => {
      if (!nextTracks.length) return 0
      if (activeIndex > index) return activeIndex - 1
      if (activeIndex === index) return Math.min(index, nextTracks.length - 1)
      return activeIndex
    })
  }

  const selectEqPreset = (preset: EqPreset) => {
    if (preset === 'Custom') return
    setEqPreset(preset)
    setEqGains([...eqPresets[preset]])
  }

  const changeEqBand = (index: number, gain: number) => {
    setEqPreset('Custom')
    setEqGains((bands) => bands.map((band, bandIndex) => bandIndex === index ? gain : band))
  }

  const changePitch = (value: number) => {
    pitchSemitonesRef.current = value
    setPitchSemitones(value)
  }

  const clearCustomBackground = () => {
    if (customBackgroundUrl.current) URL.revokeObjectURL(customBackgroundUrl.current)
    customBackgroundUrl.current = null
    setCustomBackground(null)
  }

  const chooseCustomBackground = () => customBackgroundInput.current?.click()

  const loadCustomBackground = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || !file.type.startsWith('image/')) return
    if (customBackgroundUrl.current) URL.revokeObjectURL(customBackgroundUrl.current)
    const source = URL.createObjectURL(file)
    customBackgroundUrl.current = source
    setCustomBackground(source)
    setBackgroundId('custom')
  }

  const setDeckPitchFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const amount = Math.min(1, Math.max(0, (bounds.bottom - event.clientY) / bounds.height))
    changePitch(Math.round(-8 + amount * 16))
  }

  const beginDeckPitchDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    deckPitchDragging.current = true
    setDeckPitchFromPointer(event)
  }

  const moveDeckPitchDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (deckPitchDragging.current) setDeckPitchFromPointer(event)
  }

  const endDeckPitchDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    deckPitchDragging.current = false
  }

  const keyDeckPitch = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); changePitch(pitchSemitones + 1) }
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); changePitch(pitchSemitones - 1) }
    if (event.key === 'Home') { event.preventDefault(); changePitch(-8) }
    if (event.key === 'End') { event.preventDefault(); changePitch(8) }
  }

  const toggleRpmPreset = (preset: 16 | 45) => {
    setRpm((currentRpm) => currentRpm === preset ? 33 : preset)
  }

  const resetSettings = () => {
    stopCrossfade()
    setCrossfadeSeconds(0)
    setRpm(33)
    changePitch(0)
    setVinylAmount(20)
    setLoFiAmount(10)
    setCrackleAmount(80)
    setReverbAmount(0)
    setEqPreset('Flat')
    setEqGains([...eqPresets.Flat])
    setVolume(.8)
    setMasterVolume(.8)
    setAccentId('orange')
    setBackgroundId('walnut')
    clearCustomBackground()
  }

  const getRecordAngle = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return Math.atan2(event.clientY - (bounds.top + bounds.height / 2), event.clientX - (bounds.left + bounds.width / 2)) * 180 / Math.PI
  }

  const signedAngleDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180

  const getNeedleDropProgress = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    // Matches the projected platter in the 3D camera: its circle reads as an
    // ellipse, so distance has to be measured on separate horizontal/vertical
    // radii rather than as a plain screen-space circle.
    const x = (event.clientX - (bounds.left + bounds.width * .45)) / (bounds.width * .3)
    const y = (event.clientY - (bounds.top + bounds.height * .58)) / (bounds.height * .29)
    const radius = Math.hypot(x, y)
    if (radius > 1.04) return null
    const outerGroove = .9
    const innerGroove = .29
    return Math.min(1, Math.max(0, (outerGroove - Math.max(innerGroove, radius)) / (outerGroove - innerGroove)))
  }

  const isNearTonearm = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    return x > .6 && x < .9 && y > .34 && y < .88
  }

  const isLeftScratchArea = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX < bounds.left + bounds.width * .45 && getNeedleDropProgress(event) !== null
  }

  const isRightNeedleArea = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX >= bounds.left + bounds.width * .45 && getNeedleDropProgress(event) !== null
  }

  const beginScratch = (event: React.PointerEvent<HTMLDivElement>) => {
    const player = getDeck(activeDeck)
    if (event.button !== 0 || !current || !player || !isLeftScratchArea(event)) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    void ensureAudioEngine()
    stopCrossfade()
    stopTapeRamp()
    setIsTapeStopping(false)
    if (scratchInertiaFrame.current !== null) cancelAnimationFrame(scratchInertiaFrame.current)
    setIsScratchInertia(false)
    scratchState.current = { lastAngle: getRecordAngle(event), lastTime: player.currentTime, lastMoveAt: performance.now(), lastGrainAt: 0, lastVelocity: 0, wasPlaying: playing }
    isScratchingRef.current = true
    player.pause()
    setPlaying(false)
    setIsScratching(true)
    void loadScratchBuffers()
  }

  const moveScratch = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = scratchState.current
    const player = getDeck(activeDeck)
    if (!state || !player || !current) return
    if ((event.buttons & 1) === 0) { endScratch(event); return }
    const angle = getRecordAngle(event)
    const angleDelta = signedAngleDelta(state.lastAngle, angle)
    const now = performance.now()
    // A real platter is circular: clockwise advances through the track and
    // counter-clockwise moves backwards through it.
    if (Math.abs(angleDelta) < .18) {
      state.lastAngle = angle
      state.lastMoveAt = now
      return
    }
    const target = Math.max(0, Math.min(state.lastTime + angleDelta * .04, duration))
    const elapsed = Math.max(now - state.lastMoveAt, 1)
    if (now - state.lastGrainAt > 22) {
      playScratchGrain(target, Math.sign(angleDelta), Math.abs(angleDelta) / elapsed)
      state.lastGrainAt = now
    }
    player.currentTime = target
    state.lastAngle = angle
    state.lastTime = target
    state.lastMoveAt = now
    state.lastVelocity = angleDelta / elapsed
    setPosition(target)
    rotateRecord(-angleDelta)
  }

  const endScratch = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = scratchState.current
    if (!state) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    scratchState.current = null
    isScratchingRef.current = false
    setIsScratching(false)
    startScratchInertia(state.lastVelocity)
    if (state.wasPlaying) {
      const player = getDeck(activeDeck)
      if (player) {
        prepareTapeStart()
        player.play().then(() => { setPlaying(true); rampTape(1, 300) }).catch(() => setPlaying(false))
      }
    } else {
      tapeFactorRef.current = 1
      applyPlaybackRate(1)
    }
  }

  const beginTonearmDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const player = getDeck(activeDeck)
    if (event.button !== 0 || !current || !player) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    stopCrossfade()
    stopTapeRamp()
    setIsTapeStopping(false)
    player.pause()
    tonearmDrag.current = { wasPlaying: playing, outsideRecord: false }
    setPlaying(false)
  }

  const moveTonearm = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = tonearmDrag.current
    if (!state || !current || duration <= 0) return
    const progress = getNeedleDropProgress(event)
    state.outsideRecord = progress === null
    if (progress === null) return
    setTonearmRested(false)
    // The last groove is just before the actual media end. Seeking to the
    // exact end while the pointer remains down used to emit repeated `ended`
    // events and skip through the queue.
    seekTo(Math.min(progress * duration, Math.max(duration - .12, 0)))
  }

  const endTonearmDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = tonearmDrag.current
    if (!state) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    tonearmDrag.current = null
    const player = getDeck(activeDeck)
    if (state.outsideRecord) {
      stopCrossfade()
      player?.pause()
      if (player) player.currentTime = 0
      recordRotationRef.current = 0
      setPosition(0)
      setPlaying(false)
      setTonearmRested(true)
      return
    }
    if (state.wasPlaying && player) {
      prepareTapeStart()
      player.play().then(() => { setPlaying(true); rampTape(1, 300) }).catch(() => setPlaying(false))
    }
  }

  const handleTurntablePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isNearTonearm(event) || isRightNeedleArea(event)) beginTonearmDrag(event)
    else beginScratch(event)
  }

  const handleTurntablePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (tonearmDrag.current) moveTonearm(event)
    else moveScratch(event)
  }

  const handleTurntablePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (tonearmDrag.current) endTonearmDrag(event)
    else endScratch(event)
  }

  const togglePlayback = async () => {
    const player = getDeck(activeDeck)
    if (!current || !player) return
    if (playing && !player.paused && !player.ended) {
      stopCrossfade()
      // Give the button immediate, reliable feedback.  The audio and record
      // still complete their brief tape-stop ramp in the background.
      tapeStopping.current = true
      setIsTapeStopping(true)
      setPlaying(false)
      rampTape(.16, 520, () => {
        player.pause()
        tapeStopping.current = false
        setIsTapeStopping(false)
      })
    }
    else {
      try {
        stopTapeRamp()
        tapeStopping.current = false
        setIsTapeStopping(false)
        await ensureAudioEngine()
        setTonearmRested(false)
        prepareTapeStart()
        await player.play()
        setPlaying(true)
        rampTape(1, 430)
        setPlaybackError('')
      } catch {
        setPlaying(false)
        setPlaybackError('This audio file could not be played. Try MP3 or WAV first.')
      }
    }
  }

  const selectTrack = (index: number) => { void ensureAudioEngine(); stopCrossfade(); prepareTapeStart(); setTonearmRested(false); setCurrentIndex(index); setPlaying(true); rampTape(1, 430) }
  const next = () => { if (tracks.length) { void ensureAudioEngine(); stopCrossfade(); prepareTapeStart(); setTonearmRested(false); setCurrentIndex((index) => (index + 1) % tracks.length); setPlaying(true); rampTape(1, 430) } }
  const previous = () => { if (tracks.length) { void ensureAudioEngine(); stopCrossfade(); prepareTapeStart(); setTonearmRested(false); setCurrentIndex((index) => (index - 1 + tracks.length) % tracks.length); setPlaying(true); rampTape(1, 430) } }

  const seekTo = (value: number) => {
    const player = getDeck(activeDeck)
    if (!player || !Number.isFinite(value)) return
    stopCrossfade()
    const target = Math.max(0, Math.min(value, duration))
    player.currentTime = target
    setPosition(target)
  }

  const clearTransportTimers = () => {
    if (transportHoldTimer.current !== null) window.clearTimeout(transportHoldTimer.current)
    if (transportSeekFrame.current !== null) cancelAnimationFrame(transportSeekFrame.current)
    transportHoldTimer.current = null
    transportSeekFrame.current = null
  }

  const beginTransportHold = (event: ReactPointerEvent<HTMLButtonElement>, direction: -1 | 1) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    clearTransportTimers()
    transportHolding.current = false
    suppressTransportClick.current = false
    transportHoldTimer.current = window.setTimeout(() => {
      const player = getDeck(activeDeck)
      const total = player && Number.isFinite(player.duration) ? player.duration : duration
      if (!player || !current || total <= 0) return
      transportHolding.current = true
      stopCrossfade()
      isSeeking.current = true
      let lastFrameAt = performance.now()
      const fastSeek = (now: number) => {
        const elapsed = Math.min((now - lastFrameAt) / 1000, .12)
        lastFrameAt = now
        const safeEnd = Math.max(0, total - .12)
        const target = Math.max(0, Math.min(safeEnd, player.currentTime + direction * elapsed * 16))
        if (Math.abs(target - player.currentTime) > .001) {
          player.currentTime = target
          setPosition(target)
        }
        if (target > 0 && target < safeEnd) transportSeekFrame.current = requestAnimationFrame(fastSeek)
        else transportSeekFrame.current = null
      }
      transportSeekFrame.current = requestAnimationFrame(fastSeek)
    }, 320)
  }

  const endTransportHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const wasHolding = transportHolding.current
    clearTransportTimers()
    transportHolding.current = false
    isSeeking.current = false
    if (wasHolding) suppressTransportClick.current = true
  }

  const activateTransport = (direction: -1 | 1) => {
    if (suppressTransportClick.current) {
      suppressTransportClick.current = false
      return
    }
    if (direction < 0) previous()
    else next()
  }

  const handleTimeUpdate = (deck: 'a' | 'b', player: HTMLAudioElement) => {
    if (deck !== activeDeck) return
    setPosition(player.currentTime)
    if (!isSeeking.current && !isScratchingRef.current && !tonearmDrag.current && crossfadeSeconds > 0 && player.duration - player.currentTime <= crossfadeSeconds + .15) startCrossfade()
  }

  const handleLoadedMetadata = (deck: 'a' | 'b', player: HTMLAudioElement) => {
    if (deck !== activeDeck) return
    setDuration(player.duration)
    applyPlaybackRate()
    // If a source became ready after the user had pressed play, restart the
    // short tape-go ramp from its current value instead of leaving it at .16.
    if (playing && tapeFactorRef.current < .98) rampTape(1, 360)
  }

  const handleTrackEnded = (deck: 'a' | 'b') => {
    if (deck !== activeDeck) return
    // Dragging the seek thumb to the end must not repeatedly advance the
    // queue. It simply leaves the current track paused at its endpoint.
    if (isSeeking.current || isScratchingRef.current || tonearmDrag.current) {
      setPlaying(false)
      return
    }
    const nextIndex = crossfadeNextIndex.current
    if (crossfadeActive.current && nextIndex !== null) {
      if (crossfadeFrame.current !== null) cancelAnimationFrame(crossfadeFrame.current)
      const nextDeck = inactiveDeck
      const oldDeck = getDeck(activeDeck)
      const newDeck = getDeck(nextDeck)
      crossfadeActive.current = false
      crossfadeNextIndex.current = null
      crossfadeAmount.current = 0
      setIsCrossfading(false)
      if (oldDeck) { oldDeck.pause(); oldDeck.currentTime = 0; oldDeck.volume = volume }
      if (newDeck) { newDeck.volume = volume; setPosition(newDeck.currentTime); setDuration(newDeck.duration) }
      setActiveDeck(nextDeck)
      setCurrentIndex(nextIndex)
      return
    }
    next()
  }

  return <main className="app-shell" style={accentStyle}>
    <audio ref={deckA} crossOrigin="anonymous" onTimeUpdate={(event) => handleTimeUpdate('a', event.currentTarget)} onLoadedMetadata={(event) => handleLoadedMetadata('a', event.currentTarget)} onEnded={() => handleTrackEnded('a')} onError={() => { if (activeDeck === 'a') { setPlaying(false); setPlaybackError('This audio file could not be played. Try MP3 or WAV first.') } }} />
    <audio ref={deckB} crossOrigin="anonymous" onTimeUpdate={(event) => handleTimeUpdate('b', event.currentTarget)} onLoadedMetadata={(event) => handleLoadedMetadata('b', event.currentTarget)} onEnded={() => handleTrackEnded('b')} onError={() => { if (activeDeck === 'b') { setPlaying(false); setPlaybackError('This audio file could not be played. Try MP3 or WAV first.') } }} />

    <aside className="library">
      <div className="brand"><span className="brand-dot" /><div><span className="brand-name">VIVI</span><small>virtual vinyl player</small></div></div>
      <p className="eyebrow">YOUR LIBRARY</p>
      <button className="library-action" onClick={async () => addTracks(await window.vinyl.pickFolder())}>+ Add folder</button>
      <button className="library-action" onClick={async () => addTracks(await window.vinyl.pickFiles())}>+ Add files</button>
      <div className="crossfade-setting"><p className="eyebrow">TRANSITION</p><div><span>Crossfade</span><strong>{crossfadeSeconds === 0 ? 'Off' : `${crossfadeSeconds}s`}</strong></div><input aria-label="Crossfade duration" type="range" min="0" max="10" step="1" value={crossfadeSeconds} onChange={(event) => setCrossfadeSeconds(Number(event.target.value))} /><small>{isCrossfading ? 'Blending next track…' : 'Blend consecutive songs'}</small></div>
      <div className="rpm-setting"><p className="eyebrow">TURNTABLE</p><div><span>RPM</span><strong>{rpm} · {rpmLabel}</strong></div><input aria-label="Record RPM" type="range" min="16" max="78" step="1" value={rpm} onChange={(event) => setRpm(Number(event.target.value))} /><div className="rpm-presets" role="group" aria-label="RPM presets"><button type="button" className={rpm === 16 ? 'active' : ''} aria-pressed={rpm === 16} onClick={() => toggleRpmPreset(16)}>16 RPM</button><button type="button" className={rpm === 45 ? 'active' : ''} aria-pressed={rpm === 45} onClick={() => toggleRpmPreset(45)}>45 RPM</button></div><small>16 slow · 33 normal · 45/78 fast</small></div>
      <div className="pitch-setting"><p className="eyebrow">TONE</p><div><span>Pitch adjustment</span><strong>{pitchSemitones > 0 ? '+' : ''}{pitchSemitones} st</strong></div><input aria-label="Pitch adjustment in semitones" type="range" min="-8" max="8" step="1" value={pitchSemitones} onChange={(event) => changePitch(Number(event.target.value))} /><small>−8 semitones · 0 neutral · +8 semitones</small></div>
      <div className="vinyl-setting"><p className="eyebrow">VINYL SOUND</p><div><span>Warmth</span><strong>{vinylLabel}</strong></div><input aria-label="Vinyl sound intensity" type="range" min="0" max="100" step="1" value={vinylAmount} onChange={(event) => setVinylAmount(Number(event.target.value))} /><small>Warmth, saturation and record noise</small></div>
      <div className="lofi-setting"><p className="eyebrow">VINYL AGE</p><div><span>Lo-Fi intensity</span><strong>{loFiLabel}</strong></div><input aria-label="Lo-Fi intensity: simulated vinyl age" type="range" min="0" max="100" step="1" value={loFiAmount} onChange={(event) => setLoFiAmount(Number(event.target.value))} /><small>Age and tone loss · wobble after 92% · no digital bitrate</small></div>
      <div className="crackle-setting"><p className="eyebrow">SURFACE NOISE</p><div><span>Crackle</span><strong>{crackleLabel}</strong></div><input aria-label="Crackle frequency" type="range" min="0" max="100" step="1" value={crackleAmount} onChange={(event) => setCrackleAmount(Number(event.target.value))} /><small>How often the record pops and crackles</small></div>
      <div className="colour-setting"><p className="eyebrow">APPEARANCE</p><div className="appearance-row"><span>Change Color</span><strong>{activeAccent.label}</strong></div><div className="colour-swatches" role="group" aria-label="Change accent color">{accentChoices.map((choice) => <button key={choice.id} type="button" className={choice.id === accentId ? 'active' : ''} aria-label={`${choice.label} accent`} aria-pressed={choice.id === accentId} onClick={() => setAccentId(choice.id)} style={{ '--swatch': choice.color } as CSSProperties} />)}</div><div className="appearance-row background-row"><span>Background</span><strong>{activeBackgroundLabel}</strong></div><div className="background-swatches" role="group" aria-label="Change background">{backgroundChoices.map((choice) => <button key={choice.id} type="button" className={choice.id === backgroundId ? 'active' : ''} aria-label={choice.label} title={choice.label} aria-pressed={choice.id === backgroundId} onClick={() => setBackgroundId(choice.id)} style={choice.preview ? { backgroundImage: `url("${choice.preview}")` } : undefined} />)}</div><input ref={customBackgroundInput} className="custom-background-input" type="file" accept="image/*" aria-label="Choose a custom background image" onChange={loadCustomBackground} /><button type="button" className={`custom-background-button ${backgroundId === 'custom' ? 'active' : ''}`} onClick={chooseCustomBackground}>+ CUSTOM IMAGE</button></div>
      <button type="button" className="reset-button" onClick={resetSettings}>RESET</button>
    </aside>

    <section className={`turntable-panel ${isLightBackground ? 'is-light-background' : ''}`} style={turntablePanelStyle}>
      <div className="now-playing"><p className="eyebrow">NOW PLAYING</p><h1>{displayTitle}</h1><p>{playbackError || (current ? `Track ${currentIndex + 1} of ${tracks.length}` : 'Your personal listening room')}</p></div>
      <div className="turntable three-turntable">
        <TurntableScene recordRotationRef={recordRotationRef} animationActive={playing || isTapeStopping || isScratching || isScratchInertia} trackProgress={trackProgress} hasTrack={Boolean(current)} needleEngaged={Boolean(current) && !tonearmRested} pitchSemitones={pitchSemitones} labelTitle={displayTitle} accentColor={activeAccent.color} />
        <div className={`model-scratch-surface ${isScratching || isScratchInertia ? 'scratching' : ''}`} onPointerDown={handleTurntablePointerDown} onPointerMove={handleTurntablePointerMove} onPointerUp={handleTurntablePointerEnd} onPointerCancel={handleTurntablePointerEnd} />
        <div className="turntable-hardware" aria-label="Turntable controls">
          <button type="button" className={`deck-button deck-play ${current ? (playing ? 'is-playing' : 'is-paused') : 'is-idle'}`} aria-label={playing ? 'Pause turntable' : 'Play turntable'} aria-pressed={playing} onClick={togglePlayback} />
          <button type="button" className={`deck-button deck-speed deck-speed-16 ${rpm === 16 ? 'is-active' : ''}`} aria-label="16 RPM" aria-pressed={rpm === 16} onClick={() => toggleRpmPreset(16)} />
          <button type="button" className={`deck-button deck-speed deck-speed-45 ${rpm === 45 ? 'is-active' : ''}`} aria-label="45 RPM" aria-pressed={rpm === 45} onClick={() => toggleRpmPreset(45)} />
          <div className="deck-pitch" role="slider" tabIndex={0} aria-label="Turntable pitch adjustment" aria-orientation="vertical" aria-valuemin={-8} aria-valuemax={8} aria-valuenow={pitchSemitones} aria-valuetext={`${pitchSemitones > 0 ? '+' : ''}${pitchSemitones} semitones`} onPointerDown={beginDeckPitchDrag} onPointerMove={moveDeckPitchDrag} onPointerUp={endDeckPitchDrag} onPointerCancel={endDeckPitchDrag} onKeyDown={keyDeckPitch} />
        </div>
      </div>
      <div className="scrubber"><span>{formatTime(position)}</span><input aria-label="Track progress" type="range" min="0" max={duration || 1} value={position} onPointerDown={() => { isSeeking.current = true }} onPointerUp={() => { isSeeking.current = false }} onPointerCancel={() => { isSeeking.current = false }} onChange={(event) => seekTo(event.currentTarget.valueAsNumber)} /><span>{formatTime(duration)}</span></div>
      <section className="mixer-rack" aria-label="Mix controls">
        <div className="mixer-left">
          <div className="controls"><button type="button" aria-label="Previous track" onPointerDown={(event) => beginTransportHold(event, -1)} onPointerUp={endTransportHold} onPointerCancel={endTransportHold} onClick={() => activateTransport(-1)}>⏮</button><button type="button" className="play-button" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlayback}>{playing ? 'Ⅱ' : '▶'}</button><button type="button" aria-label="Next track" onPointerDown={(event) => beginTransportHold(event, 1)} onPointerUp={endTransportHold} onPointerCancel={endTransportHold} onClick={() => activateTransport(1)}>⏭</button></div>
          <div className="knob-strip">
            <Knob label="Music volume" min={1} max={10} value={Math.max(1, Math.round(volume * 10))} valueLabel={`${Math.max(1, Math.round(volume * 10))}/10`} onChange={(value) => setVolume(value / 10)} />
            <Knob label="Master volume" min={1} max={10} value={Math.max(1, Math.round(masterVolume * 10))} valueLabel={`${Math.max(1, Math.round(masterVolume * 10))}/10`} onChange={(value) => setMasterVolume(value / 10)} />
            <Knob label="Reverb" min={0} max={10} value={Math.round(reverbAmount / 10)} valueLabel={reverbAmount === 0 ? 'Off' : `${Math.round(reverbAmount / 10)}/10`} onChange={(value) => setReverbAmount(value * 10)} />
          </div>
        </div>
        <div className="eq-setting mixer-eq"><p className="eyebrow">7-BAND EQUALIZER</p><select aria-label="EQ preset" value={eqPreset} onChange={(event) => selectEqPreset(event.target.value as EqPreset)}>{Object.keys(eqPresets).map((preset) => <option key={preset} value={preset}>{preset}</option>)}{eqPreset === 'Custom' && <option value="Custom">Custom</option>}</select><div className="eq-bands">{eqFrequencies.map((frequency, index) => <label key={frequency}><span>{frequency >= 1000 ? `${frequency / 1000}k` : frequency}</span><input aria-label={`${frequency} Hz EQ`} type="range" min="-12" max="12" step="0.5" value={eqGains[index]} onChange={(event) => changeEqBand(index, Number(event.target.value))} /><output>{`${eqGains[index] > 0 ? '+' : ''}${eqGains[index]} dB`}</output></label>)}</div></div>
      </section>
    </section>

    <aside className="queue"><div className="queue-header"><div><p className="eyebrow">ON THIS RECORD</p><h2>Queue</h2></div><span>{tracks.length} tracks</span></div><div className="track-list">{tracks.length === 0 ? <p className="empty-queue">Your selected songs will appear here.</p> : <>{tracks.map((track, index) => <div key={track.path} className={`track-row ${queueDragIndex === index ? 'dragging' : ''} ${queueDropIndex === index && queueDragIndex !== index ? 'drop-target' : ''}`} draggable onDragStart={(event) => beginQueueDrag(event, index)} onDragOver={(event) => allowQueueDrop(event, index)} onDrop={(event) => dropQueueTrack(event, index)} onDragEnd={clearQueueDrag}><button type="button" className={`track ${index === currentIndex ? 'active' : ''}`} onClick={() => selectTrack(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{track.name}</strong>{index === currentIndex && playing && <i>●</i>}</button><button type="button" className="remove-track" aria-label={`Remove ${track.name} from queue`} title="Remove from queue" onClick={() => removeTrack(index)}>×</button></div>)}<div className={`queue-drop-end ${queueDropIndex === tracks.length ? 'drop-target' : ''}`} onDragOver={(event) => allowQueueDrop(event, tracks.length)} onDrop={(event) => dropQueueTrack(event, tracks.length)}>Drop here to move to the end</div><p className="queue-helper">Drag songs to reorder them. Use × to remove a song from the queue.</p></>}</div></aside>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
