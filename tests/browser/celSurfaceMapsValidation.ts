import {
  DataTexture, DoubleSide, LinearSRGBColorSpace, Mesh, MeshNormalMaterial, MeshStandardMaterial,
  NearestFilter, NoToneMapping, OrthographicCamera, RepeatWrapping, RGBAFormat,
  Scene, UnsignedByteType, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CelMaterial } from '../../src/render/materials/CelMaterial';
import { ImportedVehiclePresentation, VehicleArtLibrary } from '../../src/render/vehicles';

/** Isolated GPU test page; never imported by the application. The runner owns
 * its browser/server and writes actual GPU readbacks, not inferred normals. */
interface Case {
  name: string;
  tangents?: boolean;
  mirrorU?: boolean;
  transformedUv1?: boolean;
  backFace?: boolean;
  mirroredModel?: boolean;
  degenerateUv?: boolean;
}

const SIZE = 160;
const CASES: readonly Case[] = [
  { name: 'derivative-positive-uv' },
  { name: 'derivative-mirrored-uv', mirrorU: true },
  { name: 'derivative-uv1-khr-transform', transformedUv1: true },
  { name: 'authored-tangents', tangents: true },
  { name: 'authored-tangents-mirrored-uv', tangents: true, mirrorU: true },
  { name: 'authored-tangents-uv1-transform', tangents: true, transformedUv1: true },
  { name: 'authored-tangents-back-face', tangents: true, backFace: true },
  { name: 'authored-tangents-mirrored-model', tangents: true, mirroredModel: true },
  { name: 'double-side-back-face', backFace: true },
  { name: 'double-side-back-uv1-transform', backFace: true, transformedUv1: true },
  { name: 'mirrored-nonuniform-model', mirroredModel: true },
  { name: 'collapsed-uv-finite-fallback', degenerateUv: true },
];

function normalTexture(): DataTexture {
  const bytes = new Uint8Array(4 * 4 * 4);
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const nx = x % 2 ? .37 : -.28, ny = y % 2 ? .45 : -.31;
    const nz = Math.sqrt(1 - nx * nx - ny * ny);
    bytes.set([nx, ny, nz].map((v) => Math.round((v * .5 + .5) * 255)).concat(255), (y * 4 + x) * 4);
  }
  const texture = new DataTexture(bytes, 4, 4, RGBAFormat, UnsignedByteType);
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.flipY = false; texture.needsUpdate = true;
  return texture;
}

async function loadFixture(test: Case) {
  // glTF V is downward. Authored tangent.w supplies the normal map's upward
  // bitangent; GLTFLoader converts that convention when tangents are absent.
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const order = [0, 1, 2, 0, 2, 3];
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], tangents: number[] = [];
  for (const index of order) {
    const [x, y] = corners[index]!;
    positions.push(x!, y!, 0); normals.push(0, 0, 1);
    const u = (x! + 1) * .5, v = (1 - y!) * .5;
    uvs.push(test.degenerateUv ? .5 : test.mirrorU ? 1 - u : u, test.degenerateUv ? .5 : v);
    tangents.push(test.mirrorU ? -1 : 1, 0, 0, test.mirrorU ? -1 : 1);
  }
  const arrays = [positions, normals, uvs, uvs, ...(test.tangents ? [tangents] : [])].map((a) => new Float32Array(a));
  const buffer = new Uint8Array(arrays.reduce((sum, a) => sum + a.byteLength, 0));
  let offset = 0;
  const views = arrays.map((array) => {
    buffer.set(new Uint8Array(array.buffer), offset);
    const view = { buffer: 0, byteOffset: offset, byteLength: array.byteLength };
    offset += array.byteLength;
    return view;
  });
  const attributes = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, TEXCOORD_1: 3, ...(test.tangents ? { TANGENT: 4 } : {}) };
  const gltf = {
    asset: { version: '2.0', generator: 'Inkstorm surface-map GPU fixture' },
    extensionsUsed: test.transformedUv1 ? ['KHR_texture_transform'] : [],
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'FixturePlane' }],
    buffers: [{ byteLength: buffer.byteLength, uri: `data:application/octet-stream;base64,${btoa(String.fromCharCode(...buffer))}` }],
    bufferViews: views,
    accessors: arrays.map((_array, index) => ({ bufferView: index, componentType: 5126, count: 6,
      type: index < 2 ? 'VEC3' : index === 4 ? 'VEC4' : 'VEC2',
      ...(index === 0 ? { min: [-1, -1, 0], max: [1, 1, 0] } : {}) })),
    textures: [{}],
    materials: [{ name: 'FixtureNormal', doubleSided: true,
      normalTexture: { index: 0, scale: .8,
        ...(test.transformedUv1 ? { extensions: { KHR_texture_transform: {
          texCoord: 1, offset: [.13, -.21], rotation: .63, scale: [-1.2, .8],
        } } } : {}) },
    }],
    meshes: [{ primitives: [{ attributes, material: 0 }] }],
  };
  const texture = normalTexture();
  const loader = new GLTFLoader();
  // Only image transport is replaced. The real parser resolves texCoord,
  // KHR_texture_transform, normalScale and tangent-dependent material cloning.
  loader.register(() => ({ name: 'FixtureDataTexture', loadTexture: async () => texture }));
  const loaded = await loader.parseAsync(JSON.stringify(gltf), '');
  const mesh = loaded.scene.getObjectByName('FixturePlane') as Mesh;
  const material = mesh.material as MeshStandardMaterial;
  return { loaded, mesh, material, texture };
}

