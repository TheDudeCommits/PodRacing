import type {
  GalacticEvent,
  GalacticVehicleClass,
  WorkshopLoadout,
} from '../game/galactic';
import {
  DEFAULT_WORKSHOP_LOADOUTS,
  GALACTIC_VEHICLE_ORDER,
  sanitizeWorkshopLoadout,
} from '../game/galactic';
import type { AIControllerState } from '../game/ai';
import {
  NEUTRAL_PLAYER_INPUT,
  normalizePlayerInput,
  type PlayerInputState,
} from '../game/input';
import type {
  AIDifficulty,
  RaceEvent,
  RaceMode,
  RaceSimulationState,
} from '../game/race';

const PROTOCOL_VERSION = 1;
const ROOM_PREFIX = 'now-this-is-podracing-room-';
// Excludes glyphs commonly confused in condensed UI fonts: 0/O, 1/I/L,
// 2/Z and 5/S, plus U/V.
const ROOM_ALPHABET = '346789ABCDEFGHJKMNPQRTWXY';
const ROOM_CAPACITY = 4;
const JOIN_TIMEOUT_MS = 12_000;
const INPUT_HEARTBEAT_MS = 1000 / 30;
const INPUT_TIMEOUT_MS = 420;
const STATE_BROADCAST_MS = 1000 / 20;
// PeerJS bufferSize counts queued messages, not bytes. Keeping only a tiny
// queue prevents an old control edge or authoritative frame arriving late.
const MAX_INPUT_BUFFER_MESSAGES = 2;
const MAX_STATE_BUFFER_MESSAGES = 1;
// Event journals are intentionally small: they cover several congested state
// intervals without allowing combat spam to grow a packet without bound.
const MAX_AUTHORITATIVE_EVENT_HISTORY = 96;
const MAX_AUTHORITATIVE_EVENT_JSON_CHARS = 24_000;
const MAX_AUTHORITATIVE_EVENT_HISTORY_JSON_CHARS = 64_000;

export const NETWORK_RACER_IDS = [
  'player',
  'ai-vexa',
  'ai-talik',
  'ai-kodo',
] as const;

export type NetworkRacerId = typeof NETWORK_RACER_IDS[number];
export type RoomRole = 'solo' | 'host' | 'guest';
export type RoomStatus = 'idle' | 'connecting' | 'waiting' | 'ready' | 'error';
export type RoomLapCount = 1 | 2 | 3;

export interface RoomProfile {
  name: string;
  vehicleClass: GalacticVehicleClass;
  workshopLoadout?: WorkshopLoadout;
}

export interface RoomMember {
  racerId: NetworkRacerId;
  name: string;
  vehicleClass: GalacticVehicleClass;
  workshopLoadout: WorkshopLoadout;
  isHost: boolean;
}

export interface RoomLobbySnapshot {
  role: RoomRole;
  status: RoomStatus;
  code: string;
  laps: RoomLapCount;
  mode: RaceMode;
  aiDifficulty: AIDifficulty;
  members: readonly Readonly<RoomMember>[];
  localRacerId: NetworkRacerId | null;
  capacity: number;
  canStart: boolean;
  error: string | null;
}

export interface RoomRaceStart {
  seed: number;
  laps: RoomLapCount;
  mode: RaceMode;
  aiDifficulty: AIDifficulty;
  vehicleClasses: Readonly<Record<NetworkRacerId, GalacticVehicleClass>>;
  workshopLoadouts: Readonly<Record<NetworkRacerId, WorkshopLoadout>>;
}

/** Semantic simulation events that are safe to replay in presentation code. */
export type RoomAuthoritativeEvent = RaceEvent | GalacticEvent;

/**
 * Ordered event journal entry transported beside an authoritative snapshot.
 * `step` preserves deterministic event time while `sequence` gives guests an
 * independent once-only cursor when a snapshot is retried or superseded.
 */
export interface RoomAuthoritativeEventEnvelope {
  sequence: number;
  step: number;
  event: RoomAuthoritativeEvent;
}

const EMPTY_AUTHORITATIVE_EVENTS: readonly RoomAuthoritativeEventEnvelope[] = Object.freeze([]);

/** The tiny structural surface RoomSession needs from PeerJS. */
export interface RoomDataConnection {
  readonly peer: string;
  readonly open: boolean;
  readonly bufferSize?: number;
  on(event: 'open' | 'close' | 'error' | 'data', listener: (...args: unknown[]) => void): unknown;
  send(data: unknown): void | Promise<void>;
  close(): void;
}

/** Exported so deterministic tests can inject an in-memory transport. */
export interface RoomPeer {
  readonly id: string;
  readonly open: boolean;
  readonly destroyed?: boolean;
  readonly disconnected?: boolean;
  on(event: 'open' | 'close' | 'disconnected' | 'error' | 'connection', listener: (...args: unknown[]) => void): unknown;
  connect(peerId: string, options?: Readonly<Record<string, unknown>>): RoomDataConnection;
  reconnect?(): void;
  destroy(): void;
}

export interface RoomSessionOptions {
  peerFactory?: (id?: string) => RoomPeer | Promise<RoomPeer>;
  now?: () => number;
  random?: () => number;
  joinTimeoutMs?: number;
}

interface WireMember {
  racerId: NetworkRacerId;
  name: string;
  vehicleClass: GalacticVehicleClass;
  workshopLoadout: WorkshopLoadout;
  isHost: boolean;
}

type ClientPacket =
  | { v: 1; type: 'hello'; profile: RoomProfile }
  | { v: 1; type: 'profile'; profile: RoomProfile }
  | { v: 1; type: 'input'; sequence: number; input: PlayerInputState }
  | { v: 1; type: 'leave' };

type HostPacket =
  | {
      v: 1;
      type: 'welcome';
      code: string;
      laps: RoomLapCount;
      mode: RaceMode;
      aiDifficulty: AIDifficulty;
      localRacerId: NetworkRacerId;
      members: readonly WireMember[];
    }
  | {
      v: 1;
      type: 'lobby';
      laps: RoomLapCount;
      mode: RaceMode;
      aiDifficulty: AIDifficulty;
      members: readonly WireMember[];
    }
  | { v: 1; type: 'start'; start: RoomRaceStart }
  | {
      v: 1;
      type: 'state';
      sequence: number;
      state: RaceSimulationState<AIControllerState>;
      /** Optional keeps protocol-v1 snapshot-only hosts wire-compatible. */
      events?: readonly RoomAuthoritativeEventEnvelope[];
    }
  | { v: 1; type: 'return-to-lobby' }
  | { v: 1; type: 'error'; message: string };

