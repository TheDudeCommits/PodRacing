import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { WreckGroundContactGate, type WreckPresentationSupport } from '../../src/render/combat/WreckGroundContact';

describe('rendered engine contact identity gate', () => {
  const contact = { position: new Vector3(1, 2, 3), direction: new Vector3(0, 0, 1) };

  it('waits for measured contact after the authoritative birth and emits once despite repeat renders/packets', () => {
    const gate = new WreckGroundContactGate();
    expect(gate.take('player', 923, 1, contact)).toBe(false);
    gate.begin('player', 912, 1);
    expect(gate.take('player', 912, 1, contact)).toBe(false);
    expect(gate.take('player', 913, 1, undefined)).toBe(false);
    expect(gate.take('player', 933, 2, contact)).toBe(false);
    expect(gate.take('player', 933, 1, contact)).toBe(true);
    for (const frame of [933, 934, 970, 1000]) expect(gate.take('player', frame, 1, contact)).toBe(false);
    gate.begin('player', 912, 1);
    gate.begin('player', 990, 1); // delayed duplicate uses a later receiving snapshot
    expect(gate.take('player', 1000, 1, contact)).toBe(false);
    gate.begin('player', 1200, 2);
    expect(gate.take('player', 1220, 2, contact)).toBe(true);
  });

  it('keeps racers independent, clears rematches, and rejects malformed input without consuming a valid cue', () => {
    const gate = new WreckGroundContactGate();
    for (const id of ['player', 'ai']) gate.begin(id, 912, 1);
    const bad = { position: new Vector3(NaN, 0, 0), direction: new Vector3(0, 0, 1) };
    expect(gate.take('player', 940, 1, bad)).toBe(false);
    expect(gate.take('player', Infinity, 1, contact)).toBe(false);
    expect(gate.take('player', 940, 1, contact)).toBe(true);
    expect(gate.take('ai', 940, 1, contact)).toBe(true);
    gate.clear();
    expect(gate.take('player', 940, 1, contact)).toBe(false);
    for (const frame of [-1, .5, Infinity, NaN]) gate.begin('player', frame, 1);
    expect(gate.take('player', 940, 1, contact)).toBe(false);
    gate.begin('player', 40, 1);
    expect(gate.take('player', 60, 1, contact)).toBe(true);
  });

  it('retains only the bounded eight racer identities', () => {
    const gate = new WreckGroundContactGate();
    for (let i = 0; i < 20; i++) gate.begin(`racer${i}`, 912, 1);
    for (let i = 0; i < 12; i++) expect(gate.take(`racer${i}`, 940, 1, contact)).toBe(false);
    for (let i = 12; i < 20; i++) expect(gate.take(`racer${i}`, 940, 1, contact)).toBe(true);
  });

  it('does not consume the contact when the dust emitter cannot resolve a horizontal direction', () => {
    const gate = new WreckGroundContactGate();
    gate.begin('player', 912, 1);
    for (const direction of [
      new Vector3(), new Vector3(0, 1, 0), new Vector3(0, -1, 0),
      new Vector3(.0006, 0, .0006), new Vector3(Infinity, 0, 1), new Vector3(0, NaN, 1),
    ]) {
      expect(gate.take('player', 940, 1, { position: contact.position, direction })).toBe(false);
    }
    // The emitter accepts exactly .001m horizontal length; the gate must use
    // the same boundary and preserve this first usable cue after bad samples.
    const boundary = { position: contact.position, direction: new Vector3(.001, 1, 0) };
    expect(gate.take('player', 940, 1, boundary)).toBe(true);
    expect(gate.take('player', 941, 1, contact)).toBe(false);
    gate.begin('player', 1200, 2);
    expect(gate.take('player', 1220, 2, contact)).toBe(true);
  });
});


describe('per-piece presentation-support identity mask', () => {
  const support = (partId: 0 | 1 | 2): WreckPresentationSupport => ({
    partId, kind: 'presentation-support', clearance: partId === 2 ? .1 : .18,
    position: new Vector3(0, 2, 0), witness: new Vector3(0, 2 + (partId === 2 ? .1 : .18), 0), direction: new Vector3(1, 0, 0),
    footprint: { center: new Vector3(0, 2, 0), axis: new Vector3(0, 0, 1), halfLength: .12, halfWidth: .5,
      edges: [new Vector3(-2, 2, 5.6), new Vector3(2, 2, 0)] },
  });
  it('allows three staggered parts, shares the rear legacy bit, and rejects stale/out-of-order crashes', () => {
    const gate = new WreckGroundContactGate(); gate.begin('r', 100, 1);
    const rear = support(2), legacy = { position: rear.position, direction: rear.direction };
    expect(gate.take('r', 100, 1, rear)).toBe(false);
    expect(gate.take('r', 101, 1, rear)).toBe(true); expect(gate.take('r', 102, 1, legacy)).toBe(false);
    gate.begin('r', 200, 1); gate.begin('r', 80, 0);
    for (const id of [1, 0] as const) { expect(gate.take('r', 103, 1, support(id))).toBe(true); expect(gate.take('r', 104, 1, support(id))).toBe(false); }
    gate.begin('r', 300, 2); expect(gate.take('r', 400, 1, support(0))).toBe(false);
    expect(gate.take('r', 301, 2, legacy)).toBe(true); expect(gate.take('r', 301, 2, rear)).toBe(false);
    expect(gate.take('r', 301, 2, support(0))).toBe(true); expect(gate.take('r', 301, 2, support(1))).toBe(true);
    gate.clear(); expect(gate.take('r', 302, 2, support(0))).toBe(false);
  });
  it('rejects malformed witness/part/band/edge data without consuming any valid bit', () => {
    const gate = new WreckGroundContactGate(); gate.begin('r', 100, 1);
    const c = support(1);
    const malformed = [ { ...c, partId: 3 }, { ...c, partId: NaN }, { ...c, partId: undefined }, { ...c, kind: 'collision' },
      { ...c, clearance: -.1 }, { ...c, clearance: .181 }, { ...c, clearance: NaN },
      { ...c, witness: new Vector3(1, 2.18, 0) }, { ...c, witness: new Vector3(0, 2.19, 0) },
      { ...c, footprint: undefined }, { ...c, footprint: { ...c.footprint!, halfLength: 0 } },
      { ...c, footprint: { ...c.footprint!, halfWidth: Infinity } },
      { ...c, footprint: { ...c.footprint!, edges: [new Vector3(-2, 2, 12.001), new Vector3(2, 2, 0)] } },
    ];
    for (const bad of malformed) expect(gate.take('r', 110, 1, bad as WreckPresentationSupport)).toBe(false);
    expect(gate.take('r', 110, 1, c)).toBe(true);
    expect(gate.take('r', 110, 1, support(0))).toBe(true); expect(gate.take('r', 110, 1, support(2))).toBe(true);
  });
});
