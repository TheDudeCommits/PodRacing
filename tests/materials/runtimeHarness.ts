import {
  Bone,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Mesh,
  PerspectiveCamera,
  Scene,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Uint16BufferAttribute,
  Vector3,
  WebGLRenderer,
} from 'three';

import {
  CEL_PALETTES,
  createCelMaterial,
  createInvertedHullOutline,
} from '../../src/render/materials';
import { createCelPostPipeline } from '../../src/render/post';

interface HarnessStatus {
  ready: boolean;
  mode: string;
  error: string | null;
}

declare global {
  interface Window {
    __CEL_HARNESS__: HarnessStatus;
  }
}

window.__CEL_HARNESS__ = { ready: false, mode: 'booting', error: null };
const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new Color('#281f56'));
document.body.append(renderer.domElement);

let shaderError: string | null = null;
renderer.debug.onShaderError = (_gl, _program, vertexShader, fragmentShader) => {
  shaderError = [
    vertexShader ? vertexShader.toString() : 'vertex shader unavailable',
    fragmentShader ? fragmentShader.toString() : 'fragment shader unavailable',
  ].join('\n');
};

const scene = new Scene();
scene.background = new Color('#d8794b');
const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.2, 8.5);
camera.lookAt(0, 0.4, 0);

const shellMaterial = createCelMaterial({
  palette: CEL_PALETTES.player,
  lightDirection: new Vector3(-0.4, 0.8, 0.35),
  hazeNear: 30,
  hazeFar: 90,
});
const sphere = new Mesh(new SphereGeometry(1.6, 32, 20), shellMaterial);
sphere.position.set(-1.25, 0.35, 0);
scene.add(sphere);
const outline = createInvertedHullOutline(sphere, {
  ink: CEL_PALETTES.player.ink,
  widthPx: 3,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
});

const machinery = createCelMaterial({ palette: CEL_PALETTES.machinery });
const box = new Mesh(new BoxGeometry(2.5, 1.4, 1.6, 4, 3, 3), machinery);
box.position.set(2, 0.25, -0.8);
box.rotation.set(0.25, 0.55, -0.18);
scene.add(box);

const pilotGeometry = new CylinderGeometry(0.3, 0.42, 2.1, 8, 4, false);
const pilotPositions = pilotGeometry.getAttribute('position');
const skinIndices: number[] = [];
const skinWeights: number[] = [];
for (let index = 0; index < pilotPositions.count; index += 1) {
  const blend = Math.min(1, Math.max(0, (pilotPositions.getY(index) + 1.05) / 2.1));
  skinIndices.push(0, 1, 0, 0);
  skinWeights.push(1 - blend, blend, 0, 0);
}
pilotGeometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndices, 4));
pilotGeometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights, 4));
const hip = new Bone();
hip.position.y = -1.05;
const shoulder = new Bone();
shoulder.position.y = 2.1;
shoulder.rotation.z = -0.35;
hip.add(shoulder);
const pilot = new SkinnedMesh(pilotGeometry, machinery);
pilot.add(hip);
pilot.bind(new Skeleton([hip, shoulder]));
pilot.position.set(3.9, 0.45, 0.3);
scene.add(pilot);
const pilotOutline = createInvertedHullOutline(pilot, {
  ink: CEL_PALETTES.machinery.ink,
  widthPx: 2,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
});

const post = createCelPostPipeline(renderer, scene, camera, { prepassScale: 1 });
post.render(1 / 60);
renderer.compile(scene, camera);
window.__CEL_HARNESS__ = {
  ready: shaderError === null,
  mode: post.mode,
  error: shaderError ?? post.failureReason,
};

addEventListener('pagehide', () => {
  outline.dispose();
  pilotOutline.dispose();
  sphere.geometry.dispose();
  box.geometry.dispose();
  pilotGeometry.dispose();
  shellMaterial.dispose();
  machinery.dispose();
  post.dispose();
  renderer.dispose();
});
