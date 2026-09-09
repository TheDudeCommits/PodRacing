import { Group, Mesh, SkinnedMesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { VehicleArtLibrary } from '../../src/render/vehicles';
import { artFixture, deferred, source } from './vehicleArtFixtures';

describe('vehicle art lease ownership', () => {
  it('loads only on demand, deduplicates concurrency and isolates transforms while sharing immutable resources', async () => {
    const f = artFixture(), pending = deferred<Group>();
    const load = vi.fn(() => pending.promise);
    const library = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
    expect(load).not.toHaveBeenCalled();
    const first = library.acquire(source('a'));
    const second = library.acquire(source('a'));
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    pending.resolve(f.root);
    const [a, b] = await Promise.all([first, second]);
    const aEngine = a.root.getObjectByName('engine-left')!;
    const bEngine = b.root.getObjectByName('engine-left')!;
    const aMesh = a.root.getObjectByName('body-0') as Mesh;
    const bMesh = b.root.getObjectByName('body-0') as Mesh;
    expect(aEngine).not.toBe(bEngine);
    aEngine.position.x = 99;
    aMesh.userData.test = true;
    expect(bEngine.position.x).toBe(-3);
    expect(f.engine.position.x).toBe(-3);
    expect(bMesh.userData.test).toBeUndefined();
    expect(aMesh.geometry).toBe(f.geometry);
    expect(bMesh.geometry).toBe(f.geometry);
    expect(aMesh.material).toBe(f.material);
    a.release(); a.release();
    expect(a.released).toBe(true);
    expect(library.diagnostics.leases).toBe(1);
    expect(f.disposed.geometry).not.toHaveBeenCalled();
    b.release();
    for (const spy of Object.values(f.disposed)) expect(spy).toHaveBeenCalledTimes(1);
    expect(library.diagnostics.entries).toBe(0);
    library.dispose();
  });

  it('cancels one waiter immediately without cancelling the shared load or another lease', async () => {
    const f = artFixture(), pending = deferred<Group>(), abort = new AbortController();
    const load = vi.fn(() => pending.promise);
    const library = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
    const cancelled = library.acquire(source('a'), { signal: abort.signal });
    const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    const kept = library.acquire(source('a'));
    abort.abort();
    await rejected;
    expect(library.diagnostics.pending).toBe(1);
    pending.resolve(f.root);
    const lease = await kept;
    expect(load).toHaveBeenCalledTimes(1);
    expect(f.disposed.geometry).not.toHaveBeenCalled();
    lease.release(); library.dispose();
    expect(f.disposed.geometry).toHaveBeenCalledTimes(1);
  });

  it('does not fetch for an already aborted consumer and cleans a sole cancelled late success', async () => {
    const f = artFixture(), pending = deferred<Group>(), abort = new AbortController();
    const load = vi.fn(() => pending.promise);
    const library = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
    abort.abort();
    await expect(library.acquire(source('a'), { signal: abort.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(load).not.toHaveBeenCalled();
    const other = new AbortController();
    const request = library.acquire(source('a'), { signal: other.signal });
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    other.abort();
    await rejected;
    pending.resolve(f.root);
    await vi.waitFor(() => expect(f.disposed.geometry).toHaveBeenCalledTimes(1));
    expect(library.diagnostics.entries).toBe(0);
    library.dispose();
  });

  it('disposes late callbacks after shutdown and retains active leased resources until release', async () => {
    const a = artFixture(), b = artFixture(), pending = deferred<Group>();
    const library = new VehicleArtLibrary({ load: (url) => url.includes('/a.') ? Promise.resolve(a.root) : pending.promise });
    const active = await library.acquire(source('a'));
    const waiting = library.acquire(source('b'));
    const rejected = expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
    library.dispose(); library.dispose();
    await rejected;
    expect(library.diagnostics.leases).toBe(1);
    expect(a.disposed.geometry).not.toHaveBeenCalled();
    await expect(library.acquire(source('c'))).rejects.toMatchObject({ name: 'AbortError' });
    pending.resolve(b.root);
    await vi.waitFor(() => expect(b.disposed.geometry).toHaveBeenCalledTimes(1));
    active.release(); active.release();
    for (const spy of Object.values(a.disposed)) expect(spy).toHaveBeenCalledTimes(1);
    expect(library.diagnostics.entries).toBe(0);
  });

  it('removes failed loads so only an explicit later request retries', async () => {
    const f = artFixture();
    const load = vi.fn().mockRejectedValueOnce(new Error('404 missing asset')).mockResolvedValueOnce(f.root);
    const library = new VehicleArtLibrary({ load });
    const first = library.acquire(source('a')), second = library.acquire(source('a'));
    await expect(first).rejects.toThrow('404 missing asset');
    await expect(second).rejects.toThrow('404 missing asset');
    expect(load).toHaveBeenCalledTimes(1);
    expect(library.diagnostics.entries).toBe(0);
    const lease = await library.acquire(source('a'));
    expect(load).toHaveBeenCalledTimes(2);
    lease.release(); library.dispose();
  });

  it('bounds idle templates with LRU eviction while pinning all active leases and separating revisions', async () => {
    const a = artFixture(), b = artFixture(), revised = artFixture();
    const load = vi.fn().mockResolvedValueOnce(a.root).mockResolvedValueOnce(b.root).mockResolvedValueOnce(revised.root);
    const library = new VehicleArtLibrary({ load, maxIdleEntries: 1 });
    const first = await library.acquire(source('a'));
    const second = await library.acquire(source('b'));
    first.release();
    expect(a.disposed.geometry).not.toHaveBeenCalled();
    second.release();
    expect(a.disposed.geometry).toHaveBeenCalledTimes(1);
    const cached = await library.acquire(source('b'));
    expect(load).toHaveBeenCalledTimes(2);
    const revision = await library.acquire({ ...source('b'), revision: 'test-2' });
    expect(revision.root.getObjectByName('body-0')).not.toBe(cached.root.getObjectByName('body-0'));
    expect(load).toHaveBeenCalledTimes(3);
    cached.release(); revision.release(); library.dispose();
    for (const f of [a, b, revised]) expect(f.disposed.geometry).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported deformed templates and releases their transferred resources', async () => {
    const f = artFixture(0);
    f.root.add(new SkinnedMesh(f.geometry, f.material));
    const library = new VehicleArtLibrary({ load: async () => f.root });
    await expect(library.acquire(source('skinned'))).rejects.toThrow('baked rigid meshes');
    for (const spy of Object.values(f.disposed)) expect(spy).toHaveBeenCalledTimes(1);
    expect(library.diagnostics.entries).toBe(0);
    library.dispose();
  });
});
