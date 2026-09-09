import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextSetupPod, SETUP_PODS } from '../../src/ui/RaceHud';
import { VehicleCardPreviewRenderer } from '../../src/ui/VehicleCardPreview';

afterEach(() => vi.unstubAllGlobals());

describe('simple race setup controls', () => {
  it('cycles the actual four authored pods in both directions without exposing a legacy class', () => {
    expect(SETUP_PODS.map(pod => nextSetupPod(pod, 1))).toEqual(['sebulba', 'polwo', 'blockrunner', 'teemto']);
    expect(SETUP_PODS.map(pod => nextSetupPod(pod, -1))).toEqual(['blockrunner', 'teemto', 'sebulba', 'polwo']);
  });

  it('coalesces pointer inspection and cancels pending GPU work when the setup closes', () => {
    const host = { dataset: {} as Record<string, string> };
    const requestAnimationFrame = vi.fn(() => 41), cancelAnimationFrame = vi.fn();
    vi.stubGlobal('window', { requestAnimationFrame, cancelAnimationFrame, removeEventListener: vi.fn() });
    const preview = new VehicleCardPreviewRenderer({ root: { querySelector: () => host } as unknown as ParentNode });
    Object.assign(preview, { visibleValue: true });
    preview.setInspectionAngle(15); preview.setInspectionAngle(48); preview.setInspectionAngle(Number.NaN);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(host.dataset.previewAngle).toBe('48');
    expect(preview.hasGpuResources).toBe(false); // Queuing controls alone does not create a second renderer.
    preview.hide();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(41);
    preview.setInspectionAngle(90);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    preview.dispose();
  });
});
