import { afterEach, describe, expect, it, vi } from 'vitest';
import { RaceHud } from '../../src/ui/RaceHud';
import { VehicleCardPreviewRenderer } from '../../src/ui/VehicleCardPreview';
import { createVehicleSelectionViewModel } from '../../src/ui/model';
import { ART_APPEARANCES, type VehicleAppearanceId } from '../../src/game/vehicleAppearance';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function pausedGarage(previewFailure = false, appearance: VehicleAppearanceId = 'sebulba') {
  let finishDecode!: () => void;
  const decoded = new Promise<void>(resolve => { finishDecode = resolve; });
  const decode = vi.fn(() => decoded);
  vi.stubGlobal('Image', class { decode = decode; });
  vi.stubGlobal('HTMLElement', class {});
  const image = { src: '', alt: '', style: { opacity: '0' }, remove: vi.fn() };
  const host = {
    dataset: { vehicleId: 'podracer' } as Record<string, string>,
    getBoundingClientRect: () => ({ width: 400, height: 200 }),
    querySelector: () => image,
  };
  const status = { textContent: '' }, retry = { hidden: true };
  const root = {
    querySelectorAll: () => [host],
    querySelector: (selector: string) => selector.includes('appearance-status') ? status : retry,
  };
  // Exercise the real status writer and asynchronous preview commit. Only the
  // GPU renderer and the surrounding DOM are substituted; there is no game
  // loop or second HUD-model update to conceal a missed completion callback.
  const hud = Object.create(RaceHud.prototype) as any;
  hud.root = root;
  hud.vehicleSelectionModel = createVehicleSelectionViewModel('podracer', true, {
    appearance: { selected: appearance, active: appearance, status: 'ready', error: null },
  });
  const notifications: string[] = [];
  const previews = new VehicleCardPreviewRenderer({
    root: root as unknown as ParentNode,
    releaseOnHide: false,
    onAppearanceStatusChange: () => {
      notifications.push(previews.appearanceStatus);
      hud.updateAppearanceStatus();
    },
  });
  hud.vehiclePreviews = previews;
  const vehicle = {
    activeAppearanceId: previewFailure ? 'procedural' : appearance,
    appearanceStatus: previewFailure ? 'error' : 'ready',
    setAppearance: vi.fn(async () => undefined),
  };
  (previews as any).resources = { vehicles: new Map([['podracer', vehicle]]) };
  const render = vi.spyOn(previews as any, 'renderVehicle').mockReturnValue('data:image/webp;base64,preview');
  const dispose = () => { (previews as any).resources = null; previews.dispose(); };
  return { hud, previews, host, image, status, retry, notifications, decode, finishDecode, render, dispose };
}

describe('paused garage preview readiness', () => {
  it.each(['sebulba', 'polwo'] as const)('settles %s only after image decode, without another simulation/HUD tick', async appearance => {
    const f = pausedGarage(false, appearance), label = ART_APPEARANCES[appearance].label;
    try {
      f.previews.setAppearance(appearance);
      const pending = f.previews.show();
      await vi.waitFor(() => expect(f.decode).toHaveBeenCalledOnce());
      expect(f.status.textContent).toBe(`Preparing ${label} preview… Your race craft is ready.`);
      expect(f.previews.appearanceStatus).toBe('loading');
      expect(f.host.dataset.previewReady).toBeUndefined();
      f.finishDecode(); await pending;
      expect(f.host.dataset).toMatchObject({ previewReady: 'true', previewAppearance: appearance, previewState: 'ready' });
      expect(f.image.src).toBe('data:image/webp;base64,preview');
      expect(f.status.textContent).toBe(`${label} · seated pilot · twin engines`);
      expect(f.retry.hidden).toBe(true);
      expect(f.notifications).toEqual(['loading', 'ready']);
      await f.previews.refresh();
      expect(f.render).toHaveBeenCalledOnce();
      expect(f.notifications).toEqual(['loading', 'ready']);
    } finally { f.dispose(); }
  });

  it.each(['sebulba', 'polwo'] as const)('reveals retry when the %s preview fails while its race craft is ready', async appearance => {
    const f = pausedGarage(true, appearance);
    try {
      f.previews.setAppearance(appearance);
      const pending = f.previews.show();
      await vi.waitFor(() => expect(f.decode).toHaveBeenCalledOnce());
      f.finishDecode(); await pending;
      expect(f.host.dataset).toMatchObject({ previewAppearance: 'procedural', previewState: 'fallback' });
      expect(f.status.textContent).toBe(`Preview unavailable. ${ART_APPEARANCES[appearance].label} remains ready to race.`);
      expect(f.retry.hidden).toBe(false);
      expect(f.notifications).toEqual(['loading', 'error']);
    } finally { f.dispose(); }
  });

  it('does not publish a late decoded preview after leaving the garage', async () => {
    const f = pausedGarage();
    try {
      f.previews.setAppearance('sebulba');
      const pending = f.previews.show();
      await vi.waitFor(() => expect(f.decode).toHaveBeenCalledOnce());
      f.hud.vehicleSelectionModel.active = false;
      f.previews.hide();
      f.finishDecode(); await pending;
      expect(f.host.dataset.previewReady).toBeUndefined();
      expect(f.notifications).toEqual(['loading']);
    } finally { f.dispose(); }
  });
});
