import { describe, expect, it } from 'vitest';
import { PodracerAudio } from '../../src/audio';
import { RECORDED_EFFECT_URLS, RECORDED_MUSIC_URL } from '../../src/audio/catalogue';
import type { PodracerAudioTelemetry } from '../../src/audio';
const EXPECTED_DECODED_FILES = RECORDED_EFFECT_URLS.length + 2;

interface ParamEvent {
  kind: 'cancel' | 'set' | 'linear' | 'exponential' | 'target';
  value?: number;
  time: number;
  constant?: number;
}

class FakeAudioParam {
  value: number;
  readonly events: ParamEvent[] = [];

  constructor(value = 0) {
    this.value = value;
  }

  cancelScheduledValues(time: number): this {
    this.events.push({ kind: 'cancel', time });
    return this;
  }

  setValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ kind: 'set', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ kind: 'linear', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.events.push({ kind: 'exponential', value, time });
    return this;
  }

  setTargetAtTime(value: number, time: number, constant: number): this {
    this.value = value;
    this.events.push({ kind: 'target', value, time, constant });
    return this;
  }
}

class FakeAudioNode {
  readonly connections: FakeAudioNode[] = [];
  disconnected = false;

  connect<T extends FakeAudioNode>(destination: T): T {
    this.connections.push(destination);
    return destination;
  }

  disconnect(): void {
    this.disconnected = true;
    this.connections.length = 0;
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam(1);
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeAudioParam(350);
  readonly Q = new FakeAudioParam(1);
  readonly gain = new FakeAudioParam(0);
}

class FakeDynamicsCompressorNode extends FakeAudioNode {
  readonly threshold = new FakeAudioParam(-24);
  readonly knee = new FakeAudioParam(30);
  readonly ratio = new FakeAudioParam(12);
  readonly attack = new FakeAudioParam(0.003);
  readonly release = new FakeAudioParam(0.25);
}

class FakeScheduledSource extends FakeAudioNode {
  readonly startCalls: Array<{ time: number; offset?: number }> = [];
  readonly stopCalls: number[] = [];
  private readonly endedListeners: Array<() => void> = [];

  start(time = 0, offset?: number): void {
    this.startCalls.push(offset === undefined ? { time } : { time, offset });
  }

  stop(time = 0): void {
    this.stopCalls.push(time);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type !== 'ended') return;
    this.endedListeners.push(() => {
      if (typeof listener === 'function') listener(new Event('ended'));
      else listener.handleEvent(new Event('ended'));
    });
  }

  emitEnded(): void {
    for (const listener of this.endedListeners.splice(0)) listener();
  }
}

class FakeBufferSourceNode extends FakeScheduledSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  readonly playbackRate = new FakeAudioParam(1);
}

class FakeOscillatorNode extends FakeScheduledSource {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeAudioParam(440);
}

class FakeStereoPannerNode extends FakeAudioNode {
  readonly pan = new FakeAudioParam(0);
}

class FakeDelayNode extends FakeAudioNode {
  readonly delayTime = new FakeAudioParam(0);
}

class FakeWaveShaperNode extends FakeAudioNode {
  curve: Float32Array<ArrayBuffer> | null = null;
  oversample: OverSampleType = 'none';
}

class FakeAudioBuffer {
  readonly duration: number;
  private readonly channels: Float32Array[];

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.duration = length / sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]!;
  }
}

class FakeAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  readonly sampleRate = 8_000;
  readonly destination = new FakeAudioNode();
  readonly gains: FakeGainNode[] = [];
  readonly filters: FakeBiquadFilterNode[] = [];
  readonly oscillators: FakeOscillatorNode[] = [];
  readonly bufferSources: FakeBufferSourceNode[] = [];
  readonly decodedIntro = new FakeAudioBuffer(2, 48_000, 8_000) as unknown as AudioBuffer;
  decodeCount = 0;
  closeCount = 0;

  createGain(): GainNode {
    const node = new FakeGainNode();
    this.gains.push(node);
    return node as unknown as GainNode;
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    return new FakeDynamicsCompressorNode() as unknown as DynamicsCompressorNode;
  }

  createOscillator(): OscillatorNode {
    const node = new FakeOscillatorNode();
    this.oscillators.push(node);
    return node as unknown as OscillatorNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSourceNode();
    this.bufferSources.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    const node = new FakeBiquadFilterNode();
    this.filters.push(node);
    return node as unknown as BiquadFilterNode;
  }

  createStereoPanner(): StereoPannerNode {
    return new FakeStereoPannerNode() as unknown as StereoPannerNode;
  }

  createDelay(): DelayNode {
    return new FakeDelayNode() as unknown as DelayNode;
  }

  createWaveShaper(): WaveShaperNode {
    return new FakeWaveShaperNode() as unknown as WaveShaperNode;
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    return new FakeAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer;
  }

  async decodeAudioData(): Promise<AudioBuffer> {
    this.decodeCount += 1;
    return this.decodedIntro;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.closeCount += 1;
    this.state = 'closed';
  }
}

