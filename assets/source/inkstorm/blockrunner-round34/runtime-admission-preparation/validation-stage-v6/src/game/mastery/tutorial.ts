import type { RaceStepResult } from '../race/RaceSimulation';
import type { TutorialCue } from './types';

const LESSONS = [
  ['Launch', 'Tap throttle during the countdown. Keep the rev needle near the launch marker.'],
  ['Build speed', 'Hold throttle and follow the racing gates. Reach 180 km/h.'],
  ['Brake before the bend', 'Brake on the approach. Scrub at least 35 km/h before turning in.'],
  ['Drift, then release', 'Hold drift while steering through a bend. Release drift when the exit opens to earn a burst.'],
  ['Manage engine heat', 'Use redline on a straight, then release it and let heat fall below 18%.'],
] as const;

/** Success is earned from actual control/physics events; time alone never passes a lesson. */
export class DrivingTutorial {
  private stage = 0;
  private peakSpeed = 0;
  private warmedEngine = false;
  private progressValue = 0;
  private countdownThrottle = false;
  private releasedGrid = false;

  reset(): void { this.stage = 0; this.peakSpeed = 0; this.warmedEngine = false; this.progressValue = 0; this.countdownThrottle = false; this.releasedGrid = false; }

  observe(result: RaceStepResult, playerId: string): void {
    if (this.stage >= LESSONS.length) return;
    const player = result.state.entries.find((entry) => entry.id === playerId);
    if (!player) return;
    const input = result.inputs[playerId];
    const speed = player.vehicle.telemetry.speed;
    const heat = player.galactic?.redline.heat ?? player.vehicle.heat;
    this.peakSpeed = Math.max(this.peakSpeed, speed);
    let passed = false;
    switch (this.stage) {
      case 0:
        if (result.state.phase === 'countdown' && (input?.throttle ?? 0) > 0.25) this.countdownThrottle = true;
        this.releasedGrid = result.state.phase === 'racing';
        this.progressValue = this.countdownThrottle ? 0.5 : Math.min(0.5, speed / 10);
        passed = this.releasedGrid && (this.countdownThrottle || ((input?.throttle ?? 0) > 0.25 && speed >= 5));
        break;
      case 1:
        this.progressValue = Math.min(1, speed / 50);
        passed = speed >= 50 && (input?.throttle ?? 0) > 0.25;
        break;
      case 2:
        this.progressValue = input?.brake ? Math.min(1, (this.peakSpeed - speed) / 10) : 0;
        passed = (input?.brake ?? 0) > 0.35 && this.peakSpeed - speed >= 10;
        break;
      case 3:
        this.progressValue = Math.min(0.9, player.vehicle.drift.charge * 2);
        passed = (result.vehicleEvents[playerId] ?? []).some((event) => event.type === 'drift-boost');
        break;
      case 4:
        if (input?.boost && heat >= 0.22) this.warmedEngine = true;
        this.progressValue = this.warmedEngine ? Math.max(0.5, 1 - heat) : Math.min(0.45, heat * 2);
        passed = this.warmedEngine && !input?.boost && heat < 0.18;
        break;
    }
    if (passed) { this.stage += 1; this.progressValue = 0; this.peakSpeed = speed; }
  }

  get complete(): boolean { return this.stage >= LESSONS.length; }
  get cue(): TutorialCue {
    const lesson = LESSONS[this.stage];
    return { step: Math.min(this.stage + 1, LESSONS.length), total: LESSONS.length,
      title: lesson?.[0] ?? 'Flight school complete',
      instruction: this.stage === 0 && this.releasedGrid
        ? 'Hold throttle to launch. On your next attempt, tap throttle during the countdown to prime the engines.'
        : lesson?.[1] ?? 'Finish the lap, then take your skills into Time Attack.',
      progress: this.complete ? 1 : Math.max(0, Math.min(1, this.progressValue)), complete: this.complete };
  }
}
