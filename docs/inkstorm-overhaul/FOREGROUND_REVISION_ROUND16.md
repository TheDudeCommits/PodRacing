# Foreground revision for round 16

Source changes after the measured round-15 build; actual browser art and performance acceptance are pending.

- Checkpoint supports now use merged painted metal bases, collars, small amber lamps and cyan timing transponders. Thin steel crossbeams replace large green luminous bars. The original checkpoint span and timing logic remain; the same two instanced batches write real opaque depth and receive the existing static scenery shadows.
- The player enamel palette now retains blue in its brightest diffuse band, with reduced broad shell rim/specular/reflection contributions. This addresses the uniform pale mint bodywork visible in round 15; it is not a substitute for requested Sketchfab vehicles.
- The coupling uses thinner cyan cores with irregular displacement and two short reconnecting branches. Fewer longitudinal tube segments pay for the forks within the existing one-draw batch. Real animation and LOD rules remain active.
- A tapered metal cockpit undertray replaces the protruding black rectangular bar. All four craft remain inside the prior solid envelopes.
- Contact footprints now feather to zero through vertex alpha, retaining one instanced draw. This reduces the detached solid-oval appearance. They are approximate hover contacts, not actual projected vehicle silhouettes or terrain-conforming sun shadows. Instance buffers are disposed with the rest of the contact renderer.

Existing focused course-render, hero-envelope and LOD tests passed during implementation. The next complete build/capture will establish shader compilation and visual effect; round-15 FPS evidence does not measure these edits.

## Interim rendered checks

`index-BJ8Znx2v.js` compiled the initial foreground/HUD revision and seven sections without errors. Fresh blind image-only criticism passed HUD readability at 8.0/10 and failed foreground finish at 6.3/10; see `gauntlet-foreground-16.md`. The critic saw the initial coupling shader. Root subsequently fixed a per-vertex random phase that distorted thin tube cross-sections, using a constant seed per beam instead.

`index-BgaKQfcq.js` passed the full 380-test/67-file verify and seven-section capture with zero browser errors. It adds the finished launch terrain/terraces and terrain-conforming hazard paint. Small flat amber ticks and a thin ring replace raised oversized glyphs, while preserving the full authoritative hazard radius. The warning shader shares the same gulf texture uniforms as the road. `output/gauntlet/round-16-world` contains those interim actual frames. Neither short smoke run is full-race FPS evidence; scanned geology and actual player-cast shadows remain in separate staging.
