/** Course identity is encoded in the seed so hosts, guests and replays agree. */
export type RacingBiomeId = 'desert' | 'frozen' | 'volcanic' | 'jungle';
export const RACING_BIOME_SEEDS = Object.freeze({ frozen: 0x46524f53, volcanic: 0x454d4245, jungle: 0x56455244 });
export interface RacingBiome {
  readonly id: RacingBiomeId;
  readonly title: string;
  readonly subtitle: string;
  readonly traction: number;
  readonly cooling: number;
  readonly ground: string;
  readonly stone: string;
  readonly sky: string;
  readonly road: string;
}
export const RACING_BIOMES: Readonly<Record<RacingBiomeId, RacingBiome>> = Object.freeze({
  desert: { id: 'desert', title: 'Sunscar Canyon', subtitle: 'Desert canyon', traction: 1, cooling: 1, ground: '#d78c58', stone: '#c38965', sky: '#ffffff', road: '#ad724a' },
  frozen: { id: 'frozen', title: 'Frostline', subtitle: 'Frozen refinery · low grip, fast cooling', traction: .58, cooling: 1.45, ground: '#d4e9f2', stone: '#91b9d2', sky: '#93c8f5', road: '#79b0c7' },
  volcanic: { id: 'volcanic', title: 'Ember Rift', subtitle: 'Basalt caldera · poor cooling, heat vents', traction: .94, cooling: .65, ground: '#403d49', stone: '#454052', sky: '#c36f63', road: '#766772' },
  jungle: { id: 'jungle', title: 'Verdant Run', subtitle: 'Forest ruins · wet turns, dense canopy', traction: .79, cooling: 1.12, ground: '#69744f', stone: '#657c65', sky: '#b1d3b7', road: '#8f9170' },
});
export function racingBiomeForSeed(seed: number | null): RacingBiome {
  if (seed === RACING_BIOME_SEEDS.frozen) return RACING_BIOMES.frozen;
  if (seed === RACING_BIOME_SEEDS.volcanic) return RACING_BIOMES.volcanic;
  if (seed === RACING_BIOME_SEEDS.jungle) return RACING_BIOMES.jungle;
  return RACING_BIOMES.desert;
}
/** The marked outer shoulder of the caldera straight vents heat. The centre lane is safe. */
export function racingBiomeHeatRate(biome: RacingBiomeId, progress: number, lateral: number, halfWidth: number): number {
  if (biome !== 'volcanic' || progress < .30 || progress > .44) return 0;
  return Math.abs(lateral) > halfWidth * .62 && Math.abs(lateral) < halfWidth * 1.2 ? .075 : 0;
}
