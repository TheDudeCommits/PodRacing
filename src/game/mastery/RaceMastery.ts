import type { RaceStepResult } from '../race/RaceSimulation';
import { CHAMPIONSHIP_EVENT_IDS, CHAMPIONSHIP_POINTS, DEFAULT_MASTERY_EVENT_ID, MASTERY_EVENTS, MASTERY_GENERATOR_VERSION, dailyMasteryEvent, getMasteryEvent } from './events';
import { PersonalBestGhostRecorder, sampleGhost } from './ghost';
import { browserMasteryStorage, createRecordIdentity, loadMasteryProfile, recordIdentityKey, saveMasteryProfile, type MasteryStorage } from './storage';
import { DrivingTutorial } from './tutorial';
import { masterySectors, masteryRetryTarget } from './sectors';
import type { GhostPose, HudMasteryViewModel, MasteryEvent, MasteryMedal, MasteryRecord, MasteryResult, MasterySector, MasteryStartOptions, RecordIdentity } from './types';

export function medalForTime(time: number, event: MasteryEvent): MasteryMedal {
  if (!Number.isFinite(time) || time <= 0) return 'none';
  if (time <= event.medalTimes.gold) return 'gold';
  if (time <= event.medalTimes.silver) return 'silver';
  if (time <= event.medalTimes.bronze) return 'bronze';
  return 'none';
}

export class RaceMastery {
  readonly profile;
  private eventValue: MasteryEvent;
  private identity: RecordIdentity | null = null;
  private identityKey = '';
  private previousBest: MasteryRecord | null = null;
  private readonly recorder = new PersonalBestGhostRecorder();
  private readonly lesson = new DrivingTutorial();
  private playerId = 'player';
  private running = false;
  private resultValue: MasteryResult | null = null;
  private latestSectorValue: MasterySector | null = null;
  private invalidReason: string | null = null;
  private eligible = true;
  private lastStep = -1;
  private lastSplitCount = 0;
  private storageWarning: string | null = null;
  private sessionOrdinal = 0;
  private sectorLabels: readonly string[] = [];
  private pursuit: { identityKey: string; target: NonNullable<MasteryResult['retryTarget']> } | null = null;

  constructor(private readonly storage: MasteryStorage | null = browserMasteryStorage(), private readonly now: () => Date = () => new Date()) {
    this.profile = loadMasteryProfile(storage);
    this.eventValue = getMasteryEvent(DEFAULT_MASTERY_EVENT_ID, this.now());
  }

  get selectedEvent(): MasteryEvent { return this.eventValue; }
  get result(): MasteryResult | null { return this.resultValue; }

  cancelRun(): void { this.running = false; }

  selectEvent(id: string): MasteryEvent {
    const favorite = this.profile.favorites.find((course) => course.id === id);
    this.eventValue = favorite ? {
      ...getMasteryEvent('inkstorm-trial'), id: favorite.id, title: favorite.title,
      subtitle: 'Saved course • One clean lap with a stock machine.', courseId: favorite.id, seed: favorite.seed,
    } : getMasteryEvent(id, this.now());
    this.running = false;
    this.identity = null;
    this.previousBest = null;
    this.resultValue = null;
    this.latestSectorValue = null;
    this.pursuit = null;
    return this.eventValue;
  }

  /** Call after the final class/build/course selection, before the first fixed tick. */
  beginRun(options: MasteryStartOptions): void {
    this.eventValue = options.event;
    this.identity = createRecordIdentity(options);
    this.identityKey = recordIdentityKey(this.identity);
    this.previousBest = this.profile.records[this.identityKey] ?? null;
    this.sectorLabels = options.sectorLabels ?? [];
    this.playerId = options.playerId ?? 'player';
    this.running = true;
    this.resultValue = null;
    this.latestSectorValue = null;
    this.invalidReason = null;
    this.eligible = options.recordEligible !== false;
    this.lastStep = -1;
    this.lastSplitCount = 0;
    this.sessionOrdinal += 1;
    this.recorder.reset();
    this.lesson.reset();
  }

