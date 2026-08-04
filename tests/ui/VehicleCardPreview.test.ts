import { describe, expect, it } from 'vitest';

import {
  calculateVehiclePreviewRenderSize,
  DEFAULT_VEHICLE_PREVIEW_LIMITS,
  resolveVehiclePreviewClass,
  VehicleCardPreviewRenderer,
} from '../../src/ui/VehicleCardPreview';

describe('vehicle card preview renderer', () => {
  it('accepts only the four canonical procedural vehicle classes', () => {
    expect([
      'podracer',
      'landspeeder',
      'speeder-bike',
      'skim-speeder',
    ].map(resolveVehiclePreviewClass)).toEqual([
      'podracer',
      'landspeeder',
      'speeder-bike',
      'skim-speeder',
    ]);
    expect(resolveVehiclePreviewClass('x-wing')).toBeNull();
    expect(resolveVehiclePreviewClass('')).toBeNull();
    expect(resolveVehiclePreviewClass(null)).toBeNull();
  });

  it('uses one uniform target scale while respecting DPR and texture caps', () => {
    expect(calculateVehiclePreviewRenderSize(360, 180, 2)).toEqual({
      cssWidth: 360,
      cssHeight: 180,
      pixelWidth: 540,
      pixelHeight: 270,
      pixelRatio: 1.5,
    });

    const capped = calculateVehiclePreviewRenderSize(1_440, 360, 2);
    expect(capped.pixelWidth).toBe(720);
    expect(capped.pixelHeight).toBe(180);
    expect(capped.pixelRatio).toBe(0.5);
    expect(capped.pixelWidth / capped.pixelHeight).toBe(
      capped.cssWidth / capped.cssHeight,
    );
  });

  it('falls back deterministically before selector layout has dimensions', () => {
    expect(calculateVehiclePreviewRenderSize(0, Number.NaN, 0)).toEqual({
      cssWidth: DEFAULT_VEHICLE_PREVIEW_LIMITS.fallbackWidth,
      cssHeight: DEFAULT_VEHICLE_PREVIEW_LIMITS.fallbackHeight,
      pixelWidth: 360,
      pixelHeight: 180,
      pixelRatio: 1,
    });
  });

  it('is lazy and can dispose without creating a WebGL context', () => {
    const previews = new VehicleCardPreviewRenderer();
    expect(previews.visible).toBe(false);
    expect(previews.hasGpuResources).toBe(false);
    previews.dispose();
    expect(previews.hasGpuResources).toBe(false);
  });
});
