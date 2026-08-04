import {
  createAudioEnvelopeSchedule,
  derivePodracerAudioTargets,
  mapGameEventsToAudioCues,
} from './model';
import {
  createMenuMusicTransitionSchedule,
  renderOriginalMenuScoreAsync,
} from './menuMusic';
import type { MenuMusicTransitionSchedule } from './menuMusic';
import type {
  AudioEventLike,
  AudioEventMapOptions,
  MenuMusicMode,
  MenuMusicStatus,
  OvertakeCalloutStatus,
  PodracerAudioCue,
  PodracerAudioMix,
  PodracerAudioOptions,
  PodracerAudioTelemetry,
} from './types';

interface EngineVoice {
  main: OscillatorNode;
  harmonic: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

interface ContinuousGraph {
  master: GainNode;
  compressor: DynamicsCompressorNode;
  engineBus: GainNode;
  effectsBus: GainNode;
  musicBus: GainNode;
  calloutBus: GainNode;
  calloutHighpass: BiquadFilterNode;
  calloutPresence: BiquadFilterNode;
  left: EngineVoice;
  right: EngineVoice;
  repulsor: OscillatorNode;
  repulsorHarmonic: OscillatorNode;
  repulsorGain: GainNode;
  wind: AudioBufferSourceNode;
  windHighpass: BiquadFilterNode;
  windLowpass: BiquadFilterNode;
  windGain: GainNode;
  coupling: AudioBufferSourceNode;
  couplingFilter: BiquadFilterNode;
  couplingGain: GainNode;
  noiseBuffer: AudioBuffer;
  steadySources: AudioScheduledSourceNode[];
}

interface MenuMusicPlayback {
  url: string;
  group: GainNode;
  intro: AudioBufferSourceNode;
  introGain: GainNode;
  introStart: number;
  transition: MenuMusicTransitionSchedule;
  score: AudioBufferSourceNode | null;
  scoreGain: GainNode | null;
}

interface OvertakeCalloutPlayback {
  source: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  endsAt: number;
}

type BrowserAudioHost = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function defaultAudioContext(): AudioContext {
  const host = globalThis as BrowserAudioHost;
  const AudioContextClass = host.AudioContext ?? host.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is not available in this browser.');
  return new AudioContextClass({ latencyHint: 'interactive' });
}

function createDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1_024;
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
  const drive = Math.max(1, amount);
  for (let index = 0; index < samples; index += 1) {
    const x = index * 2 / (samples - 1) - 1;
    curve[index] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 2.4);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let state = 0x504f4452;
  let previous = 0;
  for (let index = 0; index < length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const white = ((state >>> 0) / 0xffffffff) * 2 - 1;
    previous = white * 0.72 + previous * 0.28;
    channel[index] = previous;
  }
  return buffer;
}

export class PodracerAudio {
  private readonly contextFactory: () => AudioContext;
  private readonly fetchAudio: (url: string) => Promise<ArrayBuffer>;
  private readonly renderMenuScore: (context: BaseAudioContext) => Promise<AudioBuffer>;
  private readonly masterVolume: number;
  private readonly overtakeCalloutCooldownSeconds: number;
  private context: AudioContext | null = null;
  private graph: ContinuousGraph | null = null;
  private armedTarget: EventTarget | null = null;
  private unlockPromise: Promise<boolean> | null = null;
  private lastTelemetry: PodracerAudioTelemetry | null = null;
  private muted: boolean;
  private paused = false;
  private disposed = false;
  private effectSequence = 0;
  private menuMusicMode: MenuMusicMode = 'off';
  private menuMusicUrl: string | null = null;
  private menuMusicLoadingUrl: string | null = null;
  private menuMusicLoadPromise: Promise<boolean> | null = null;
  private menuMusicGeneration = 0;
  private menuMusicPlayback: MenuMusicPlayback | null = null;
  private menuIntroBuffer: AudioBuffer | null = null;
  private overtakeCalloutPlayback: OvertakeCalloutPlayback | null = null;
  private lastOvertakeCalloutAt = Number.NEGATIVE_INFINITY;
  private overtakeCalloutPlayCount = 0;
  private mix: PodracerAudioMix = {
    master: 1,
    music: 1,
    engine: 1,
    effects: 1,
    voice: 1,
  };