interface HostConnectionState {
  connection: RoomDataConnection;
  racerId: NetworkRacerId | null;
  lastInput: PlayerInputState;
  lastInputAt: number;
  lastInputSequence: number;
  lastEventSequenceSent: number;
}

const DEFAULT_VEHICLE_CLASSES: Readonly<Record<NetworkRacerId, GalacticVehicleClass>> = Object.freeze({
  player: GALACTIC_VEHICLE_ORDER[0] ?? 'podracer',
  'ai-vexa': GALACTIC_VEHICLE_ORDER[1] ?? 'landspeeder',
  'ai-talik': GALACTIC_VEHICLE_ORDER[2] ?? 'speeder-bike',
  'ai-kodo': GALACTIC_VEHICLE_ORDER[3] ?? 'skim-speeder',
});

const ROOM_RACE_MODES: readonly RaceMode[] = Object.freeze([
  'circuit',
  'eliminator',
  'checkpoint-sprint',
  'combat-race',
  'survival-gauntlet',
  'drift-trial',
  'team-race',
]);
const ROOM_AI_DIFFICULTIES: readonly AIDifficulty[] = Object.freeze(['easy', 'medium', 'hard']);

function clampLaps(value: number): RoomLapCount {
  return Math.min(3, Math.max(1, Math.round(value))) as RoomLapCount;
}

function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function isValidRoomCode(value: string): boolean {
  return value.length === 6 && [...value].every((character) => ROOM_ALPHABET.includes(character));
}

function normalizeProfile(
  profile: RoomProfile,
): Readonly<RoomProfile & { workshopLoadout: WorkshopLoadout }> {
  const name = profile.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 18) || 'Pilot';
  const vehicleClass = GALACTIC_VEHICLE_ORDER.includes(profile.vehicleClass)
    ? profile.vehicleClass
    : 'podracer';
  const sanitized = sanitizeWorkshopLoadout(profile.workshopLoadout, vehicleClass);
  const workshopLoadout = sanitized.vehicleClass === vehicleClass
    ? sanitized
    : DEFAULT_WORKSHOP_LOADOUTS[vehicleClass];
  return Object.freeze({ name, vehicleClass, workshopLoadout });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVehicleClass(value: unknown): value is GalacticVehicleClass {
  return typeof value === 'string'
    && GALACTIC_VEHICLE_ORDER.includes(value as GalacticVehicleClass);
}

function isRaceMode(value: unknown): value is RaceMode {
  return typeof value === 'string' && ROOM_RACE_MODES.includes(value as RaceMode);
}

function isAIDifficulty(value: unknown): value is AIDifficulty {
  return typeof value === 'string'
    && ROOM_AI_DIFFICULTIES.includes(value as AIDifficulty);
}

function parseProfile(
  value: unknown,
): Readonly<RoomProfile & { workshopLoadout: WorkshopLoadout }> | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !isVehicleClass(value.vehicleClass)) {
    return null;
  }
  return normalizeProfile({
    name: value.name,
    vehicleClass: value.vehicleClass,
    workshopLoadout: value.workshopLoadout as WorkshopLoadout | undefined,
  });
}

function parseMember(value: unknown): WireMember | null {
  if (!isRecord(value)
    || !NETWORK_RACER_IDS.includes(value.racerId as NetworkRacerId)
    || typeof value.name !== 'string'
    || !isVehicleClass(value.vehicleClass)
    || typeof value.isHost !== 'boolean') {
    return null;
  }
  return Object.freeze({
    racerId: value.racerId as NetworkRacerId,
    name: normalizeProfile({ name: value.name, vehicleClass: value.vehicleClass }).name,
    vehicleClass: value.vehicleClass,
    workshopLoadout: normalizeProfile({
      name: value.name,
      vehicleClass: value.vehicleClass,
      workshopLoadout: value.workshopLoadout as WorkshopLoadout | undefined,
    }).workshopLoadout ?? DEFAULT_WORKSHOP_LOADOUTS[value.vehicleClass],
    isHost: value.isHost,
  });
}

function parseMembers(value: unknown): readonly WireMember[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > ROOM_CAPACITY) return null;
  const members: WireMember[] = [];
  const ids = new Set<NetworkRacerId>();
  for (const item of value) {
    const member = parseMember(item);
    if (!member || ids.has(member.racerId)) return null;
    ids.add(member.racerId);
    members.push(member);
  }
  return Object.freeze(members);
}

function hasValidHost(members: readonly WireMember[]): boolean {
  return members.filter((member) => member.isHost).length === 1
    && members.some((member) => member.racerId === 'player' && member.isHost);
}

function parsePlayerInput(value: unknown): PlayerInputState | null {
  if (!isRecord(value)) return null;
  for (const key of ['throttle', 'brake', 'steer'] as const) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) return null;
  }
  for (const key of [
    'drift', 'boost', 'fire', 'mine', 'shield', 'cycleVehicle', 'reset', 'pause',
  ] as const) {
    if (typeof value[key] !== 'boolean') return null;
  }
  return normalizePlayerInput(value as unknown as PlayerInputState);
}

function containsOnlyFiniteJson(
  value: unknown,
  seen = new WeakSet<object>(),
  budget = { nodes: 0 },
  depth = 0,
): boolean {
  budget.nodes += 1;
  if (budget.nodes > 20_000 || depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > 10_000) return false;
    return value.every((item) => containsOnlyFiniteJson(item, seen, budget, depth + 1));
  }
  return Object.values(value).every((item) => containsOnlyFiniteJson(item, seen, budget, depth + 1));
}

function isVec3(value: unknown): boolean {
  return isRecord(value)
    && typeof value.x === 'number' && Number.isFinite(value.x)
    && typeof value.y === 'number' && Number.isFinite(value.y)
    && typeof value.z === 'number' && Number.isFinite(value.z);
}