  /** Observe authoritative steps only. Calling twice for a tick is harmless. */
  step(result: RaceStepResult): void {
    if (!this.running || !this.identity || result.state.step <= this.lastStep) return;
    this.lastStep = result.state.step;
    const player = result.state.entries.find((entry) => entry.id === this.playerId);
    if (!player) return;
    if (this.eventValue.profile === 'training') {
      this.lesson.observe(result, this.playerId);
      if (this.lesson.complete && !this.profile.tutorialComplete && this.eligible) {
        this.profile.tutorialComplete = true;
        this.persist();
      }
    }
    if (result.state.phase === 'countdown') {
      this.recorder.record(0, player.vehicle, true);
      return;
    }
    this.recorder.record(result.state.raceTime, player.vehicle);
    const recovered = (result.vehicleEvents[this.playerId] ?? []).some((event) => event.type === 'reset');
    const wrecked = result.galacticEvents.some((event) => event.type === 'wreck' && event.racerId === this.playerId);
    if (recovered || wrecked) {
      this.invalidReason = 'Recovery used — finish for practice, then retry for a clean record.';
      if (this.latestSectorValue) this.latestSectorValue = { ...this.latestSectorValue, delta: null, paceDelta: null };
    }
    if (player.progress.splits.length > this.lastSplitCount) {
      this.latestSectorValue = masterySectors(player.progress.splits, this.previousBest?.sectors, this.sectorLabels).at(-1)!;
      if (this.invalidReason || !this.eligible) this.latestSectorValue = { ...this.latestSectorValue, delta: null, paceDelta: null };
      this.lastSplitCount = player.progress.splits.length;
    }
    if (player.progress.finishTime !== null && !this.resultValue) {
      const time = player.progress.finishTime;
      if (!Number.isFinite(time) || time <= 0) return;
      if (player.progress.completedLaps !== this.identity.laps) {
        this.invalidReason ??= 'Full course not completed — only complete clean runs set time records.';
      }
      this.recorder.record(time, player.vehicle, true);
      const valid = this.eligible && !this.invalidReason && player.progress.completedLaps === this.identity.laps && time > 0;
      const previousTime = this.previousBest?.time ?? null;
      const personalBest = valid && (previousTime === null || time < previousTime - 0.00001);
      const medal = valid ? medalForTime(time, this.eventValue) : 'none';
      const recordedAt = this.now().toISOString();
      if (personalBest) {
        this.profile.records[this.identityKey] = { identity: this.identity, time,
          lapTimes: player.progress.lapTimes.slice(), sectors: player.progress.splits.map((split) => split.segmentTime),
          medal, recordedAt, ghost: this.recorder.finish(this.identityKey, time) };
      }
      if (this.eligible) {
        this.profile.history.push({ id: `${recordedAt}-${this.sessionOrdinal}`, eventId: this.eventValue.id,
          time, placement: player.progress.placement ?? 1, medal, valid, recordedAt });
      }
      // Choose the nearest attainable medal, not the largest time improvement.
      const target = (['bronze', 'silver', 'gold'] as const).find((tier) => time > this.eventValue.medalTimes[tier]);
      const sectors = masterySectors(player.progress.splits, this.previousBest?.sectors, this.sectorLabels);
      // A new PB replaces the benchmark for the next run. Keep the historical
      // result deltas, but never carry a pursuit against the overwritten PB.
      const retryTarget = valid && !personalBest ? masteryRetryTarget(sectors) : null;
      this.pursuit = retryTarget ? { identityKey: this.identityKey, target: retryTarget } : null;
      this.resultValue = {
        eventTitle: this.eventValue.title, time, personalBest, bestTime: personalBest ? time : previousTime,
        improvement: personalBest && previousTime !== null ? previousTime - time : null,
        medal, nextMedal: target ? { medal: target, time: this.eventValue.medalTimes[target] } : null,
        sectors, retryTarget,
        invalidReason: this.eligible ? this.invalidReason : 'Practice session — local competitive records are disabled.',
        nextEventId: null,
        nextObjective: this.eventValue.profile === 'training'
          ? this.lesson.complete ? 'Flight school complete. Take on Inkstorm Time Attack.' : 'Retry Flight School to finish the driving lessons.'
          : this.invalidReason ? 'Retry the same course and complete a lap without recovery.'
          : target ? `Find ${(time - this.eventValue.medalTimes[target]).toFixed(2)}s for ${target}.` : 'Gold earned. Race your ghost or enter the Inkstorm Cup.',
      };
      if (this.eventValue.profile === 'training' && this.lesson.complete) this.resultValue.nextEventId = 'inkstorm-trial';
      if (this.eligible) this.persist();
    }
    if (result.state.phase === 'finished') {
      this.finishChampionship(result);
      this.running = false;
    }
  }

  ghostPose(time: number): GhostPose | null {
    return this.profile.ghostEnabled ? sampleGhost(this.previousBest?.ghost ?? null, time) : null;
  }

  toggleGhost(): boolean { this.profile.ghostEnabled = !this.profile.ghostEnabled; this.persist(); return this.profile.ghostEnabled; }