function asFakeNode(node: unknown): FakeAudioNode | undefined {
  return node as unknown as FakeAudioNode | undefined;
}

function asFakeGain(node: unknown): FakeGainNode | undefined {
  return node as unknown as FakeGainNode | undefined;
}

async function createLoadedAudio(initiallyMuted = false): Promise<{
  audio: PodracerAudio;
  context: FakeAudioContext;
  fetchCount: () => number;
}> {
  const context = new FakeAudioContext();
  let fetches = 0;
  const audio = new PodracerAudio({
    initiallyMuted,
    createContext: () => context as unknown as AudioContext,
    fetchAudio: async () => {
      fetches += 1;
      return new ArrayBuffer(16);
    },
    overtakeCalloutCooldownSeconds: 4.2,
  });
  await expect(audio.startMenuMusic('/audio/podracing-selection-intro.webm')).resolves.toBe(true);
  return { audio, context, fetchCount: () => fetches };
}

describe('PodracerAudio overtake callout', () => {
  it('reuses the decoded menu buffer and never refetches it for overtakes', async () => {
    const { audio, context, fetchCount } = await createLoadedAudio();
    expect(fetchCount()).toBe(EXPECTED_DECODED_FILES);
    expect(context.decodeCount).toBe(EXPECTED_DECODED_FILES);

    context.currentTime = 7;
    expect(audio.playOvertakeCallout()).toBe(true);
    const firstCallout = context.bufferSources.at(-1)!;
    expect(firstCallout.buffer).toBe(context.decodedIntro);

    context.currentTime = 14;
    expect(audio.playOvertakeCallout()).toBe(true);
    const secondCallout = context.bufferSources.at(-1)!;
    expect(secondCallout).not.toBe(firstCallout);
    expect(secondCallout.buffer).toBe(context.decodedIntro);
    expect(fetchCount()).toBe(EXPECTED_DECODED_FILES);
    expect(context.decodeCount).toBe(EXPECTED_DECODED_FILES);
    expect(audio.overtakeCalloutStatus.playCount).toBe(2);
    audio.dispose();
  });

  it('blocks cooldown and overlap, then owns and disconnects the live source on dispose', async () => {
    const { audio, context } = await createLoadedAudio();
    context.currentTime = 7;
    expect(audio.playOvertakeCallout()).toBe(true);
    const source = context.bufferSources.at(-1)!;
    const sourceCount = context.bufferSources.length;
    expect(audio.playOvertakeCallout()).toBe(false);
    context.currentTime = 11.5;
    expect(audio.playOvertakeCallout()).toBe(false);
    expect(context.bufferSources).toHaveLength(sourceCount);
    expect(audio.overtakeCalloutStatus.playing).toBe(true);

    audio.dispose();
    expect(source.stopCalls).toHaveLength(1);
    expect(source.disconnected).toBe(true);
    expect(audio.overtakeCalloutStatus.ready).toBe(false);
    expect(audio.playOvertakeCallout()).toBe(false);
    expect(context.closeCount).toBe(1);
  });

  it('routes through the presence bus, ducks race music/engines, and remains master-muted', async () => {
    const { audio, context } = await createLoadedAudio(true);
    audio.transitionMenuMusicToRace(0.02);
    context.currentTime = 7;
    expect(audio.playOvertakeCallout()).toBe(true);
    const callout = context.bufferSources.at(-1)!;
    const sourceGain = asFakeGain(callout.connections[0]);
    const calloutBus = sourceGain?.connections[0] as FakeGainNode | undefined;
    const highpass = calloutBus?.connections[0] as FakeBiquadFilterNode | undefined;
    const presence = highpass?.connections[0] as FakeBiquadFilterNode | undefined;
    const master = presence?.connections[0] as FakeGainNode | undefined;

    expect(callout.startCalls).toEqual([{ time: 7.015 }]);
    expect(callout.buffer).toBe(context.decodedIntro);
    expect(callout.loop).toBe(false);
    expect(sourceGain?.gain.value).toBeCloseTo(0.98);
    expect(calloutBus?.gain.value).toBeCloseTo(0.94);
    expect(highpass?.type).toBe('highpass');
    expect(highpass?.frequency.value).toBe(115);
    expect(presence?.type).toBe('peaking');
    expect(presence?.gain.value).toBeCloseTo(3.4);
    expect(master).toBe(context.gains[0]);
    expect(master?.gain.value).toBe(0);

    const engineBus = context.gains[1]!;
    const musicBus = context.gains[3]!;
    expect(engineBus.gain.events.some((event) => event.kind === 'linear' && event.value === 0.4)).toBe(true);
    expect(engineBus.gain.events.some((event) => event.kind === 'linear' && event.value === 0.88)).toBe(true);
    expect(musicBus.gain.events.some((event) => event.kind === 'linear' && event.value === 0.31 * 0.28)).toBe(true);
    expect(musicBus.gain.events.some((event) => event.kind === 'linear' && event.value === 0.31)).toBe(true);
    audio.dispose();
  });

  it('refuses new playback while paused and the shared master owns an active callout', async () => {
    const { audio, context } = await createLoadedAudio();
    context.currentTime = 7;
    audio.setPaused(true);
    const sourcesBefore = context.bufferSources.length;
    expect(audio.playOvertakeCallout()).toBe(false);
    expect(context.bufferSources).toHaveLength(sourcesBefore);
    expect(audio.overtakeCalloutStatus.paused).toBe(true);

    audio.setPaused(false);
    expect(audio.playOvertakeCallout()).toBe(true);
    audio.setMuted(true);
    const master = context.gains[0]!;
    expect(master.gain.events.at(-1)).toMatchObject({ kind: 'target', value: 0 });
    expect(asFakeNode(context.bufferSources.at(-1)?.connections[0])?.connections.length).toBe(1);
    audio.dispose();
  });
});


