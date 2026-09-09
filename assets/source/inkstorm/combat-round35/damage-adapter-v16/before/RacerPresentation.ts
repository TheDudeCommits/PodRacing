import { CatmullRomCurve3, Float32BufferAttribute, Group, Mesh, TubeGeometry, Vector3, type ShaderMaterial } from 'three';
import { getVehicleArtDefinition, isVehicleAppearanceId, resolveVehicleAppearance, type VehicleAppearanceId } from '../../game/vehicleAppearance';
import { PodracerView, type DistantRivalLod, type PodracerMaterials, type PodracerPose, type RacerVehicleClass } from '../objects/PodracerView';
import { ImportedVehiclePresentation } from './ImportedVehiclePresentation';
import { VehicleArtLibrary } from './VehicleArtLibrary';
import { ImportedExhaustNozzles } from './ImportedExhaustNozzles';

/** Stable race identity and pose, with independently owned procedural and imported art. */
export class RacerPresentation extends Group {
  readonly procedural: PodracerView;
  readonly imported: ImportedVehiclePresentation;
  readonly authoredVehicleClass: RacerVehicleClass;
  readonly pilotAnchor: Group;
  private readonly importedWake = [new Group(), new Group()];
  private readonly importedDust = [new Group(), new Group(), new Group()];
  private readonly effects = new Group();
  private readonly exhaustSources: Mesh[] = [];
  private readonly exhaustMeshes: Mesh[] = [];
  private nozzleLips: ImportedExhaustNozzles | null = null;
  private coupling: Mesh | null = null;
  private couplingMaterial: ShaderMaterial | null = null;
  private effectsSource: ImportedVehiclePresentation['activeSource'] = null;
  private proceduralProxy: Mesh | null = null;
  private activePrepasses: readonly Mesh[] = [];
  private requested: VehicleAppearanceId = 'procedural';
  private effective: VehicleAppearanceId = 'procedural';
  private disposed = false;
  private geometryChanged: (() => void) | null = null;
  private revision = 0;
  private sourceGeneration = 0;
  private readonly localPose: PodracerPose = {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, steer: 0, throttle: 0, speed: 0, boost: 0, damage: 0,
  };
  ready: Promise<unknown> = Promise.resolve();

  constructor(library: VehicleArtLibrary, materials?: PodracerMaterials, readonly racerIndex = 0) {
    super();
    this.name = `racer-presentation-${racerIndex}`;
    this.procedural = new PodracerView(materials, racerIndex);
    this.authoredVehicleClass = this.procedural.authoredVehicleClass;
    this.pilotAnchor = this.procedural.pilotAnchor;
    this.imported = new ImportedVehiclePresentation(library, {
      maxTriangles: racerIndex === 0 ? 60_000 : 30_000,
      materialOptions: { specularStrength: .2, rimStrength: .16, reflectionStrength: .08, wear: .24 },
      onGeometryChanged: () => this.refreshGeometry(),
    });
    this.effects.name = 'imported-vehicle-effects';
    this.effects.userData.inkstormRacerShadowExclude = true;
    this.effects.visible = false;
    this.add(this.procedural, this.imported, this.effects);
    this.userData.vehicleClass = this.vehicleClass;
    this.userData.authoredVehicleClass = this.authoredVehicleClass;
  }

  get vehicleClass(): RacerVehicleClass { return this.procedural.vehicleClass; }
  get lodMode(): DistantRivalLod { return this.procedural.lodMode; }
  get appearanceId(): VehicleAppearanceId { return this.effective; }
  get activeAppearanceId(): VehicleAppearanceId {
    const id = this.importedActive ? this.imported.activeSource?.id : null;
    return isVehicleAppearanceId(id) ? id : 'procedural';
  }
  get importedActive(): boolean { return this.effective !== 'procedural' && this.imported.activeSource !== null; }
  get appearanceStatus(): string { return this.effective === 'procedural' ? 'procedural' : this.imported.status; }
  get breakupAvailable(): boolean { return this.importedActive && this.imported.wreckBreakupAvailable; }
  get breakupActive(): boolean { return this.importedActive && this.imported.wreckBreakupActive; }
  get geometryRevision(): number { return this.revision; }
  get prepassMeshes(): readonly Mesh[] { return this.activePrepasses; }
  get wakeAnchors(): readonly Group[] { return this.importedActive ? this.importedWake : this.procedural.wakeAnchors; }
  get dustAnchors(): readonly Group[] { return this.importedActive ? this.importedDust : this.procedural.dustAnchors; }

