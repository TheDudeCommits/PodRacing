import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three';

import {
  CEL_PALETTES,
  CelMaterial,
  InvertedHullMaterial,
  createInvertedHullOutline,
  type InvertedHullHandle,
} from '../materials';
import {
  PILOT_VARIANTS,
  pilotVariantForRacer,
  type PilotVariantConfig,
  type PilotVariantId,
} from './PilotVariants';

export type PilotDetailLevel = 'hero' | 'distant';
export type PilotRacePhase = 'countdown' | 'racing' | 'finished';

/**
 * Render-only pilot telemetry. Acceleration values are metres/second squared;
 * controls and intensities are normalized. Drift is signed so the animation
 * can anticipate a powerslide independently from steering input.
 */
export interface PilotAnimationInput {
  readonly time: number;
  readonly deltaTime?: number;
  readonly steering?: number;
  readonly throttle?: number;
  readonly brake?: number;
  readonly lateralAcceleration?: number;
  readonly verticalAcceleration?: number;
  readonly drift?: number;
  readonly grounded?: boolean;
  readonly landingIntensity?: number;
  readonly engineVibration?: number;
  readonly racePhase?: PilotRacePhase;
  readonly finished?: boolean;
}

export interface PilotViewOptions {
  readonly racerIndex?: number;
  readonly variant?: PilotVariantId | PilotVariantConfig;
  readonly detail?: PilotDetailLevel;
  readonly outlines?: boolean;
  readonly outlineWidthPx?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly pixelRatio?: number;
  /** Local cockpit fit; defaults high enough that shoulders clear the canopy rim. */
  readonly seatOffset?: readonly [number, number, number];
}

export interface PilotArmRig {
  readonly side: -1 | 1;
  readonly shoulder: Group;
  readonly elbow: Group;
  readonly hand: Group;
  readonly upperLength: number;
  readonly lowerLength: number;
}

export interface PilotLegRig {
  readonly side: -1 | 1;
  readonly hip: Group;
  readonly knee: Group;
  readonly boot: Group;
}

export interface PilotRigHandles {
  readonly bodyRoot: Group;
  readonly pelvis: Group;
  readonly spine: Group;
  readonly chest: Group;
  readonly neck: Group;
  readonly head: Group;
  readonly leftArm: PilotArmRig;
  readonly rightArm: PilotArmRig;
  readonly leftLeg: PilotLegRig;
  readonly rightLeg: PilotLegRig;
  readonly accessoryPivots: readonly Group[];
}

export interface PilotAnimationState {
  lean: number;
  foreAft: number;
  landingBrace: number;
  celebration: number;
  vibration: number;
  grounded: boolean;
}

export interface PilotRenderStats {
  readonly beautyMeshes: number;
  readonly outlineMeshes: number;
  readonly estimatedDrawCalls: number;
  readonly triangles: number;
}

interface PilotMaterials {
  readonly suit: CelMaterial;
  readonly accent: CelMaterial;
  readonly skin: CelMaterial;
  readonly glove: CelMaterial;
  readonly grip: CelMaterial;
  readonly visor: CelMaterial;
}

interface MutableArmRig extends PilotArmRig {
  readonly restShoulder: Vector3;
  readonly upperArmMesh: Mesh;
  readonly forearmMesh: Mesh;
  readonly gripContactMesh: Mesh | null;
  readonly restUpperArmScale: Vector3;
  readonly restForearmScale: Vector3;
}

interface MutableLegRig extends PilotLegRig {
  readonly thighLength: number;
  readonly calfLength: number;
}

const ARM_AXIS = new Vector3(0, 1, 0);
const EPSILON = 0.00001;
const GRAPHIC_GLOVE_PALETTE = Object.freeze({
  // Even the shadow band stays warm and legible. A black first band made the
  // near fist look like a second helmet in the tight cockpit view.
  diffuseBands: ['#e87848', '#f79a5d', '#ffd478', '#fff7d0'],
  ink: '#24131d',
  specular: '#fff6cb',
  rim: '#72f1d7',
  reflection: '#7968ad',
  emissive: '#ffb35e',
  haze: '#df7950',
} as const);

const scratchTargetWorld = new Vector3();
const scratchTargetLocal = new Vector3();
const scratchToTarget = new Vector3();
const scratchDirection = new Vector3();
const scratchPole = new Vector3();
const scratchPerpendicular = new Vector3();
const scratchElbow = new Vector3();
const scratchUpperDirection = new Vector3();
const scratchForeDirection = new Vector3();
const scratchSolvedTarget = new Vector3();
const scratchCelebrationTarget = new Vector3();
const scratchInverseQuaternion = new Quaternion();

function finite(value: number | undefined, fallback = 0): number {
  return value === undefined || !Number.isFinite(value) ? fallback : value;
}

function normalized(value: number | undefined, fallback = 0): number {
  return MathUtils.clamp(finite(value, fallback), -1, 1);
}

function unit(value: number | undefined, fallback = 0): number {
  return MathUtils.clamp(finite(value, fallback), 0, 1);
}

function damp(current: number, target: number, responsiveness: number, deltaTime: number): number {
  return current + (target - current) * (1 - Math.exp(-responsiveness * deltaTime));
}

function translatedCylinder(
  radiusTop: number,
  radiusBottom: number,
  length: number,
  segments: number,
  direction: 1 | -1,
): BufferGeometry {
  const geometry = new CylinderGeometry(radiusTop, radiusBottom, length, segments, 1, false);
  geometry.translate(0, direction * length * 0.5, 0);
  return geometry;
}

function meshTriangles(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return Math.floor(index.count / 3);
  const position = geometry.getAttribute('position');
  return position ? Math.floor(position.count / 3) : 0;
}

function resolveVariant(
  variant: PilotViewOptions['variant'],
  racerIndex: number,
): PilotVariantConfig {
  if (variant === undefined) return pilotVariantForRacer(racerIndex);
  if (typeof variant === 'string') return PILOT_VARIANTS[variant];
  return variant;
}

