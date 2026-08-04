import type {
  CaptureCamera,
  CapturePreset,
  ExpansionCaptureCamera,
  ExpansionCapturePreset,
  ReviewCaptureCamera,
  ReviewCapturePreset,
} from './reviewTypes';

export const CAPTURE_PRESETS = [
  'desert',
  'countdown',
  'race',
  'airtime',
  'drift',
  'finish',
] as const satisfies readonly CapturePreset[];

export const CAPTURE_CAMERAS = [
  'chase',
  'hero',
  'side',
  'course',
  'cockpit',
] as const satisfies readonly CaptureCamera[];

export const EXPANSION_CAPTURE_PRESETS = [
  'vehicle-showcase',
  'weapon-fired',
  'shield-active',
  'mine-trigger',
  'hazard',
  'redline',
  'wreck',
  'recovery',
  'upgrade',
  'combat-stress',
] as const satisfies readonly ExpansionCapturePreset[];

export const EXPANSION_CAPTURE_CAMERAS = [
  'overhead',
  'impact',
] as const satisfies readonly ExpansionCaptureCamera[];

export const REVIEW_CAPTURE_PRESETS: readonly ReviewCapturePreset[] = [
  ...CAPTURE_PRESETS,
  ...EXPANSION_CAPTURE_PRESETS,
];

export const REVIEW_CAPTURE_CAMERAS: readonly ReviewCaptureCamera[] = [
  ...CAPTURE_CAMERAS,
  ...EXPANSION_CAPTURE_CAMERAS,
];

export function isCapturePreset(value: string): value is CapturePreset {
  return (CAPTURE_PRESETS as readonly string[]).includes(value);
}

export function isCaptureCamera(value: string): value is CaptureCamera {
  return (CAPTURE_CAMERAS as readonly string[]).includes(value);
}

export function isReviewCapturePreset(value: string): value is ReviewCapturePreset {
  return (REVIEW_CAPTURE_PRESETS as readonly string[]).includes(value);
}

export function isReviewCaptureCamera(value: string): value is ReviewCaptureCamera {
  return (REVIEW_CAPTURE_CAMERAS as readonly string[]).includes(value);
}