function display(bytes: Uint8Array, label: string): HTMLElement {
  const item = document.createElement('figure');
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
  const flipped = new Uint8ClampedArray(bytes.length);
  for (let row = 0; row < SIZE; row += 1) flipped.set(bytes.subarray(row * SIZE * 4, (row + 1) * SIZE * 4), (SIZE - row - 1) * SIZE * 4);
  canvas.getContext('2d')!.putImageData(new ImageData(flipped, SIZE, SIZE), 0, 0);
  const caption = document.createElement('figcaption'); caption.textContent = label;
  item.append(canvas, caption); return item;
}

function compare(actual: Uint8Array, expected: Uint8Array) {
  let comparedPixels = 0, maximumByteError = 0, totalError = 0, mismatchedPixels = 0, coverageMismatch = 0;
  const difference = new Uint8Array(actual.length);
  for (let offset = 0; offset < actual.length; offset += 4) {
    difference[offset + 3] = 255;
    const a = actual[offset + 3]! > 0, b = expected[offset + 3]! > 0;
    if (a !== b) coverageMismatch += 1;
    if (!a || !b) continue;
    comparedPixels += 1;
    let pixelError = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const error = Math.abs(actual[offset + channel]! - expected[offset + channel]!);
      totalError += error; maximumByteError = Math.max(maximumByteError, error); pixelError = Math.max(pixelError, error);
      difference[offset + channel] = Math.min(255, error * 12);
    }
    if (pixelError > 2) mismatchedPixels += 1;
  }
  return { comparedPixels, maximumByteError, meanByteError: totalError / Math.max(1, comparedPixels * 3),
    mismatchedPixels, coverageMismatch, pass: comparedPixels > 1000 && coverageMismatch === 0 && mismatchedPixels === 0,
    difference };
}