  saveCourse(seed = this.identity?.courseSeed ?? this.eventValue.seed): void {
    const id = `saved-${seed >>> 0}`;
    if (this.profile.favorites.some((course) => course.seed === (seed >>> 0))) return;
    this.profile.favorites.push({ id, title: `Saved • ${this.eventValue.title.replace(' • Time Attack', '')}`,
      seed: seed >>> 0, generatorVersion: MASTERY_GENERATOR_VERSION, savedAt: this.now().toISOString() });
    this.persist();
  }

  restartChampionship(): MasteryEvent {
    this.profile.championship.rounds = [];
    this.persist();
    return this.selectEvent(CHAMPIONSHIP_EVENT_IDS[0]);
  }

  model(preview?: MasteryStartOptions): HudMasteryViewModel {
    const key = preview ? recordIdentityKey(createRecordIdentity(preview)) : this.identityKey;
    const record = this.profile.records[key] ?? null;
    const event = preview?.event ?? this.eventValue;
    const standings = new Map<string, { name: string; points: number; isPlayer: boolean }>();
    for (const round of this.profile.championship.rounds) for (const entry of round.results) {
      const previous = standings.get(entry.id);
      standings.set(entry.id, { name: entry.name, points: (previous?.points ?? 0) + entry.points, isPlayer: entry.id === this.playerId });
    }
    const daily = dailyMasteryEvent(this.now());
    return {
      eventId: event.id, eventTitle: event.title, eventSubtitle: event.subtitle,
      events: [...MASTERY_EVENTS, daily, ...this.profile.favorites.map((course) => ({ id: course.id, title: course.title, subtitle: 'Saved circuit • stock time attack' }))]
        .map(({ id, title, subtitle }) => ({ id, title, subtitle })),
      bestTime: record?.time ?? null, medal: record?.medal ?? 'none', ghostAvailable: !!record?.ghost,
      ghostEnabled: this.profile.ghostEnabled,
      courseSaved: this.profile.favorites.some((course) => course.seed === (preview?.courseSeed ?? this.identity?.courseSeed ?? event.seed)),
      latestSector: this.latestSectorValue,
      retryTarget: this.pursuit?.identityKey === key ? this.pursuit.target : null,
      tutorial: event.profile === 'training' ? this.lesson.cue : null,
      result: this.resultValue, championship: [...standings.values()].sort((a, b) => b.points - a.points),
      championshipRound: this.profile.championship.rounds.length,
      championshipContext: event.championshipRound ? event.championshipRound === this.profile.championship.rounds.length + 1
        ? { title: `Cup round ${event.championshipRound} of 3`,
          detail: event.championshipRound === 1 ? 'Begin a three-round championship. Points carry across all three circuits.' : 'This is your next unplayed round. Its points will join your championship standings.',
          actionLabel: event.championshipRound === 1 ? 'Start championship' : 'Continue championship' }
        : { title: 'Single-round practice', detail: 'This round is outside your current championship sequence. Practice earns a course record, but does not add cup points.', actionLabel: 'Practice this round' }
        : undefined,
      storageWarning: this.storageWarning,
      archiveNotice: this.profile.archivedRecords.length + this.profile.archivedFavorites.length > 0
        ? `Earlier editions: ${this.profile.archivedRecords.length} records and ${this.profile.archivedFavorites.length} saved courses preserved.` : null,
    };
  }

  private finishChampionship(result: RaceStepResult): void {
    if (!this.eligible || !this.eventValue.championshipRound || !this.resultValue) return;
    const roundIndex = this.eventValue.championshipRound - 1;
    if (roundIndex !== this.profile.championship.rounds.length) {
      this.resultValue.nextObjective = 'Cup practice complete. Continue the next unplayed round or start a new cup.';
      this.resultValue.nextEventId = CHAMPIONSHIP_EVENT_IDS[this.profile.championship.rounds.length] ?? null;
      return;
    }
    this.profile.championship.rounds.push({ eventId: this.eventValue.id, results: result.state.results.map((entry) => ({
      id: entry.id, name: entry.name, placement: entry.placement, points: CHAMPIONSHIP_POINTS[entry.placement - 1] ?? 0,
    })) });
    const next = CHAMPIONSHIP_EVENT_IDS[roundIndex + 1] ?? null;
    this.resultValue.nextEventId = next;
    this.resultValue.nextObjective = next ? 'Points banked. Continue to the next Inkstorm Cup round.' : 'Inkstorm Cup complete. Start a new cup or chase a gold time.';
    this.persist();
  }

  private persist(): void { this.storageWarning = saveMasteryProfile(this.profile, this.storage); }
}
