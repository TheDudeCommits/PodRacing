import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { sampleTeemtoStrikeMotion, teemtoStrikeTime, TEEMTO_REAR_SLIDE_TIME } from '/Users/amir/Projects/PodRacing/src/render/combat/TeemtoStrikeMotion';

describe('principal strike motion', () => {
  it.each([0, 1, 2])('mass %i has exact birth, one-way travel, an impact speed loss and a terminal rest', index => {
    const p = new Vector3(), v = new Vector3(), previous = new Vector3(), direction = new Vector3();
    sampleTeemtoStrikeMotion(index, 0, p, v); expect(p.length()).toBe(0); direction.copy(v).normalize();
    const contact = teemtoStrikeTime(index), end = contact + TEEMTO_REAR_SLIDE_TIME;
    for (let age = 0; age <= 1.7; age += .002) {
      sampleTeemtoStrikeMotion(index, age, p, v);
      expect(p.clone().sub(previous).dot(direction)).toBeGreaterThanOrEqual(-1e-8);
      expect(v.dot(direction)).toBeGreaterThanOrEqual(-1e-8);
      previous.copy(p);
    }
    sampleTeemtoStrikeMotion(index, contact - 1e-7, p, v); const before = p.clone(), incoming = v.length();
    sampleTeemtoStrikeMotion(index, contact + 1e-7, p, v);
    expect(p.distanceTo(before)).toBeLessThan(1e-5); expect(v.length()).toBeLessThan(incoming);
    sampleTeemtoStrikeMotion(index, end, p, v); const stopped = p.clone(); expect(v.length()).toBe(0);
    sampleTeemtoStrikeMotion(index, 1.7, p, v); expect(p.toArray()).toEqual(stopped.toArray()); expect(v.length()).toBe(0);
    sampleTeemtoStrikeMotion(index, .05, p, v); const direct = p.clone();
    sampleTeemtoStrikeMotion(index, 1, p, v); sampleTeemtoStrikeMotion(index, .05, p, v);
    expect(p.toArray()).toEqual(direct.toArray());
  });
});
