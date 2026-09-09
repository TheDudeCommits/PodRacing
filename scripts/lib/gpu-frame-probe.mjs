/** Serialized with browserContext.addInitScript. No application source hooks,
 * synthetic clocks, blocking GPU reads, finish(), or rendering state changes. */
export function installGpuFrameProbe(options = {}) {
  const selector = options.selector ?? '#game > canvas#viewport[aria-label="Podracing viewport"]';
  const sampleEveryMs = options.sampleEveryMs ?? 250;
  const queryTimeoutMs = options.queryTimeoutMs ?? 5000;
  const maxQueries = options.maxQueries ?? 256;
  const maxFrames = options.maxFrames ?? 10000;
  const now = performance.now.bind(performance);
  const originalPerformanceNow = performance.now, originalDateNow = Date.now;
  const nativeRaf = window.requestAnimationFrame;
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  const contexts = [], callbacks = [], restorers = [], events = [], queries = [], frames = [];
  const callbackRecords = new WeakMap(), contextRecords = new WeakMap();
  let main = null, currentCallback = null, pending = null, active = false, disposed = false;
  let startedAt = null, stoppedAt = null, lastSample = -Infinity, lastRenderTime = null;
  let outsideRafDraws = 0, totalActiveDraws = 0, droppedFrames = 0, sampleLimitReached = false;
  const event = (type, detail = {}) => events.push({ type, atMs: now(), ...detail });

  function patch(object, key, replacement) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    try {
      Object.defineProperty(object, key, { value: replacement, configurable: true, writable: true });
      restorers.push(() => {
        if (object[key] !== replacement) { event('cleanup-property-replaced', { key }); return; }
        if (descriptor) Object.defineProperty(object, key, descriptor);
        else delete object[key];
      });
      return true;
    } catch (error) { event('instrumentation-failed', { key, message: String(error) }); return false; }
  }

  function countDraw(record, method, mode, count, instances = 1) {
    record.draws += 1;
    if (mode === record.gl.TRIANGLES) record.triangles += count * instances / 3;
    record.methods[method] = (record.methods[method] ?? 0) + 1;
    if (active && record === main) {
      totalActiveDraws += 1;
      if (currentCallback === null) outsideRafDraws += 1;
    }
  }

  function hookExtension(record, extension) {
    if (!extension || record.extensions.has(extension)) return extension;
    record.extensions.add(extension);
    const signatures = {
      multiDrawArraysWEBGL: { counts: 3, countsOffset: 4, drawCount: 5 },
      multiDrawElementsWEBGL: { counts: 1, countsOffset: 2, drawCount: 6 },
      multiDrawArraysInstancedWEBGL: { counts: 3, countsOffset: 4, instances: 5, instancesOffset: 6, drawCount: 7 },
      multiDrawElementsInstancedWEBGL: { counts: 1, countsOffset: 2, instances: 6, instancesOffset: 7, drawCount: 8 },
    };
    for (const [method, signature] of Object.entries(signatures)) {
      if (typeof extension[method] !== 'function') continue;
      const original = extension[method];
      patch(extension, method, function (...args) {
        let elements = 0;
        for (let index = 0; index < args[signature.drawCount]; index += 1) {
          const instances = signature.instances === undefined ? 1 : args[signature.instances][args[signature.instancesOffset] + index];
          elements += args[signature.counts][args[signature.countsOffset] + index] * instances;
        }
        // Three r185 records one renderer.info call per multiDraw submission.
        countDraw(record, method, args[0], elements);
        return Reflect.apply(original, this, args);
      });
    }
    return extension;
  }

  function register(gl, requestedType) {
    if (contextRecords.has(gl)) return;
    const record = { id: contexts.length + 1, gl, requestedType, canvas: gl.canvas,
      draws: 0, triangles: 0, methods: {}, extensions: new WeakSet(), extension: null,
      supported: null, unavailableReason: null, environment: null };
    contexts.push(record); contextRecords.set(gl, record);
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = gl[method];
      patch(gl, method, function (...args) {
        const count = method.startsWith('drawArrays') ? args[2] : args[1];
        const instances = method === 'drawArraysInstanced' ? args[3] : method === 'drawElementsInstanced' ? args[4] : 1;
        countDraw(record, method, args[0], count, instances);
        return Reflect.apply(original, this, args);
      });
    }
    const getExtension = gl.getExtension;
    patch(gl, 'getExtension', function (...args) {
      const extension = Reflect.apply(getExtension, this, args);
      return String(args[0]).toLowerCase() === 'webgl_multi_draw' ? hookExtension(record, extension) : extension;
    });
    const contextEvent = () => ({ contextId: record.id, mainAtEvent: main === record,
      canvasId: record.canvas.id, canvasParentId: record.canvas.parentElement?.id ?? null, duringMeasurement: active });
    const lost = () => { event('context-lost', contextEvent()); if (main === record && pending) retire('context-lost'); };
    const restored = () => { event('context-restored', contextEvent()); record.supported = null; if (main === record) identify(); };
    record.canvas.addEventListener('webglcontextlost', lost);
    record.canvas.addEventListener('webglcontextrestored', restored);
    restorers.push(() => { record.canvas.removeEventListener('webglcontextlost', lost); record.canvas.removeEventListener('webglcontextrestored', restored); });
  }

  const getContext = function (...args) {
    const result = Reflect.apply(nativeGetContext, this, args);
    if (result && typeof WebGL2RenderingContext !== 'undefined' && result instanceof WebGL2RenderingContext) register(result, args[0]);
    return result;
  };
  patch(HTMLCanvasElement.prototype, 'getContext', getContext);

  function identify() {
    const matches = document.querySelectorAll(selector);
    if (matches.length !== 1) return null;
    const record = contexts.find((candidate) => candidate.canvas === matches[0]);
    if (!record) return null;
    if (main && main !== record) event('main-context-changed', { previousId: main.id, nextId: record.id });
    main = record;
    if (record.supported !== null) return record;
    const gl = record.gl;
    record.extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const bits = record.extension ? gl.getQuery(record.extension.TIME_ELAPSED_EXT, record.extension.QUERY_COUNTER_BITS_EXT) : null;
    record.supported = !!record.extension && typeof bits === 'number' && bits > 0;
    record.unavailableReason = record.supported ? null : record.extension ? 'elapsed-query-counter-bits-unavailable' : 'EXT_disjoint_timer_query_webgl2-unavailable';
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    record.environment = { contextId: record.id, requestedType: record.requestedType, selector,
      canvas: { id: record.canvas.id, parentId: record.canvas.parentElement?.id ?? null,
        ariaLabel: record.canvas.getAttribute('aria-label'), width: record.canvas.width, height: record.canvas.height },
      webglVersion: gl.getParameter(gl.VERSION), shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
      extensionSupported: record.supported, queryCounterBits: bits, unavailableReason: record.unavailableReason };
    event('main-context-identified', { ...record.environment });
    return record;
  }

  function dimensions(record) {
    return { canvasWidth: record.canvas.width, canvasHeight: record.canvas.height,
      drawingBufferWidth: record.gl.drawingBufferWidth, drawingBufferHeight: record.gl.drawingBufferHeight,
      cssWidth: record.canvas.clientWidth, cssHeight: record.canvas.clientHeight, requestedDpr: devicePixelRatio };
  }

  function phase() { return document.querySelector('.pod-hud')?.getAttribute('data-phase') ?? 'unknown'; }

  function appReceipt() {
    const state = window.__PODRACING__?.snapshot();
    if (!state) return null;
    return { simulationFrame: state.simulationFrame, raceTime: state.raceTime,
      progress: state.galactic?.racers?.find((racer) => racer.id === 'player')?.courseProgress ?? null,
      awaitingStart: state.game.awaitingStart, speed: state.game.speed, phase: phase(),
      renderer: state.renderer, postMode: state.game.postMode, postFailure: state.game.postFailure,
      appearance: state.game.vehiclePresentation?.racers?.[0] ?? null };
  }

  function retire(status, detail = {}) {
    if (!pending) return;
    const item = pending; pending = null;
    item.row.status = status; item.row.resolvedAtMs = now(); Object.assign(item.row, detail);
    try { item.record.gl.deleteQuery(item.query); item.row.deleted = true; }
    catch (error) { item.row.deleteError = String(error); }
  }

  function poll() {
    if (!pending) return;
    const { record, query, row } = pending, gl = record.gl;
    row.polls += 1;
    try {
      if (gl.isContextLost()) { retire('context-lost'); return; }
      const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
      const disjoint = gl.getParameter(record.extension.GPU_DISJOINT_EXT);
      if (disjoint) {
        event('gpu-disjoint', { queryId: row.id });
        retire('invalid-disjoint', { availableWhenDisjoint: available,
          rawResultNs: available ? gl.getQueryParameter(query, gl.QUERY_RESULT) : null });
      } else if (available) {
        const result = gl.getQueryParameter(query, gl.QUERY_RESULT);
        const valid = Number.isFinite(result) && result >= 0 && !(row.rendered && result === 0);
        retire(valid ? 'available' : row.rendered && result === 0 ? 'invalid-zero-duration' : 'invalid-result',
          { rawResultNs: result, gpuElapsedMs: valid ? result / 1e6 : null });
      } else if (now() - row.startedAtMs > queryTimeoutMs) retire('poll-timeout');
    } catch (error) { retire('poll-error', { error: String(error) }); }
  }

  function begin(record, callback, rafTime) {
    if (!active || !record.supported || !callback.rendered || pending || now() - lastSample < sampleEveryMs) return null;
    if (queries.length >= maxQueries) { sampleLimitReached = true; return null; }
    lastSample = now();
    const row = { id: queries.length + 1, callbackId: callback.id, rafTime, startedAtMs: now(),
      phaseBefore: phase(), beginDimensions: dimensions(record), status: 'starting', polls: 0,
      rawResultNs: null, gpuElapsedMs: null, deleted: false };
    queries.push(row);
    const gl = record.gl, extension = record.extension;
    try {
      if (gl.isContextLost()) { row.status = 'context-lost-before-begin'; return null; }
      if (gl.getParameter(extension.GPU_DISJOINT_EXT)) { row.status = 'skipped-disjoint'; return null; }
      if (gl.getQuery(extension.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) { row.status = 'skipped-existing-query'; return null; }
      const query = gl.createQuery();
      if (!query) { row.status = 'query-allocation-failed'; return null; }
      pending = { query, record, row };
      gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
      if (gl.getQuery(extension.TIME_ELAPSED_EXT, gl.CURRENT_QUERY) !== query) {
        retire('begin-not-active'); return null;
      }
      row.status = 'active';
      return row;
    } catch (error) {
      if (pending?.row === row) retire('begin-error', { error: String(error) });
      else { row.status = 'begin-error'; row.error = String(error); }
      return null;
    }
  }

  const requestAnimationFrame = function (callback) {
    if (typeof callback !== 'function') return Reflect.apply(nativeRaf, window, [callback]);
    let record = callbackRecords.get(callback);
    if (!record) {
      record = { id: callbacks.length + 1, name: callback.name || '(anonymous)', invocations: 0,
        rendered: 0, activeRendered: 0, mainDraws: 0, maxDraws: 0 };
      callbackRecords.set(callback, record); callbacks.push(record);
    }
    return Reflect.apply(nativeRaf, window, [function (rafTime) {
      if (disposed) return Reflect.apply(callback, this, [rafTime]);
      const context = main ?? identify();
      const beforeDraws = context?.draws ?? 0, beforeTriangles = context?.triangles ?? 0;
      const previousCallback = currentCallback; currentCallback = record.id;
      const cpuStarted = now();
      const row = context ? begin(context, record, rafTime) : null;
      try { return Reflect.apply(callback, this, [rafTime]); }
      finally {
        // End immediately after the complete native callback, before snapshots,
        // polling or report bookkeeping. No other RAF callback can nest a query.
        if (row && pending?.row === row) {
          try {
            if (context.gl.getQuery(context.extension.TIME_ELAPSED_EXT, context.gl.CURRENT_QUERY) !== pending.query) {
              event('query-ownership-changed', { queryId: row.id }); retire('query-ownership-changed');
            } else { context.gl.endQuery(context.extension.TIME_ELAPSED_EXT); row.status = 'pending'; row.endedAtMs = now(); }
          }
          catch (error) { retire('end-error', { error: String(error) }); }
        }
        const cpuElapsedMs = now() - cpuStarted;
        currentCallback = previousCallback; record.invocations += 1;
        const draws = (context?.draws ?? 0) - beforeDraws;
        const triangles = (context?.triangles ?? 0) - beforeTriangles;
        if (draws > 0) {
          record.rendered += 1; record.mainDraws += draws; record.maxDraws = Math.max(record.maxDraws, draws);
          if (active) {
            record.activeRendered += 1;
            const frame = { callbackId: record.id, rafTime,
              intervalMs: lastRenderTime === null ? null : rafTime - lastRenderTime,
              phase: phase(), draws, triangles, cpuBracketMs: cpuElapsedMs };
            lastRenderTime = rafTime;
            if (frames.length < maxFrames) frames.push(frame); else droppedFrames += 1;
          }
        }
        if (row) {
          row.draws = draws; row.triangles = triangles; row.cpuBracketMs = cpuElapsedMs;
          row.endDimensions = dimensions(context);
          // GameApp resets renderer.info once before its entire frame graph.
          // Matching this receipt detects omitted passes/another RAF callback.
          row.app = appReceipt();
          row.drawCountMatchesRenderer = row.app?.renderer.calls === draws;
          row.triangleCountMatchesRenderer = row.app?.renderer.triangles === triangles;
          row.rendered = draws > 0;
        }
      }
    }]);
  };
  patch(window, 'requestAnimationFrame', requestAnimationFrame);
  const pollTimer = setInterval(poll, 50);

  function report() {
    return { installedAtOrigin: performance.timeOrigin, selector,
      method: 'EXT_disjoint_timer_query_webgl2 TIME_ELAPSED brackets an actual draw-producing native RAF callback on the DOM-verified main WebGL2 context.',
      sampleEveryMs, queryTimeoutMs, maxQueries, maxFrames, startedAt, stoppedAt,
      active, disposed, environment: main?.environment ?? null,
      unavailableReason: main ? main.unavailableReason : 'main-canvas-context-not-identified',
      contexts: contexts.map((record) => ({ id: record.id, requestedType: record.requestedType,
        canvasId: record.canvas.id, canvasParentId: record.canvas.parentElement?.id ?? null,
        selected: record === main, totalDraws: record.draws, methods: record.methods })),
      callbacks: callbacks.map((record) => ({ ...record })),
      frames, queries, events, outsideRafDraws, totalActiveDraws, droppedFrames, sampleLimitReached,
      pendingQueryCount: pending ? 1 : 0,
      clockIdentityUnchanged: { performanceNow: performance.now === originalPerformanceNow, dateNow: Date.now === originalDateNow },
      mutations: { clocks: false, timestamps: false, inputs: false, applicationSource: false, renderTargets: false,
        wrappers: ['HTMLCanvasElement.getContext', 'main/aux context draw submissions and multiDraw methods', 'window.requestAnimationFrame'] } };
  }

  const api = {
    status() { identify(); return { mainIdentified: !!main, supported: main?.supported ?? null, unavailableReason: main?.unavailableReason ?? null }; },
    start() {
      if (disposed || active || startedAt !== null) throw new Error('GPU frame probe can start only once.');
      identify(); startedAt = now(); active = true;
      event('measurement-start', { receipt: appReceipt(), dimensions: main ? dimensions(main) : null });
      return api.status();
    },
    snapshot: report,
    async stop() {
      if (disposed) return report();
      active = false; stoppedAt = now();
      event('measurement-stop', { receipt: appReceipt(), dimensions: main ? dimensions(main) : null });
      const deadline = now() + queryTimeoutMs;
      while (pending && now() < deadline) { await new Promise((resolve) => setTimeout(resolve, 50)); poll(); }
      if (pending) retire('stop-drain-timeout');
      clearInterval(pollTimer);
      disposed = true;
      for (let index = restorers.length - 1; index >= 0; index -= 1) {
        try { restorers[index](); } catch (error) { event('cleanup-error', { error: String(error) }); }
      }
      event('cleanup-complete', { pendingQueries: pending ? 1 : 0,
        rafRestored: window.requestAnimationFrame === nativeRaf,
        getContextRestored: HTMLCanvasElement.prototype.getContext === nativeGetContext });
      return report();
    },
  };
  Object.defineProperty(window, '__INKSTORM_GPU_FRAME_PROBE__', { value: api, configurable: true });
}