/**
 * A transform rig rather than a skinned mesh is deliberate: every limb keeps
 * the exact same custom CelMaterial path as the vehicles, and the low part
 * count stays cheap enough for four simultaneous racers.
 */
export class PilotView extends Group {
  readonly variant: PilotVariantConfig;
  readonly detail: PilotDetailLevel;
  readonly rig: PilotRigHandles;
  readonly leverTargets: Readonly<{ left: Group; right: Group }>;
  readonly outlineHandles: readonly InvertedHullHandle[];
  readonly animationState: PilotAnimationState = {
    lean: 0,
    foreAft: 0,
    landingBrace: 0,
    celebration: 0,
    vibration: 0,
    grounded: true,
  };

  private readonly materials: PilotMaterials;
  private readonly ownedMaterials = new Set<Material>();
  private readonly ownedGeometries = new Set<BufferGeometry>();
  private readonly mutableOutlineHandles: InvertedHullHandle[] = [];
  private readonly outlineMaterial: InvertedHullMaterial | null;
  private readonly leftArm: MutableArmRig;
  private readonly rightArm: MutableArmRig;
  private readonly leftLeg: MutableLegRig;
  private readonly rightLeg: MutableLegRig;
  private readonly leftLever: Group;
  private readonly rightLever: Group;
  private readonly restSpineY: number;
  private readonly restChestY: number;
  private readonly restNeckY: number;
  private readonly restHeadY: number;
  // Keep the controls outside the helmet silhouette in the tight cockpit
  // camera. The prior narrow spacing projected the near glove directly beside
  // the head, where it read as a second dark face.
  private readonly baseLeverX = 1.06;
  private readonly baseLeverY = 0.03;
  private readonly baseLeverZ = 0.18;
  private lastAnimationTime = Number.NaN;
  private disposed = false;
  private renderStatsValue: PilotRenderStats = {
    beautyMeshes: 0,
    outlineMeshes: 0,
    estimatedDrawCalls: 0,
    triangles: 0,
  };

  constructor(options: PilotViewOptions = {}) {
    super();
    const racerIndex = Math.max(0, Math.trunc(finite(options.racerIndex, 0)));
    this.variant = resolveVariant(options.variant, racerIndex);
    this.detail = options.detail ?? (racerIndex === 0 ? 'hero' : 'distant');
    this.name = `pilot-${this.variant.id}`;
    this.position.set(...(options.seatOffset ?? [0, 0.22, 0.04]));

    this.materials = this.createMaterials();
    this.outlineMaterial = options.outlines === false
      ? null
      : new InvertedHullMaterial({
          ink: this.variant.suitPalette.ink,
          widthPx: options.outlineWidthPx ?? (this.detail === 'hero' ? 1.45 : 1.15),
          viewportWidth: options.viewportWidth,
          viewportHeight: options.viewportHeight,
          pixelRatio: options.pixelRatio,
        });

    const height = this.variant.proportions.height;
    const bodyRoot = new Group();
    bodyRoot.name = 'pilot-body-root';
    this.add(bodyRoot);

    const pelvis = new Group();
    pelvis.name = 'pilot-pelvis';
    bodyRoot.add(pelvis);
    this.addPart(
      pelvis,
      new CylinderGeometry(0.34 * this.variant.proportions.shoulderWidth, 0.39, 0.28 * height, this.detail === 'hero' ? 7 : 5),
      this.materials.suit,
      'pelvis-shell',
      [0, 0.04, 0],
      [this.detail === 'distant' ? 1.08 : 1, 1, 0.9 * this.variant.proportions.torsoDepth],
    );

    const spine = new Group();
    spine.name = 'pilot-spine';
    this.restSpineY = 0.19 * height;
    spine.position.y = this.restSpineY;
    pelvis.add(spine);

    const chest = new Group();
    chest.name = 'pilot-chest';
    this.restChestY = 0.29 * height;
    chest.position.y = this.restChestY;
    spine.add(chest);
    this.addPart(
      chest,
      new CylinderGeometry(0.43, 0.31, 0.57 * height, this.detail === 'hero' ? 7 : 5),
      this.materials.suit,
      'torso-shell',
      [0, 0.02, 0],
      [
        this.variant.proportions.shoulderWidth * (this.detail === 'distant' ? 1.14 : 1),
        this.detail === 'distant' ? 1.04 : 1,
        this.variant.proportions.torsoDepth * (this.detail === 'distant' ? 1.08 : 1),
      ],
    );
    if (this.detail === 'hero') {
      this.addPart(
        chest,
        new BoxGeometry(0.7, 0.12, 0.08),
        this.materials.accent,
        'diagonal-flight-harness',
        [this.variant.dominantSide * -0.035, 0.11, 0.29 * this.variant.proportions.torsoDepth],
        [1, 1, 1],
        [0, 0, this.variant.dominantSide * -0.46],
        false,
      );

      // A single high-contrast pauldron breaks the toy-soldier shoulder line
      // from the chase camera. It rides with the torso instead of the IK arm,
      // so even extreme lever reaches retain one clean asymmetric silhouette.
      this.addPart(
        chest,
        // A thin, dark armor plate keeps the asymmetric shoulder silhouette
        // without forming another warm faceted "fist" beside the helmet.
        new ConeGeometry(0.28, 0.12, 4),
        this.materials.visor,
        'dominant-shoulder-pauldron',
        [
          this.variant.dominantSide * 0.48 * this.variant.proportions.shoulderWidth,
          0.22,
          -0.015,
        ],
        [1, 1, 1.18],
        [0, 0, this.variant.dominantSide * -Math.PI * 0.5],
      );
    }

    const neck = new Group();
    neck.name = 'pilot-neck';
    this.restNeckY = 0.33 * height;
    neck.position.y = this.restNeckY;
    chest.add(neck);
    if (this.detail === 'hero') {
      this.addPart(
        neck,
        new CylinderGeometry(0.115, 0.13, 0.18, 6),
        this.materials.skin,
        'neck-skin',
        [0, 0.04, 0],
        [1, 1, 1],
        [0, 0, 0],
        false,
      );
    }

    const head = new Group();
    head.name = 'pilot-head';
    this.restHeadY = 0.16 * height;
    head.position.y = this.restHeadY;
    neck.add(head);
    this.buildHead(head);

    this.leftArm = this.buildArm(chest, -1);
    this.rightArm = this.buildArm(chest, 1);
    this.leftLeg = this.buildLeg(pelvis, -1);
    this.rightLeg = this.buildLeg(pelvis, 1);

    const accessoryPivots = this.buildAccessory(neck, head);

    this.leftLever = this.buildLever(-1);
    this.rightLever = this.buildLever(1);
    this.leverTargets = Object.freeze({ left: this.leftLever, right: this.rightLever });

    this.rig = Object.freeze({
      bodyRoot,
      pelvis,
      spine,
      chest,
      neck,
      head,
      leftArm: this.leftArm,
      rightArm: this.rightArm,
      leftLeg: this.leftLeg,
      rightLeg: this.rightLeg,
      accessoryPivots: Object.freeze(accessoryPivots),
    });
    this.outlineHandles = this.mutableOutlineHandles;
    this.updateAnimation({ time: 0, deltaTime: 1 / 60, racePhase: 'countdown' });
    this.renderStatsValue = this.measureRenderStats();
  }

