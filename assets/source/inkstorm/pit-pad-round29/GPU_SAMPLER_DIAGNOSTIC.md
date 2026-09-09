# Staged actual-GLSL sampler diagnostic

`gpu-sampler-diagnostic.ts` is ready for root to run from its owned Vite browser page when the GPU slot is free. Importing the module does not create a canvas or GPU context. This subagent ran only `inspectSamplerBinding()` in Vite SSR; the identity/reset/disposal checks passed and their result is in `sampler-lifecycle-receipt.json`.

Example invocation inside root's existing page harness:

```js
const receipt = await page.evaluate(async () => {
  const diagnostic = await import('/assets/source/inkstorm/pit-pad-round29/gpu-sampler-diagnostic.ts');
  return diagnostic.runGpuSamplerDiagnostic();
});
// Save the returned JSON from the harness, then close the owned browser.
```

The explicit GPU entry point imports the actual current `COURSE_GULF_GLSL`, reads the actual `TerrainSystem.gulfTextures.uniforms` data and bounds, and renders a one-pixel row of probes into RGBA32F. Channels are total offset, launch offset, finish offset and pit offset. It reads back the framebuffer for combined, pit-only, gulf-only and fully cleared bindings, and records the exact shader-string SHA-256.

Probes include pad centers, all slab corners, both sides of apron transitions, atlas boundaries, protected main-road width/ten-metre shoulders/normal probes, positive and negative gulf extrema with fractional texel coordinates, and a point outside every field. CPU values use the same float32 world coordinates uploaded to the shader; the requested-coordinate quantization difference is reported separately. Every channel must be finite and within one centimetre of CPU; protected-road pit offsets must be exactly zero. Missing WebGL2/float-framebuffer support, shader compilation errors, GL errors or tolerance failures throw instead of fabricating a fallback result.

The routine deletes all its buffers, textures, shaders, program, VAO and framebuffer, disposes its temporary TerrainSystem, and loses its temporary WebGL context in `finally`. Root still owns closing the browser. This is actual GPU sampler evidence when run, not in-world art acceptance or an FPS benchmark. No GPU run was performed by this subagent.

Independent source inspection found the intended render contract present: stable pit uniform objects join the existing shared set; clearing either field retains the other; TerrainSystem height/surface/normal samplers use their sum; the GLSL total adds the pit after the unchanged signed gulf composition; rigid hangars/foundations use saved anchors; GameApp installs and clears the pit beside its gulf.