  constructor(options: PodracerAudioOptions = {}) {
    this.contextFactory = options.createContext ?? defaultAudioContext;
    this.fetchAudio = options.fetchAudio ?? (async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to load menu intro (${response.status}).`);
      return response.arrayBuffer();
    });
    this.renderMenuScore = options.renderMenuScore ?? renderOriginalMenuScoreAsync;
    this.masterVolume = Math.min(1, Math.max(0, finite(options.masterVolume ?? 0.72, 0.72)));
    this.overtakeCalloutCooldownSeconds = Math.min(
      5,
      Math.max(3, finite(options.overtakeCalloutCooldownSeconds ?? 4.2, 4.2)),
    );
    this.muted = options.initiallyMuted ?? false;
  }

  /**
   * Arms pointer, keyboard, and touch listeners. The first real input creates
   * and resumes AudioContext inside that gesture, satisfying browser policy.
   */
  arm(target: EventTarget = globalThis): () => void {
    if (this.disposed || this.context?.state === 'running') return () => undefined;
    this.disarm();
    this.armedTarget = target;
    target.addEventListener('pointerdown', this.handleUnlockGesture, { once: true });
    target.addEventListener('keydown', this.handleUnlockGesture, { once: true });
    target.addEventListener('touchstart', this.handleUnlockGesture, { once: true });
    return () => this.disarm();
  }

  /** Call directly from a click/key handler when the app owns its own gate. */
  unlock(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    if (this.context) {
      return this.context.state === 'suspended'
        ? this.context.resume().then(() => true, () => false)
        : Promise.resolve(this.context.state === 'running');
    }
    if (this.unlockPromise) {
      return this.unlockPromise.then(async (created) => {
        if (!created || !this.context) return false;
        if (this.context.state === 'suspended') {
          await this.context.resume();
        }
        return this.context.state === 'running';
      }, () => false);
    }
    this.unlockPromise = this.createGraph(true)
      .then(() => this.context?.state === 'running')
      .catch(() => false)
      .finally(() => {
        this.unlockPromise = null;
      });
    return this.unlockPromise;
  }

  /**
   * Builds the relatively expensive noise buffers and node graph before the
   * first control input. The context remains suspended until `unlock()` runs
   * inside a real gesture, satisfying Chrome autoplay policy without a hitch.
   */
  prewarm(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    if (this.context && this.graph) return Promise.resolve(true);
    if (this.unlockPromise) return this.unlockPromise;
    this.unlockPromise = this.createGraph(false)
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        this.unlockPromise = null;
      });
    return this.unlockPromise;
  }

  get ready(): boolean {
    return this.context?.state === 'running' && this.graph !== null;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get mixSettings(): Readonly<PodracerAudioMix> {
    return { ...this.mix };
  }

  /** Read-only lifecycle state for diagnostics and browser harness assertions. */
  get menuMusicStatus(): MenuMusicStatus {
    return {
      mode: this.menuMusicMode,
      requested: this.menuMusicUrl !== null,
      loading: this.menuMusicUrl !== null && this.menuMusicLoadPromise !== null,
      introScheduled: this.menuMusicPlayback !== null,
      scoreScheduled: this.menuMusicPlayback !== null && this.menuMusicPlayback.score !== null,
      awaitingGesture: this.menuMusicUrl !== null && this.context?.state === 'suspended',
      url: this.menuMusicUrl,
    };
  }

  get overtakeCalloutStatus(): OvertakeCalloutStatus {
    const context = this.context;
    const now = context?.currentTime ?? 0;
    const playback = this.overtakeCalloutPlayback;
    const elapsedSinceCallout = now - this.lastOvertakeCalloutAt;
    return {
      ready: !this.disposed
        && context?.state === 'running'
        && this.graph !== null
        && this.menuIntroBuffer !== null,
      scheduled: playback !== null && now < playback.startedAt,
      playing: playback !== null && now >= playback.startedAt && now < playback.endsAt,
      paused: this.paused,
      cooldownRemainingSeconds: Number.isFinite(elapsedSinceCallout)
        ? Math.max(0, this.overtakeCalloutCooldownSeconds - elapsedSinceCallout)
        : 0,
      playCount: this.overtakeCalloutPlayCount,
    };
  }

  /**
   * Loads and schedules the supplied intro once, then crossfades into the
   * procedural score. Calling this during page setup attempts autoplay when
   * policy permits; a suspended context starts on the existing unlock gesture.
   */
  startMenuMusic(url: string): Promise<boolean> {
    const normalizedUrl = url.trim();
    if (this.disposed || normalizedUrl.length === 0) return Promise.resolve(false);
    this.menuMusicMode = 'selection';
    this.menuMusicUrl = normalizedUrl;
    this.applyMenuMusicMix(0.14);

    if (this.menuMusicLoadingUrl === normalizedUrl && this.menuMusicLoadPromise) {
      return this.menuMusicLoadPromise;
    }
    if (this.menuMusicPlayback?.url === normalizedUrl) return Promise.resolve(true);

    const generation = ++this.menuMusicGeneration;
    this.menuMusicLoadingUrl = normalizedUrl;
    const clearFailedRequest = (): void => {
      if (generation === this.menuMusicGeneration) {
        this.menuMusicUrl = null;
        this.menuMusicMode = 'off';
        this.applyMenuMusicMix(0.12);
      }
    };
    const task = this.loadAndScheduleMenuMusic(normalizedUrl, generation)
      .then((scheduled) => {
        if (!scheduled) clearFailedRequest();
        return scheduled;
      })
      .catch(() => {
        clearFailedRequest();
        return false;
      });
    this.menuMusicLoadPromise = task;
    const clearLoading = (): void => {
      if (this.menuMusicLoadPromise !== task) return;
      this.menuMusicLoadPromise = null;
      this.menuMusicLoadingUrl = null;
    };
    void task.then(clearLoading, clearLoading);
    return task;
  }

  /** Keep the score running beneath engines and effects at a restrained mix. */
  transitionMenuMusicToRace(fadeSeconds = 0.9): void {
    if (this.disposed) return;
    this.menuMusicMode = this.menuMusicUrl ? 'race' : 'off';
    this.applyMenuMusicMix(fadeSeconds);
  }

  /** Restore the full selection-screen mix without restarting the intro. */
  transitionMenuMusicToSelection(fadeSeconds = 0.65): void {
    if (this.disposed) return;
    this.menuMusicMode = this.menuMusicUrl ? 'selection' : 'off';
    this.applyMenuMusicMix(fadeSeconds);
  }

  stopMenuMusic(fadeSeconds = 0.45): void {
    if (this.disposed) return;
    this.menuMusicGeneration += 1;
    this.menuMusicUrl = null;
    this.menuMusicLoadingUrl = null;
    this.menuMusicLoadPromise = null;
    this.menuMusicMode = 'off';
    this.applyMenuMusicMix(fadeSeconds);
    const playback = this.menuMusicPlayback;
    this.menuMusicPlayback = null;
    if (playback) this.fadeOutMenuMusicPlayback(playback, fadeSeconds);
  }

  /**
   * Replays the cached, user-supplied intro for a local position gain. The
   * source is never pitch-shifted or looped. Returns false when unavailable,
   * paused, cooling down, or when another callout is already scheduled/playing.
   */
  playOvertakeCallout(): boolean {
    const context = this.context;
    const graph = this.graph;
    const buffer = this.menuIntroBuffer;
    if (
      this.disposed
      || this.paused
      || !context
      || context.state !== 'running'
      || !graph
      || !buffer
    ) return false;

    const now = context.currentTime;
    this.releaseExpiredOvertakeCallout(now);
    if (this.overtakeCalloutPlayback) return false;
    if (now - this.lastOvertakeCalloutAt < this.overtakeCalloutCooldownSeconds) return false;

    // If the selection intro is still completing, queue the callout directly
    // after it instead of layering two copies of the same authorized clip.
    const menuIntroEnd = this.menuMusicPlayback
      ? this.menuMusicPlayback.introStart + this.menuMusicPlayback.transition.introEndSeconds
      : now;
    const start = Math.max(now + 0.015, menuIntroEnd + 0.025);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = 0.98;
    source.connect(gain).connect(graph.calloutBus);
    const playback: OvertakeCalloutPlayback = {
      source,
      gain,
      startedAt: start,
      endsAt: start + buffer.duration,
    };
    source.addEventListener('ended', () => {
      if (this.overtakeCalloutPlayback !== playback) return;
      this.disconnectOvertakeCallout(playback);
      this.overtakeCalloutPlayback = null;
    }, { once: true });
    source.start(start);
    this.overtakeCalloutPlayback = playback;
    this.lastOvertakeCalloutAt = now;
    this.overtakeCalloutPlayCount += 1;
    this.scheduleOvertakeDucking(start, buffer.duration);
    return true;
  }

  update(model: PodracerAudioTelemetry): void {
    this.lastTelemetry = { ...model };
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph || context.state === 'closed') return;
    const targets = derivePodracerAudioTargets(model);
    const now = context.currentTime;
    const simulationTime = finite(model.simulationTime ?? now, now);
    const crackle = Math.pow(Math.max(0, Math.sin(simulationTime * 29.7) * 0.72 + Math.sin(simulationTime * 47.1 + 1.7) * 0.45), 9);

    this.target(graph.left.main.frequency, targets.engineLeft.frequency, now, 0.025);
    this.target(graph.left.harmonic.frequency, targets.engineLeft.frequency * 2.015, now, 0.022);
    this.target(graph.left.filter.frequency, targets.engineLeft.filterFrequency, now, 0.035);
    this.target(graph.left.gain.gain, targets.engineLeft.gain, now, 0.03);

    this.target(graph.right.main.frequency, targets.engineRight.frequency, now, 0.025);
    this.target(graph.right.harmonic.frequency, targets.engineRight.frequency * 1.985, now, 0.022);
    this.target(graph.right.filter.frequency, targets.engineRight.filterFrequency, now, 0.035);
    this.target(graph.right.gain.gain, targets.engineRight.gain, now, 0.03);

    this.target(graph.repulsor.frequency, targets.repulsorFrequency, now, 0.06);
    this.target(graph.repulsorHarmonic.frequency, targets.repulsorFrequency * 1.505, now, 0.055);
    this.target(graph.repulsorGain.gain, targets.repulsorGain, now, 0.08);
    this.target(graph.windGain.gain, targets.windGain, now, 0.07);
    this.target(graph.windLowpass.frequency, targets.windFilterFrequency, now, 0.06);
    this.target(graph.couplingFilter.frequency, targets.couplingFilterFrequency, now, 0.025);
    this.target(graph.couplingGain.gain, targets.couplingGain * (0.32 + crackle * 2.4), now, crackle > 0.1 ? 0.004 : 0.025);
  }

  handleEvents<TEvent extends AudioEventLike>(events: readonly TEvent[], options: AudioEventMapOptions = {}): void {
    for (const cue of mapGameEventsToAudioCues(events, options)) this.trigger(cue);
  }

  trigger(cue: PodracerAudioCue): void {
    if (!this.context || !this.graph || this.context.state === 'closed') return;
    const normalizedCue: PodracerAudioCue = {
      kind: cue.kind,
      intensity: Math.min(1, Math.max(0, finite(cue.intensity, 0))),
      pitch: Math.max(0.25, finite(cue.pitch ?? 1, 1)),
    };
    if (normalizedCue.intensity <= 0) return;
    this.effectSequence += 1;
    switch (normalizedCue.kind) {
      case 'impact':
        this.playTone(normalizedCue, 'triangle', 96, 37);
        this.playNoise(normalizedCue, 'lowpass', 720);
        break;
      case 'sand':
        this.playNoise(normalizedCue, 'bandpass', 1_650);
        break;
      case 'boost':
        this.playTone(normalizedCue, 'sawtooth', 78, 355);
        this.playNoise({ ...normalizedCue, intensity: normalizedCue.intensity * 0.56 }, 'highpass', 1_050);
        break;
      case 'horn':
        this.playHorn(normalizedCue);
        break;
      case 'countdown':
        this.playTone(normalizedCue, 'square', 278, 248);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.52 }, 'sine', 139, 124);
        break;
      case 'checkpoint':
        this.playTone(normalizedCue, 'triangle', 520, 740);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.7 }, 'triangle', 690, 910, 0.065);
        break;
      case 'lap':
        this.playArpeggio(normalizedCue, [330, 440, 554], 0.095);
        break;
      case 'finish':
        this.playArpeggio(normalizedCue, [220, 330, 440, 660], 0.13);
        break;
      case 'warning':
        this.playTone(normalizedCue, 'square', 172, 154);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.74 }, 'square', 172, 145, 0.19);
        break;
      case 'electric':
        this.playNoise(normalizedCue, 'bandpass', 3_300);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.42 }, 'square', 1_100, 410);
        break;
      case 'ui':
        this.playTone(normalizedCue, 'sine', 610, 820);
        break;
      case 'weapon':
        this.playHeatLanceFire(normalizedCue);
        break;
      case 'weapon-hit':
        this.playHeatLanceImpact(normalizedCue);
        break;
      case 'shield':
        this.playTone(normalizedCue, 'sine', 260, 980);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.52 }, 'triangle', 520, 1_420, 0.012);
        this.playNoise({ ...normalizedCue, intensity: normalizedCue.intensity * 0.3 }, 'highpass', 2_800);
        break;
      case 'mine':
        this.playTone(normalizedCue, 'triangle', 145, 46);
        this.playNoise(normalizedCue, 'lowpass', 980);
        break;
      case 'hazard':
        this.playNoise(normalizedCue, 'bandpass', 1_280);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.4 }, 'triangle', 118, 72);
        break;
      case 'redline':
        this.playTone(normalizedCue, 'sawtooth', 118, 470);
        this.playNoise({ ...normalizedCue, intensity: normalizedCue.intensity * 0.42 }, 'highpass', 1_900);
        break;
      case 'wreck':
        this.playTone(normalizedCue, 'sawtooth', 132, 31);
        this.playNoise(normalizedCue, 'lowpass', 680);
        break;
      case 'takedown':
        this.playArpeggio(normalizedCue, [246, 370, 493, 740], 0.065);
        break;
      case 'recovery':
        this.playArpeggio(normalizedCue, [165, 247, 330], 0.075);
        break;
      case 'upgrade':
        this.playArpeggio(normalizedCue, [440, 554, 740], 0.055);
        break;
      case 'vehicle':
        this.playTone(normalizedCue, 'triangle', 210, 420);
        this.playTone({ ...normalizedCue, intensity: normalizedCue.intensity * 0.56 }, 'sine', 105, 210, 0.045);
        break;
      default:
        break;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.context || !this.graph) return;
    this.target(
      this.graph.master.gain,
      muted ? 0 : this.effectiveMasterGain(),
      this.context.currentTime,
      0.025,
    );
  }

  /** Applies a complete or partial five-bus mix without rebuilding audio nodes. */
  setMix(settings: Partial<PodracerAudioMix>): void {
    const normalized = (value: number | undefined, fallback: number): number => (
      Number.isFinite(value) ? Math.min(1, Math.max(0, value!)) : fallback
    );
    this.mix = {
      master: normalized(settings.master, this.mix.master),
      music: normalized(settings.music, this.mix.music),
      engine: normalized(settings.engine, this.mix.engine),
      effects: normalized(settings.effects, this.mix.effects),
      voice: normalized(settings.voice, this.mix.voice),
    };
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph || context.state === 'closed') return;
    const now = context.currentTime;
    this.target(graph.master.gain, this.muted ? 0 : this.effectiveMasterGain(), now, 0.035);
    this.target(graph.engineBus.gain, this.engineBusGain(), now, 0.035);
    this.target(graph.effectsBus.gain, this.effectsBusGain(), now, 0.035);
    this.target(graph.calloutBus.gain, this.voiceBusGain(), now, 0.035);
    this.applyMenuMusicMix(0.035);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.context || !this.graph || this.context.state === 'closed') return;
    this.target(
      this.graph.master.gain,
      this.muted ? 0 : this.effectiveMasterGain(),
      this.context.currentTime,
      0.045,
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.menuMusicGeneration += 1;
    this.menuMusicUrl = null;
    this.menuMusicLoadingUrl = null;
    this.menuMusicLoadPromise = null;
    this.menuMusicMode = 'off';
    this.disarm();
    const context = this.context;
    const graph = this.graph;
    const menuPlayback = this.menuMusicPlayback;
    const calloutPlayback = this.overtakeCalloutPlayback;
    this.context = null;
    this.graph = null;
    this.menuMusicPlayback = null;
    this.menuIntroBuffer = null;
    this.overtakeCalloutPlayback = null;
    if (menuPlayback) this.haltMenuMusicPlayback(menuPlayback);
    if (calloutPlayback) this.haltOvertakeCallout(calloutPlayback);
    if (graph) {
      for (const source of graph.steadySources) {
        try {
          source.stop();
        } catch {
          // A stopped source throws on a second stop in some WebKit builds.
        }
      }
      graph.master.disconnect();
      graph.compressor.disconnect();
      graph.engineBus.disconnect();
      graph.effectsBus.disconnect();
      graph.musicBus.disconnect();
      graph.calloutBus.disconnect();
      graph.calloutHighpass.disconnect();
      graph.calloutPresence.disconnect();
    }
    if (context && context.state !== 'closed') void context.close();
  }

  private readonly handleUnlockGesture: EventListener = (): void => {
    void this.unlock();
    this.disarm();
  };

  private disarm(): void {
    if (!this.armedTarget) return;
    this.armedTarget.removeEventListener('pointerdown', this.handleUnlockGesture);
    this.armedTarget.removeEventListener('keydown', this.handleUnlockGesture);
    this.armedTarget.removeEventListener('touchstart', this.handleUnlockGesture);
    this.armedTarget = null;
  }

  private menuMusicMixGain(): number {
    switch (this.menuMusicMode) {
      case 'selection':
        return 0.78 * this.mix.music;
      case 'race':
        return 0.31 * this.mix.music;
      case 'off':
        return 0;
    }
  }

  private effectiveMasterGain(): number {
    return this.masterVolume * this.mix.master * (this.paused ? 0.08 : 1);
  }

  private engineBusGain(): number {
    return 0.88 * this.mix.engine;
  }

  private effectsBusGain(): number {
    return 0.76 * this.mix.effects;
  }

  private voiceBusGain(): number {
    return 0.94 * this.mix.voice;
  }

  private applyMenuMusicMix(fadeSeconds: number): void {
    const context = this.context;
    const musicBus = this.graph?.musicBus;
    if (!context || !musicBus || context.state === 'closed') return;
    const now = context.currentTime;
    const fade = Math.max(0.02, finite(fadeSeconds, 0.5));
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(this.menuMusicMixGain(), now + fade);
  }

  private async loadAndScheduleMenuMusic(url: string, generation: number): Promise<boolean> {
    const graphReady = await this.prewarm();
    if (!graphReady || generation !== this.menuMusicGeneration || this.disposed) return false;
    const encoded = await this.fetchAudio(url);
    if (generation !== this.menuMusicGeneration || this.disposed) return false;
    const context = this.context;
    if (!context || context.state === 'closed') return false;
    const introBuffer = await context.decodeAudioData(encoded.slice(0));
    if (generation !== this.menuMusicGeneration || this.disposed) return false;
    this.menuIntroBuffer = introBuffer;
    const playback = this.scheduleMenuMusicIntro(url, introBuffer);
    if (!playback) return false;
    const scoreBuffer = await this.renderMenuScore(context);
    if (
      generation !== this.menuMusicGeneration
      || this.disposed
      || this.menuMusicPlayback !== playback
    ) return false;
    this.scheduleMenuMusicScore(playback, scoreBuffer);
    return true;
  }

  private scheduleMenuMusicIntro(
    url: string,
    introBuffer: AudioBuffer,
  ): MenuMusicPlayback | null {
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph || context.state === 'closed') return null;
    const previous = this.menuMusicPlayback;

    const group = context.createGain();
    group.gain.value = 1;
    group.connect(graph.musicBus);

    const intro = context.createBufferSource();
    intro.buffer = introBuffer;
    const introGain = context.createGain();
    introGain.gain.value = 0.9;
    intro.connect(introGain).connect(group);

    const start = context.currentTime + 0.035;
    const transition = createMenuMusicTransitionSchedule(introBuffer.duration);
    intro.start(start + transition.introStartSeconds);

    const playback: MenuMusicPlayback = {
      url,
      group,
      intro,
      introGain,
      introStart: start,
      transition,
      score: null,
      scoreGain: null,
    };
    this.menuMusicPlayback = playback;
    this.applyMenuMusicMix(0.12);
    if (previous) this.fadeOutMenuMusicPlayback(previous, 0.16);
    return playback;
  }

  private scheduleMenuMusicScore(playback: MenuMusicPlayback, scoreBuffer: AudioBuffer): void {
    const context = this.context;
    if (!context || context.state === 'closed' || this.menuMusicPlayback !== playback) return;
    const score = context.createBufferSource();
    score.buffer = scoreBuffer;
    score.loop = true;
    score.loopStart = 0;
    score.loopEnd = scoreBuffer.duration;
    const scoreGain = context.createGain();
    score.connect(scoreGain).connect(playback.group);

    const desiredStart = playback.introStart + playback.transition.scoreStartSeconds;
    const fadeEnd = playback.introStart + playback.transition.scoreFadeEndSeconds;
    const scheduleAt = Math.max(context.currentTime + 0.025, desiredStart);
    const elapsed = Math.max(0, scheduleAt - desiredStart);
    const offset = elapsed % scoreBuffer.duration;
    const fadeDuration = Math.max(0.001, fadeEnd - desiredStart);
    const fadeProgress = Math.min(1, elapsed / fadeDuration);
    const initialGain = 0.0001 + (0.56 - 0.0001) * fadeProgress;
    scoreGain.gain.setValueAtTime(initialGain, scheduleAt);
    if (scheduleAt < fadeEnd) scoreGain.gain.linearRampToValueAtTime(0.56, fadeEnd);
    score.start(scheduleAt, offset);
    playback.score = score;
    playback.scoreGain = scoreGain;
  }

  private fadeOutMenuMusicPlayback(playback: MenuMusicPlayback, fadeSeconds: number): void {
    const context = this.context;
    if (!context || context.state === 'closed') {
      this.haltMenuMusicPlayback(playback);
      return;
    }
    const now = context.currentTime;
    const fade = Math.max(0.02, finite(fadeSeconds, 0.2));
    const stop = now + fade + 0.025;
    playback.group.gain.cancelScheduledValues(now);
    playback.group.gain.setValueAtTime(playback.group.gain.value, now);
    playback.group.gain.linearRampToValueAtTime(0.0001, now + fade);
    try {
      playback.intro.stop(stop);
    } catch {
      // It may already have completed naturally.
    }
    try {
      playback.score?.stop(stop);
    } catch {
      // A second stop is not accepted by every Web Audio implementation.
    }
    const cleanupSource = playback.score ?? playback.intro;
    cleanupSource.addEventListener('ended', () => this.disconnectMenuMusicPlayback(playback), { once: true });
  }

  private haltMenuMusicPlayback(playback: MenuMusicPlayback): void {
    try {
      playback.intro.stop();
    } catch {
      // It may already have completed naturally.
    }
    try {
      playback.score?.stop();
    } catch {
      // It may already have completed naturally.
    }
    this.disconnectMenuMusicPlayback(playback);
  }

  private disconnectMenuMusicPlayback(playback: MenuMusicPlayback): void {
    playback.intro.disconnect();
    playback.score?.disconnect();
    playback.introGain.disconnect();
    playback.scoreGain?.disconnect();
    playback.group.disconnect();
  }

  private releaseExpiredOvertakeCallout(now: number): void {
    const playback = this.overtakeCalloutPlayback;
    if (!playback || now < playback.endsAt) return;
    this.disconnectOvertakeCallout(playback);
    this.overtakeCalloutPlayback = null;
  }

  private scheduleOvertakeDucking(start: number, calloutDuration: number): void {
    const graph = this.graph;
    if (!graph) return;
    const attack = 0.065;
    const hold = Math.min(2.25, Math.max(0.9, calloutDuration * 0.36));
    const release = 0.72;
    const musicRestore = this.menuMusicMixGain();
    const engineRestore = this.engineBusGain();
    this.scheduleDuck(
      graph.engineBus.gain,
      start,
      0.4 * this.mix.engine,
      engineRestore,
      attack,
      hold,
      release,
    );
    this.scheduleDuck(
      graph.musicBus.gain,
      start,
      musicRestore * 0.28,
      musicRestore,
      attack,
      hold,
      release,
    );
  }

  private scheduleDuck(
    parameter: AudioParam,
    start: number,
    duckedValue: number,
    restoreValue: number,
    attack: number,
    hold: number,
    release: number,
  ): void {
    parameter.cancelScheduledValues(start);
    parameter.setValueAtTime(parameter.value, start);
    parameter.linearRampToValueAtTime(duckedValue, start + attack);
    parameter.setValueAtTime(duckedValue, start + attack + hold);
    parameter.linearRampToValueAtTime(restoreValue, start + attack + hold + release);
  }

  private haltOvertakeCallout(playback: OvertakeCalloutPlayback): void {
    try {
      playback.source.stop();
    } catch {
      // A source that ended naturally cannot be stopped twice in WebKit.
    }
    this.disconnectOvertakeCallout(playback);
  }

  private disconnectOvertakeCallout(playback: OvertakeCalloutPlayback): void {
    playback.source.disconnect();
    playback.gain.disconnect();
  }

  private async createGraph(resume: boolean): Promise<void> {
    const context = this.contextFactory();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    master.gain.value = this.muted ? 0 : this.effectiveMasterGain();
    master.connect(compressor);
    compressor.connect(context.destination);

    const engineBus = context.createGain();
    engineBus.gain.value = this.engineBusGain();
    engineBus.connect(master);
    const effectsBus = context.createGain();
    effectsBus.gain.value = this.effectsBusGain();
    effectsBus.connect(master);
    const musicBus = context.createGain();
    musicBus.gain.value = this.menuMusicMixGain();
    musicBus.connect(master);
    const calloutBus = context.createGain();
    calloutBus.gain.value = this.voiceBusGain();
    const calloutHighpass = context.createBiquadFilter();
    calloutHighpass.type = 'highpass';
    calloutHighpass.frequency.value = 115;
    calloutHighpass.Q.value = 0.7;
    const calloutPresence = context.createBiquadFilter();
    calloutPresence.type = 'peaking';
    calloutPresence.frequency.value = 2_250;
    calloutPresence.Q.value = 0.82;
    calloutPresence.gain.value = 3.4;
    calloutBus.connect(calloutHighpass).connect(calloutPresence).connect(master);
    const left = this.createEngineVoice(context, engineBus, -0.66, 4.2);
    const right = this.createEngineVoice(context, engineBus, 0.66, 4.55);

    const repulsor = context.createOscillator();
    repulsor.type = 'sine';
    repulsor.frequency.value = 43;
    const repulsorHarmonic = context.createOscillator();
    repulsorHarmonic.type = 'triangle';
    repulsorHarmonic.frequency.value = 65;
    const repulsorHarmonicGain = context.createGain();
    repulsorHarmonicGain.gain.value = 0.28;
    const repulsorGain = context.createGain();
    repulsorGain.gain.value = 0;
    repulsor.connect(repulsorGain);
    repulsorHarmonic.connect(repulsorHarmonicGain).connect(repulsorGain);
    repulsorGain.connect(engineBus);

    const noiseBuffer = createNoiseBuffer(context);
    const wind = context.createBufferSource();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    const windHighpass = context.createBiquadFilter();
    windHighpass.type = 'highpass';
    windHighpass.frequency.value = 150;
    const windLowpass = context.createBiquadFilter();
    windLowpass.type = 'lowpass';
    windLowpass.frequency.value = 900;
    windLowpass.Q.value = 0.72;
    const windGain = context.createGain();
    windGain.gain.value = 0;
    wind.connect(windHighpass).connect(windLowpass).connect(windGain).connect(engineBus);

    const coupling = context.createBufferSource();
    coupling.buffer = noiseBuffer;
    coupling.loop = true;
    coupling.playbackRate.value = 1.81;
    const couplingFilter = context.createBiquadFilter();
    couplingFilter.type = 'bandpass';
    couplingFilter.frequency.value = 2_100;
    couplingFilter.Q.value = 9.5;
    const couplingGain = context.createGain();
    couplingGain.gain.value = 0;
    const couplingPanner = context.createStereoPanner();
    couplingPanner.pan.value = 0;
    coupling.connect(couplingFilter).connect(couplingGain).connect(couplingPanner).connect(engineBus);

    const steadySources: AudioScheduledSourceNode[] = [
      left.main,
      left.harmonic,
      right.main,
      right.harmonic,
      repulsor,
      repulsorHarmonic,
      wind,
      coupling,
    ];
    const start = context.currentTime;
    for (const source of steadySources) source.start(start);

    this.context = context;
    this.graph = {
      master,
      compressor,
      engineBus,
      effectsBus,
      musicBus,
      calloutBus,
      calloutHighpass,
      calloutPresence,
      left,
      right,
      repulsor,
      repulsorHarmonic,
      repulsorGain,
      wind,
      windHighpass,
      windLowpass,
      windGain,
      coupling,
      couplingFilter,
      couplingGain,
      noiseBuffer,
      steadySources,
    };
    if (resume && context.state === 'suspended') await context.resume();
    if (context.state === 'running') this.disarm();
    if (this.lastTelemetry) this.update(this.lastTelemetry);
  }

  private createEngineVoice(
    context: AudioContext,
    destination: AudioNode,
    pan: number,
    drive: number,
  ): EngineVoice {
    const main = context.createOscillator();
    main.type = 'sawtooth';
    main.frequency.value = 58;
    const harmonic = context.createOscillator();
    harmonic.type = 'square';
    harmonic.frequency.value = 116;
    const harmonicGain = context.createGain();
    harmonicGain.gain.value = 0.17;
    const shaper = context.createWaveShaper();
    shaper.curve = createDriveCurve(drive);
    shaper.oversample = '2x';
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = 2.8;
    const gain = context.createGain();
    gain.gain.value = 0;
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    main.connect(shaper);
    harmonic.connect(harmonicGain).connect(shaper);
    shaper.connect(filter).connect(gain).connect(panner).connect(destination);
    return { main, harmonic, filter, gain };
  }

  private target(parameter: AudioParam, value: number, now: number, timeConstant: number): void {
    parameter.setTargetAtTime(finite(value, parameter.value), now, Math.max(0.001, timeConstant));
  }

  private applyEnvelope(gain: AudioParam, cue: PodracerAudioCue, start: number): number {
    const schedule = createAudioEnvelopeSchedule(cue, start);
    gain.cancelScheduledValues(start);
    for (let index = 0; index < schedule.length; index += 1) {
      const point = schedule[index];
      if (!point) continue;
      if (index === 0) gain.setValueAtTime(point.value, point.time);
      else if (point.curve === 'exponential') gain.exponentialRampToValueAtTime(point.value, point.time);
      else gain.linearRampToValueAtTime(point.value, point.time);
    }
    return schedule[schedule.length - 1]?.time ?? start + 0.1;
  }

  private playTone(
    cue: PodracerAudioCue,
    type: OscillatorType,
    startFrequency: number,
    endFrequency: number,
    delay = 0,
  ): void {
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph) return;
    const pitch = cue.pitch ?? 1;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(24, startFrequency * pitch), start);
    const gain = context.createGain();
    const end = this.applyEnvelope(gain.gain, cue, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, endFrequency * pitch), end);
    oscillator.connect(gain).connect(graph.effectsBus);
    oscillator.start(start);
    oscillator.stop(end + 0.03);
  }

  private playNoise(
    cue: PodracerAudioCue,
    filterType: BiquadFilterType,
    frequency: number,
    delay = 0,
  ): void {
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = graph.noiseBuffer;
    source.loop = true;
    source.playbackRate.value = 0.82 + ((this.effectSequence * 37) % 19) / 50;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency * (cue.pitch ?? 1);
    filter.Q.value = filterType === 'bandpass' ? 1.35 : 0.75;
    const gain = context.createGain();
    const end = this.applyEnvelope(gain.gain, cue, start);
    source.connect(filter).connect(gain).connect(graph.effectsBus);
    const maxOffset = Math.max(0, graph.noiseBuffer.duration - 0.25);
    const offset = maxOffset * ((this.effectSequence * 0.61803398875) % 1);
    source.start(start, offset);
    source.stop(end + 0.03);
  }

  private playHorn(cue: PodracerAudioCue): void {
    const chord = [92.5, 123.5, 185];
    for (let index = 0; index < chord.length; index += 1) {
      const frequency = chord[index];
      if (frequency === undefined) continue;
      this.playTone(
        { ...cue, intensity: cue.intensity * (1 - index * 0.16) },
        index === 2 ? 'triangle' : 'sawtooth',
        frequency,
        frequency * 0.93,
        index * 0.012,
      );
    }
    this.playNoise({ ...cue, intensity: cue.intensity * 0.16 }, 'lowpass', 520);
  }

  /**
   * A fast upward ion sweep, hard electrical snap, and short sub-body make the
   * Heat Lance recognizable through engine/wind noise without using samples.
   */
  private playHeatLanceFire(cue: PodracerAudioCue): void {
    this.playTone(cue, 'triangle', 430, 3_450);
    this.playTone(
      { ...cue, intensity: cue.intensity * 0.58, pitch: (cue.pitch ?? 1) * 1.03 },
      'square',
      3_900,
      720,
      0.003,
    );
    this.playTone(
      { ...cue, intensity: cue.intensity * 0.32, pitch: (cue.pitch ?? 1) * 0.74 },
      'sine',
      210,
      92,
      0.012,
    );
    this.playNoise(
      { ...cue, intensity: cue.intensity * 0.24, pitch: (cue.pitch ?? 1) * 1.08 },
      'highpass',
      2_450,
      0.002,
    );
  }

  /** A descending electrical rip plus a compact low impact for a clean hit. */
  private playHeatLanceImpact(cue: PodracerAudioCue): void {
    this.playTone(cue, 'sawtooth', 2_300, 86);
    this.playTone(
      { ...cue, intensity: cue.intensity * 0.56, pitch: (cue.pitch ?? 1) * 1.12 },
      'triangle',
      980,
      155,
      0.009,
    );
    this.playNoise(
      { ...cue, intensity: cue.intensity * 0.46 },
      'bandpass',
      2_650,
    );
    this.playNoise(
      { ...cue, intensity: cue.intensity * 0.25, pitch: (cue.pitch ?? 1) * 0.7 },
      'lowpass',
      560,
      0.012,
    );
  }

  private playArpeggio(cue: PodracerAudioCue, notes: readonly number[], spacing: number): void {
    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index];
      if (note === undefined) continue;
      this.playTone(
        { ...cue, intensity: cue.intensity * Math.max(0.55, 1 - index * 0.09) },
        'triangle',
        note,
        note * 1.025,
        index * spacing,
      );
    }
  }
}
