import { describe, expect, it } from 'vitest';
import {
  RoomSession,
  type RoomAuthoritativeEvent,
  type RoomDataConnection,
  type RoomPeer,
} from '../../src/network';
import { normalizePlayerInput, NEUTRAL_PLAYER_INPUT } from '../../src/game/input';
import {
  DEFAULT_WORKSHOP_LOADOUTS,
  type GalacticVehicleClass,
} from '../../src/game/galactic';
import { createRaceSimulation } from '../../src/game/race';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';

type EventName = 'open' | 'close' | 'disconnected' | 'error' | 'connection' | 'data';

function clonePacket<T>(value: T): T {
  return structuredClone(value);
}

function packetType(value: unknown): unknown {
  return typeof value === 'object' && value !== null
    ? (value as { type?: unknown }).type
    : undefined;
}

class FakeConnection implements RoomDataConnection {
  open = true;
  bufferSize = 0;
  other: FakeConnection | null = null;
  readonly sent: unknown[] = [];
  private readonly listeners = new Map<EventName, Array<(...args: unknown[]) => void>>();

  constructor(readonly peer: string) {}

  on(event: 'open' | 'close' | 'error' | 'data', listener: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  send(data: unknown): void {
    if (!this.open) throw new Error('not-open-yet');
    const packet = clonePacket(data);
    this.sent.push(packet);
    this.other?.emit('data', packet);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    const other = this.other;
    if (other) other.open = false;
    this.emit('close');
    other?.emit('close');
  }

  emit(event: EventName, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

class FakePeer implements RoomPeer {
  open = true;
  destroyed = false;
  disconnected = false;
  reconnectCount = 0;
  readonly connections: FakeConnection[] = [];
  readonly connectOptions: Readonly<Record<string, unknown>>[] = [];
  private readonly listeners = new Map<EventName, Array<(...args: unknown[]) => void>>();

  constructor(readonly id: string, private readonly hub: FakePeerHub) {}

  on(
    event: 'open' | 'close' | 'disconnected' | 'error' | 'connection',
    listener: (...args: unknown[]) => void,
  ): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  connect(peerId: string, options: Readonly<Record<string, unknown>> = {}): RoomDataConnection {
    const target = this.hub.peers.get(peerId);
    if (!target) throw new Error(`Unknown peer ${peerId}`);
    const outgoing = new FakeConnection(peerId);
    const incoming = new FakeConnection(this.id);
    outgoing.other = incoming;
    incoming.other = outgoing;
    this.connections.push(outgoing);
    target.connections.push(incoming);
    this.connectOptions.push(options);
    target.emit('connection', incoming);
    return outgoing;
  }

  reconnect(): void {
    if (this.destroyed) throw new Error('destroyed');
    this.reconnectCount += 1;
    this.disconnected = false;
    this.open = true;
    this.emit('open', this.id);
  }

  disconnectSignaling(): void {
    this.disconnected = true;
    this.emit('disconnected', this.id);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.open = false;
    this.hub.peers.delete(this.id);
    for (const connection of this.connections) connection.close();
    this.emit('close');
  }

  emit(event: EventName, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

class FakePeerHub {
  readonly peers = new Map<string, FakePeer>();
  private guestSequence = 0;

  readonly factory = async (id?: string): Promise<RoomPeer> => {
    const peerId = id ?? `guest-${++this.guestSequence}`;
    if (this.peers.has(peerId)) {
      const error = Object.assign(new Error('ID is unavailable'), { type: 'unavailable-id' });
      throw error;
    }
    const peer = new FakePeer(peerId, this);
    this.peers.set(peerId, peer);
    return peer;
  };

  peer(id: string): FakePeer {
    const peer = this.peers.get(id);
    if (!peer) throw new Error(`Missing fake peer ${id}`);
    return peer;
  }
}

function profile(name: string, vehicleClass: GalacticVehicleClass = 'podracer') {
  return { name, vehicleClass };
}

async function connectedPair(clock = { now: 0 }) {
  const hub = new FakePeerHub();
  const options = { peerFactory: hub.factory, now: () => clock.now, random: () => 0 };
  const host = new RoomSession(options);
  const guest = new RoomSession(options);
  const hostLobby = await host.createRoom(profile('Host'), 3);
  const guestLobby = await guest.joinRoom(hostLobby.code, profile('Guest', 'speeder-bike'));
  return { hub, host, guest, hostLobby, guestLobby, clock };
}

function hostToGuestConnection(hub: FakePeerHub, guestPeerId = 'guest-1'): FakeConnection {
  const hostPeer = [...hub.peers.values()]
    .find((peer) => peer.id.startsWith('now-this-is-podracing-room-'));
  const connection = hostPeer?.connections.find((candidate) => candidate.peer === guestPeerId);
  if (!connection) throw new Error(`Missing host connection for ${guestPeerId}`);
  return connection;
}

describe('RoomSession in-memory protocol', () => {
  it('creates an unambiguous room and assigns stable guest slots', async () => {
    const { hub, host, guest, hostLobby, guestLobby } = await connectedPair();

    expect(hostLobby.code).toMatch(/^[346789ABCDEFGHJKMNPQRTWXY]{6}$/);
    expect(hostLobby).toMatchObject({ role: 'host', status: 'ready', localRacerId: 'player' });
    expect(guestLobby).toMatchObject({ role: 'guest', status: 'waiting', localRacerId: 'ai-vexa' });
    expect(host.lobby.members.map((member) => member.racerId)).toEqual(['player', 'ai-vexa']);
    expect(guest.lobby.members).toEqual(host.lobby.members);
    expect(hub.peer('guest-1').connectOptions[0]).toMatchObject({
      reliable: true,
      serialization: 'binary',
    });
    expect(Object.isFrozen(host.lobby)).toBe(true);
    expect(Object.isFrozen(host.lobby.members)).toBe(true);

    guest.updateLocalVehicle('skim-speeder');
    const guestBuild = {
      ...DEFAULT_WORKSHOP_LOADOUTS['skim-speeder'],
      slots: {
        ...DEFAULT_WORKSHOP_LOADOUTS['skim-speeder'].slots,
        gadget: 'heat-lance-amplifier' as const,
      },
    };
    guest.updateLocalWorkshop(guestBuild);
    host.setLaps(2);
    host.setRaceMode('combat-race');
    host.setAIDifficulty('hard');
    expect(host.lobby.members.find((member) => member.racerId === 'ai-vexa')?.vehicleClass)
      .toBe('skim-speeder');
    expect(host.lobby.members.find((member) => member.racerId === 'ai-vexa')?.workshopLoadout)
      .toEqual(guestBuild);
    expect(guest.lobby.laps).toBe(2);
    expect(guest.lobby.mode).toBe('combat-race');
    expect(guest.lobby.aiDifficulty).toBe('hard');

    const start = host.startRace(0x1234);
    expect(guest.consumeStart()).toEqual(start);
    expect(start.vehicleClasses['ai-vexa']).toBe('skim-speeder');
    expect(start.workshopLoadouts['ai-vexa']).toEqual(guestBuild);
    expect(start).toMatchObject({ mode: 'combat-race', aiDifficulty: 'hard' });
  });

  it('caps rooms at four racers and reuses only the vacated stable slot', async () => {
    const hub = new FakePeerHub();
    const options = { peerFactory: hub.factory, random: () => 0 };
    const host = new RoomSession(options);
    const room = await host.createRoom(profile('Host'), 3);
    const guests = [
      new RoomSession(options),
      new RoomSession(options),
      new RoomSession(options),
    ];

    await Promise.all(guests.map((guest, index) => (
      guest.joinRoom(room.code, profile(`Guest ${index + 1}`))
    )));
    expect(guests.map((guest) => guest.lobby.localRacerId)).toEqual([
      'ai-vexa',
      'ai-talik',
      'ai-kodo',
    ]);
    expect(host.lobby.members).toHaveLength(4);

    const overflow = new RoomSession(options);
    await expect(overflow.joinRoom(room.code, profile('Overflow'))).rejects.toThrow(/room is full/i);
    expect(overflow.lobby.error).toMatch(/room is full/i);
    expect(hub.peers.has('guest-4')).toBe(false);

    guests[1]!.leave();
    expect(host.lobby.members.map((member) => member.racerId)).toEqual([
      'player',
      'ai-vexa',
      'ai-kodo',
    ]);
    const replacement = new RoomSession(options);
    await replacement.joinRoom(room.code, profile('Replacement'));
    expect(replacement.lobby.localRacerId).toBe('ai-talik');
  });

  it('sends semantic changes immediately, rejects stale/malformed input, and neutralizes timeout', async () => {
    const { hub, host, guest, clock } = await connectedPair();
    host.startRace(1);
    guest.consumeStart();
    const first = normalizePlayerInput({ throttle: 1, steer: 0.25 });

    expect(guest.sendInput(first)).toBe(true);
    expect(guest.sendInput(first)).toBe(false);
    expect(host.remoteInputs['ai-vexa']).toEqual(first);

    const fired = normalizePlayerInput({ ...first, fire: true, mine: true });
    expect(guest.sendInput(fired)).toBe(true);
    expect(host.remoteInputs['ai-vexa']).toEqual(fired);

    const outgoing = hub.peer('guest-1').connections[0]!;
    outgoing.bufferSize = 2;
    expect(guest.sendInput(normalizePlayerInput({ throttle: 1, steer: -0.5 }))).toBe(false);
    outgoing.bufferSize = 0;
    outgoing.send({ v: 1, type: 'input', sequence: 999, input: { throttle: Number.NaN } });
    expect(host.remoteInputs['ai-vexa']).toEqual(fired);
    outgoing.send({ v: 1, type: 'input', sequence: 1, input: normalizePlayerInput({ brake: 1 }) });
    expect(host.remoteInputs['ai-vexa']).toEqual(fired);

    clock.now = 421;
    expect(host.remoteInputs['ai-vexa']).toEqual(NEUTRAL_PLAYER_INPUT);
    outgoing.close();
    expect(host.remoteInputs).not.toHaveProperty('ai-vexa');
  });

  it('throttles snapshots, drops congested frames, and rejects malformed authoritative state', async () => {
    const { hub, host, guest, clock } = await connectedPair();
    host.startRace(2);
    guest.consumeStart();
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed: 2,
    });
    const first = race.snapshot();

    expect(host.broadcastState(first)).toBe(true);
    expect(guest.consumeAuthoritativeState()).toEqual(first);
    expect(host.broadcastState(first)).toBe(false);

    clock.now = 50;
    race.step({ throttle: 1 });
    const second = race.snapshot();
    expect(host.broadcastState(second)).toBe(true);
    expect(guest.consumeAuthoritativeState()?.step).toBe(second.step);

    const hostConnection = hostToGuestConnection(hub);
    hostConnection.bufferSize = 1;
    clock.now = 100;
    expect(host.broadcastState(race.snapshot())).toBe(false);
    expect(guest.consumeAuthoritativeState()).toBeNull();

    hostConnection.bufferSize = 0;
    hostConnection.send({
      v: 1,
      type: 'state',
      sequence: 999,
      state: { version: 1, entries: [] },
    });
    expect(guest.consumeAuthoritativeState()).toBeNull();
  });

  it('delivers semantic event journals once and rejects stale snapshot steps', async () => {
    const { hub, host, guest, clock } = await connectedPair();
    const seed = 0x1234_5678;
    host.startRace(seed);
    guest.consumeStart();
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed,
    });
    const expectedEvents = [
      { type: 'launch-result', racerId: 'ai-vexa', outcome: 'perfect' },
      { type: 'slingshot', racerId: 'ai-vexa', leaderId: 'player', strength: 1.2 },
      {
        type: 'takedown',
        attackerId: 'ai-vexa',
        victimId: 'player',
        cause: 'heat-lance',
      },
    ] as const satisfies readonly RoomAuthoritativeEvent[];

    expect(host.recordAuthoritativeEvents(race.state.step, expectedEvents)).toBe(3);
    expect(host.recordAuthoritativeEvents(Number.NaN, expectedEvents)).toBe(0);
    expect(host.recordAuthoritativeEvents(race.state.step, [{
      type: 'slingshot',
      racerId: 'ai-vexa',
      leaderId: 'player',
      strength: Number.NaN,
    }])).toBe(0);
    expect(host.broadcastState(race.snapshot())).toBe(true);
    expect(guest.consumeAuthoritativeState()?.step).toBe(0);
    const delivered = guest.consumeAuthoritativeEvents();
    expect(delivered.map((envelope) => envelope.event)).toEqual(expectedEvents);
    expect(delivered.map((envelope) => envelope.sequence)).toEqual([1, 2, 3]);
    expect(delivered.every((envelope) => envelope.step === 0)).toBe(true);
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);

    clock.now = 50;
    race.step({ throttle: 1 });
    expect(host.broadcastState(race.snapshot())).toBe(true);
    expect(guest.consumeAuthoritativeState()?.step).toBe(1);
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);

    const statePackets = hostToGuestConnection(hub).sent.filter((packet) => (
      packetType(packet) === 'state'
    )) as Array<Record<string, unknown>>;
    const firstPacket = statePackets[0];
    const secondPacket = statePackets[1];
    expect((firstPacket?.events as unknown[] | undefined)?.length).toBe(3);
    expect(secondPacket?.events).toEqual([]);
    if (!firstPacket || !secondPacket) throw new Error('Missing authoritative state packets.');

    // A transport sequence alone cannot make an older simulation step valid.
    hostToGuestConnection(hub).send({ ...firstPacket, sequence: 500 });
    expect(guest.consumeAuthoritativeState()).toBeNull();
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);

    // A valid current-step retry may repeat a journal tail, but event sequence
    // cursors keep semantic presentation exactly-once.
    hostToGuestConnection(hub).send({
      ...secondPacket,
      sequence: 501,
      events: firstPacket.events,
    });
    expect(guest.consumeAuthoritativeState()?.step).toBe(1);
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);

