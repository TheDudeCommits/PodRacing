import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { WreckGroundContactGate } from '../../src/render/combat/WreckGroundContact';

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
