import {
  NoToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export function createRenderer(canvas?: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = false;
  renderer.sortObjects = true;
  // The frame graph performs several renderer.render calls (MRT, beauty,
  // custom terrain, composite). Reset once in GameApp so diagnostics report the
  // whole frame rather than only the final fullscreen triangle.
  renderer.info.autoReset = false;
  return renderer;
}
