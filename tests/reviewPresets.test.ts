import { describe, expect, it } from 'vitest';
import {
  CAPTURE_CAMERAS,
  CAPTURE_PRESETS,
  EXPANSION_CAPTURE_CAMERAS,
  EXPANSION_CAPTURE_PRESETS,
  isCaptureCamera,
  isCapturePreset,
  isReviewCaptureCamera,
  isReviewCapturePreset,
} from '../src/diagnostics/reviewPresets';

describe('deterministic review contract', () => {
  it('keeps every named milestone moment addressable', () => {
    expect(CAPTURE_PRESETS).toEqual([
      'desert',
      'countdown',
      'race',
      'airtime',
      'drift',
      'finish',
    ]);
    expect(isCapturePreset('drift')).toBe(true);
    expect(isCapturePreset('random')).toBe(false);
  });

  it('keeps every critic camera addressable', () => {
    expect(CAPTURE_CAMERAS).toHaveLength(5);
    expect(isCaptureCamera('hero')).toBe(true);
    expect(isCaptureCamera('overhead')).toBe(false);
  });

  it('adds v2 expansion scenarios without changing the legacy GameApp contract', () => {
    expect(EXPANSION_CAPTURE_PRESETS).toEqual([
      'vehicle-showcase',
      'weapon-fired',
      'shield-active',
      'mine-trigger',
      'hazard',
      'redline',
      'wreck',
      'recovery',
      'upgrade',
      'combat-stress',
    ]);
    expect(EXPANSION_CAPTURE_CAMERAS).toEqual(['overhead', 'impact']);
    expect(isReviewCapturePreset('combat-stress')).toBe(true);
    expect(isReviewCapturePreset('race')).toBe(true);
    expect(isReviewCapturePreset('random')).toBe(false);
    expect(isReviewCaptureCamera('impact')).toBe(true);
    expect(isCaptureCamera('impact')).toBe(false);
  });
});