  get renderStats(): PilotRenderStats {
    return this.renderStatsValue;
  }

  resetAnimationState(): void {
    this.animationState.lean = 0;
    this.animationState.foreAft = 0;
    this.animationState.landingBrace = 0;
    this.animationState.celebration = 0;
    this.animationState.vibration = 0;
    this.animationState.grounded = true;
    this.lastAnimationTime = Number.NaN;
  }

  private createMaterials(): PilotMaterials {
    const materials: PilotMaterials = {
      suit: new CelMaterial({
        name: `${this.variant.id}:pilot-suit`,
        palette: this.variant.suitPalette,
        specularCutoff: 0.3,
        specularStrength: 0.24,
        rimCutoff: 0.48,
        rimStrength: 0.46,
      }),
      accent: new CelMaterial({
        name: `${this.variant.id}:pilot-accent`,
        palette: this.variant.accentPalette,
        specularCutoff: 0.28,
        specularStrength: 0.36,
        rimCutoff: 0.5,
        rimStrength: 0.4,
      }),
      skin: new CelMaterial({
        name: `${this.variant.id}:pilot-skin`,
        palette: this.variant.skinPalette,
        specularCutoff: 0.5,
        specularStrength: 0.12,
        rimCutoff: 0.52,
        rimStrength: 0.42,
      }),
      glove: new CelMaterial({
        name: `${this.variant.id}:pilot-glove`,
        palette: GRAPHIC_GLOVE_PALETTE,
        specularCutoff: 0.32,
        specularStrength: 0.3,
        rimCutoff: 0.46,
        rimStrength: 0.5,
        emissiveStrength: 0.3,
      }),
      grip: new CelMaterial({
        name: `${this.variant.id}:pilot-control-grip`,
        palette: CEL_PALETTES.checkpoint,
        tint: '#5dffd2',
        specularCutoff: 0.26,
        specularStrength: 0.22,
        rimCutoff: 0.42,
        rimStrength: 0.58,
        emissiveStrength: 0.16,
      }),
      visor: new CelMaterial({
        name: `${this.variant.id}:pilot-visor`,
        palette: CEL_PALETTES.machinery,
        tint: this.variant.id === 'night-comet' ? '#49627e' : '#283149',
        specularPower: 18,
        specularCutoff: 0.14,
        specularStrength: 0.7,
        reflectionStrength: 0.55,
        rimCutoff: 0.42,
        rimStrength: 0.6,
      }),
    };
    // This tiny contact mark is a graphic readability cheat, not a physical
    // control surface. Draw it over the fist so the cyan bar visibly crosses
    // the palm at cockpit distance instead of being depth-hidden into a cuff.
    materials.grip.depthTest = false;
    materials.grip.depthWrite = false;
    for (const material of Object.values(materials)) this.ownedMaterials.add(material);
    return materials;
  }

