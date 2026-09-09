import { ClampToEdgeWrapping, LinearFilter, SRGBColorSpace, Texture, TextureLoader } from 'three';

/** Original pixels are immutable. Rectangles use top-left PNG coordinates. */
export const RUPTURE_FLAME_ATLAS = {
  sha256: 'f14657a3388bf9618d0206806c7b9c54856bd7f54c98596ea1790d85c97dd4c5',
  width: 1254, height: 1254,
  // Base sampling scale: at severity2 one source pixel spans1/120m, before
  // the authored pressure/fire optical envelope below. Original pixels/roots
  // remain immutable; the three fire drawings share the same event-age scale.
  pixelsPerWorldAtUnitSeverity: 240,
  frames: [
    { rect: [245, 126, 619, 539], root: [266, 349] },
    { rect: [860, 102, 1254, 489], root: [882, 349] },
    { rect: [194, 730, 720, 1134], root: [231, 969] },
    { rect: [860, 814, 1201, 1117], root: [889, 969] },
  ],
} as const;

/** Optical extent only; pressure/fire clocks and roots stay in the FX owner.
 * The larger short pressure gives way to a smaller lingering burn. */
export function ruptureArtworkScale(pressure: boolean, age: number): number {
  if (pressure) return 1.8;
  const t = Number.isFinite(age) ? Math.max(0, Math.min(1, age / .60)) : 0;
  return 1.6 - .45 * t * t * (3 - 2 * t);
}

export interface RuptureAtlasOptions {
  readonly url: string;
  readonly loader?: Pick<TextureLoader, 'load'>;
}

/** One view owns one optional texture. No work or request occurs by default. */
export class RuptureFlameAtlas {
  readonly uniforms = {
    uRuptureAtlas: { value: null as Texture | null },
    uRuptureAtlasReady: { value: 0 },
  };
  private status: 'disabled' | 'loading' | 'ready' | 'error' | 'disposed' = 'disabled';
  private url: string | null = null;
  private pending: Texture | null = null;
  private readonly released = new WeakSet<Texture>();

  load(options: RuptureAtlasOptions): void {
    // A view has one boot request; retries/replacements require a new owner.
    if (this.status !== 'disabled') return;
    this.url = options.url;
    this.status = 'loading';
    let completed = false;
    const accept = (texture: Texture): void => {
      completed = true;
      if (this.status !== 'loading') { this.release(texture); return; }
      const image = texture.image as { width?: number; height?: number } | undefined;
      if (image?.width !== RUPTURE_FLAME_ATLAS.width || image.height !== RUPTURE_FLAME_ATLAS.height) {
        this.status = 'error'; this.release(texture); this.pending = null; return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false; // UV y follows the PNG's top-down pixel metadata.
      texture.premultiplyAlpha = false;
      texture.wrapS = ClampToEdgeWrapping; texture.wrapT = ClampToEdgeWrapping;
      texture.minFilter = LinearFilter; texture.magFilter = LinearFilter;
      texture.generateMipmaps = false; // No cross-rectangle atlas mip bleeding.
      texture.needsUpdate = true;
      this.pending = null;
      this.uniforms.uRuptureAtlas.value = texture;
      this.uniforms.uRuptureAtlasReady.value = 1;
      this.status = 'ready';
    };
    const reject = (): void => {
      completed = true;
      if (this.status !== 'loading') return;
      this.status = 'error';
      if (this.pending) this.release(this.pending);
      this.pending = null;
    };
    try {
      const texture = (options.loader ?? new TextureLoader()).load(options.url, accept, undefined, reject);
      // Also safe for test/custom loaders that complete synchronously.
      if (!completed) this.pending = texture;
      else if (this.uniforms.uRuptureAtlas.value !== texture) this.release(texture);
    } catch { reject(); }
  }

  get diagnostics() {
    return { status: this.status, url: this.url,
      width: this.status === 'ready' ? RUPTURE_FLAME_ATLAS.width : 0,
      height: this.status === 'ready' ? RUPTURE_FLAME_ATLAS.height : 0,
      frameCount: this.status === 'ready' ? RUPTURE_FLAME_ATLAS.frames.length : 0 };
  }

  dispose(): void {
    if (this.status === 'disposed') return;
    this.status = 'disposed';
    this.uniforms.uRuptureAtlasReady.value = 0;
    if (this.pending) this.release(this.pending);
    if (this.uniforms.uRuptureAtlas.value) this.release(this.uniforms.uRuptureAtlas.value);
    this.pending = null; this.uniforms.uRuptureAtlas.value = null;
  }

  private release(texture: Texture): void {
    if (this.released.has(texture)) return;
    this.released.add(texture); texture.dispose();
  }
}

// Shared by the GPU shader and metadata tests. No texture-coordinate rewrite,
// world transform, per-hit texture allocation or mutable per-event phase clock.
export const RUPTURE_ATLAS_GLSL = `
  uniform sampler2D uRuptureAtlas;
  uniform float uRuptureAtlasReady;
  varying vec2 vRuptureAtlasSpan;
  vec4 ruptureFrame(float frame, vec2 local) {
    vec4 rect;
    vec2 root;
    ${RUPTURE_FLAME_ATLAS.frames.map((f, i) => `${i ? 'else ' : ''}if (frame < ${i + .5}) {
      rect = vec4(${f.rect.map(n => n.toFixed(1)).join(', ')});
      root = vec2(${f.root.map(n => n.toFixed(1)).join(', ')});
    }`).join('\n')}
    else { return vec4(0.0); }
    vec2 pixel = root + vec2(local.x, -local.y) * vRuptureAtlasSpan;
    // Pixel indices address centers, with explicit outside transparency even
    // when bilinear sampling would otherwise see a neighboring drawing.
    if (any(lessThan(pixel, rect.xy)) || any(greaterThanEqual(pixel, rect.zw))) return vec4(0.0);
    vec2 uv = (clamp(pixel, rect.xy, rect.zw - 1.0) + 0.5) / ${RUPTURE_FLAME_ATLAS.width.toFixed(1)};
    vec4 texel = texture2D(uRuptureAtlas, uv);
    // sRGB texture hardware decoding preserves the painted source colors.
    return vec4(texel.rgb * texel.a, texel.a);
  }
  vec4 ruptureArtwork(float kind, float age, vec2 local) {
    if (kind < 6.5) return ruptureFrame(0.0, local);
    // Existing fire slot age; loading cannot restart these transitions.
    float second = smoothstep(0.24, 0.40, age);
    float embers = smoothstep(1.35, 1.65, age);
    if (age < 0.24) return ruptureFrame(1.0, local);
    if (age < 0.40) return mix(ruptureFrame(1.0, local), ruptureFrame(2.0, local), second);
    if (age < 1.35) return ruptureFrame(2.0, local);
    if (age < 1.65) return mix(ruptureFrame(2.0, local), ruptureFrame(3.0, local), embers);
    return ruptureFrame(3.0, local);
  }
`;
