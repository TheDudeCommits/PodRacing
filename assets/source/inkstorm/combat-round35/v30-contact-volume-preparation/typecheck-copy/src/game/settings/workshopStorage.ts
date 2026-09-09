import {
  DEFAULT_WORKSHOP_LOADOUTS,
  GALACTIC_VEHICLE_ORDER,
  sanitizeWorkshopLoadout,
  type GalacticVehicleClass,
  type WorkshopLoadout,
} from '../galactic';
import { resolveBrowserSettingsStorage, type SettingsStorage } from './storage';

export const WORKSHOP_GARAGE_STORAGE_KEY = 'now-this-is-podracing.workshop';
export const WORKSHOP_GARAGE_VERSION = 1 as const;
const MAX_WORKSHOP_JSON_LENGTH = 128_000;

export interface WorkshopGarageSave {
  version: typeof WORKSHOP_GARAGE_VERSION;
  loadouts: Readonly<Record<GalacticVehicleClass, WorkshopLoadout>>;
}

function freezeGarage(loadouts: Record<GalacticVehicleClass, WorkshopLoadout>): Readonly<WorkshopGarageSave> {
  return Object.freeze({
    version: WORKSHOP_GARAGE_VERSION,
    loadouts: Object.freeze(loadouts),
  });
}

export const DEFAULT_WORKSHOP_GARAGE: Readonly<WorkshopGarageSave> = freezeGarage({
  podracer: DEFAULT_WORKSHOP_LOADOUTS.podracer,
  landspeeder: DEFAULT_WORKSHOP_LOADOUTS.landspeeder,
  'speeder-bike': DEFAULT_WORKSHOP_LOADOUTS['speeder-bike'],
  'skim-speeder': DEFAULT_WORKSHOP_LOADOUTS['skim-speeder'],
});

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

/** Repairs each vehicle independently, so one corrupt build never erases the garage. */
export function sanitizeWorkshopGarage(value: unknown): Readonly<WorkshopGarageSave> {
  const root = record(value);
  const savedLoadouts = root?.version === WORKSHOP_GARAGE_VERSION ? record(root.loadouts) : null;
  const loadouts = {} as Record<GalacticVehicleClass, WorkshopLoadout>;
  for (const vehicleClass of GALACTIC_VEHICLE_ORDER) {
    const candidate = sanitizeWorkshopLoadout(savedLoadouts?.[vehicleClass], vehicleClass);
    loadouts[vehicleClass] = candidate.vehicleClass === vehicleClass
      ? candidate
      : DEFAULT_WORKSHOP_LOADOUTS[vehicleClass];
  }
  return freezeGarage(loadouts);
}

export function withWorkshopLoadout(
  garage: unknown,
  vehicleClass: GalacticVehicleClass,
  loadout: unknown,
): Readonly<WorkshopGarageSave> {
  const current = sanitizeWorkshopGarage(garage);
  const candidate = sanitizeWorkshopLoadout(loadout, vehicleClass);
  return sanitizeWorkshopGarage({
    version: WORKSHOP_GARAGE_VERSION,
    loadouts: {
      ...current.loadouts,
      [vehicleClass]: candidate.vehicleClass === vehicleClass
        ? candidate
        : DEFAULT_WORKSHOP_LOADOUTS[vehicleClass],
    },
  });
}

export function loadWorkshopGarage(
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
  key = WORKSHOP_GARAGE_STORAGE_KEY,
): Readonly<WorkshopGarageSave> {
  if (!storage) return sanitizeWorkshopGarage(DEFAULT_WORKSHOP_GARAGE);
  try {
    const json = storage.getItem(key);
    if (json === null || json.length > MAX_WORKSHOP_JSON_LENGTH) return sanitizeWorkshopGarage(null);
    return sanitizeWorkshopGarage(JSON.parse(json) as unknown);
  } catch {
    return sanitizeWorkshopGarage(null);
  }
}

export function saveWorkshopGarage(
  garage: unknown,
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
  key = WORKSHOP_GARAGE_STORAGE_KEY,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(sanitizeWorkshopGarage(garage)));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedWorkshopGarage(
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
  key = WORKSHOP_GARAGE_STORAGE_KEY,
): boolean {
  if (!storage?.removeItem) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