  private addPart(
    parent: Object3D,
    geometry: BufferGeometry,
    material: Material,
    name: string,
    position: readonly [number, number, number] = [0, 0, 0],
    scale: readonly [number, number, number] = [1, 1, 1],
    rotation: readonly [number, number, number] = [0, 0, 0],
    outlined = true,
  ): Mesh {
    this.ownedGeometries.add(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData['pilotPart'] = true;
    parent.add(mesh);
    if (outlined && this.outlineMaterial) {
      this.mutableOutlineHandles.push(createInvertedHullOutline(mesh, {
        material: this.outlineMaterial,
      }));
    }
    return mesh;
  }

  private buildHead(head: Group): void {
    // Below hero LOD the helmet is the pilot's main gesture. Slightly
    // exaggerating it preserves a readable facing direction at 15--30 px.
    const headScale = this.variant.proportions.headScale * (this.detail === 'distant' ? 1.16 : 1);
    this.addPart(
      head,
      // Keep the face as a shallow forward mask rather than a complete sphere.
      // A full head volume protruded below the rear helmet rim and read as a
      // second, dark head in the close cockpit camera.
      new IcosahedronGeometry(0.21, this.detail === 'hero' ? 1 : 0),
      this.materials.skin,
      'face',
      [0, -0.005, 0.13],
      [0.86 * headScale, 0.94 * headScale, 0.55 * headScale],
      [0, 0, 0],
      false,
    );

    const helmet = this.addPart(
      head,
      new SphereGeometry(
        0.286,
        this.detail === 'hero' ? 9 : 6,
        this.detail === 'hero' ? 6 : 4,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.72,
      ),
      this.materials.accent,
      'helmet-dome',
      [0, 0.08, -0.018],
      [headScale, headScale, 1.04 * headScale],
    );
    helmet.rotation.x = -0.08;

    switch (this.variant.helmetStyle) {
      case 'goggles':
        this.addPart(
          head,
          new BoxGeometry(0.46, 0.115, 0.075),
          this.materials.visor,
          'split-goggles',
          [0, 0.015, 0.232],
          [headScale, headScale, headScale],
          [0, 0, 0],
          false,
        );
        break;
      case 'fin':
        this.addPart(
          head,
          new BoxGeometry(0.075, 0.31, 0.39),
          this.materials.accent,
          'helmet-fin',
          [0, 0.31, -0.055],
          [headScale, headScale, headScale],
          [-0.12, 0, 0],
        );
        this.addPart(
          head,
          new BoxGeometry(0.3, 0.15, 0.09),
          this.materials.visor,
          'breather-mask',
          [0, -0.08, 0.235],
          [headScale, headScale, headScale],
          [0, 0, 0],
          false,
        );
        break;
      case 'full-visor':
        this.addPart(
          head,
          new BoxGeometry(0.48, 0.205, 0.09),
          this.materials.visor,
          'full-visor',
          [0, 0.015, 0.23],
          [headScale, headScale, headScale],
          [-0.08, 0, 0],
          false,
        );
        if (this.detail === 'hero') {
          this.addPart(
            head,
            new ConeGeometry(0.09, 0.32, 5),
            this.materials.accent,
            'helmet-crest',
            [0, 0.38, -0.05],
            [0.8, 1, 1.4],
          );
        }
        break;
      case 'desert-wrap':
        this.addPart(
          head,
          new BoxGeometry(0.43, 0.1, 0.08),
          this.materials.visor,
          'wrap-eye-slit',
          [0, 0.025, 0.232],
          [headScale, headScale, headScale],
          [0, 0, 0],
          false,
        );
        this.addPart(
          head,
          new CylinderGeometry(0.27, 0.24, 0.15, 7),
          this.materials.suit,
          'desert-wrap',
          [0, -0.105, -0.005],
          [headScale, headScale, headScale],
          [0, 0, 0],
          false,
        );
        break;
    }
  }

  private buildArm(chest: Group, side: -1 | 1): MutableArmRig {
    const armScale = this.variant.proportions.armScale * this.variant.proportions.height;
    // Podracer controls sit unusually far forward; the slightly long anime
    // proportions preserve a bent-elbow silhouette without losing the grips.
    const upperLength = 0.535 * armScale;
    const lowerLength = 0.555 * armScale;
    const shoulder = new Group();
    shoulder.name = side < 0 ? 'left-shoulder' : 'right-shoulder';
    const restShoulder = new Vector3(
      side * 0.39 * this.variant.proportions.shoulderWidth,
      (0.19 + (side === this.variant.dominantSide ? 0.018 : -0.008)) * this.variant.proportions.height,
      0.025,
    );
    shoulder.position.copy(restShoulder);
    chest.add(shoulder);

    const upperArmMesh = this.addPart(
      shoulder,
      translatedCylinder(
        this.detail === 'hero' ? 0.105 : 0.1,
        this.detail === 'hero' ? 0.18 : 0.13,
        upperLength,
        this.detail === 'hero' ? 7 : 5,
        1,
      ),
      this.materials.suit,
      side < 0 ? 'left-upper-arm' : 'right-upper-arm',
      [0, 0, 0],
      side === this.variant.dominantSide
        ? [this.detail === 'distant' ? 1.34 : 1.3, 1, this.detail === 'hero' ? 1.16 : 1.08]
        : [this.detail === 'distant' ? 0.94 : 1.04, 1, this.detail === 'hero' ? 0.92 : 0.78],
    );

    const elbow = new Group();
    elbow.name = side < 0 ? 'left-elbow' : 'right-elbow';
    elbow.position.y = upperLength;
    shoulder.add(elbow);
    const forearmMesh = this.addPart(
      elbow,
      translatedCylinder(
        this.detail === 'distant' ? 0.122 : 0.15,
        this.detail === 'distant' ? 0.105 : 0.135,
        lowerLength,
        this.detail === 'hero' ? 7 : 5,
        1,
      ),
      this.materials.accent,
      side < 0 ? 'left-forearm' : 'right-forearm',
      [0, 0, 0],
      this.detail === 'hero' ? [1.12, 1, 1.05] : [1, 1, 0.9],
      [0, 0, 0],
      this.detail === 'hero',
    );

    const hand = new Group();
    hand.name = side < 0 ? 'left-hand' : 'right-hand';
    hand.position.y = lowerLength;
    elbow.add(hand);
    let gripContactMesh: Mesh | null = null;
    if (this.detail === 'hero') {
      this.addPart(
        hand,
        // A faceted mitt reads as a clenched working hand from both chase and
        // cockpit views; the old tiny cuboid disappeared inside the forearm.
        new IcosahedronGeometry(0.15, 0),
        this.materials.glove,
        side < 0 ? 'left-glove' : 'right-glove',
        [0, 0.008, 0],
        // The anatomical right hand projects on the screen-left diagonal in
        // the cockpit shot. Its old narrow silhouette vanished into the dark
        // cuff, so give that one fist enough warm surface to frame the grip.
        side > 0 ? [1.48, 1.24, 1.28] : [1.12, 0.9, 0.98],
        [0.12, 0, side * -0.12],
        false,
      );
      gripContactMesh = this.addPart(
        hand,
        // A narrow graphic bar through the exact glove origin leaves a cyan
        // stripe across the bright palm. Keeping both minor axes thin avoids
        // replacing the entire fist with a cyan square at oblique wrist angles.
        // Local X projects across the anatomical left fist, while local Z is
        // the screen-horizontal axis for the anatomical right. Choosing the
        // axis per hand keeps both marks as stripes rather than cyan cuffs.
        new BoxGeometry(side < 0 ? 0.38 : 0.055, 0.055, side < 0 ? 0.055 : 0.38),
        this.materials.grip,
        side < 0 ? 'left-control-grip-cap' : 'right-control-grip-cap',
        [0, 0.008, 0],
        [1, 1, 1],
        [0.12, 0, side * -0.12],
        false,
      );
      gripContactMesh.renderOrder = 40;
    }

    return {
      side,
      shoulder,
      elbow,
      hand,
      upperLength,
      lowerLength,
      restShoulder,
      upperArmMesh,
      forearmMesh,
      gripContactMesh,
      restUpperArmScale: upperArmMesh.scale.clone(),
      restForearmScale: forearmMesh.scale.clone(),
    };
  }

  private buildLeg(pelvis: Group, side: -1 | 1): MutableLegRig {
    const height = this.variant.proportions.height;
    const thighLength = 0.48 * height;
    const calfLength = 0.39 * height;
    const hip = new Group();
    hip.name = side < 0 ? 'left-hip' : 'right-hip';
    hip.position.set(side * 0.19, 0.02, 0.04);
    pelvis.add(hip);
    this.addPart(
      hip,
      translatedCylinder(0.12, 0.15, thighLength, this.detail === 'hero' ? 7 : 5, -1),
      this.materials.suit,
      side < 0 ? 'left-thigh' : 'right-thigh',
      [0, 0, 0],
      [1, 1, 0.9],
    );

    const knee = new Group();
    knee.name = side < 0 ? 'left-knee' : 'right-knee';
    knee.position.y = -thighLength;
    hip.add(knee);
    this.addPart(
      knee,
      translatedCylinder(0.095, 0.115, calfLength, this.detail === 'hero' ? 7 : 5, -1),
      this.materials.accent,
      side < 0 ? 'left-calf' : 'right-calf',
      [0, 0, 0],
      [1, 1, 0.9],
      [0, 0, 0],
      this.detail === 'hero',
    );

    const boot = new Group();
    boot.name = side < 0 ? 'left-boot' : 'right-boot';
    boot.position.y = -calfLength;
    knee.add(boot);
    if (this.detail === 'hero') {
      this.addPart(
        boot,
        new BoxGeometry(0.22, 0.16, 0.37),
        this.materials.visor,
        side < 0 ? 'left-boot-shell' : 'right-boot-shell',
        [0, -0.015, 0.12],
        [1, 1, 1],
      );
    }

    return { side, hip, knee, boot, thighLength, calfLength };
  }

  private buildAccessory(neck: Group, head: Group): Group[] {
    const pivots: Group[] = [];
    switch (this.variant.accessory) {
      case 'scarf': {
        const scarf = new Group();
        scarf.name = 'scarf-pivot';
        scarf.position.set(0, 0.04, -0.16);
        neck.add(scarf);
        this.addPart(
          scarf,
          new ConeGeometry(0.12, this.detail === 'hero' ? 0.52 : 0.34, 5),
          this.materials.accent,
          'scarf-tail',
          [0, 0, -0.23],
          [1, 1, 1.4],
          [Math.PI / 2, 0, 0],
        );
        pivots.push(scarf);
        break;
      }
      case 'breather': {
        if (this.detail === 'hero') {
          const hose = new Group();
          hose.name = 'breather-hose-pivot';
          hose.position.set(0.16, 0.09, 0.1);
          neck.add(hose);
          this.addPart(
            hose,
            new CylinderGeometry(0.025, 0.025, 0.38, 5),
            this.materials.visor,
            'breather-hose',
            [0.06, -0.11, 0.05],
            [1, 1, 1],
            [0.25, 0, -0.32],
            false,
          );
          pivots.push(hose);
        }
        break;
      }
      case 'crest': {
        const crest = new Group();
        crest.name = 'crest-pivot';
        crest.position.set(0, 0.34, -0.05);
        head.add(crest);
        if (this.detail === 'hero') {
          this.addPart(
            crest,
            new BoxGeometry(0.055, 0.2, 0.3),
            this.materials.accent,
            'flex-crest',
            [0, 0.08, -0.07],
          );
        }
        pivots.push(crest);
        break;
      }
      case 'head-tails': {
        const tailCount = this.detail === 'hero' ? 2 : 1;
        for (let index = 0; index < tailCount; index += 1) {
          const side = index === 0 ? -1 : 1;
          const tail = new Group();
          tail.name = `head-tail-${index}`;
          tail.position.set(side * 0.14, 0.03, -0.17);
          head.add(tail);
          this.addPart(
            tail,
            new ConeGeometry(0.09, index === 0 ? 0.5 : 0.42, 5),
            this.materials.suit,
            `head-tail-mesh-${index}`,
            [0, -0.08, -0.2],
            [1, 1, 1],
            [Math.PI * 0.39, 0, side * 0.16],
          );
          pivots.push(tail);
        }
        break;
      }
    }
    return pivots;
  }

  private buildLever(side: -1 | 1): Group {
    const lever = new Group();
    lever.name = side < 0 ? 'left-lever-target' : 'right-lever-target';
    lever.position.set(side * this.baseLeverX, this.baseLeverY, this.baseLeverZ);
    this.add(lever);
    this.addPart(
      lever,
      translatedCylinder(0.08, 0.055, 0.34, 6, -1),
      this.materials.visor,
      side < 0 ? 'left-control-lever' : 'right-control-lever',
      [0, 0.01, 0],
      [1, 1, 1],
      [0.24, 0, side * -0.1],
      false,
    );
    return lever;
  }

  /**
   * Updates the complete rig without allocating. All inputs are sanitized so
   * a bad telemetry frame cannot poison Three's world matrices with NaNs.
   */
  updateAnimation(input: PilotAnimationInput): void {
    if (this.disposed) return;
    const time = finite(input.time, Number.isFinite(this.lastAnimationTime) ? this.lastAnimationTime : 0);
    const inferredDelta = Number.isFinite(this.lastAnimationTime) ? time - this.lastAnimationTime : 1 / 60;
    const deltaTime = MathUtils.clamp(finite(input.deltaTime, inferredDelta), 1 / 600, 0.1);
    this.lastAnimationTime = time;

    const steering = normalized(input.steering);
    const throttle = unit(input.throttle);
    const brake = unit(input.brake);
    const drift = normalized(input.drift);
    const lateralAcceleration = MathUtils.clamp(finite(input.lateralAcceleration) / 32, -1, 1);
    const verticalAcceleration = MathUtils.clamp(finite(input.verticalAcceleration) / 28, -1, 1);
    const landingIntensity = unit(input.landingIntensity);
    const engineVibration = unit(input.engineVibration);
    const grounded = input.grounded ?? true;
    const finished = input.finished ?? input.racePhase === 'finished';
    const countdownTension = input.racePhase === 'countdown' && !finished ? 0.22 : 0;
    const airborneWeightShift = grounded ? 0 : this.variant.dominantSide * 0.17;

    const leanTarget = MathUtils.clamp(
      -steering * 0.58 - lateralAcceleration * 0.24 - drift * 0.44
        + airborneWeightShift,
      -0.94,
      0.94,
    );
    const foreAftTarget = MathUtils.clamp(brake * 0.31 - throttle * 0.21, -0.28, 0.38);
    const impactBrace = Math.max(landingIntensity, grounded ? Math.max(0, verticalAcceleration) * 0.45 : 0);
    const braceTarget = MathUtils.clamp(
      impactBrace + (grounded ? 0 : 0.18) + countdownTension,
      0,
      1,
    );

    this.animationState.lean = damp(this.animationState.lean, leanTarget, 18, deltaTime);
    this.animationState.foreAft = damp(this.animationState.foreAft, foreAftTarget, 15, deltaTime);
    this.animationState.landingBrace = damp(
      this.animationState.landingBrace,
      braceTarget,
      braceTarget > this.animationState.landingBrace ? 25 : 4.2,
      deltaTime,
    );
    this.animationState.celebration = damp(
      this.animationState.celebration,
      finished ? 1 : 0,
      // The finish pose must break silhouette on the very first camera cut.
      // A quick ease-in still avoids a pop during live play, while slower
      // motion is supplied by the authored arm pumps and body bounce below.
      finished ? 180 : 8,
      deltaTime,
    );
    this.animationState.vibration = damp(this.animationState.vibration, engineVibration, 8, deltaTime);
    this.animationState.grounded = grounded;

    const phase = this.variant.motionPhase;
    const vibration = this.animationState.vibration;
    const highBuzz = Math.sin(time * 37.7 + phase) * 0.5 + Math.sin(time * 51.1 + phase * 1.7) * 0.5;
    const idleBob = Math.sin(time * 8.1 + phase) * 0.5 + Math.sin(time * 13.7 + phase) * 0.25;
    const celebrationPulse = Math.sin(time * 7.2 + phase);
    const celebrationBeat = 0.5 + celebrationPulse * 0.5;
    const celebration = this.animationState.celebration;
    const brace = this.animationState.landingBrace;

    this.animateLevers(time, steering, throttle, brake, vibration);

    this.rig.bodyRoot.position.set(
      this.animationState.lean * 0.1 + highBuzz * vibration * 0.008,
      idleBob * vibration * 0.01 - brace * 0.055
        + celebration * (0.32 + celebrationBeat * 0.12),
      Math.sin(time * 43.3 + phase * 0.7) * vibration * 0.006,
    );
    // The fixed results composition is intentionally wide. Let the winner
    // rise out of the seat and grow into a graphic foreground silhouette so
    // the arm gesture survives at full-frame scale without affecting racing.
    this.rig.bodyRoot.scale.setScalar(1 + celebration * 0.75);
    this.rig.bodyRoot.rotation.set(
      verticalAcceleration * 0.025,
      steering * 0.026 + celebration * this.variant.dominantSide * 0.055,
      this.animationState.lean * 0.38 + celebration * this.variant.dominantSide * 0.06,
    );
    this.rig.pelvis.rotation.set(
      this.animationState.foreAft * 0.35 - brace * 0.12,
      celebration * this.variant.dominantSide * 0.08,
      this.animationState.lean * 0.5,
    );
    this.rig.spine.position.y = this.restSpineY - brace * 0.085;
    this.rig.spine.rotation.set(
      this.animationState.foreAft * 0.64 + brace * 0.2,
      -steering * 0.04,
      this.animationState.lean * 0.72,
    );
    this.rig.chest.position.y = this.restChestY - brace * 0.045;
    this.rig.chest.rotation.set(
      this.animationState.foreAft + brace * 0.18,
      steering * 0.17
        + celebration * this.variant.dominantSide * (0.22 + celebrationBeat * 0.12),
      this.animationState.lean * 1.22
        + celebration * this.variant.dominantSide * (0.08 + celebrationBeat * 0.08),
    );
    this.rig.neck.position.y = this.restNeckY - brace * 0.018;
    this.rig.neck.rotation.set(
      -this.animationState.foreAft * 0.56 - brace * 0.13,
      -steering * 0.18 - celebration * this.variant.dominantSide * 0.18,
      // Follow most of the torso bank. Strong counter-roll translated the head
      // away from its own shoulders in the close cockpit view and exposed the
      // shaded torso as a convincing second head-and-body silhouette.
      -this.animationState.lean * 0.16,
    );
    this.rig.head.position.y = this.restHeadY + celebration * (0.035 + celebrationBeat * 0.035);
    this.rig.head.rotation.set(
      -this.animationState.foreAft * 0.36
        + celebration * (-0.08 + Math.sin(time * 10.2 + phase) * 0.12),
      steering * 0.24
        + celebration * this.variant.dominantSide * (0.32 + celebrationPulse * 0.1),
      -this.animationState.lean * 0.12
        - celebration * this.variant.dominantSide * celebrationPulse * 0.08,
    );

    this.animateShoulder(this.leftArm, steering, brace, celebration, celebrationBeat);
    this.animateShoulder(this.rightArm, steering, brace, celebration, celebrationBeat);

    this.animateLeg(this.leftLeg, brace, grounded, steering, time);
    this.animateLeg(this.rightLeg, brace, grounded, steering, time);
    this.animateAccessories(time, throttle, drift, celebration);

    // Update inherited chest transforms before transforming lever targets into
    // chest space for the analytic two-bone arm solve.
    this.updateMatrixWorld(true);
    this.solveArm(this.leftArm, this.leftLever, brace, celebration, time);
    this.solveArm(this.rightArm, this.rightLever, brace, celebration, time);
    this.updateMatrixWorld(true);
  }

  /** Alias kept terse for render loops that update every view uniformly. */
  update(input: PilotAnimationInput): void {
    this.updateAnimation(input);
  }

  private animateLevers(
    time: number,
    steering: number,
    throttle: number,
    brake: number,
    vibration: number,
  ): void {
    this.animateLever(this.leftLever, -1, time, steering, throttle, brake, vibration);
    this.animateLever(this.rightLever, 1, time, steering, throttle, brake, vibration);
  }

  private animateLever(
    lever: Group,
    side: -1 | 1,
    time: number,
    steering: number,
    throttle: number,
    brake: number,
    vibration: number,
  ): void {
    const independentBuzz = Math.sin(
      time * (side < 0 ? 31.3 : 34.9) + this.variant.motionPhase + side,
    ) * vibration;
    lever.position.set(
      side * (this.baseLeverX + Math.abs(steering) * 0.024),
      this.baseLeverY + side * steering * 0.09 + independentBuzz * 0.006,
      this.baseLeverZ - side * steering * 0.34
        + throttle * 0.095 - brake * 0.14 + independentBuzz * 0.008,
    );
    lever.rotation.set(-0.08 + brake * 0.12 - throttle * 0.07, 0, side * steering * 0.14);
  }

  private animateShoulder(
    arm: MutableArmRig,
    steering: number,
    brace: number,
    celebration: number,
    celebrationBeat: number,
  ): void {
    // Blend control input with inertial body lag. This keeps the two shoulders
    // from mirroring each other when the controls are nearly centred in an
    // airborne or high-lateral-load shot.
    const workingGesture = MathUtils.clamp(
      steering - this.animationState.lean * 0.65,
      -1,
      1,
    );
    const sideTurn = arm.side * workingGesture;
    const dominant = arm.side === this.variant.dominantSide ? 1 : 0;
    arm.shoulder.position.copy(arm.restShoulder);
    arm.shoulder.position.x += arm.side * brace * 0.025;
    arm.shoulder.position.y += -sideTurn * 0.095 - brace * 0.055
      + celebration * dominant * celebrationBeat * 0.06;
    arm.shoulder.position.z += sideTurn * 0.13 + brace * 0.07
      - celebration * dominant * 0.035;
  }

  private animateLeg(
    leg: MutableLegRig,
    brace: number,
    grounded: boolean,
    steering: number,
    time: number,
  ): void {
    const airborneTuck = grounded ? 0 : 0.18;
    const vibration = Math.sin(time * (29 + leg.side * 1.3) + this.variant.motionPhase) * this.animationState.vibration;
    leg.hip.rotation.set(
      -0.72 - brace * 0.4 - airborneTuck + vibration * 0.012,
      leg.side * 0.07,
      leg.side * 0.025 - steering * 0.035,
    );
    leg.knee.rotation.set(
      1.08 + brace * 0.55 + airborneTuck * 0.7,
      0,
      leg.side * -0.03,
    );
    leg.boot.rotation.set(-0.2 - brace * 0.16, leg.side * 0.03, 0);
  }

  private animateAccessories(time: number, throttle: number, drift: number, celebration: number): void {
    for (let index = 0; index < this.rig.accessoryPivots.length; index += 1) {
      const pivot = this.rig.accessoryPivots[index];
      if (!pivot) continue;
      const phase = this.variant.motionPhase + index * 1.9;
      const gust = Math.sin(time * (7.2 + index) + phase) * 0.16
        + Math.sin(time * 15.7 + phase) * 0.045;
      pivot.rotation.x = -0.18 - throttle * 0.23 + gust + celebration * Math.sin(time * 11 + phase) * 0.13;
      pivot.rotation.z = drift * 0.22 + Math.sin(time * 9.1 + phase) * 0.07;
    }
  }

  private solveArm(
    arm: MutableArmRig,
    lever: Group,
    brace: number,
    celebration: number,
    time: number,
  ): void {
    lever.getWorldPosition(scratchTargetWorld);
    scratchTargetLocal.copy(scratchTargetWorld);
    this.rig.chest.worldToLocal(scratchTargetLocal);

    if (celebration > 0.001) {
      const dominant = arm.side === this.variant.dominantSide;
      const pump = 0.5 + 0.5 * Math.sin(time * (dominant ? 8.2 : 6.4) + this.variant.motionPhase);
      scratchCelebrationTarget.set(
        arm.side * (dominant ? 1.65 : 1.75),
        dominant ? 1.88 + pump * 0.1 : 1.84 + pump * 0.1,
        arm.side * 1.48 - 0.12,
      );
      scratchTargetLocal.lerp(scratchCelebrationTarget, celebration);
    } else {
      scratchTargetLocal.y -= brace * 0.035;
      scratchTargetLocal.z -= brace * 0.045;
    }

    scratchToTarget.copy(scratchTargetLocal).sub(arm.shoulder.position);
    const rawDistance = Math.max(EPSILON, scratchToTarget.length());
    scratchDirection.copy(scratchToTarget).multiplyScalar(1 / rawDistance);
    const minimumReach = Math.abs(arm.upperLength - arm.lowerLength) + 0.015;
    const maximumReach = arm.upperLength + arm.lowerLength - 0.012;
    const distance = MathUtils.clamp(rawDistance, minimumReach, maximumReach);
    scratchSolvedTarget.copy(arm.shoulder.position).addScaledVector(scratchDirection, distance);

    // The torso can lean farther than a literal human rig because the pilot
    // must read at chase-camera scale. When that stylized pose would pull a
    // requested lever beyond the two-bone reach, bring the physical lever to
    // the solved hand position. This preserves the all-important hand/grip
    // contact instead of letting the animation visibly disconnect.
    if (celebration <= 0.001 && Math.abs(distance - rawDistance) > EPSILON) {
      scratchTargetWorld.copy(scratchSolvedTarget);
      this.rig.chest.localToWorld(scratchTargetWorld);
      this.worldToLocal(scratchTargetWorld);
      lever.position.copy(scratchTargetWorld);
    }

    const along = (
      arm.upperLength * arm.upperLength
      - arm.lowerLength * arm.lowerLength
      + distance * distance
    ) / (2 * distance);
    const height = Math.sqrt(Math.max(0, arm.upperLength * arm.upperLength - along * along));

    // Elbows ride wide and near shoulder level. High poles pushed a forearm up
    // beside the helmet in the cockpit shot; the lower pole preserves a clear
    // sleeve/elbow/gauntlet kink without creating a second upper-body mass.
    const workingDominance = arm.side === this.variant.dominantSide ? 0.055 : -0.025;
    scratchPole.set(
      arm.side * 1.35,
      -0.035 + workingDominance - brace * 0.32,
      -0.08,
    ).normalize();
    scratchPerpendicular.copy(scratchPole)
      .addScaledVector(scratchDirection, -scratchPole.dot(scratchDirection));
    if (scratchPerpendicular.lengthSq() < EPSILON) scratchPerpendicular.set(arm.side, 0, 0);
    scratchPerpendicular.normalize();
    scratchElbow.copy(arm.shoulder.position)
      .addScaledVector(scratchDirection, along)
      .addScaledVector(scratchPerpendicular, height);

    scratchUpperDirection.copy(scratchElbow).sub(arm.shoulder.position).normalize();
    arm.shoulder.quaternion.setFromUnitVectors(ARM_AXIS, scratchUpperDirection);

    scratchForeDirection.copy(scratchSolvedTarget).sub(scratchElbow).normalize();
    scratchInverseQuaternion.copy(arm.shoulder.quaternion).invert();
    scratchForeDirection.applyQuaternion(scratchInverseQuaternion).normalize();
    arm.elbow.quaternion.setFromUnitVectors(ARM_AXIS, scratchForeDirection);
    const victoryFist = celebration * (0.32 + 0.24 * Math.sin(time * 8.2 + this.variant.motionPhase));
    // Thicken the released arms and enlarge their fists during a win so the
    // high-V gesture survives the deliberately wide results camera.
    const victoryUpperThickness = 1 + celebration * 0.85;
    const victoryForearmThickness = 1 + celebration * 0.65;
    arm.upperArmMesh.material = celebration > 0.45 ? this.materials.accent : this.materials.suit;
    if (arm.gripContactMesh) arm.gripContactMesh.visible = celebration < 0.15;
    arm.upperArmMesh.scale.set(
      arm.restUpperArmScale.x * victoryUpperThickness,
      arm.restUpperArmScale.y,
      arm.restUpperArmScale.z * victoryUpperThickness,
    );
    arm.forearmMesh.scale.set(
      arm.restForearmScale.x * victoryForearmThickness,
      arm.restForearmScale.y,
      arm.restForearmScale.z * victoryForearmThickness,
    );
    arm.hand.scale.setScalar(1 + celebration * 1.8);
    arm.hand.rotation.set(
      victoryFist,
      arm.side * (0.18 + celebration * 0.22),
      arm.side * (-0.08 - celebration * 0.22),
    );
  }

  private measureRenderStats(): PilotRenderStats {
    let beautyMeshes = 0;
    let triangles = 0;
    this.traverse((object) => {
      if (!(object instanceof Mesh) || object.name.endsWith(':ink-hull')) return;
      beautyMeshes += 1;
      triangles += meshTriangles(object.geometry);
    });
    return Object.freeze({
      beautyMeshes,
      outlineMeshes: this.mutableOutlineHandles.length,
      estimatedDrawCalls: beautyMeshes + this.mutableOutlineHandles.length,
      triangles,
    });
  }

  setViewport(width: number, height: number, pixelRatio = 1): void {
    this.outlineMaterial?.setViewport(width, height, pixelRatio);
  }

  syncOutlines(): void {
    for (const handle of this.mutableOutlineHandles) handle.sync();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of this.mutableOutlineHandles) handle.dispose();
    this.mutableOutlineHandles.length = 0;
    this.outlineMaterial?.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    for (const geometry of this.ownedGeometries) geometry.dispose();
    this.ownedMaterials.clear();
    this.ownedGeometries.clear();
    this.removeFromParent();
  }
}

export function createPilotView(options: PilotViewOptions = {}): PilotView {
  return new PilotView(options);
}

export function attachPilotToAnchor(anchor: Object3D, options: PilotViewOptions = {}): PilotView {
  const pilot = new PilotView(options);
  anchor.add(pilot);
  return pilot;
}