async function run() {
  const renderer = new WebGLRenderer({ antialias: false, alpha: true });
  renderer.setSize(SIZE, SIZE); renderer.setPixelRatio(1);
  renderer.outputColorSpace = LinearSRGBColorSpace; renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const target = new WebGLRenderTarget(SIZE, SIZE, { depthBuffer: true });
  const camera = new OrthographicCamera(-2, 2, 2, -2, .1, 30);
  camera.position.set(.45, .3, 6); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const rows: Record<string, unknown>[] = [];
  const render = (scene: Scene): Uint8Array => {
    const bytes = new Uint8Array(SIZE * SIZE * 4);
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, bytes);
    return bytes;
  };
  try {
    for (const test of CASES) {
      const fixture = await loadFixture(test);
      const original = fixture.material;
      const library = new VehicleArtLibrary({ load: async () => fixture.loaded.scene, maxIdleEntries: 0 });
      const presentation = new ImportedVehiclePresentation(library);
      if (await presentation.setSource({ id: test.name, revision: 'fixture-1', url: '/fixture.glb' }) !== 'ready') {
        throw presentation.error ?? new Error('Fixture failed admission.');
      }
      const actual = presentation.geometryMeshes[0]!;
      const cel = actual.material as CelMaterial;
      // Run the production vertex shader and normal-mapping code unchanged;
      // only replace its final lighting output with view-normal RGB for proof.
      cel.fragmentShader = cel.fragmentShader.replace('vec3 lightDirection = normalize(uLightDirection);',
        'gl_FragColor = vec4(transformDirection(normal, viewMatrix) * .5 + .5, 1.); return;\nvec3 lightDirection = normalize(uLightDirection);');
      cel.needsUpdate = true;
      const reference = new MeshNormalMaterial({ normalMap: original.normalMap,
        normalScale: original.normalScale, side: DoubleSide });
      const scene = new Scene(); scene.add(presentation);
      presentation.rotation.set(.23, (test.backFace ? Math.PI : 0) + .38, -.14);
      presentation.scale.set(test.mirroredModel ? -1.1 : 1.1, .73, 1.6);
      // A rotated child beneath a nonuniform parent exercises inverse-transpose
      // normals and sheared model matrices without changing camera coordinates.
      actual.rotation.set(.12, -.18, .21); actual.scale.set(.91, 1.08, .66);
      const actualBytes = render(scene);
      actual.material = reference;
      const referenceBytes = render(scene);
      actual.material = cel;
      const { difference, ...result } = compare(actualBytes, referenceBytes);
      rows.push({ name: test.name, ...result, loaderNormalScale: original.normalScale.toArray(),
        celNormalScale: cel.uniforms.uNormalScale?.value.toArray(), normalUv: cel.defines.CEL_NORMAL_UV,
        tangentAttribute: !!actual.geometry.getAttribute('tangent'), worldMatrix: actual.matrixWorld.toArray() });
      const row = document.createElement('section');
      row.append(display(actualBytes, `${test.name}: Cel`), display(referenceBytes, 'Three MeshNormalMaterial'), display(difference, `error ×12 · ${result.pass ? 'PASS' : 'FAIL'}`));
      document.body.append(row);
      reference.dispose(); presentation.dispose(); library.dispose();
      // The parser may clone the plugin texture for KHR_texture_transform.
      if (fixture.texture !== original.normalMap) fixture.texture.dispose();
    }

    // Verify the compiled roughness sampler consumes green times the factor.
    // Red and blue are deliberately opposite so channel mixups cannot pass.
    const fixture = await loadFixture({ name: 'roughness-green-times-factor' });
    const scene = new Scene(); const mesh = fixture.mesh; scene.add(mesh);
    const roughness = new DataTexture(new Uint8Array([255, 64, 0, 255]), 1, 1, RGBAFormat);
    roughness.needsUpdate = true;
    const options = { roughness: .5, rimStrength: 0, specularCutoff: .001, specularPower: 1,
      specularStrength: .65, reflectionStrength: .7, hazeNear: 100, hazeFar: 200, side: DoubleSide };
    const mapped = new CelMaterial({ ...options, roughnessMap: roughness });
    const scalar = new CelMaterial({ ...options, roughness: .5 * 64 / 255 });
    mesh.material = mapped; const actualBytes = render(scene);
    mesh.material = scalar; const expectedBytes = render(scene);
    const { difference, ...result } = compare(actualBytes, expectedBytes);
    rows.push({ name: 'roughness-green-times-factor', ...result });
    const row = document.createElement('section');
    row.append(display(actualBytes, 'Roughness map G × factor'), display(expectedBytes, 'Equivalent scalar factor'), display(difference, `error ×12 · ${result.pass ? 'PASS' : 'FAIL'}`));
    document.body.append(row);
    mapped.dispose(); scalar.dispose(); roughness.dispose(); fixture.mesh.geometry.dispose(); fixture.material.dispose(); fixture.texture.dispose();
    const gl = renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const report = { createdAt: new Date().toISOString(), width: SIZE, height: SIZE, pixelRatio: 1,
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : gl.getParameter(gl.RENDERER) as string,
      pass: rows.every((row) => row.pass), cases: rows };
    Object.assign(window, { __CEL_SURFACE_VALIDATION__: report });
    document.title = `Cel surface maps: ${report.pass ? 'PASS' : 'FAIL'}`;
  } finally {
    renderer.setRenderTarget(null); target.dispose(); renderer.dispose(); renderer.forceContextLoss();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  Object.assign(window, { __CEL_SURFACE_VALIDATION__: { pass: false, error: message } });
  document.body.append(document.createTextNode(message)); console.error(message);
});
