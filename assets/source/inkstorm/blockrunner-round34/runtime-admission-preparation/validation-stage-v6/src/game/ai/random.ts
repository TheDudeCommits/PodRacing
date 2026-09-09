/** Mulberry-style integer seed mixer followed by xorshift32 runtime draws. */
export function mixSeed(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) || 0x6d2b79f5;
}

export function nextRandom(state: { rngState: number }): number {
  let value = state.rngState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = (value >>> 0) || 0x6d2b79f5;
  return state.rngState / 0x1_0000_0000;
}

export function randomRange(state: { rngState: number }, minimum: number, maximum: number): number {
  return minimum + (maximum - minimum) * nextRandom(state);
}