  /** Register once after the post pipeline exists; replacements notify before old leases release. */
  setGeometryChangeListener(listener: (() => void) | null): void { this.geometryChanged = listener; }

  createCelPrepassProxy(): Mesh {
    this.proceduralProxy ??= this.procedural.createCelPrepassProxy();
    this.refreshGeometry(false);
    return this.proceduralProxy;
  }

  setVehicleClass(vehicleClass: RacerVehicleClass): void {
    if (vehicleClass === this.vehicleClass) return;
    this.procedural.setVehicleClass(vehicleClass);
    this.userData.vehicleClass = vehicleClass;
    this.selectAppearance(true);
    this.refreshGeometry();
  }

  setAppearance(appearance: VehicleAppearanceId): Promise<unknown> {
    if (appearance === this.requested) return this.ready;
    this.requested = appearance;
    return this.selectAppearance();
  }

  retryAppearance(): Promise<unknown> { return this.selectAppearance(true); }

  setLodMode(mode: DistantRivalLod): void {
    this.procedural.setLodMode(mode);
    this.syncVisibility();
  }

  update(pose: PodracerPose, time: number, preserveWreckBreakup = false): void {
    // Ordinary driving, garage and historical replays restore the exact source
    // transforms. The live resolver alone prepares the current breakup frame.
    if (!preserveWreckBreakup) this.imported.resetWreckBreakup();
    this.position.set(pose.x, pose.y, pose.z);
    this.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
    Object.assign(this.localPose, pose);
    this.localPose.x = this.localPose.y = this.localPose.z = 0;
    this.localPose.yaw = this.localPose.pitch = this.localPose.roll = 0;
    this.procedural.update(this.localPose, time);
    // Reuse the established flame/coupling shaders and animated uniforms, with
    // the actual DCC nozzle roots. Imported geometry itself is never distorted.
    if (this.importedActive) {
      for (let index = 0; index < this.exhaustMeshes.length; index += 1) {
        const flame = this.exhaustMeshes[index], source = this.exhaustSources[index];
        const anchor = this.imported.getAttachment(index === 0 ? 'exhaustLeft' : 'exhaustRight');
        if (!flame || !source || !anchor) continue;
        flame.scale.copy(source.scale);
        // Installed aperture metadata includes peak redline expansion; omitted
        // metadata retains the existing .54 multiplier exactly.
        flame.scale.x *= this.imported.exhaustRadialScale;
        flame.scale.z *= this.imported.exhaustRadialScale;
        flame.position.copy(anchor.position);
        flame.position.z -= 4.25 * flame.scale.y;
      }
    }
    this.syncVisibility();
  }

  /** Must also run for views hidden because no racer occupies that slot. */
  syncVisibility(): void {
    const imported = this.importedActive;
    this.procedural.visible = !imported;
    this.imported.visible = imported;
    // Cut the intact energy tether/flames/nozzle overlays while Teemto engines
    // separate. The authored solid engine meshes retain their existing passes.
    this.effects.visible = imported && this.lodMode !== 'silhouette' && !this.imported.wreckBreakupActive;
    this.pilotAnchor.visible = !imported && this.lodMode === 'full';
    if (imported) {
      for (const mesh of this.imported.geometryMeshes) {
        if (mesh.userData.inkstormRacerShadowExclude === true) mesh.visible = this.lodMode === 'full';
      }
    }
    let visible = true;
    for (let parent: Group['parent'] = this; parent; parent = parent.parent) if (!parent.visible) visible = false;
    if (this.proceduralProxy) this.proceduralProxy.visible = visible && !imported;
    this.imported.syncPrepassVisibility();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sourceGeneration += 1;
    this.geometryChanged = null;
    this.imported.dispose();
    this.coupling?.geometry.dispose();
    this.nozzleLips?.dispose();
    this.effects.clear();
    this.procedural.dispose();
    this.clear();
    this.removeFromParent();
  }