describe('recorded catalogue audio owner', () => {
  const racingTelemetry: PodracerAudioTelemetry = {
    speedMps: 160, throttle: 1, boost: 0.8, boostActive: true,
    drift: 0.2, heat: 0.2, damage: 0, grounded: true, environmentClosure: 1,
    rivals: Array.from({ length: 4 }, (_, i) => ({
      id: `rival-${i}`, distanceM: 8 + i * 2, pan: i % 2 ? 0.5 : -0.5,
      closingSpeedMps: 12, speedMps: 150,
    })),
  };

  it('silences every vehicle and combat tail in the garage while retaining the same intro and score', async () => {
    const { audio, context } = await createLoadedAudio();
    const menuSources = context.bufferSources.filter(source => !(source.connections[0] instanceof FakeBiquadFilterNode));
    const vehicleSources = context.bufferSources.filter(source => source.loop && source.connections[0] instanceof FakeBiquadFilterNode);
    const vehicleGains = vehicleSources.map(source => source.connections[0]!.connections[0] as FakeGainNode);
    expect(vehicleGains).toHaveLength(3);
    const engineBus = vehicleGains[0]!.connections[0]!.connections[0] as FakeGainNode;
    const delay = engineBus.connections.find(node => node instanceof FakeDelayNode)!;
    const canyonReturn = delay.connections[0]!.connections[0] as FakeGainNode;

    audio.transitionMenuMusicToRace();
    context.currentTime = 8;
    audio.update(racingTelemetry);
    expect(vehicleGains.every(node => node.gain.value > 0)).toBe(true);
    expect(canyonReturn.gain.value).toBeGreaterThan(0);
    audio.trigger({ kind: 'weapon', intensity: 1 });
    const weapon = context.bufferSources.at(-1)!;
    expect(audio.playOvertakeCallout()).toBe(true);
    const callout = context.bufferSources.at(-1)!;
    const sourceCount = context.bufferSources.length;

    context.currentTime = 8.1;
    audio.setPaused(true);
    audio.transitionMenuMusicToSelection();
    audio.setPaused(false);
    expect(audio.recordingStatus.activeEffects).toBe(0);
    expect(audio.overtakeCalloutStatus.playing).toBe(false);
    expect([weapon, callout].every(source => source.disconnected && source.stopCalls.at(-1) === 0)).toBe(true);
    expect([...vehicleGains, engineBus, canyonReturn].every(node => node.gain.value === 0)).toBe(true);
    expect(engineBus.gain.events.slice(-2)).toEqual([
      { kind: 'cancel', time: 8.1 }, { kind: 'set', time: 8.1, value: 0 },
    ]);
    expect(menuSources).toHaveLength(2);
    expect(menuSources.every(source => !source.disconnected && source.stopCalls.length === 0)).toBe(true);
    expect(audio.menuMusicStatus).toMatchObject({ mode: 'selection', introScheduled: true, scoreScheduled: true });

    // No menu telemetry normally arrives; even a late update or a mix edit
    // cannot revive the previous race's throttle or rival gains.
    context.currentTime = 30;
    audio.setMix({ engine: 0.8 });
    audio.update(racingTelemetry);
    expect([...vehicleGains, engineBus, canyonReturn].every(node => node.gain.value === 0)).toBe(true);
    audio.transitionMenuMusicToRace();
    expect(vehicleGains.every(node => node.gain.value === 0)).toBe(true);
    audio.update(racingTelemetry);
    expect(vehicleGains.every(node => node.gain.value > 0)).toBe(true);
    expect(context.bufferSources).toHaveLength(sourceCount);
    audio.dispose();
  });

  it('hard-mutes hidden playback without overwriting pause, music or user mix, and discards hidden events', async () => {
    const { audio, context } = await createLoadedAudio();
    audio.transitionMenuMusicToRace();
    context.currentTime = 8;
    audio.update(racingTelemetry);
    audio.trigger({ kind: 'weapon', intensity: 1 });
    const effect = context.bufferSources.at(-1)!;
    expect(audio.playOvertakeCallout()).toBe(true);
    const callout = context.bufferSources.at(-1)!;
    audio.setMix({ master: 0.6, music: 0.3, engine: 0.7 });
    audio.setPaused(true);
    const master = context.gains[0]!;
    const sourceCount = context.bufferSources.length;
    audio.setHidden(true);
    expect(master.gain.events.slice(-2)).toEqual([
      { kind: 'cancel', time: 8 }, { kind: 'set', time: 8, value: 0 },
    ]);
    expect(audio.overtakeCalloutStatus.paused).toBe(true);
    expect([effect, callout].every(source => source.disconnected)).toBe(true);
    audio.setMuted(true);
    audio.setMuted(false);
    audio.setMix({ effects: 0.4 });
    expect(master.gain.value).toBe(0);
    expect(audio.menuMusicStatus.mode).toBe('race');
    audio.setHidden(false);
    expect(master.gain.value).toBeCloseTo(0.72 * 0.6 * 0.08);
    expect(audio.overtakeCalloutStatus.paused).toBe(true);

    // The app can return to its unpaused garage while still backgrounded.
    audio.setHidden(true);
    audio.transitionMenuMusicToSelection();
    audio.setPaused(false);
    audio.trigger({ kind: 'weapon', intensity: 1 });
    expect(audio.playOvertakeCallout()).toBe(false);
    expect(master.gain.value).toBe(0);
    expect(context.bufferSources).toHaveLength(sourceCount);
    expect(audio.recordingStatus.activeEffects).toBe(0);
    audio.setHidden(false);
    expect(master.gain.value).toBeCloseTo(0.72 * 0.6);
    expect(context.gains[1]!.gain.value).toBe(0);
    expect(audio.menuMusicStatus.mode).toBe('selection');
    expect(audio.mixSettings).toEqual({ master: 0.6, music: 0.3, engine: 0.7, effects: 0.4, voice: 1 });
    audio.setMuted(true);
    audio.setHidden(true);
    audio.setHidden(false);
    expect(audio.isMuted).toBe(true);
    expect(master.gain.value).toBe(0);
    audio.dispose();
  });

  it('honors hidden state before graph creation and keeps loading/unlock from unmuting it', async () => {
    const context = new FakeAudioContext();
    context.state = 'suspended';
    const audio = new PodracerAudio({ createContext: () => context as unknown as AudioContext,
      fetchAudio: async () => new ArrayBuffer(16) });
    audio.setHidden(true);
    await audio.startMenuMusic('/audio/podracing-selection-intro.webm');
    await expect(audio.unlock()).resolves.toBe(true);
    expect(context.gains[0]!.gain.value).toBe(0);
    audio.setPaused(false);
    audio.transitionMenuMusicToSelection();
    expect(context.gains[0]!.gain.value).toBe(0);
    expect(audio.menuMusicStatus.scoreScheduled).toBe(true);
    audio.setHidden(false);
    expect(context.gains[0]!.gain.value).toBeCloseTo(0.72);
    audio.dispose();
  });

  it('uses cached recorded EMP playback without oscillators or extra fetch/decode', async () => {
    const { audio, context, fetchCount } = await createLoadedAudio();
    context.currentTime = 7;
    const before = context.bufferSources.length;
    audio.handleEvents([{ type: 'emp-pulse', racerId: 'player' }], { playerId: 'player' });
    const effects = context.bufferSources.slice(before);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.loop).toBe(false);
    expect(effects[0]!.startCalls).toHaveLength(1);
    expect(context.oscillators).toHaveLength(0);
    expect(fetchCount()).toBe(EXPECTED_DECODED_FILES);
    expect(context.decodeCount).toBe(EXPECTED_DECODED_FILES);
    effects[0]!.emitEnded();
    expect(effects[0]!.disconnected).toBe(true);
    expect(audio.recordingStatus.activeEffects).toBe(0);
    audio.dispose();
    expect(context.closeCount).toBe(1);
  });

  it('plays one cached repair cue for core-only cooling and rejects remote/no-op pickups', async () => {
    const { audio, context } = await createLoadedAudio(); context.currentTime = 8;
    const before = context.bufferSources.length;
    audio.handleEvents([
      { type: 'repair-salvage-collected', racerId: 'rival', repaired: .2, cooled: .1, coreCooled: .1 },
      { type: 'repair-salvage-collected', racerId: 'player', repaired: 0, cooled: 0, coreCooled: 0 },
    ], { playerId: 'player' });
    expect(context.bufferSources.length).toBe(before);
    audio.handleEvents([{ type: 'repair-salvage-collected', racerId: 'player', repaired: 0, cooled: 0, coreCooled: .2 }], { playerId: 'player' });
    expect(context.bufferSources.length).toBe(before + 1);
    expect(context.oscillators).toHaveLength(0);
    audio.dispose();
  });

  it('bounds combat voices, rate-limits duplicate contacts and releases everything on dispose', async () => {
    const { audio, context } = await createLoadedAudio(); context.currentTime = 8;
    const before = context.bufferSources.length;
    for (let i = 0; i < 50; i++) audio.trigger({ kind: 'impact', intensity: 1 });
    expect(context.bufferSources.length).toBe(before + 1);
    for (let i = 0; i < 50; i++) {
      context.currentTime += .1;
      audio.trigger({ kind: 'weapon', intensity: .8 });
    }
    expect(audio.recordingStatus.activeEffects).toBe(4);
    const sources = context.bufferSources.slice(before);
    audio.dispose();
    expect(audio.recordingStatus.activeEffects).toBe(0);
    expect(sources.every(source => source.disconnected && source.stopCalls.length > 0)).toBe(true);
    expect(context.bufferSources.filter(source => source.loop).every(source => source.stopCalls.length > 0)).toBe(true);
  });

  it('does not replay paused events and resumes the existing loops without reallocating them', async () => {
    const { audio, context } = await createLoadedAudio(); context.currentTime = 8;
    const before = context.bufferSources.length;
    audio.setPaused(true); audio.trigger({ kind: 'weapon', intensity: 1 });
    expect(context.bufferSources.length).toBe(before);
    audio.setPaused(false); audio.trigger({ kind: 'weapon', intensity: 1 });
    expect(context.bufferSources.length).toBe(before + 1);
    audio.dispose();
  });

  it('uses one stable propulsion bed and only two quiet rivals with conservative playback rates', async () => {
    const { audio, context } = await createLoadedAudio();
    audio.transitionMenuMusicToRace();
    const sources = context.bufferSources.filter(source => source.loop && source.connections[0] instanceof FakeBiquadFilterNode);
    expect(sources).toHaveLength(3);
    const gains = sources.map(source => source.connections[0]!.connections[0] as FakeGainNode);
    context.currentTime = 8;
    audio.update({ ...racingTelemetry, speedMps: 1000, throttle: 100, boost: 100, damage: 0,
      rivals: Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, speedMps: 1000, distanceM: 0, closingSpeedMps: 999, pan: 1 })) });
    expect(gains[0]!.gain.value).toBeGreaterThan(0.3);
    expect(gains.slice(1).every(gain => gain.gain.value <= 0.031)).toBe(true);
    expect(gains.reduce((sum, node) => sum + node.gain.value, 0)).toBeLessThan(0.43);
    expect(sources.every(source => source.playbackRate.value >= 0.94 && source.playbackRate.value <= 1.121)).toBe(true);
    context.currentTime = 9;
    audio.update(racingTelemetry);
    const rate = sources[0]!.playbackRate.value;
    context.currentTime = 10;
    audio.update({ ...racingTelemetry, heat: 1, simulationTime: 812, vehicleId: 'speeder-bike', rivals: [] });
    expect(sources[0]!.playbackRate.value).toBe(rate);
    expect(gains.slice(1).every(node => node.gain.value === 0)).toBe(true);
    expect(context.bufferSources.filter(source => source.loop && source.connections[0] instanceof FakeBiquadFilterNode)).toHaveLength(3);
    audio.dispose();
  });

  it('omits reward bleeps and rate-limits aliased effects as one physical recording', async () => {
    const { audio, context } = await createLoadedAudio();
    context.currentTime = 8;
    const before = context.bufferSources.length;
    for (const kind of ['checkpoint', 'lap', 'finish', 'warning', 'electric', 'takedown', 'recovery', 'redline', 'sand'] as const) {
      audio.trigger({ kind, intensity: 1 });
    }
    expect(context.bufferSources).toHaveLength(before);
    audio.trigger({ kind: 'boost', intensity: 1, pitch: 7 });
    const firstBoost = context.bufferSources.at(-1)!;
    audio.trigger({ kind: 'horn', intensity: 1 });
    expect(context.bufferSources).toHaveLength(before + 1);
    expect(firstBoost.playbackRate.value).toBe(1.05);
    context.currentTime = 10;
    audio.trigger({ kind: 'boost', intensity: 1, pitch: 0.1 });
    expect(firstBoost.disconnected).toBe(true);
    expect(firstBoost.stopCalls.at(-1)).toBe(0);
    expect(context.bufferSources.at(-1)!.playbackRate.value).toBe(0.95);
    expect(audio.recordingStatus.activeEffects).toBe(1);
    audio.dispose();
  });

  it('leaves failed recordings silent, preserves the intro and reports failure without a synth fallback', async () => {
    const context = new FakeAudioContext();
    const audio = new PodracerAudio({ createContext: () => context as unknown as AudioContext,
      fetchAudio: async url => {
        if (url !== '/audio/podracing-selection-intro.webm') throw new Error('offline asset');
        return new ArrayBuffer(16);
      },
    });
    await expect(audio.startMenuMusic('/audio/podracing-selection-intro.webm')).resolves.toBe(true);
    expect(audio.menuMusicStatus.introScheduled).toBe(true);
    expect(audio.menuMusicStatus.scoreScheduled).toBe(false);
    const before = context.bufferSources.length;
    audio.trigger({ kind: 'weapon', intensity: 1 });
    expect(context.bufferSources.length).toBe(before);
    expect(context.oscillators).toHaveLength(0);
    expect(audio.recordingStatus.failed).toContain(RECORDED_MUSIC_URL);
    expect(audio.overtakeCalloutStatus.ready).toBe(true);
    audio.dispose();
  });

  it('resumes from a user gesture while loading and discards late audio after disposal', async () => {
    const context = new FakeAudioContext(); context.state = 'suspended';
    let release!: (bytes: ArrayBuffer) => void;
    const pending = new Promise<ArrayBuffer>(resolve => { release = resolve; });
    const audio = new PodracerAudio({ createContext: () => context as unknown as AudioContext, fetchAudio: () => pending });
    const loading = audio.prewarm();
    await expect(audio.unlock()).resolves.toBe(true);
    expect(context.state).toBe('running');
    audio.dispose(); release(new ArrayBuffer(16)); await loading;
    expect(context.closeCount).toBe(1);
    expect(context.bufferSources).toHaveLength(0);
    expect(audio.recordingStatus.loaded).toBe(0);
  });
});
