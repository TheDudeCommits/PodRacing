import { describe, expect, it } from 'vitest';
import { PodracerAudio } from '../../src/audio';

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
    return new FakeOscillatorNode() as unknown as OscillatorNode;
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
  const score = context.createBuffer(2, 2_000, context.sampleRate);
  const audio = new PodracerAudio({
    initiallyMuted,
    createContext: () => context as unknown as AudioContext,
    fetchAudio: async () => {
      fetches += 1;
      return new ArrayBuffer(16);
    },
    renderMenuScore: async () => score,
    overtakeCalloutCooldownSeconds: 4.2,
  });
  await expect(audio.startMenuMusic('/audio/podracing-selection-intro.webm')).resolves.toBe(true);
  return { audio, context, fetchCount: () => fetches };
}

describe('PodracerAudio overtake callout', () => {
  it('reuses the decoded menu buffer and never refetches it for overtakes', async () => {
    const { audio, context, fetchCount } = await createLoadedAudio();
    expect(fetchCount()).toBe(1);
    expect(context.decodeCount).toBe(1);

    context.currentTime = 7;
    expect(audio.playOvertakeCallout()).toBe(true);
    const firstCallout = context.bufferSources.at(-1)!;
    expect(firstCallout.buffer).toBe(context.decodedIntro);

    context.currentTime = 14;
    expect(audio.playOvertakeCallout()).toBe(true);
    const secondCallout = context.bufferSources.at(-1)!;
    expect(secondCallout).not.toBe(firstCallout);
    expect(secondCallout.buffer).toBe(context.decodedIntro);
    expect(fetchCount()).toBe(1);
    expect(context.decodeCount).toBe(1);
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
