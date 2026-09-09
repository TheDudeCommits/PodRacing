/** Independent display oracle: retain millisecond truncation after removing
 * sub-nanosecond floating-point noise from accumulated simulation steps. */
export function expectedResultClock(seconds: number): string {
  const nanoseconds = Math.round(seconds * 1e9);
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isSafeInteger(nanoseconds)) {
    throw new RangeError('Invalid authoritative race time');
  }
  const milliseconds = Math.floor(nanoseconds / 1e6);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds / 60_000) % 60;
  const secondPart = String(Math.floor(milliseconds / 1_000) % 60).padStart(2, '0');
  const fraction = String(milliseconds % 1_000).padStart(3, '0');
  const prefix = hours ? `${hours}:${String(minutes).padStart(2, '0')}` : String(minutes);
  return `${prefix}:${secondPart}.${fraction}`;
}
