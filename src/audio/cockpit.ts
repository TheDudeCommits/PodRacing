import type { CockpitCue } from '../ui/CockpitConsole';

/** Downloaded Kenney Interface Sounds, CC0. No generated/synthesized fallback. */
export const COCKPIT_RECORDINGS: Record<CockpitCue, { url: string; gain: number }> = {
  press: { url: '/audio/cockpit/press.ogg', gain: .5 },
  select: { url: '/audio/cockpit/select.ogg', gain: .38 },
  open: { url: '/audio/cockpit/open.ogg', gain: .3 },
  launch: { url: '/audio/cockpit/launch.ogg', gain: .6 },
};
