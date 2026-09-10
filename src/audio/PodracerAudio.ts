import {
  deriveRivalAudioTargets,
  mapGameEventsToAudioCues,
} from './model';
import {
  createMenuMusicTransitionSchedule,
} from './menuMusic';
import type { MenuMusicTransitionSchedule } from './menuMusic';
import { RECORDED_CUES, RECORDED_CUE_ROLES, RECORDED_EFFECT_URLS, RECORDED_LOOPS, RECORDED_MUSIC_URL } from './catalogue';
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

interface RecordedVoice {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  panner: StereoPannerNode;
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
  engine: RecordedVoice | null;
  rivals: RecordedVoice[];
  canyonReturn: GainNode;
  canyonDelay: DelayNode | null;
  steadySources: AudioBufferSourceNode[];
  nodes: AudioNode[];
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

export class PodracerAudio {
  private readonly contextFactory: () => AudioContext;
  private readonly fetchAudio: (url: string) => Promise<ArrayBuffer>;
  private readonly masterVolume: number;
  private readonly overtakeCalloutCooldownSeconds: number;
  private context: AudioContext | null = null;
  private graph: ContinuousGraph | null = null;
  private armedTarget: EventTarget | null = null;
  private unlockPromise: Promise<boolean> | null = null;
  private lastTelemetry: PodracerAudioTelemetry | null = null;
  private muted: boolean;
  private paused = false;
  private hidden = false;
  private vehicleLoopsEnabled = true;
  private disposed = false;
  private effectSequence = 0;
  private readonly recordings = new Map<string, AudioBuffer>();
  private readonly pendingRecordings = new Map<string, Promise<AudioBuffer | null>>();
  private readonly failedRecordings = new Set<string>();
  private readonly effects = new Map<AudioBufferSourceNode, { gain: GainNode; url: string }>();
  private readonly cueLastPlayed = new Map<string, number>();
  private nextAudioUpdateAt = 0;
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
      if (!response.ok) throw new Error(`Unable to load recorded audio (${response.status}).`);
      return response.arrayBuffer();
    });
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
   * Loads existing catalogue recordings and the node graph before the
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
   * existing composed music. Calling this during page setup attempts autoplay when
   * policy permits; a suspended context starts on the existing unlock gesture.
   */
  startMenuMusic(url: string): Promise<boolean> {
    const normalizedUrl = url.trim();
    if (this.disposed || normalizedUrl.length === 0) return Promise.resolve(false);
    this.silenceVehicleAudio();
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
    this.vehicleLoopsEnabled = true;
    this.nextAudioUpdateAt = 0;
    if (this.context && this.graph && this.context.state !== 'closed') {
      this.graph.engineBus.gain.cancelScheduledValues(this.context.currentTime);
      this.graph.engineBus.gain.setValueAtTime(this.engineBusGain(), this.context.currentTime);
    }
    this.menuMusicMode = this.menuMusicUrl ? 'race' : 'off';
    this.applyMenuMusicMix(fadeSeconds);
  }

  /** Restore the full selection-screen mix without restarting the intro. */
  transitionMenuMusicToSelection(fadeSeconds = 0.65): void {
    if (this.disposed) return;
    this.silenceVehicleAudio();
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
      || this.hidden
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
    if (!this.vehicleLoopsEnabled || this.disposed) return;
    this.lastTelemetry = { ...model };
    const context = this.context, graph = this.graph;
    if (!context || !graph || context.state === 'closed') return;
    if (context.currentTime < this.nextAudioUpdateAt) return;
    this.nextAudioUpdateAt = context.currentTime + 1 / 30;
    const now = context.currentTime;
    const unit = (value: number): number => Math.min(1, Math.max(0, finite(value, 0)));
    const speed = unit(model.speedMps / 210), throttle = unit(model.throttle);
    const boost = model.boostActive ? unit(model.boost) : 0;
    if (graph.engine) {
      // One continuous propulsion bed. Load changes are gradual and narrow;
      // heat/damage/time never introduce pitch flutter or oscillating layers.
      this.target(graph.engine.source.playbackRate, 0.94 + throttle * 0.12 + speed * 0.04 + boost * 0.02, now, 0.22);
      this.target(graph.engine.filter.frequency, 1_600 + throttle * 2_000 + speed * 800, now, 0.18);
      this.target(graph.engine.gain.gain, (0.13 + throttle * 0.13 + speed * 0.07 + boost * 0.03) * (1 - unit(model.damage) * 0.25), now, 0.16);
    }
    this.target(graph.canyonReturn.gain, unit(model.environmentClosure ?? 0) * 0.025, now, 0.45);
    const rivals = deriveRivalAudioTargets(model.rivals);
    for (let i = 0; i < graph.rivals.length; i += 1) {
      const voice = graph.rivals[i]!, rival = model.rivals?.[i], target = rivals[i];
      const near = rival && finite(rival.distanceM, 240) < 70;
      this.target(voice.source.playbackRate, Math.min(1.08, Math.max(0.94, (target?.frequency ?? 180) / 180)), now, 0.24);
      this.target(voice.gain.gain, near ? (target?.gain ?? 0) * 0.36 : 0, now, 0.14);
      this.target(voice.filter.frequency, 1_800, now, 0.18);
      if (target) this.target(voice.panner.pan, target.pan * 0.75, now, 0.12);
    }
  }

  /** Diagnostic copy; unavailable files remain silent, never synthesized. */
  get recordingStatus(): { loaded: number; pending: number; failed: readonly string[]; activeEffects: number } {
    return { loaded: this.recordings.size, pending: this.pendingRecordings.size,
      failed: [...this.failedRecordings], activeEffects: this.effects.size };
  }

  handleEvents<TEvent extends AudioEventLike>(events: readonly TEvent[], options: AudioEventMapOptions = {}): void {
    for (const cue of mapGameEventsToAudioCues(events, options)) this.trigger(cue);
  }

  trigger(cue: PodracerAudioCue): void {
    const context = this.context, graph = this.graph;
    if (!context || !graph || context.state !== 'running' || this.paused || this.hidden || this.disposed) return;
    const intensity = Math.min(1, Math.max(0, finite(cue.intensity, 0)));
    if (intensity <= 0) return;
    const now = context.currentTime;
    const choices = RECORDED_CUES[cue.kind];
    if (choices.length === 0) return;
    const url = choices[this.effectSequence % choices.length]!;
    const role = RECORDED_CUE_ROLES[url];
    if (!role || now - (this.cueLastPlayed.get(url) ?? -Infinity) < role.gap) return;
    const buffer = this.recordings.get(url);
    // Do not queue stale gameplay sounds if loading has not completed.
    if (!buffer) return;
    this.cueLastPlayed.set(url, now);
    this.effectSequence += 1;
    // Bound tails per recording, so aliased collision/EMP/boost events cannot
    // accumulate a wall of overlapping copies. Preserve a global safety cap.
    const matching = [...this.effects].filter(([, effect]) => effect.url === url);
    if (matching.length >= role.voices) this.releaseEffect(matching[0]![0], true);
    if (this.effects.size >= 12) {
      const oldest = this.effects.keys().next().value as AudioBufferSourceNode;
      this.releaseEffect(oldest, true);
    }
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = Math.min(1.05, Math.max(0.95, finite(cue.pitch ?? 1, 1)));
    const start = now + 0.005, duration = buffer.duration / source.playbackRate.value;
    const level = role.gain * intensity;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.008, duration * 0.1));
    gain.gain.setValueAtTime(level, start + Math.max(0.01, duration - 0.025));
    gain.gain.linearRampToValueAtTime(0, start + duration);
    source.connect(gain).connect(graph.effectsBus);
    this.effects.set(source, { gain, url });
    source.addEventListener('ended', () => this.releaseEffect(source, false));
    source.start(start);
    source.stop(start + duration + 0.005);
  }

  private releaseEffect(source: AudioBufferSourceNode, stop: boolean): void {
    const effect = this.effects.get(source);
    if (!effect) return;
    this.effects.delete(source);
    if (stop) { try { source.stop(); } catch { /* Already ended. */ } }
    source.disconnect();
    effect.gain.disconnect();
  }

  private clearGameplayTransients(): void {
    for (const source of this.effects.keys()) this.releaseEffect(source, true);
    const callout = this.overtakeCalloutPlayback;
    this.overtakeCalloutPlayback = null;
    if (callout) this.haltOvertakeCallout(callout);
  }

  private silenceVehicleAudio(): void {
    this.vehicleLoopsEnabled = false;
    this.lastTelemetry = null;
    this.nextAudioUpdateAt = 0;
    this.clearGameplayTransients();
    const context = this.context, graph = this.graph;
    if (!context || !graph || context.state === 'closed') return;
    // Menu frames do not supply telemetry. Cancel every lingering gain/duck,
    // including the canyon return, without stopping the pooled recordings.
    const gains = [graph.engineBus, graph.canyonReturn,
      graph.engine?.gain,
      ...graph.rivals.map(voice => voice.gain)];
    for (const node of gains) {
      if (!node) continue;
      node.gain.cancelScheduledValues(context.currentTime);
      node.gain.setValueAtTime(0, context.currentTime);
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

  /** Visibility is independent of user pause/mute and survives menu transitions. */
  setHidden(hidden: boolean): void {
    if (this.disposed || this.hidden === hidden) return;
    this.hidden = hidden;
    const context = this.context, graph = this.graph;
    if (hidden) this.clearGameplayTransients();
    if (!context || !graph || context.state === 'closed') return;
    const now = context.currentTime;
    // Keep music/source clocks running silently. A synchronous hard mute avoids
    // suspend/resume races and cannot be undone by setPaused(false) in a garage.
    graph.master.gain.cancelScheduledValues(now);
    graph.master.gain.setValueAtTime(this.muted ? 0 : this.effectiveMasterGain(), now);
    if (hidden) {
      graph.engineBus.gain.cancelScheduledValues(now);
      graph.engineBus.gain.setValueAtTime(this.engineBusGain(), now);
      this.applyMenuMusicMix(0.02);
    }
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
    for (const source of this.effects.keys()) this.releaseEffect(source, true);
    this.recordings.clear();
    this.pendingRecordings.clear();
    this.failedRecordings.clear();
    this.cueLastPlayed.clear();
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
      graph.canyonReturn.disconnect();
      graph.canyonDelay?.disconnect();
      for (const node of graph.nodes) node.disconnect();
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
    return this.hidden ? 0 : this.masterVolume * this.mix.master * (this.paused ? 0.08 : 1);
  }

  private engineBusGain(): number {
    return this.vehicleLoopsEnabled ? 0.88 * this.mix.engine : 0;
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
    const scoreBuffer = await this.loadRecording(RECORDED_MUSIC_URL);
    if (
      generation !== this.menuMusicGeneration
      || this.disposed
      || this.menuMusicPlayback !== playback
    ) return false;
    if (scoreBuffer) this.scheduleMenuMusicScore(playback, scoreBuffer);
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
      Math.min(0.4 * this.mix.engine, engineRestore),
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
    const canyonReturn = context.createGain();
    canyonReturn.gain.value = 0;
    const canyonDelay = typeof context.createDelay === 'function' ? context.createDelay(0.5) : null;
    const nodes: AudioNode[] = [];
    if (canyonDelay) {
      canyonDelay.delayTime.value = 0.115;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 1_900;
      engineBus.connect(canyonDelay).connect(filter).connect(canyonReturn).connect(master);
      nodes.push(filter);
    }
    this.context = context;
    const graph: ContinuousGraph = {
      master, compressor, engineBus, effectsBus, musicBus, calloutBus,
      calloutHighpass, calloutPresence, engine: null,
      rivals: [], canyonReturn, canyonDelay, steadySources: [], nodes,
    };
    this.graph = graph;
    // Resume is called before network awaits, in the original user gesture.
    if (resume && context.state === 'suspended') await context.resume();
    if (context.state === 'running') this.disarm();
    await Promise.all(RECORDED_EFFECT_URLS.map(url => this.loadRecording(url)));
    if (this.disposed || this.graph !== graph || context.state === 'closed') return;
    graph.engine = this.createRecordedVoice(RECORDED_LOOPS.engine, 0, 0);
    for (let i = 0; i < 2; i += 1) {
      const voice = this.createRecordedVoice(RECORDED_LOOPS.rival, 0, (i + 1) * 0.57);
      if (voice) graph.rivals.push(voice);
    }
    if (this.lastTelemetry) this.update(this.lastTelemetry);
  }

  private loadRecording(url: string): Promise<AudioBuffer | null> {
    const cached = this.recordings.get(url);
    if (cached) return Promise.resolve(cached);
    const pending = this.pendingRecordings.get(url);
    if (pending) return pending;
    const context = this.context;
    if (!context || this.disposed) return Promise.resolve(null);
    const task = this.fetchAudio(url).then(encoded => context.decodeAudioData(encoded.slice(0)))
      .then(buffer => {
        if (this.disposed || this.context !== context || context.state === 'closed') return null;
        this.recordings.set(url, buffer);
        this.failedRecordings.delete(url);
        return buffer;
      }).catch(() => {
        if (!this.disposed) this.failedRecordings.add(url);
        return null;
      }).finally(() => { this.pendingRecordings.delete(url); });
    this.pendingRecordings.set(url, task);
    return task;
  }

  private createRecordedVoice(url: string, pan: number, offset: number): RecordedVoice | null {
    const context = this.context, graph = this.graph, buffer = this.recordings.get(url);
    if (!context || !graph || !buffer) return null;
    const source = context.createBufferSource(), filter = context.createBiquadFilter();
    const gain = context.createGain(), panner = context.createStereoPanner();
    source.buffer = buffer; source.loop = true;
    filter.type = 'lowpass'; filter.frequency.value = 4_000; filter.Q.value = 0.7;
    gain.gain.value = 0; panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(graph.engineBus);
    graph.steadySources.push(source); graph.nodes.push(source, filter, gain, panner);
    source.start(context.currentTime, offset % buffer.duration);
    return { source, filter, gain, panner };
  }

  private target(parameter: AudioParam, value: number, now: number, timeConstant: number): void {
    parameter.setTargetAtTime(finite(value, parameter.value), now, Math.max(0.001, timeConstant));
  }

}