function parseRaceState(value: unknown): RaceSimulationState<AIControllerState> | null {
  if (!isRecord(value)
    || value.version !== 1
    || !Number.isSafeInteger(value.seed)
    || !Number.isSafeInteger(value.step)
    || Number(value.step) < 0
    || !['countdown', 'racing', 'finished'].includes(String(value.phase))
    || typeof value.raceTime !== 'number' || !Number.isFinite(value.raceTime)
    || ![1, 2, 3].includes(Number(value.totalLaps))
    || !Array.isArray(value.entries)
    || value.entries.length < ROOM_CAPACITY
    || value.entries.length > 8
    || !Array.isArray(value.results)
    || !isRecord(value.galacticWorld)
    || !containsOnlyFiniteJson(value)) {
    return null;
  }
  const ids = new Set<string>();
  for (const candidate of value.entries) {
    if (!isRecord(candidate)
      || typeof candidate.id !== 'string'
      || candidate.id.length === 0
      || candidate.id.length > 48
      || ids.has(candidate.id)
      || typeof candidate.name !== 'string'
      || typeof candidate.isPlayer !== 'boolean'
      || !['grid', 'racing', 'finished'].includes(String(candidate.status))
      || !isRecord(candidate.vehicle)
      || candidate.vehicle.version !== 1
      || !isVec3(candidate.vehicle.position)
      || !isVec3(candidate.vehicle.velocity)
      || !isRecord(candidate.vehicle.orientation)
      || !isRecord(candidate.vehicle.telemetry)
      || !isRecord(candidate.progress)) {
      return null;
    }
    ids.add(candidate.id);
  }
  // The room exposes four stable human-controllable slots. A production race
  // may append four host-authoritative AI entries, but it may never omit or
  // rename a human slot because guest input routing depends on these IDs.
  if (!NETWORK_RACER_IDS.every((id) => ids.has(id))) return null;
  return value as unknown as RaceSimulationState<AIControllerState>;
}

function cloneAuthoritativeEvent(
  value: unknown,
  budget = { nodes: 0 },
): { event: RoomAuthoritativeEvent; jsonChars: number } | null {
  if (!isRecord(value)
    || typeof value.type !== 'string'
    || value.type.length < 1
    || value.type.length > 64
    || !containsOnlyFiniteJson(value, new WeakSet<object>(), budget)) {
    return null;
  }
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_AUTHORITATIVE_EVENT_JSON_CHARS) return null;
    return {
      event: Object.freeze(JSON.parse(json) as RoomAuthoritativeEvent),
      jsonChars: json.length,
    };
  } catch {
    return null;
  }
}

function parseAuthoritativeEventEnvelopes(
  value: unknown,
  stateStep: number,
): readonly RoomAuthoritativeEventEnvelope[] | null {
  // Older protocol-v1 hosts did not attach semantic events to state packets.
  if (value === undefined) return EMPTY_AUTHORITATIVE_EVENTS;
  if (!Array.isArray(value) || value.length > MAX_AUTHORITATIVE_EVENT_HISTORY) return null;
  const parsed: RoomAuthoritativeEventEnvelope[] = [];
  const budget = { nodes: 0 };
  let previousSequence = 0;
  let previousStep = -1;
  let totalJsonChars = 2;
  for (const candidate of value) {
    if (!isRecord(candidate)
      || !Number.isSafeInteger(candidate.sequence)
      || Number(candidate.sequence) <= previousSequence
      || !Number.isSafeInteger(candidate.step)
      || Number(candidate.step) < 0
      || Number(candidate.step) < previousStep
      || Number(candidate.step) > stateStep) {
      return null;
    }
    const cloned = cloneAuthoritativeEvent(candidate.event, budget);
    if (!cloned) return null;
    totalJsonChars += cloned.jsonChars + 64;
    if (totalJsonChars > MAX_AUTHORITATIVE_EVENT_HISTORY_JSON_CHARS) return null;
    previousSequence = Number(candidate.sequence);
    previousStep = Number(candidate.step);
    parsed.push(Object.freeze({
      sequence: previousSequence,
      step: previousStep,
      event: cloned.event,
    }));
  }
  return Object.freeze(parsed);
}