/** Evidence summary only. Never convert GPU elapsed time into claimed FPS. */
export function summarizeGpuFrameProbe(report) {
  const valid = report.queries.filter((query) => query.status === 'available' && query.rendered
    && query.drawCountMatchesRenderer && query.triangleCountMatchesRenderer && Number.isFinite(query.gpuElapsedMs));
  const sorted = valid.map((query) => query.gpuElapsedMs).sort((a, b) => a - b);
  const quantile = (fraction) => sorted.length ? sorted[Math.floor((sorted.length - 1) * fraction)] : null;
  const drawingCallbacks = report.callbacks.filter((callback) => callback.activeRendered > 0);
  const problems = [];
  if (!report.environment) problems.push('main context was not identified');
  if (drawingCallbacks.length !== 1) problems.push(`expected one main rendering callback, observed ${drawingCallbacks.length}`);
  if (report.outsideRafDraws !== 0) problems.push(`${report.outsideRafDraws} main-context draws occurred outside RAF callbacks`);
  if (report.queries.some((query) => query.rendered && (!query.drawCountMatchesRenderer || !query.triangleCountMatchesRenderer))) problems.push('query draw coverage did not match the whole-frame renderer receipt');
  const mainContextIds = new Set([report.environment?.contextId,
    ...report.events.filter((event) => event.type === 'main-context-identified').map((event) => event.contextId)]
    .filter((id) => Number.isInteger(id)));
  const auxiliaryContextIds = new Set(report.contexts.filter((context) => context.selected === false
    && !mainContextIds.has(context.id)).map((context) => context.id));
  const contextEvents = report.events.filter((event) => event.type === 'context-lost' || event.type === 'context-restored')
    .map((event) => ({ ...event,
      scope: event.mainAtEvent === true || mainContextIds.has(event.contextId) ? 'main'
        : auxiliaryContextIds.has(event.contextId) ? 'auxiliary' : 'unidentified' }));
  if (contextEvents.some((event) => event.scope !== 'auxiliary')) problems.push('main or unidentified WebGL context changed during the probe');
  if (report.events.some((event) => /instrumentation-failed|cleanup-error|cleanup-property-replaced|main-context-changed|query-ownership-changed/.test(event.type))) problems.push('instrumentation, query ownership or cleanup changed during the probe');
  if (report.droppedFrames || report.sampleLimitReached || report.pendingQueryCount) problems.push('a bounded evidence limit or pending query remains');
  if (!report.clockIdentityUnchanged?.performanceNow || !report.clockIdentityUnchanged?.dateNow) problems.push('native clock function identity changed');
  if (!report.unavailableReason && valid.length < 10) problems.push('fewer than 10 usable completed queries');
  const statuses = {};
  for (const query of report.queries) statuses[query.status] = (statuses[query.status] ?? 0) + 1;
  return { scope: 'Initial course only: ordinary Start followed by 20 seconds of real held W input, including countdown; no complete-race or physical-presentation claim.',
    outcome: report.unavailableReason ? 'UNAVAILABLE' : problems.length || valid.length < 10 ? 'INCOMPLETE' : 'MEASURED',
    unavailableReason: report.unavailableReason, coverageProblems: problems, validQueries: valid.length, queryStatuses: statuses,
    contextEvents,
    drawingCallbackIds: drawingCallbacks.map((callback) => callback.id),
    gpuElapsedMs: { mean: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null,
      p50: quantile(.5), p95: quantile(.95), maximum: sorted.at(-1) ?? null },
    displayCadenceIsSeparate: true };
}
