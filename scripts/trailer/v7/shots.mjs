/** Thrustline in-engine showreel shot list. Cameras are racer-local: x right, y up, z forward. */
const cam = (eye, target = [0, 4, 8], fov = 64, racerIndex = 0) => ({ eye, target, fov, racerIndex });
export const PACK = [{ forward: 0, lane: -3 }, { forward: 35, lane: 5 }, { forward: 70, lane: -5 }, { forward: 105, lane: 6 }, { forward: -35, lane: 5 }, { forward: -75, lane: -6 }, { forward: 145, lane: 0 }, { forward: -115, lane: 0 }];
const pace = { throttle: .95, boost: false, overtake: false, weave: 0, shield: false, drift: false };
const shot = (id, biome, localPod, progress, seconds, camera, extra = {}) => ({ id, biome, localPod, progress, seconds, camera, drive: { ...pace }, ...extra });
export const SHOTS = [
  // The real countdown from the grid: lamps, painted slots, GO curtain and launch.
  { id: 'ceremony', biome: 'desert', localPod: 'teemto', natural: true, seconds: 6.2, warm: 0,
    camera: cam([9, 13, -44], [0, 18, 120], 56), endEye: [5, 10, -30], drive: { ...pace, throttle: 1, boost: true } },
  shot('colossus-run', 'desert', 'teemto', .061, 4.4, cam([-8, 7, -28], [0, 7, 40], 72), { drive: { ...pace, throttle: 1, boost: true, overtake: true } }),
  shot('colossus-wide', 'desert', 'sebulba', .074, 3.6, cam([78, 30, -20], [0, 16, 30], 56), { endEye: [70, 26, 0] }),
  shot('canyon-drift', 'desert', 'teemto', .28, 3.2, cam([36, 12, -6], [0, 4, 9], 65), { drive: { ...pace, drift: true, targetLat: 6 }, endEye: [30, 10, -12] }),
  shot('frost-wide', 'frozen', 'verdigris', .12, 4, cam([-40, 26, -43], [0, 8, 45], 72), { endEye: [-28, 18, -36] }),
  shot('frost-chase', 'frozen', 'skybolt', .29, 3.2, cam([-12, 9, -30]), { drive: { ...pace, boost: true } }),
  shot('ember-volcano', 'volcanic', 'sebulba', .70, 4, cam([-7, 7, -26], [0, 12, 70], 64), { drive: { ...pace, boost: true } }),
  shot('ember-flame', 'volcanic', 'sebulba', .35, 3.2, cam([29, 10, -10], [0, 4, 13], 66), { drive: { ...pace, fire: true }, abilityAt: .35 }),
  shot('verdant-canopy', 'jungle', 'needle', .18, 4, cam([-9, 6, -27], [0, 16, 60], 74), { drive: { ...pace, boost: true } }),
  shot('verdant-wide', 'jungle', 'pog', .30, 3.4, cam([-30, 24, -40], [0, 8, 40], 72)),
  shot('impact', 'volcanic', 'blockrunner', .52, 3, cam([22, 10, -20], [0, 4, 8], 66, 1), { drive: { ...pace, fire: true }, wreckAt: .65 }),
];