function deepFreezeLobby(snapshot: RoomLobbySnapshot): RoomLobbySnapshot {
  return Object.freeze({
    ...snapshot,
    members: Object.freeze(snapshot.members.map((member) => Object.freeze({ ...member }))),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}

function isUnavailableIdError(error: unknown): boolean {
  return isRecord(error) && error.type === 'unavailable-id';
}

async function defaultPeerFactory(id?: string): Promise<RoomPeer> {
  const { Peer } = await import('peerjs');
  return (id === undefined ? new Peer() : new Peer(id)) as unknown as RoomPeer;
}

/**
 * Peer-to-peer room coordinator. The host owns race truth; this class only
 * transports lobby choices, semantic controls, and immutable snapshots.
 */
export class RoomSession {
  private readonly peerFactory: NonNullable<RoomSessionOptions['peerFactory']>;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly joinTimeoutMs: number;
  private readonly listeners = new Set<(lobby: RoomLobbySnapshot) => void>();
  private peer: RoomPeer | null = null;
  private guestConnection: RoomDataConnection | null = null;
  private readonly hostConnections = new Map<string, HostConnectionState>();
  private readonly hostMembers = new Map<NetworkRacerId, RoomMember>();
  private guestMembers: readonly RoomMember[] = [];
  private role: RoomRole = 'solo';
  private status: RoomStatus = 'idle';
  private code = '';
  private laps: RoomLapCount = 3;
  private mode: RaceMode = 'circuit';
  private aiDifficulty: AIDifficulty = 'medium';
  private localRacerIdValue: NetworkRacerId | null = null;
  private errorValue: string | null = null;
  private racing = false;
  private disposed = false;
  private pendingStart: RoomRaceStart | null = null;
  private pendingState: RaceSimulationState<AIControllerState> | null = null;
  private readonly pendingAuthoritativeEvents: RoomAuthoritativeEventEnvelope[] = [];
  private pendingReturnToLobby = false;
  private stateSequence = 0;
  private lastStateBroadcastAt = Number.NEGATIVE_INFINITY;
  private lastReceivedStateSequence = -1;
  private lastReceivedStateStep = -1;
  private activeRaceSeed: number | null = null;
  private authoritativeEventSequence = 0;
  private lastQueuedAuthoritativeEventStep = -1;
  private readonly authoritativeEventHistory: RoomAuthoritativeEventEnvelope[] = [];
  private authoritativeEventHistoryJsonChars = 2;
  private lastReceivedAuthoritativeEventSequence = 0;
  private lastReceivedAuthoritativeEventStep = -1;
  private inputSequence = 0;
  private lastInputSentAt = Number.NEGATIVE_INFINITY;
  private lastInputSignature = '';
  private joinResolve: ((snapshot: RoomLobbySnapshot) => void) | null = null;
  private joinReject: ((error: Error) => void) | null = null;
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  private transportEpoch = 0;

  constructor(options: RoomSessionOptions = {}) {
    this.peerFactory = options.peerFactory ?? defaultPeerFactory;
    this.now = options.now ?? (() => performance.now());
    this.random = options.random ?? Math.random;
    this.joinTimeoutMs = Math.max(1_000, options.joinTimeoutMs ?? JOIN_TIMEOUT_MS);
  }

  get lobby(): RoomLobbySnapshot {
    const members = this.role === 'host'
      ? NETWORK_RACER_IDS.flatMap((id) => {
          const member = this.hostMembers.get(id);
          return member ? [member] : [];
        })
      : this.role === 'guest'
        ? [...this.guestMembers]
        : [];
    return deepFreezeLobby({
      role: this.role,
      status: this.status,
      code: this.code,
      laps: this.laps,
      mode: this.mode,
      aiDifficulty: this.aiDifficulty,
      members,
      localRacerId: this.localRacerIdValue,
      capacity: ROOM_CAPACITY,
      canStart: this.role === 'host' && this.status === 'ready' && !this.racing,
      error: this.errorValue,
    });
  }

  subscribe(listener: (lobby: RoomLobbySnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.lobby);
    return () => this.listeners.delete(listener);
  }

  async createRoom(profile: RoomProfile, laps: number): Promise<RoomLobbySnapshot> {
    this.assertUsable();
    this.resetTransport();
    const epoch = this.transportEpoch;
    this.role = 'host';
    this.status = 'connecting';
    this.laps = clampLaps(laps);
    this.errorValue = null;
    this.emit();

    let lastError: unknown = new Error('Unable to reserve a room code.');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = this.makeRoomCode();
      let peer: RoomPeer | null = null;
      try {
        peer = await this.openPeer(`${ROOM_PREFIX}${code.toLowerCase()}`);
        if (!this.isCurrentEpoch(epoch)) {
          peer.destroy();
          throw new Error('Room creation was cancelled.');
        }
        this.peer = peer;
        this.code = code;
        this.localRacerIdValue = 'player';
        this.hostMembers.set('player', {
          racerId: 'player',
          ...normalizeProfile(profile),
          isHost: true,
        });
        this.installHostPeerHandlers(peer, epoch);
        this.status = 'ready';
        this.emit();
        return this.lobby;
      } catch (error) {
        lastError = error;
        peer?.destroy();
        if (!isUnavailableIdError(error)) break;
      }
    }
    if (this.isCurrentEpoch(epoch)) {
      this.fail(errorMessage(lastError, 'Could not create the room.'));
    }
    throw lastError instanceof Error ? lastError : new Error(this.errorValue ?? 'Could not create the room.');
  }

  async joinRoom(code: string, profile: RoomProfile): Promise<RoomLobbySnapshot> {
    this.assertUsable();
    const normalizedCode = normalizeRoomCode(code);
    if (!isValidRoomCode(normalizedCode)) throw new Error('Enter a valid six-character room code.');
    this.resetTransport();
    const epoch = this.transportEpoch;
    this.role = 'guest';
    this.status = 'connecting';
    this.code = normalizedCode;
    this.errorValue = null;
    this.emit();

    try {
      const peer = await this.openPeer();
      if (!this.isCurrentEpoch(epoch)) {
        peer.destroy();
        throw new Error('Room connection was cancelled.');
      }
      this.peer = peer;
      this.installGuestPeerHandlers(peer, epoch);
      const connection = peer.connect(`${ROOM_PREFIX}${normalizedCode.toLowerCase()}`, {
        reliable: true,
        // BinaryPack supports PeerJS chunking; JSON packets are capped near
        // 16 KiB and cannot carry a complete four-racer authoritative state.
        serialization: 'binary',
      });
      this.guestConnection = connection;
      const joined = new Promise<RoomLobbySnapshot>((resolve, reject) => {
        this.joinResolve = resolve;
        this.joinReject = reject;
        this.joinTimer = setTimeout(() => {
          const error = new Error('Room connection timed out. Check the code and try again.');
          this.rejectJoin(error);
          this.fail(error.message);
        }, this.joinTimeoutMs);
      });
      this.installGuestConnectionHandlers(connection, normalizeProfile(profile), epoch);
      return await joined;
    } catch (error) {
      if (this.isCurrentEpoch(epoch)) {
        // A refused or timed-out join has no reusable data channel. Tear down
        // its anonymous peer now so retries do not leak signaling resources.
        this.resetTransport();
        this.fail(errorMessage(error, 'Could not join the room.'));
      }
      throw error;
    }
  }

  leave(): void {
    if (this.role === 'guest' && this.guestConnection?.open) {
      this.safeSend(this.guestConnection, { v: PROTOCOL_VERSION, type: 'leave' } satisfies ClientPacket);
    }
    this.resetTransport();
    this.role = 'solo';
    this.status = 'idle';
    this.code = '';
    this.localRacerIdValue = null;
    this.errorValue = null;
    this.racing = false;
    this.emit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.leave();
    this.disposed = true;
    this.listeners.clear();
  }

  updateLocalVehicle(
    vehicleClass: GalacticVehicleClass,
    workshopLoadout: WorkshopLoadout = DEFAULT_WORKSHOP_LOADOUTS[vehicleClass],
  ): void {
    if (!isVehicleClass(vehicleClass) || this.racing) return;
    const profileLoadout = normalizeProfile({
      name: 'Pilot',
      vehicleClass,
      workshopLoadout,
    }).workshopLoadout ?? DEFAULT_WORKSHOP_LOADOUTS[vehicleClass];
    if (this.role === 'host') {
      const local = this.hostMembers.get('player');
      if (!local) return;
      this.hostMembers.set('player', { ...local, vehicleClass, workshopLoadout: profileLoadout });
      this.broadcastLobby();
      this.emit();
      return;
    }
    if (this.role === 'guest' && this.guestConnection?.open && this.localRacerIdValue) {
      const local = this.guestMembers.find((member) => member.racerId === this.localRacerIdValue);
      if (!local) return;
      this.safeSend(this.guestConnection, {
        v: PROTOCOL_VERSION,
        type: 'profile',
        profile: { name: local.name, vehicleClass, workshopLoadout: profileLoadout },
      } satisfies ClientPacket);
    }
  }

  updateLocalWorkshop(workshopLoadout: WorkshopLoadout): void {
    if (this.racing) return;
    const local = this.lobby.members.find((member) => member.racerId === this.localRacerIdValue);
    if (!local) return;
    this.updateLocalVehicle(local.vehicleClass, workshopLoadout);
  }

  setLaps(laps: number): void {
    if (this.role !== 'host' || this.racing) return;
    this.laps = clampLaps(laps);
    this.broadcastLobby();
    this.emit();
  }

  setRaceMode(mode: RaceMode): void {
    if (this.role !== 'host' || this.racing || !isRaceMode(mode)) return;
    this.mode = mode;
    this.broadcastLobby();
    this.emit();
  }

  setAIDifficulty(aiDifficulty: AIDifficulty): void {
    if (this.role !== 'host' || this.racing || !isAIDifficulty(aiDifficulty)) return;
    this.aiDifficulty = aiDifficulty;
    this.broadcastLobby();
    this.emit();
  }

  startRace(seed = Math.floor(this.random() * 0xffff_ffff) >>> 0): RoomRaceStart {
    if (this.role !== 'host' || this.status !== 'ready' || this.racing) {
      throw new Error('Only the room host can start this race.');
    }
    const vehicleClasses: Record<NetworkRacerId, GalacticVehicleClass> = {
      ...DEFAULT_VEHICLE_CLASSES,
    };
    const workshopLoadouts = {} as Record<NetworkRacerId, WorkshopLoadout>;
    for (const racerId of NETWORK_RACER_IDS) {
      workshopLoadouts[racerId] = DEFAULT_WORKSHOP_LOADOUTS[vehicleClasses[racerId]];
    }
    for (const member of this.hostMembers.values()) {
      vehicleClasses[member.racerId] = member.vehicleClass;
      workshopLoadouts[member.racerId] = member.workshopLoadout;
    }
    const start = Object.freeze({
      seed: seed >>> 0,
      laps: this.laps,
      mode: this.mode,
      aiDifficulty: this.aiDifficulty,
      vehicleClasses: Object.freeze(vehicleClasses),
      workshopLoadouts: Object.freeze(workshopLoadouts),
    });
    this.resetAuthoritativeRaceDelivery(start.seed);
    this.racing = true;
    this.pendingReturnToLobby = false;
    this.broadcast({ v: PROTOCOL_VERSION, type: 'start', start } satisfies HostPacket);
    this.emit();
    return start;
  }

  consumeStart(): RoomRaceStart | null {
    const start = this.pendingStart;
    this.pendingStart = null;
    return start;
  }

  /**
   * Records semantic output from every host simulation step. Snapshots remain
   * rate-limited, while this bounded journal prevents events between two 20 Hz
   * state frames from disappearing.
   */
  recordAuthoritativeEvents(
    step: number,
    events: readonly RoomAuthoritativeEvent[],
  ): number {
    if (this.role !== 'host'
      || !this.racing
      || !Number.isSafeInteger(step)
      || step < 0
      || step < this.lastQueuedAuthoritativeEventStep) {
      return 0;
    }
    let recorded = 0;
    for (const event of events) {
      const cloned = cloneAuthoritativeEvent(event);
      if (!cloned) continue;
      this.authoritativeEventSequence += 1;
      const envelope = Object.freeze({
        sequence: this.authoritativeEventSequence,
        step,
        event: cloned.event,
      });
      this.authoritativeEventHistory.push(envelope);
      this.authoritativeEventHistoryJsonChars += cloned.jsonChars + 64;
      recorded += 1;
      while (this.authoritativeEventHistory.length > MAX_AUTHORITATIVE_EVENT_HISTORY
        || this.authoritativeEventHistoryJsonChars > MAX_AUTHORITATIVE_EVENT_HISTORY_JSON_CHARS) {
        const removed = this.authoritativeEventHistory.shift();
        if (!removed) break;
        this.authoritativeEventHistoryJsonChars = Math.max(
          2,
          this.authoritativeEventHistoryJsonChars
            - JSON.stringify(removed.event).length
            - 64,
        );
      }
    }
    this.lastQueuedAuthoritativeEventStep = Math.max(
      this.lastQueuedAuthoritativeEventStep,
      step,
    );
    return recorded;
  }

  sendInput(input: PlayerInputState): boolean {
    if (this.role !== 'guest' || !this.racing || !this.guestConnection?.open) return false;
    const normalized = normalizePlayerInput(input);
    const signature = JSON.stringify(normalized);
    const now = this.now();
    if (signature === this.lastInputSignature && now - this.lastInputSentAt < INPUT_HEARTBEAT_MS) {
      return false;
    }
    if ((this.guestConnection.bufferSize ?? 0) >= MAX_INPUT_BUFFER_MESSAGES) return false;
    this.lastInputSignature = signature;
    this.lastInputSentAt = now;
    this.inputSequence += 1;
    return this.safeSend(this.guestConnection, {
      v: PROTOCOL_VERSION,
      type: 'input',
      sequence: this.inputSequence,
      input: normalized,
    } satisfies ClientPacket);
  }

  get remoteInputs(): Readonly<Partial<Record<NetworkRacerId, PlayerInputState>>> {
    if (this.role !== 'host' || !this.racing) return Object.freeze({});
    const now = this.now();
    const inputs: Partial<Record<NetworkRacerId, PlayerInputState>> = {};
    for (const state of this.hostConnections.values()) {
      if (!state.racerId) continue;
      inputs[state.racerId] = now - state.lastInputAt <= INPUT_TIMEOUT_MS
        ? state.lastInput
        : NEUTRAL_PLAYER_INPUT;
    }
    return Object.freeze(inputs);
  }

  broadcastState(state: RaceSimulationState<AIControllerState>): boolean {
    if (this.role !== 'host'
      || !this.racing
      || state.seed !== this.activeRaceSeed
      || state.step < this.lastQueuedAuthoritativeEventStep) return false;
    const now = this.now();
    if (now - this.lastStateBroadcastAt < STATE_BROADCAST_MS) return false;
    const sequence = this.stateSequence + 1;
    let sent = false;
    for (const connectionState of this.hostConnections.values()) {
      const connection = connectionState.connection;
      if (!connection.open || !connectionState.racerId) continue;
      if ((connection.bufferSize ?? 0) >= MAX_STATE_BUFFER_MESSAGES) continue;
      const events = this.authoritativeEventHistory.filter(
        (event) => event.sequence > connectionState.lastEventSequenceSent,
      );
      const connectionSent = this.safeSend(connection, {
        v: PROTOCOL_VERSION,
        type: 'state',
        sequence,
        state,
        events,
      } satisfies HostPacket);
      if (connectionSent) {
        connectionState.lastEventSequenceSent = events.at(-1)?.sequence
          ?? connectionState.lastEventSequenceSent;
        sent = true;
      }
    }
    if (sent) {
      this.stateSequence = sequence;
      this.lastStateBroadcastAt = now;
    }
    return sent;
  }

  consumeAuthoritativeState(): RaceSimulationState<AIControllerState> | null {
    const state = this.pendingState;
    this.pendingState = null;
    return state;
  }

  /** Returns each accepted semantic event exactly once in host sequence order. */
  consumeAuthoritativeEvents(): readonly RoomAuthoritativeEventEnvelope[] {
    if (this.pendingAuthoritativeEvents.length === 0) return EMPTY_AUTHORITATIVE_EVENTS;
    const events = this.pendingAuthoritativeEvents.splice(0);
    return Object.freeze(events);
  }

  returnToLobby(): void {
    if (this.role !== 'host') return;
    this.racing = false;
    this.pendingStart = null;
    this.pendingReturnToLobby = false;
    this.resetAuthoritativeRaceDelivery(null);
    for (const connectionState of this.hostConnections.values()) {
      connectionState.lastInput = NEUTRAL_PLAYER_INPUT;
      connectionState.lastInputAt = Number.NEGATIVE_INFINITY;
      connectionState.lastInputSequence = -1;
    }
    this.broadcast({ v: PROTOCOL_VERSION, type: 'return-to-lobby' } satisfies HostPacket);
    this.emit();
  }

  consumeReturnToLobby(): boolean {
    const pending = this.pendingReturnToLobby;
    this.pendingReturnToLobby = false;
    return pending;
  }

  private resetAuthoritativeRaceDelivery(seed: number | null): void {
    this.pendingState = null;
    this.pendingAuthoritativeEvents.length = 0;
    this.stateSequence = 0;
    this.lastStateBroadcastAt = Number.NEGATIVE_INFINITY;
    this.lastReceivedStateSequence = -1;
    this.lastReceivedStateStep = -1;
    this.activeRaceSeed = seed;
    this.authoritativeEventSequence = 0;
    this.lastQueuedAuthoritativeEventStep = -1;
    this.authoritativeEventHistory.length = 0;
    this.authoritativeEventHistoryJsonChars = 2;
    this.lastReceivedAuthoritativeEventSequence = 0;
    this.lastReceivedAuthoritativeEventStep = -1;
    for (const connectionState of this.hostConnections.values()) {
      connectionState.lastEventSequenceSent = 0;
    }
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error('RoomSession has been disposed.');
  }

  private isCurrentEpoch(epoch: number): boolean {
    return !this.disposed && epoch === this.transportEpoch;
  }

  private reconnectSignaling(peer: RoomPeer, epoch: number): void {
    if (!this.isCurrentEpoch(epoch) || this.peer !== peer || peer.destroyed) return;
    if (typeof peer.reconnect !== 'function') {
      this.fail('Room signaling disconnected.');
      return;
    }
    this.status = 'connecting';
    this.errorValue = null;
    this.emit();
    try {
      peer.reconnect();
    } catch (error) {
      this.fail(errorMessage(error, 'Room signaling could not reconnect.'));
    }
  }

  private makeRoomCode(): string {
    let code = '';
    for (let index = 0; index < 6; index += 1) {
      const pick = Math.floor(this.random() * ROOM_ALPHABET.length) % ROOM_ALPHABET.length;
      code += ROOM_ALPHABET[pick] ?? 'X';
    }
    return code;
  }

  private async openPeer(id?: string): Promise<RoomPeer> {
    const peer = await this.peerFactory(id);
    if (peer.open) return peer;
    return await new Promise<RoomPeer>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        peer.destroy();
        reject(new Error('Signaling service timed out.'));
      }, this.joinTimeoutMs);
      peer.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(peer);
      });
      peer.on('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.destroy();
        reject(error);
      });
    });
  }

  private installHostPeerHandlers(peer: RoomPeer, epoch: number): void {
    peer.on('connection', (connection) => {
      if (!this.isCurrentEpoch(epoch) || this.peer !== peer) return;
      if (!this.isConnection(connection)) return;
      this.installHostConnectionHandlers(connection, epoch);
    });
    peer.on('open', () => {
      if (!this.isCurrentEpoch(epoch) || this.peer !== peer) return;
      this.status = 'ready';
      this.errorValue = null;
      this.emit();
    });
    peer.on('error', (error) => {
      if (this.isCurrentEpoch(epoch) && this.peer === peer) {
        this.fail(errorMessage(error, 'Room signaling failed.'));
      }
    });
    peer.on('close', () => {
      if (this.isCurrentEpoch(epoch) && this.peer === peer) {
        this.fail('Room signaling closed.');
      }
    });
    peer.on('disconnected', () => this.reconnectSignaling(peer, epoch));
  }

  private installGuestPeerHandlers(peer: RoomPeer, epoch: number): void {
    peer.on('open', () => {
      if (!this.isCurrentEpoch(epoch) || this.peer !== peer) return;
      this.status = this.localRacerIdValue ? 'waiting' : 'connecting';
      this.errorValue = null;
      this.emit();
    });
    peer.on('error', (error) => {
      if (!this.isCurrentEpoch(epoch) || this.peer !== peer) return;
      const message = errorMessage(error, 'Room connection failed.');
      this.rejectJoin(new Error(message));
      this.fail(message);
    });
    peer.on('close', () => {
      if (!this.isCurrentEpoch(epoch) || this.peer !== peer) return;
      const error = new Error('Room signaling closed.');
      this.rejectJoin(error);
      this.fail(error.message);
    });
    peer.on('disconnected', () => this.reconnectSignaling(peer, epoch));
  }

  private installHostConnectionHandlers(connection: RoomDataConnection, epoch: number): void {
    if (this.hostConnections.has(connection.peer)) {
      connection.close();
      return;
    }
    const state: HostConnectionState = {
      connection,
      racerId: null,
      lastInput: NEUTRAL_PLAYER_INPUT,
      lastInputAt: Number.NEGATIVE_INFINITY,
      lastInputSequence: -1,
      lastEventSequenceSent: 0,
    };
    this.hostConnections.set(connection.peer, state);
    connection.on('data', (data) => {
      if (this.isCurrentEpoch(epoch)) this.handleClientPacket(state, data);
    });
    connection.on('close', () => {
      if (this.isCurrentEpoch(epoch)) this.removeHostConnection(connection.peer);
    });
    connection.on('error', () => {
      if (this.isCurrentEpoch(epoch)) this.removeHostConnection(connection.peer);
    });
  }

  private installGuestConnectionHandlers(
    connection: RoomDataConnection,
    profile: RoomProfile,
    epoch: number,
  ): void {
    const sendHello = (): void => {
      if (!this.isCurrentEpoch(epoch) || this.guestConnection !== connection) return;
      this.safeSend(connection, { v: PROTOCOL_VERSION, type: 'hello', profile } satisfies ClientPacket);
    };
    connection.on('open', sendHello);
    connection.on('data', (data) => {
      if (this.isCurrentEpoch(epoch) && this.guestConnection === connection) {
        this.handleHostPacket(data);
      }
    });
    connection.on('close', () => {
      if (!this.isCurrentEpoch(epoch) || this.guestConnection !== connection || this.role !== 'guest') return;
      if (this.status === 'error') return;
      const error = new Error('The host closed the room.');
      this.rejectJoin(error);
      this.fail(error.message);
    });
    connection.on('error', (error) => {
      if (!this.isCurrentEpoch(epoch) || this.guestConnection !== connection) return;
      const message = errorMessage(error, 'Room data connection failed.');
      this.rejectJoin(new Error(message));
      this.fail(message);
    });
    if (connection.open) sendHello();
  }

  private handleClientPacket(state: HostConnectionState, data: unknown): void {
    if (!isRecord(data) || data.v !== PROTOCOL_VERSION || typeof data.type !== 'string') {
      if (!state.racerId) state.connection.close();
      return;
    }
    if (data.type === 'hello') {
      if (state.racerId) return;
      const profile = parseProfile(data.profile);
      if (!profile || this.racing) {
        this.safeSend(state.connection, {
          v: PROTOCOL_VERSION,
          type: 'error',
          message: this.racing ? 'That race has already started.' : 'Invalid room profile.',
        } satisfies HostPacket);
        state.connection.close();
        return;
      }
      const racerId = NETWORK_RACER_IDS.slice(1).find((id) => !this.hostMembers.has(id));
      if (!racerId) {
        this.safeSend(state.connection, {
          v: PROTOCOL_VERSION,
          type: 'error',
          message: 'That room is full.',
        } satisfies HostPacket);
        state.connection.close();
        return;
      }
      state.racerId = racerId;
      state.lastInputAt = this.now();
      this.hostMembers.set(racerId, { racerId, ...profile, isHost: false });
      this.safeSend(state.connection, {
        v: PROTOCOL_VERSION,
        type: 'welcome',
        code: this.code,
        laps: this.laps,
        mode: this.mode,
        aiDifficulty: this.aiDifficulty,
        localRacerId: racerId,
        members: this.wireMembers(),
      } satisfies HostPacket);
      this.broadcastLobby();
      this.emit();
      return;
    }
    if (!state.racerId) return;
    if (data.type === 'profile') {
      if (this.racing) return;
      const profile = parseProfile(data.profile);
      if (!profile) return;
      const previous = this.hostMembers.get(state.racerId);
      if (!previous) return;
      this.hostMembers.set(state.racerId, { ...previous, ...profile });
      this.broadcastLobby();
      this.emit();
      return;
    }
    if (data.type === 'input') {
      const input = parsePlayerInput(data.input);
      if (!this.racing
        || typeof data.sequence !== 'number'
        || !Number.isSafeInteger(data.sequence)
        || data.sequence <= state.lastInputSequence
        || !input) {
        return;
      }
      state.lastInputSequence = data.sequence;
      state.lastInput = input;
      state.lastInputAt = this.now();
      return;
    }
    if (data.type === 'leave') state.connection.close();
  }

  private handleHostPacket(data: unknown): void {
    if (!isRecord(data) || data.v !== PROTOCOL_VERSION || typeof data.type !== 'string') return;
    if (data.type === 'welcome') {
      const members = parseMembers(data.members);
      const normalizedCode = typeof data.code === 'string' ? normalizeRoomCode(data.code) : '';
      const localMember = members?.find((member) => member.racerId === data.localRacerId);
      if (!members
        || !isValidRoomCode(normalizedCode)
        || normalizedCode !== this.code
        || ![1, 2, 3].includes(Number(data.laps))
        || !isRaceMode(data.mode)
        || !isAIDifficulty(data.aiDifficulty)
        || !NETWORK_RACER_IDS.includes(data.localRacerId as NetworkRacerId)
        || data.localRacerId === 'player'
        || !hasValidHost(members)
        || !localMember
        || localMember.isHost) {
        return;
      }
      this.code = normalizedCode;
      this.laps = Number(data.laps) as RoomLapCount;
      this.mode = data.mode;
      this.aiDifficulty = data.aiDifficulty;
      this.localRacerIdValue = data.localRacerId as NetworkRacerId;
      this.guestMembers = members;
      this.status = 'waiting';
      this.errorValue = null;
      this.resolveJoin();
      this.emit();
      return;
    }
    if (data.type === 'lobby') {
      const members = parseMembers(data.members);
      if (!members
        || ![1, 2, 3].includes(Number(data.laps))
        || !isRaceMode(data.mode)
        || !isAIDifficulty(data.aiDifficulty)
        || !hasValidHost(members)
        || !this.localRacerIdValue
        || !members.some((member) => member.racerId === this.localRacerIdValue)) return;
      this.guestMembers = members;
      this.laps = Number(data.laps) as RoomLapCount;
      this.mode = data.mode;
      this.aiDifficulty = data.aiDifficulty;
      this.emit();
      return;
    }
    if (data.type === 'start') {
      const start = this.parseRaceStart(data.start);
      if (!start || !this.localRacerIdValue) return;
      this.resetAuthoritativeRaceDelivery(start.seed);
      this.racing = true;
      this.pendingStart = start;
      this.pendingReturnToLobby = false;
      this.emit();
      return;
    }
    if (data.type === 'state') {
      const state = parseRaceState(data.state);
      const events = state
        ? parseAuthoritativeEventEnvelopes(data.events, state.step)
        : null;
      if (!this.racing
        || typeof data.sequence !== 'number'
        || !Number.isSafeInteger(data.sequence)
        || data.sequence <= this.lastReceivedStateSequence
        || !state
        || events === null
        || state.seed !== this.activeRaceSeed
        || state.step < this.lastReceivedStateStep) {
        return;
      }
      const freshEvents = events.filter(
        (event) => event.sequence > this.lastReceivedAuthoritativeEventSequence,
      );
      if (freshEvents.some(
        (event) => event.step < this.lastReceivedAuthoritativeEventStep,
      )) return;
      this.lastReceivedStateSequence = data.sequence;
      this.lastReceivedStateStep = state.step;
      this.pendingState = state;
      if (freshEvents.length > 0) {
        const last = freshEvents.at(-1);
        if (!last) return;
        this.lastReceivedAuthoritativeEventSequence = last.sequence;
        this.lastReceivedAuthoritativeEventStep = last.step;
        this.pendingAuthoritativeEvents.push(...freshEvents);
        if (this.pendingAuthoritativeEvents.length > MAX_AUTHORITATIVE_EVENT_HISTORY) {
          this.pendingAuthoritativeEvents.splice(
            0,
            this.pendingAuthoritativeEvents.length - MAX_AUTHORITATIVE_EVENT_HISTORY,
          );
        }
      }
      return;
    }
    if (data.type === 'return-to-lobby') {
      this.racing = false;
      this.pendingStart = null;
      this.resetAuthoritativeRaceDelivery(null);
      this.pendingReturnToLobby = true;
      this.inputSequence = 0;
      this.lastInputSignature = '';
      this.lastInputSentAt = Number.NEGATIVE_INFINITY;
      this.status = 'waiting';
      this.errorValue = null;
      this.emit();
      return;
    }
    if (data.type === 'error' && typeof data.message === 'string') {
      const error = new Error(data.message.slice(0, 160));
      this.rejectJoin(error);
      this.fail(error.message);
    }
  }

  private parseRaceStart(value: unknown): RoomRaceStart | null {
    if (!isRecord(value)
      || !Number.isSafeInteger(value.seed)
      || ![1, 2, 3].includes(Number(value.laps))
      || !isRaceMode(value.mode)
      || !isAIDifficulty(value.aiDifficulty)
      || !isRecord(value.vehicleClasses)) {
      return null;
    }
    const vehicleClasses = {} as Record<NetworkRacerId, GalacticVehicleClass>;
    const workshopLoadouts = {} as Record<NetworkRacerId, WorkshopLoadout>;
    const rawWorkshopLoadouts = isRecord(value.workshopLoadouts) ? value.workshopLoadouts : {};
    for (const racerId of NETWORK_RACER_IDS) {
      const vehicleClass = value.vehicleClasses[racerId];
      if (!isVehicleClass(vehicleClass)) return null;
      vehicleClasses[racerId] = vehicleClass;
      const candidate = sanitizeWorkshopLoadout(rawWorkshopLoadouts[racerId], vehicleClass);
      workshopLoadouts[racerId] = candidate.vehicleClass === vehicleClass
        ? candidate
        : DEFAULT_WORKSHOP_LOADOUTS[vehicleClass];
    }
    return Object.freeze({
      seed: Number(value.seed) >>> 0,
      laps: Number(value.laps) as RoomLapCount,
      mode: value.mode,
      aiDifficulty: value.aiDifficulty,
      vehicleClasses: Object.freeze(vehicleClasses),
      workshopLoadouts: Object.freeze(workshopLoadouts),
    });
  }

  private wireMembers(): readonly WireMember[] {
    return NETWORK_RACER_IDS.flatMap((id) => {
      const member = this.hostMembers.get(id);
      return member ? [Object.freeze({ ...member })] : [];
    });
  }

  private broadcastLobby(): void {
    if (this.role !== 'host') return;
    this.broadcast({
      v: PROTOCOL_VERSION,
      type: 'lobby',
      laps: this.laps,
      mode: this.mode,
      aiDifficulty: this.aiDifficulty,
      members: this.wireMembers(),
    } satisfies HostPacket);
  }

  private broadcast(packet: HostPacket): void {
    for (const state of this.hostConnections.values()) {
      if (!state.racerId || !state.connection.open) continue;
      this.safeSend(state.connection, packet);
    }
  }

  private removeHostConnection(peerId: string): void {
    const state = this.hostConnections.get(peerId);
    if (!state) return;
    this.hostConnections.delete(peerId);
    if (state.racerId) this.hostMembers.delete(state.racerId);
    this.broadcastLobby();
    this.emit();
  }

  private isConnection(value: unknown): value is RoomDataConnection {
    return isRecord(value)
      && typeof value.peer === 'string'
      && typeof value.on === 'function'
      && typeof value.send === 'function'
      && typeof value.close === 'function';
  }

  private safeSend(connection: RoomDataConnection, packet: ClientPacket | HostPacket): boolean {
    if (!connection.open) return false;
    try {
      const result = connection.send(packet);
      if (result && typeof result.catch === 'function') void result.catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  private fail(message: string): void {
    this.status = 'error';
    this.errorValue = message.slice(0, 160);
    this.emit();
  }

  private emit(): void {
    const snapshot = this.lobby;
    for (const listener of this.listeners) listener(snapshot);
  }

  private resolveJoin(): void {
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    const resolve = this.joinResolve;
    this.joinResolve = null;
    this.joinReject = null;
    resolve?.(this.lobby);
  }

  private rejectJoin(error: Error): void {
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    const reject = this.joinReject;
    this.joinResolve = null;
    this.joinReject = null;
    reject?.(error);
  }

  private resetTransport(): void {
    this.transportEpoch += 1;
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    this.rejectJoin(new Error('Room connection cancelled.'));
    for (const state of this.hostConnections.values()) state.connection.close();
    this.hostConnections.clear();
    this.hostMembers.clear();
    this.guestConnection?.close();
    this.guestConnection = null;
    this.peer?.destroy();
    this.peer = null;
    this.guestMembers = [];
    this.pendingStart = null;
    this.pendingReturnToLobby = false;
    this.resetAuthoritativeRaceDelivery(null);
    this.inputSequence = 0;
    this.lastInputSignature = '';
    this.lastInputSentAt = Number.NEGATIVE_INFINITY;
    this.racing = false;
  }
}
