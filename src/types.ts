export type LayerMode = 'photo-over-template' | 'photo-under-template';

export type SlotShape = 'rect' | 'rounded' | 'circle';

export interface PhotoSlot {
  /** Normalized horizontal center (0..1) */
  x: number;
  /** Normalized vertical center (0..1) */
  y: number;
  /** Normalized width (0..1) */
  width: number;
  /** Normalized height (0..1) */
  height: number;
  /** Clip shape inside the flyer */
  shape: SlotShape;
  /** Corner radius in px at native resolution (used when shape === 'rounded') */
  radius: number;
  /** Whether the photo should be clipped strictly to the slot bounds */
  clipToSlot: boolean;
}

export interface TemplateConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  imageUrl: string;
  /** Optional backdrop rendered underneath the subject when imageUrl is a foreground mask/overlay */
  backgroundImageUrl?: string;
  layerMode: LayerMode;
  slot: PhotoSlot;
  isPlaceholder?: boolean;
}

export type PortraitPreset =
  | 'bw-official'
  | 'bw-soft'
  | 'bw-dramatic'
  | 'color'
  | 'warm';

export interface PhotoTransform {
  /** Offset in template pixels relative to slot center */
  offsetX: number;
  offsetY: number;
  /** 1.0 = auto-fit inside slot */
  scale: number;
  /** Rotation in degrees */
  rotation: number;
  flipX: boolean;
  /** Subtle ambient shadow behind cut-out subject */
  dropShadow: boolean;
  /** Portrait visual treatment */
  preset: PortraitPreset;
  grayscale: boolean;
  /** Percentage 70..150 */
  contrast: number;
  /** Percentage 75..135 */
  brightness: number;
  /** Softly fade the lower torso into the flyer fog */
  bottomFade: boolean;
}

export type CutoutStatus = 'idle' | 'processing' | 'done' | 'error';

export interface CutoutState {
  status: CutoutStatus;
  progress: number;
  stageLabel: string;
  errorMessage?: string;
}

export type ExportFormat = 'png' | 'jpeg';

export interface RegistrationRecord {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  church: string;
  guests: number;
  createdAt: string;
}
