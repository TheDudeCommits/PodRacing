import type { PerspectiveCamera, WebGLRenderer } from 'three';

export interface ViewportMetrics {
  cssWidth: number;
  cssHeight: number;
  pixelRatio: number;
}

export class Viewport {
  private readonly observer: ResizeObserver;
  private captureMode = false;
  private adaptivePixelRatio = 1;
  private metrics: ViewportMetrics = { cssWidth: 1, cssHeight: 1, pixelRatio: 1 };

  constructor(
    private readonly mount: HTMLElement,
    private readonly renderer: WebGLRenderer,
    private readonly camera: PerspectiveCamera,
    private readonly onResize?: (width: number, height: number, pixelRatio: number) => void,
  ) {
    this.adaptivePixelRatio = Math.min(window.devicePixelRatio, 1.75);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();
  }

  setCaptureMode(enabled: boolean): void {
    this.captureMode = enabled;
    this.resize();
  }

  setAdaptivePixelRatio(pixelRatio: number): void {
    this.adaptivePixelRatio = Math.min(2, Math.max(1, pixelRatio));
    if (!this.captureMode) this.resize();
  }

  getMetrics(): ViewportMetrics {
    return { ...this.metrics };
  }

  dispose(): void {
    this.observer.disconnect();
  }

  private resize(): void {
    const rect = this.mount.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const pixelRatio = this.captureMode ? 2 : this.adaptivePixelRatio;
    this.camera.aspect = cssWidth / cssHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(cssWidth, cssHeight, false);
    this.metrics = { cssWidth, cssHeight, pixelRatio };
    this.onResize?.(cssWidth, cssHeight, pixelRatio);
  }
}
