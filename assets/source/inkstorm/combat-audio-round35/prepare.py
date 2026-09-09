from pathlib import Path
import difflib,hashlib,json
R=Path('/Users/amir/Projects/PodRacing');P=Path(__file__).resolve().parent
files=['src/audio/PodracerAudio.ts','src/audio/model.ts','src/audio/types.ts','tests/audio/PodracerAudioCallout.test.ts']
before={};after={}
for n in files:
 p=P/'baseline'/n;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():p.write_bytes((R/n).read_bytes())
 assert p.read_bytes()==(R/n).read_bytes(),'Baseline changed: '+n
 before[n]=p.read_text();after[n]=before[n]
def replace(n,a,b):
 assert after[n].count(a)==1,(n,a[:50]);after[n]=after[n].replace(a,b)
replace(files[2],"  | 'electric'\n", "  | 'electric'\n  | 'emp-pulse'\n  | 'repair'\n")
replace(files[1],"  ui: { attack:", "  'emp-pulse': { attack: 0.003, decay: 0.052, sustain: 0.22, release: 0.16, peak: 0.23 },\n  repair: { attack: 0.006, decay: 0.055, sustain: 0.24, release: 0.13, peak: 0.18 },\n  ui: { attack:")
replace(files[1],"    case 'shield-active':", """    case 'emp-pulse':
      // Match existing local-emitter fire cues; these events carry no position.
      return ownRacer ? [cue('emp-pulse', 0.68)] : [];
    case 'emp-hit':
      // The emitter receives its pulse once, not one extra sound per victim.
      if (options.playerId && eventString(event, 'targetId') !== options.playerId) return [];
      return eventBoolean(event, 'blocked')
        ? [cue('shield', 0.44, 0.92)]
        : [cue('electric', 0.42, 0.78)];
    case 'repair-salvage-collected': {
      if (!ownRacer) return [];
      const restored = Math.max(0, eventNumber(event, 'repaired'))
        + Math.max(0, eventNumber(event, 'cooled')) + Math.max(0, eventNumber(event, 'coreCooled'));
      return restored > 0 ? [cue('repair', 0.48 + Math.min(1, restored) * 0.14)] : [];
    }
    case 'shield-active':""")
replace(files[0],"      case 'ui':", """      case 'emp-pulse':
        this.playTone(normalizedCue, 'triangle', 1_360, 82);
        this.playNoise({ ...normalizedCue, intensity: normalizedCue.intensity * 0.28 }, 'bandpass', 1_900);
        break;
      case 'repair':
        this.playArpeggio(normalizedCue, [440, 554, 660], 0.065);
        break;
      case 'ui':""")
replace(files[3],"  readonly filters: FakeBiquadFilterNode[] = [];", "  readonly filters: FakeBiquadFilterNode[] = [];\n  readonly oscillators: FakeOscillatorNode[] = [];")
replace(files[3],"    return new FakeOscillatorNode() as unknown as OscillatorNode;", "    const node = new FakeOscillatorNode();\n    this.oscillators.push(node);\n    return node as unknown as OscillatorNode;")
after[files[3]]+='''

describe('new combat cues within the existing audio owner', () => {
  it('schedules a short descending EMP and cached noise without decoding or creating another context', async () => {
    const { audio, context, fetchCount } = await createLoadedAudio();
    context.currentTime = 7;
    const previousOscillators = context.oscillators.length, previousBuffers = context.bufferSources.length;
    audio.handleEvents([{ type: 'emp-pulse', racerId: 'player' }], { playerId: 'player' });
    const tones = context.oscillators.slice(previousOscillators), noise = context.bufferSources.slice(previousBuffers);
    expect(tones).toHaveLength(1); expect(noise).toHaveLength(1);
    const frequency = tones[0]!.frequency.events.filter(event => event.value !== undefined);
    expect(frequency[0]!.value).toBeGreaterThan(frequency.at(-1)!.value!);
    expect(noise[0]!.buffer).toBe(context.bufferSources.find(source => source.loop && source !== noise[0])!.buffer);
    for (const source of [...tones, ...noise]) {
      expect(source.startCalls).toHaveLength(1); expect(source.stopCalls).toHaveLength(1);
      expect(source.stopCalls[0]! - source.startCalls[0]!.time).toBeGreaterThan(0);
      expect(source.stopCalls[0]! - source.startCalls[0]!.time).toBeLessThan(.3);
    }
    const gain = tones[0]!.connections[0] as FakeGainNode;
    expect(Math.max(...gain.gain.events.map(event => event.value ?? 0))).toBeLessThan(.17);
    expect(fetchCount()).toBe(1); expect(context.decodeCount).toBe(1);
    audio.dispose(); expect(context.closeCount).toBe(1);
    audio.handleEvents([{ type: 'emp-pulse', racerId: 'player' }], { playerId: 'player' });
    expect(context.oscillators.length).toBe(previousOscillators + 1);
  });

  it('schedules an ascending repair chime for core-only cooling and rejects remote/no-op pickups', async () => {
    const { audio, context } = await createLoadedAudio(); context.currentTime = 8;
    const before = context.oscillators.length;
    audio.handleEvents([
      { type: 'repair-salvage-collected', racerId: 'rival', repaired: .2, cooled: .1, coreCooled: .1 },
      { type: 'repair-salvage-collected', racerId: 'player', repaired: 0, cooled: 0, coreCooled: 0 },
    ], { playerId: 'player' });
    expect(context.oscillators.length).toBe(before);
    audio.handleEvents([{ type: 'repair-salvage-collected', racerId: 'player', repaired: 0, cooled: 0, coreCooled: .2 }], { playerId: 'player' });
    const notes = context.oscillators.slice(before); expect(notes).toHaveLength(3);
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]!;
      expect(note.stopCalls[0]).toBeLessThan(8.4);
      if (i) {
        expect(note.startCalls[0]!.time).toBeGreaterThan(notes[i - 1]!.startCalls[0]!.time);
        expect(note.frequency.events[0]!.value).toBeGreaterThan(notes[i - 1]!.frequency.events[0]!.value!);
      }
    }
    audio.dispose();
  });
});
'''
for n,s in after.items():
 p=P/'candidate'/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
new='tests/audio/combatPickupAudio.test.ts';after[new]=(P/'candidate'/new).read_text()
patch=''.join(''.join(difflib.unified_diff(before.get(n,'').splitlines(True),s.splitlines(True),fromfile='a/'+n if n in before else '/dev/null',tofile='b/'+n)) for n,s in after.items())
(P/'combat-audio-v1.patch').write_text(patch)
def record(n,s):return {'path':n,'bytes':len(s.encode()),'sha256':hashlib.sha256(s.encode()).hexdigest()}
(P/'inputs-v1.json').write_text(json.dumps({'status':'PREPARED ONLY','baseline':[record(n,s) for n,s in before.items()],'candidate':[record(n,s) for n,s in after.items()],'patch':record('combat-audio-v1.patch',patch)},indent=2)+'\n')
print(len(patch.encode()),hashlib.sha256(patch.encode()).hexdigest())
