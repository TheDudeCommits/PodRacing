import { afterEach, describe, expect, it, vi } from 'vitest';
import { VehicleCardPreviewRenderer } from '../../src/ui/VehicleCardPreview';

const environmentAssets = vi.hoisted(() => ({ acquire: vi.fn() }));
vi.mock('../../src/render/saltDusk/SaltDuskAssets', () => ({ acquireSaltDuskAssets: environmentAssets.acquire }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('interactive preview cache lifecycle', () => {
  it('awaits photographic lighting before capture, then reacquires the cached hero and draws its latest angle', async () => {
    let finishEnvironment!: () => void;
    const environmentReady = new Promise<void>(resolve => { finishEnvironment = resolve; });
    const releaseEnvironment = vi.fn();
    environmentAssets.acquire.mockReturnValue({ ready: environmentReady, release: releaseEnvironment });
    let finishReload!: () => void;
    const reloaded = new Promise<void>(resolve => { finishReload = resolve; });
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('HTMLElement', class {});
    vi.stubGlobal('window', {
      devicePixelRatio: 1,
      requestAnimationFrame: (callback: FrameRequestCallback) => frames.push(callback),
      cancelAnimationFrame: vi.fn(), removeEventListener: vi.fn(),
    });
    const image = { src: '', style: {}, remove: vi.fn() };
    const drawImage = vi.fn();
    const canvas = {
      dataset: {}, style: {}, width: 0, height: 0, hidden: true,
      setAttribute: vi.fn(), getContext: () => ({ clearRect: vi.fn(), drawImage }),
    };
    let canvasAttached = false;
    const host = {
      dataset: { vehicleId: 'podracer', vehiclePreview: 'hero', previewAngle: '0' } as Record<string, string>,
      getBoundingClientRect: () => ({ width: 400, height: 200 }),
      querySelector: (selector: string) => selector.includes('inspection-canvas') ? (canvasAttached ? canvas : null) : image,
      ownerDocument: { createElement: () => canvas },
      append: () => { canvasAttached = true; },
    };
    const root = { querySelectorAll: () => [host], querySelector: () => host };
    const preview = new VehicleCardPreviewRenderer({ root: root as unknown as ParentNode });
    const allocated: any[] = [];
    // Substitute the GPU boundary only; show/hide, cache commit, appearance
    // awaiting, RAF inspection and resource disposal all use production methods.
    const ensure = vi.spyOn(preview as any, 'ensureResources').mockImplementation(() => {
      const existing = (preview as any).resources;
      if (existing) return existing;
      const generation = allocated.length;
      const vehicle = {
        activeAppearanceId: 'procedural', appearanceStatus: 'procedural',
        setAppearance: vi.fn(async (appearance: string) => {
          if (generation > 0) await reloaded;
          vehicle.activeAppearanceId = appearance; vehicle.appearanceStatus = 'ready';
        }),
        removeFromParent: vi.fn(), dispose: vi.fn(),
      };
      const resources = {
        vehicles: new Map([['podracer', vehicle]]), pilots: new Map(), outlines: [],
        outlineMaterial: { dispose: vi.fn() }, scene: { clear: vi.fn() }, stage: { dispose: vi.fn() },
        renderer: { domElement: { width: 400, height: 200 }, renderLists: { dispose: vi.fn() }, dispose: vi.fn(), forceContextLoss: vi.fn() },
      };
      allocated.push(resources); (preview as any).resources = resources; return resources;
    });
    const render = vi.spyOn(preview as any, 'renderVehicle').mockReturnValue('data:image/webp;base64,cached');
    try {
      preview.setAppearance('teemto');
      const firstShow = preview.show();
      await Promise.resolve();
      expect(render).not.toHaveBeenCalled(); // A slow HDR must not become a permanent fallback snapshot.
      expect(host.dataset.previewReady).not.toBe('true');
      finishEnvironment();
      await firstShow;
      expect(render).toHaveBeenCalledOnce();
      preview.hide();
      expect(preview.hasGpuResources).toBe(false);
      expect(allocated[0].renderer.forceContextLoss).toHaveBeenCalledOnce();
      expect(allocated[0].stage.dispose).toHaveBeenCalledOnce();

      const returning = preview.show();
      expect(ensure).toHaveBeenCalledTimes(2);
      expect(allocated[1].vehicles.get('podracer').setAppearance).toHaveBeenCalledWith('teemto');
      preview.setInspectionAngle(15); preview.setInspectionAngle(45);
      frames.shift()!(0);
      expect(render).toHaveBeenCalledOnce(); // A cached image cannot stand in for the pending mesh.
      finishReload(); await returning;
      await Promise.resolve();
      frames.shift()!(16);
      expect(render).toHaveBeenCalledTimes(2); // Cache reused; only the interactive angle is drawn again.
      expect(render).toHaveBeenLastCalledWith(allocated[1], 'podracer', 400, 200, 45, false);
      expect(drawImage).toHaveBeenCalledWith(allocated[1].renderer.domElement, 0, 0);
      expect(host.dataset).toMatchObject({ previewMode: 'interactive', renderedAngle: '45', previewAppearance: 'teemto' });
      preview.hide();
      expect(preview.hasGpuResources).toBe(false);
      expect(allocated[1].renderer.forceContextLoss).toHaveBeenCalledOnce();
      expect(allocated[1].stage.dispose).toHaveBeenCalledOnce();
      expect(releaseEnvironment).not.toHaveBeenCalled(); // The backend still owns its borrowed bindings while hidden.
    } finally { finishEnvironment(); finishReload(); preview.dispose(); }
    expect(releaseEnvironment).toHaveBeenCalledOnce();
    preview.dispose();
    expect(releaseEnvironment).toHaveBeenCalledOnce();
  });
});
