import { describe, expect, it } from 'vitest';
import {
  PHOTO_FINISH_TIME_SCALE,
  PhotoFinishPresentation,
  photoFinishGap,
  type PhotoFinishRacer,
} from '../../src/render/combat/PhotoFinishPresentation';

const racer = (id: string, distanceToLine: number, speed: number, extra: Partial<PhotoFinishRacer> = {}): PhotoFinishRacer => ({
  id, finished: false, onFinalLap: true, distanceToLine, speed, ...extra,
});

describe('photo finish', () => {
  it('predicts the gap at the line from distance and speed, ignoring racers not on their final lap', () => {
    const local = racer('player', 60, 100);
    expect(photoFinishGap(local, [local, racer('a', 70, 100)])).toBeCloseTo(0.1, 6);
    expect(photoFinishGap(local, [local, racer('a', 70, 100, { onFinalLap: false })])).toBeNull();
    expect(photoFinishGap(local, [local, racer('a', 70, 100, { finished: true })])).toBeNull();
    expect(photoFinishGap(racer('player', 200, 100), [racer('a', 205, 100)])).toBeNull();
  });

  it('slows wall time when a rival is within half a second, holds through the line, then releases', () => {
    const presentation = new PhotoFinishPresentation();
    const rival = racer('a', 62, 100);
    // Far apart: nothing happens.
    expect(presentation.update(1 / 60, racer('player', 60, 100), [racer('a', 140, 100)], true)).toBe(false);
    expect(presentation.timeScale).toBe(1);
    expect(presentation.update(1 / 60, racer('player', 60, 100), [rival], true)).toBe(true);
    expect(presentation.active).toBe(true);
    for (let frame = 0; frame < 60; frame += 1) presentation.update(1 / 60, racer('player', 40, 100), [rival], true);
    expect(presentation.timeScale).toBeCloseTo(PHOTO_FINISH_TIME_SCALE, 2);
    // Crossing the line keeps the slow motion for a short hold, then eases back to real time.
    for (let frame = 0; frame < 30; frame += 1) presentation.update(1 / 60, racer('player', 0, 100, { finished: true }), [rival], true);
    expect(presentation.active).toBe(true);
    for (let frame = 0; frame < 120; frame += 1) presentation.update(1 / 60, racer('player', 0, 100, { finished: true }), [rival], true);
    expect(presentation.active).toBe(false);
    expect(presentation.timeScale).toBe(1);
  });

  it('never arms when disabled, on a guest, or in capture', () => {
    const presentation = new PhotoFinishPresentation();
    expect(presentation.update(1 / 60, racer('player', 60, 100), [racer('a', 62, 100)], false)).toBe(false);
    expect(presentation.timeScale).toBe(1);
  });
});