    const { events: _events, ...legacyPacket } = secondPacket;
    hostToGuestConnection(hub).send({ ...legacyPacket, sequence: 502 });
    expect(guest.consumeAuthoritativeState()?.step).toBe(1);
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);

    hostToGuestConnection(hub).send({
      ...secondPacket,
      sequence: 503,
      events: [{
        sequence: 4,
        step: 1,
        event: {
          type: 'slingshot',
          racerId: 'ai-vexa',
          leaderId: 'player',
          strength: Number.NaN,
        },
      }],
    });
    expect(guest.consumeAuthoritativeState()).toBeNull();
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);
  });

  it('bounds a congested semantic journal while preserving sequence order', async () => {
    const { host, guest } = await connectedPair();
    const seed = 0x0bad_cafe;
    host.startRace(seed);
    guest.consumeStart();
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed,
    });
    const events = Array.from({ length: 140 }, (_, index) => ({
      type: 'overtake' as const,
      racerId: 'ai-vexa',
      passedId: `racer-${index}`,
      fromPosition: 3,
      toPosition: 2,
    }));

    expect(host.recordAuthoritativeEvents(race.state.step, events)).toBe(140);
    expect(host.broadcastState(race.snapshot())).toBe(true);
    expect(guest.consumeAuthoritativeState()?.step).toBe(0);
    const delivered = guest.consumeAuthoritativeEvents();
    expect(delivered).toHaveLength(96);
    expect(delivered[0]?.sequence).toBe(45);
    expect(delivered.at(-1)?.sequence).toBe(140);
    expect(delivered.map((event) => event.sequence)).toEqual(
      [...delivered].map((event) => event.sequence).sort((left, right) => left - right),
    );
  });

  it('returns the same members to the lobby and clears race queues and input edges', async () => {
    const { host, guest, clock } = await connectedPair();
    host.setLaps(2);
    const firstStart = host.startRace(3);
    expect(guest.consumeStart()).toEqual(firstStart);
    expect(guest.sendInput(normalizePlayerInput({ fire: true }))).toBe(true);

    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed: 3,
    });
    host.recordAuthoritativeEvents(0, [{
      type: 'overtake',
      racerId: 'player',
      passedId: 'ai-vexa',
      fromPosition: 2,
      toPosition: 1,
    }]);
    host.broadcastState(race.snapshot());
    host.returnToLobby();

    expect(guest.consumeReturnToLobby()).toBe(true);
    expect(guest.consumeReturnToLobby()).toBe(false);
    expect(guest.consumeAuthoritativeState()).toBeNull();
    expect(guest.consumeAuthoritativeEvents()).toEqual([]);
    expect(guest.lobby.members).toEqual(host.lobby.members);
    expect(guest.lobby.laps).toBe(2);

    const secondStart = host.startRace(4);
    expect(guest.consumeStart()).toEqual(secondStart);
    // Rematch clears the old signature, so a held semantic edge is sent on
    // the first frame even when no wall-clock heartbeat elapsed.
    expect(guest.sendInput(normalizePlayerInput({ fire: true }))).toBe(true);
    clock.now = 34;
    expect(guest.sendInput(normalizePlayerInput({ fire: true }))).toBe(true);
  });

  it('propagates one authoritative procedural course seed to every peer across rematches', async () => {
    const { host, guest } = await connectedPair();
    const firstSeed = 0x1020_3040;
    const secondSeed = 0xa1b2_c3d4;

    const firstHostStart = host.startRace(firstSeed);
    const firstGuestStart = guest.consumeStart();
    expect(firstGuestStart).toEqual(firstHostStart);
    if (!firstGuestStart) throw new Error('Guest omitted the first race start packet.');

    const firstHostRace = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: firstHostStart.seed,
    });
    const firstGuestRace = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: firstGuestStart.seed,
    });
    expect(firstGuestRace.course.signature).toBe(firstHostRace.course.signature);

    host.returnToLobby();
    expect(guest.consumeReturnToLobby()).toBe(true);

    const secondHostStart = host.startRace(secondSeed);
    const secondGuestStart = guest.consumeStart();
    expect(secondGuestStart).toEqual(secondHostStart);
    if (!secondGuestStart) throw new Error('Guest omitted the rematch start packet.');

    const secondHostRace = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: secondHostStart.seed,
    });
    const secondGuestRace = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      seed: secondGuestStart.seed,
    });
    expect(secondGuestRace.course.signature).toBe(secondHostRace.course.signature);
    expect(secondHostRace.course.signature).not.toBe(firstHostRace.course.signature);
  });

  it('rejects late joins and malformed room codes without disturbing connected members', async () => {
    const { hub, host, hostLobby } = await connectedPair();
    host.startRace(5);
    const late = new RoomSession({ peerFactory: hub.factory, random: () => 0 });
    await expect(late.joinRoom(hostLobby.code, profile('Late'))).rejects.toThrow(/already started/);
    expect(host.lobby.members).toHaveLength(2);

    const invalid = new RoomSession({ peerFactory: hub.factory });
    await expect(invalid.joinRoom('OOOOOO', profile('Invalid'))).rejects.toThrow(/valid six-character/);
  });

  it('reconnects signaling and ignores stale transport callbacks after leave/dispose', async () => {
    const { hub, host } = await connectedPair();
    const hostPeer = [...hub.peers.values()]
      .find((peer) => peer.id.startsWith('now-this-is-podracing-room-'))!;
    hostPeer.disconnectSignaling();
    expect(hostPeer.reconnectCount).toBe(1);
    expect(host.lobby).toMatchObject({ status: 'ready', error: null });

    host.leave();
    expect(hostPeer.destroyed).toBe(true);
    hostPeer.emit('error', new Error('late failure'));
    expect(host.lobby).toMatchObject({ role: 'solo', status: 'idle', error: null });

    host.dispose();
    host.dispose();
    await expect(host.createRoom(profile('Again'), 3)).rejects.toThrow(/disposed/);
  });
});
