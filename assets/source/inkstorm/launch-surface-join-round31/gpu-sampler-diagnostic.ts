import type { DataTexture } from 'three';
import { RaceSimulation } from '../../../../src/game/race/RaceSimulation';
import { combineCourseGulfOffsets, sampleCourseGulfGrid } from '../../../../src/game/race/CourseGulfField';
import { padLocalToWorld } from '../../../../src/game/race/PitPadField';
import { COURSE_GULF_GLSL } from '../../../../src/render/terrain/CourseGulfTextures';
import { TerrainSystem } from '../../../../src/render/terrain/TerrainSystem';
import { sampleTerrainHeight } from '../../../../src/render/terrain/terrainMath';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Pit sampler diagnostic: ${message}`);
}
const makeRace = (seed = 0x494e4b53) => new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed, fieldSize: 4 });
interface Probe { label: string; category: string; requested: [number, number]; world: [number, number] }
export function makeSamplerProbes(race: RaceSimulation): Probe[] {
  const probes: Probe[] = [];
  const add = (label: string, category: string, x: number, z: number) =>
    probes.push({ label, category, requested: [x, z], world: [Math.fround(x), Math.fround(z)] });
  for (const [i, pad] of (race.pitPadField?.pads ?? []).entries()) {
    add(`pit-${i + 1}/anchor`, 'interior', pad.x, pad.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const [x, z] = padLocalToWorld(pad, sx * pad.halfX, sz * pad.halfZ);
      add(`pit-${i + 1}/corner-${sx}-${sz}`, 'slab-edge', x, z);
    }
    for (const side of [-1, 1]) for (const [axis, bound] of [[0, pad.halfX], [1, pad.halfZ]]) {
      for (const distance of [-.25, .25, 8.37, 34.81, 40]) {
        const [x, z] = padLocalToWorld(pad, axis === 0 ? side * (bound! + distance) : 0, axis === 1 ? side * (bound! + distance) : 0);
        add(`pit-${i + 1}/edge-${axis}-${side}/${distance}`, distance > 37 ? 'outside-apron' : 'apron-edge', x, z);
      }
    }
  }
  const grid = race.pitPadField?.grid;
  if (grid) for (const [axis, extent] of [[0, grid.columns - 1], [1, grid.rows - 1]]) {
    for (const edge of [0, extent!]) for (const offset of [-.02, 0, .02])
      add(`atlas-${axis}/${edge}/${offset}`, 'atlas-boundary', grid.minX + (axis === 0 ? edge + offset : grid.columns / 2),
        grid.minZ + (axis === 1 ? edge + offset : grid.rows / 2));
  }
  for (const progress of [.993, .024, .006]) {
    const p = race.course.samplePlanAtProgress(progress);
    for (const lateral of [-p.width - 10, -p.width, 0, p.width, p.width + 10])
      for (const [dx, dz] of [[0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]])
        add(`road-${progress}/${lateral}/${dx}/${dz}`, 'protected-road', p.x + p.rightX * lateral + dx!, p.z + p.rightZ * lateral + dz!);
  }
  for (const g of race.courseGulfField?.grids ?? []) {
    let low = 0, high = 0;
    for (let i = 1; i < g.values.length; i++) { if (g.values[i]! < g.values[low]!) low = i; if (g.values[i]! > g.values[high]!) high = i; }
    for (const [name, index] of [['low', low], ['high', high]] as const) for (const [dx, dz] of [[0, 0], [.37, .81]])
      add(`${g.name}-${name}/${dx}/${dz}`, 'gulf-interior', g.minX + ((index % g.size) + dx!) * g.cellSize,
        g.minZ + (Math.floor(index / g.size) + dz!) * g.cellSize);
    add(`${g.name}/outside`, 'gulf-boundary', g.minX - .02, g.minZ + g.cellSize * 50.37);
    add(`${g.name}/boundary`, 'gulf-boundary', g.minX + (g.size - 1) * g.cellSize, g.minZ + g.cellSize * 50.37);
  }
  const launch = race.courseGulfField?.launchProfile;
  if (launch) for (let distance = launch.crestDistance - 80; distance <= launch.floorDistance + 90; distance += 25) {
    const p = race.course.samplePlanAtProgress(distance / race.course.totalLength);
    for (const side of [-p.width - 24, -p.width, 0, p.width, p.width + 24])
      for (const [dx, dz] of [[0,0],[.85,0],[-.85,0],[0,1.15],[0,-1.15]])
        add(`launch/${distance}/${side}/${dx}/${dz}`, 'launch-lip-lane-bank-normal', p.x+p.rightX*side+dx!, p.z+p.rightZ*side+dz!);
  }
  add('far-outside', 'outside-all', -100000, -100000);
  return probes;
}

/** CPU-only. Safe to invoke without a browser, canvas or WebGL context. */
export function inspectSamplerBinding(race = makeRace()) {
  check(race.pitPadField?.grid, 'expected an active pad atlas');
  const terrain = new TerrainSystem({ levels: 2 }), u = terrain.gulfTextures.uniforms;
  const uniformObjects = Object.values(u), vectors = [u.uCourseGulfBounds0.value, u.uCourseGulfBounds1.value, u.uPitPadBounds.value];
  const events: Record<string, number> = {};
  const watch = (texture: DataTexture | null, id: string) => {
    if (texture) { events[id] = 0; texture.addEventListener('dispose', () => { events[id] = (events[id] ?? 0) + 1; }); }
    return texture;
  };
  const stable = () => {
    check(Object.values(u).every((v, i) => v === uniformObjects[i]), 'a shared uniform object was replaced');
    check([u.uCourseGulfBounds0.value, u.uCourseGulfBounds1.value, u.uPitPadBounds.value].every((v, i) => v === vectors[i]), 'a shared bounds vector was replaced');
    for (const m of [terrain.materials.material, terrain.materials.depthMaterial, terrain.materials.normalMaterial])
      check(m.uniforms.uPitPad === u.uPitPad && m.uniforms.uPitPadBounds === u.uPitPadBounds, 'beauty/depth/normal material lost shared pit uniforms');
  };
  try {
    terrain.setCourseGulfField(race.courseGulfField); terrain.setPitPadField(race.pitPadField); stable();
    const first = [watch(u.uCourseGulf0.value, 'gulf0-first'), watch(u.uCourseGulf1.value, 'gulf1-first'), watch(u.uPitPad.value, 'pit-first')];
    terrain.setPitPadField(race.pitPadField); terrain.setCourseGulfField(race.courseGulfField);
    check(first.every((v, i) => v === [u.uCourseGulf0.value, u.uCourseGulf1.value, u.uPitPad.value][i]), 'same-field setters churned texture objects');
    terrain.setCourseGulfField(null); stable();
    check(u.uPitPad.value === first[2] && events['pit-first'] === 0, 'clearing gulfs disposed the independent pit atlas');
    check(u.uCourseGulf0.value === null && u.uCourseGulfBounds0.value.w === 0, 'gulf clear left live bindings');
    const pad = race.pitPadField.pads[0]!;
    check(terrain.sampleHeight(pad.x, pad.z) === sampleTerrainHeight(pad.x, pad.z) + race.pitPadField.sampleOffset(pad.x, pad.z), 'pit-only CPU sampler disagrees');
    terrain.setCourseGulfField(race.courseGulfField);
    const second = [watch(u.uCourseGulf0.value, 'gulf0-second'), watch(u.uCourseGulf1.value, 'gulf1-second')];
    terrain.setPitPadField(null); stable();
    check(Number(events['pit-first']) === 1 && u.uPitPad.value === null && u.uPitPadBounds.value.z === 0, 'pit clear failed disposal or bounds reset');
    check(u.uCourseGulf0.value === second[0] && u.uCourseGulf1.value === second[1], 'pit clear replaced gulf textures');
    terrain.setPitPadField(race.pitPadField); watch(u.uPitPad.value, 'pit-second');
    terrain.dispose(); terrain.dispose(); stable();
    check(Object.values(events).every(count => count === 1), 'textures were leaked or disposed more than once');
    check(u.uPitPad.value === null && u.uCourseGulf0.value === null && u.uCourseGulf1.value === null, 'final disposal left a live texture');
    check(vectors.every(v => v.x === 0 && v.y === 0 && v.z === 0 && v.w === 0), 'final disposal left nonzero bounds');
    return { status: 'passed', scope: 'CPU uniform identity, independent setter reset and disposal only; no GPU launched', disposalEvents: events };
  } finally { terrain.dispose(); }
}

/**
 * Explicit GPU entry point. Root may call this from its owned Vite page only
 * when the GPU slot is free. Importing this module does not create a context.
 * page.evaluate(async () => (await import('/assets/source/inkstorm/pit-pad-round29/gpu-sampler-diagnostic.ts')).runGpuSamplerDiagnostic())
 */
export async function runGpuSamplerDiagnostic(seed = 0x494e4b53) {
  check(COURSE_GULF_GLSL.includes('pitPadOffset(worldXZ)'), 'runtime GLSL is missing the pit integration');
  const race = makeRace(seed), probes = makeSamplerProbes(race), lifecycle = inspectSamplerBinding(race);
  const terrain = new TerrainSystem({ levels: 2 }), u = terrain.gulfTextures.uniforms;
  const canvas = document.createElement('canvas'); canvas.width = probes.length; canvas.height = 1;
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) { terrain.dispose(); canvas.remove(); throw new Error('Pit sampler diagnostic: WebGL2 is unavailable'); }
  const shaders: WebGLShader[] = [], textures: WebGLTexture[] = [], programs: WebGLProgram[] = [], buffers: WebGLBuffer[] = [];
  let framebuffer: WebGLFramebuffer | null = null, vao: WebGLVertexArrayObject | null = null;
  try {
    check(gl.getExtension('EXT_color_buffer_float'), 'float framebuffer readback is unavailable; no fabricated fallback');
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind); check(shader, 'cannot create shader'); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      check(gl.getShaderParameter(shader, gl.COMPILE_STATUS), gl.getShaderInfoLog(shader) ?? 'shader compile failed'); return shader;
    };
    const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 world;
uniform float pointCount;
flat out vec2 sampleWorld;
void main(){ sampleWorld=world; gl_Position=vec4((float(gl_VertexID)+.5)/pointCount*2.-1.,0.,0.,1.); gl_PointSize=1.; }`;
    const fragment = `#version 300 es
precision highp float;
precision highp sampler2D;
flat in vec2 sampleWorld;
out vec4 outputOffsets;
${COURSE_GULF_GLSL}
void main(){ outputOffsets=vec4(courseGulfOffset(sampleWorld),
sampleCourseGulf(uCourseGulf0,uCourseGulfBounds0,sampleWorld),
sampleCourseGulf(uCourseGulf1,uCourseGulfBounds1,sampleWorld),pitPadOffset(sampleWorld)); }`;
    const program = gl.createProgram(); check(program, 'cannot create program'); programs.push(program);
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    check(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program) ?? 'link failed'); gl.useProgram(program);
    vao = gl.createVertexArray(); check(vao, 'cannot create VAO'); gl.bindVertexArray(vao);
    const points = gl.createBuffer(); check(points, 'cannot create point buffer'); buffers.push(points); gl.bindBuffer(gl.ARRAY_BUFFER, points);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(probes.flatMap(p => p.world)), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(gl.getUniformLocation(program, 'pointCount'), probes.length);
    const output = gl.createTexture(); check(output, 'cannot create float target'); textures.push(output); gl.bindTexture(gl.TEXTURE_2D, output);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, probes.length, 1, 0, gl.RGBA, gl.FLOAT, null);
    framebuffer = gl.createFramebuffer(); check(framebuffer, 'cannot create framebuffer'); gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
    check(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE, 'float framebuffer is incomplete');
    gl.viewport(0, 0, probes.length, 1); gl.disable(gl.BLEND); gl.disable(gl.DITHER); gl.disable(gl.DEPTH_TEST);
    const gpuSources = [0, 1, 2].map(() => { const t = gl.createTexture(); check(t, 'cannot create source texture'); textures.push(t); return t; });
    const upload = (unit: number, source: DataTexture | null, sampler: string, boundsName: string, bounds: number[]) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, gpuSources[unit]!);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const img = source?.image as { width: number; height: number; data: Float32Array } | undefined;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, img?.width ?? 1, img?.height ?? 1, 0, gl.RED, gl.FLOAT, img?.data ?? new Float32Array([0]));
      gl.uniform1i(gl.getUniformLocation(program, sampler), unit); gl.uniform4fv(gl.getUniformLocation(program, boundsName), bounds);
    };
    const phases = [];
    for (const [phase, enableGulf, enablePit] of [['combined', true, true], ['pit-only', false, true], ['gulf-only', true, false], ['cleared', false, false]] as const) {
      terrain.setCourseGulfField(enableGulf ? race.courseGulfField : null); terrain.setPitPadField(enablePit ? race.pitPadField : null);
      upload(0, u.uCourseGulf0.value, 'uCourseGulf0', 'uCourseGulfBounds0', u.uCourseGulfBounds0.value.toArray());
      upload(1, u.uCourseGulf1.value, 'uCourseGulf1', 'uCourseGulfBounds1', u.uCourseGulfBounds1.value.toArray());
      upload(2, u.uPitPad.value, 'uPitPad', 'uPitPadBounds', u.uPitPadBounds.value.toArray());
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([-999, -999, -999, -999])); gl.drawArrays(gl.POINTS, 0, probes.length);
      const pixels = new Float32Array(probes.length * 4); gl.readPixels(0, 0, probes.length, 1, gl.RGBA, gl.FLOAT, pixels);
      check(gl.getError() === gl.NO_ERROR, `GL error in ${phase}`);
      const rows = probes.map((p, i) => {
        const [x, z] = p.world, grids = race.courseGulfField?.grids;
        const a = enableGulf && grids ? sampleCourseGulfGrid(grids[0], x, z) : 0;
        const b = enableGulf && grids ? sampleCourseGulfGrid(grids[1], x, z) : 0;
        const pit = enablePit ? race.pitPadField?.sampleOffset(x, z) ?? 0 : 0;
        const cpu = [combineCourseGulfOffsets(a, b) + pit, a, b, pit], gpu = Array.from(pixels.slice(i * 4, i * 4 + 4));
        const errors = cpu.map((v, j) => Math.abs(v - gpu[j]!));
        if (p.category === 'protected-road') check(pit === 0 && gpu[3] === 0, `${phase}/${p.label} changed protected terrain`);
        check(errors.every(e => Number.isFinite(e) && e < .01), `${phase}/${p.label} exceeded 1 cm GPU/CPU tolerance: ${errors}`);
        const requestedPit = enablePit ? race.pitPadField?.sampleOffset(...p.requested) ?? 0 : 0;
        return { ...p, cpu, gpu, errors, pitCoordinateQuantizationDelta: pit - requestedPit };
      });
      phases.push({ phase, maximumErrorMetres: Math.max(...rows.flatMap(r => r.errors)), rows });
    }
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const shaderHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(COURSE_GULF_GLSL)))).map(v => v.toString(16).padStart(2, '0')).join('');
    return { status: 'passed', seed, signature: race.course.signature, samplerSourceSha256: shaderHash,
      scope: 'Actual current GLSL and actual uniform atlas bytes read through WebGL2; isolated sampler evidence, not an in-world screenshot or frame-rate benchmark.',
      pointCount: probes.length, phaseCount: phases.length, toleranceMetres: .01,
      float32WorldCoordinates: true, originalCoordinateQuantizationReportedSeparately: true,
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), lifecycle, phases };
  } finally {
    terrain.dispose();
    for (const buffer of buffers) gl.deleteBuffer(buffer); for (const texture of textures) gl.deleteTexture(texture);
    for (const program of programs) gl.deleteProgram(program); for (const shader of shaders) gl.deleteShader(shader);
    if (framebuffer) gl.deleteFramebuffer(framebuffer); if (vao) gl.deleteVertexArray(vao);
    gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
  }
}