  private selectAppearance(force = false): Promise<unknown> {
    if (this.disposed) return Promise.resolve();
    const next = resolveVehicleAppearance(this.vehicleClass, this.requested);
    if (!force && next === this.effective) return this.ready;
    this.effective = next;
    const generation = ++this.sourceGeneration;
    const definition = getVehicleArtDefinition(next, this.racerIndex === 0 ? 'hero' : 'rival');
    this.ready = this.imported.setSource(definition).then(() => {
      if (this.disposed || generation !== this.sourceGeneration) return;
      this.refreshGeometry();
    });
    this.refreshGeometry();
    return this.ready;
  }

  private refreshGeometry(notify = true): void {
    if (this.disposed) return;
    if (this.importedActive && this.exhaustMeshes.length === 0) this.createEffects();
    if (this.importedActive && this.imported.activeSource !== this.effectsSource) this.refreshCoupling();
    if (this.importedActive) {
      const left = this.imported.getAttachment('exhaustLeft'), right = this.imported.getAttachment('exhaustRight');
      if (left && right) {
        this.importedWake[0]!.position.copy(left.position);
        this.importedWake[1]!.position.copy(right.position);
        this.importedDust[0]!.position.copy(left.position);
        this.importedDust[2]!.position.copy(right.position);
        this.importedDust[1]!.position.copy(this.imported.getAttachment('pilot')?.position ?? this.imported.position);
      }
    }
    const next = this.importedActive ? this.imported.prepassMeshes
      : this.proceduralProxy ? [this.proceduralProxy] : [];
    const changed = next.length !== this.activePrepasses.length || next.some((mesh, index) => mesh !== this.activePrepasses[index]);
    this.activePrepasses = next;
    this.syncVisibility();
    if (notify && changed) { this.revision += 1; this.geometryChanged?.(); }
  }

  private createEffects(): void {
    this.nozzleLips = new ImportedExhaustNozzles();
    this.effects.add(this.nozzleLips);
    this.procedural.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.name === 'engine-exhaust') this.exhaustSources.push(object);
      if (object.name.startsWith('podracer-energy-coupling')) this.couplingMaterial = object.material as ShaderMaterial;
    });
    for (const source of this.exhaustSources) {
      const flame = new Mesh(source.geometry, source.material);
      flame.name = 'imported-engine-exhaust';
      flame.rotation.copy(source.rotation);
      flame.renderOrder = source.renderOrder;
      this.effects.add(flame);
      this.exhaustMeshes.push(flame);
    }
  }

  /** Rebuild only on an installed art change, never while loading or per frame. */
  private refreshCoupling(): void {
    this.effectsSource = this.imported.activeSource;
    const definition = getVehicleArtDefinition(this.activeAppearanceId, this.racerIndex === 0 ? 'hero' : 'rival');
    if (definition?.hasAuthoredExhaustHardware) this.nozzleLips?.setAnchors();
    else this.nozzleLips?.setAnchors(this.imported.getAttachment('exhaustLeft'), this.imported.getAttachment('exhaustRight'));
    if (this.coupling) {
      this.coupling.removeFromParent();
      this.coupling.geometry.dispose();
      this.coupling = null;
    }
    const left = this.imported.getAttachment('couplingLeft'), right = this.imported.getAttachment('couplingRight');
    if (left && right && this.couplingMaterial) {
      const a = left.position, b = right.position;
      const curve = new CatmullRomCurve3([
        a.clone(), new Vector3().lerpVectors(a, b, .25).add(new Vector3(0, .13, -.08)),
        new Vector3().lerpVectors(a, b, .5).add(new Vector3(0, -.08, 0)),
        new Vector3().lerpVectors(a, b, .75).add(new Vector3(0, .13, -.08)), b.clone(),
      ]);
      const geometry = new TubeGeometry(curve, 24, .045, 5, false);
      geometry.setAttribute('aArcSeed', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(17), 1));
      this.coupling = new Mesh(geometry, this.couplingMaterial);
      this.coupling.name = 'imported-engine-coupling'; this.coupling.renderOrder = 14;
      this.effects.add(this.coupling);
    }
  }
}
