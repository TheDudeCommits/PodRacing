import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { PILOT_VARIANT_ORDER, PilotView } from '../../src/render/pilots';

declare global {
  interface Window {
    __PILOTS_READY__?: boolean;
  }
}

const renderer = new WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
document.body.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#4b3151');
const camera = new PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.65, 8.3);
camera.lookAt(0, 0.82, 0.15);

const ground = new Mesh(
  new PlaneGeometry(30, 16),
  new MeshBasicMaterial({ color: '#d77b4d' }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.91;
scene.add(ground);

const pilots = PILOT_VARIANT_ORDER.map((variant, index) => {
  const pilot = new PilotView({
    variant,
    detail: 'hero',
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: renderer.getPixelRatio(),
  });
  pilot.position.set((index - 1.5) * 1.85, 0, 0);
  pilot.rotation.y = (index - 1.5) * -0.07;
  pilot.scale.setScalar(1.35);
  scene.add(pilot);
  return pilot;
});

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  for (const pilot of pilots) pilot.setViewport(width, height, renderer.getPixelRatio());
}
window.addEventListener('resize', resize);

let firstFrame = true;
function frame(milliseconds: number): void {
  const time = milliseconds * 0.001;
  pilots[0]?.updateAnimation({
    time,
    deltaTime: 1 / 60,
    steering: -0.7,
    throttle: 0.9,
    lateralAcceleration: -12,
    engineVibration: 0.7,
    grounded: true,
    racePhase: 'racing',
  });
  pilots[1]?.updateAnimation({
    time,
    deltaTime: 1 / 60,
    steering: 0.65,
    throttle: 0.8,
    drift: 0.85,
    engineVibration: 0.8,
    grounded: true,
    racePhase: 'racing',
  });
  pilots[2]?.updateAnimation({
    time,
    deltaTime: 1 / 60,
    brake: 0.8,
    landingIntensity: 0.9,
    verticalAcceleration: 22,
    engineVibration: 0.9,
    grounded: true,
    racePhase: 'racing',
  });
  pilots[3]?.updateAnimation({
    time,
    deltaTime: 1 / 60,
    engineVibration: 0.5,
    grounded: true,
    racePhase: 'finished',
    finished: true,
  });
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    window.__PILOTS_READY__ = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
