import { PhotoSlot, PhotoTransform, TemplateConfig } from '../types';

export interface RenderOptions {
  templateImage: HTMLImageElement;
  backgroundImage?: HTMLImageElement | null;
  subjectDrawable: HTMLCanvasElement | HTMLImageElement | null;
  template: TemplateConfig;
  transform: PhotoTransform;
  /** Draws dashed slot outline when empty and alignment guides when dragging */
  showSlotOutline?: boolean;
  snapGuides?: { x: boolean; y: boolean };
  /** Fill opaque white background underneath (useful for JPEG export) */
  opaqueBackground?: boolean;
}

export function getSlotBounds(template: TemplateConfig) {
  const { width, height, slot } = template;
  const sw = slot.width * width;
  const sh = slot.height * height;
  const cx = slot.x * width;
  const cy = slot.y * height;
  return {
    cx,
    cy,
    width: sw,
    height: sh,
    left: cx - sw / 2,
    top: cy - sh / 2,
  };
}

function getDrawableSize(drawable: HTMLCanvasElement | HTMLImageElement) {
  if (drawable instanceof HTMLImageElement) {
    return {
      width: drawable.naturalWidth || drawable.width || 1,
      height: drawable.naturalHeight || drawable.height || 1,
    };
  }
  return {
    width: drawable.width || 1,
    height: drawable.height || 1,
  };
}

export function getBaseFitScale(
  drawable: HTMLCanvasElement | HTMLImageElement,
  slotWidth: number,
  slotHeight: number
): number {
  const { width: imgW, height: imgH } = getDrawableSize(drawable);
  return Math.min(slotWidth / imgW, slotHeight / imgH);
}

/**
 * Applies grayscale/contrast/brightness and optional bottom edge feathering
 * in pixel space so results are consistent across every browser (including Safari).
 */
export function buildStyledSubjectCanvas(
  source: HTMLImageElement,
  transform: Pick<
    PhotoTransform,
    'grayscale' | 'contrast' | 'brightness' | 'preset' | 'bottomFade'
  >
): HTMLCanvasElement {
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(source, 0, 0, w, h);

  const needsPixelAdjust =
    transform.grayscale ||
    transform.contrast !== 100 ||
    transform.brightness !== 100 ||
    transform.preset === 'warm';

  if (needsPixelAdjust) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const contrastFactor = transform.contrast / 100;
    const brightnessFactor = transform.brightness / 100;
    const isWarm = transform.preset === 'warm';

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;

      let r = data[i] * brightnessFactor;
      let g = data[i + 1] * brightnessFactor;
      let b = data[i + 2] * brightnessFactor;

      if (transform.grayscale) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = lum;
        g = lum;
        b = lum;
      } else if (isWarm) {
        r *= 1.07;
        g *= 1.01;
        b *= 0.91;
      }

      if (contrastFactor !== 1) {
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imgData, 0, 0);
  }

  if (transform.bottomFade) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const grad = ctx.createLinearGradient(0, h * 0.62, 0, h);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.78)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  return canvas;
}

function buildSlotPath(
  ctx: CanvasRenderingContext2D,
  slot: PhotoSlot,
  left: number,
  top: number,
  width: number,
  height: number
) {
  ctx.beginPath();
  if (slot.shape === 'circle') {
    ctx.ellipse(
      left + width / 2,
      top + height / 2,
      width / 2,
      height / 2,
      0,
      0,
      Math.PI * 2
    );
  } else if (slot.shape === 'rounded' && slot.radius > 0) {
    const r = Math.min(slot.radius, width / 2, height / 2);
    ctx.roundRect(left, top, width, height, r);
  } else {
    ctx.rect(left, top, width, height);
  }
  ctx.closePath();
}

function drawSubject(
  ctx: CanvasRenderingContext2D,
  drawable: HTMLCanvasElement | HTMLImageElement,
  template: TemplateConfig,
  transform: PhotoTransform
) {
  const bounds = getSlotBounds(template);
  const baseScale = getBaseFitScale(drawable, bounds.width, bounds.height);
  const effectiveScale = baseScale * transform.scale;
  const { width: imgW, height: imgH } = getDrawableSize(drawable);

  ctx.save();

  if (template.slot.clipToSlot) {
    buildSlotPath(
      ctx,
      template.slot,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height
    );
    ctx.clip();
  }

  ctx.translate(bounds.cx + transform.offsetX, bounds.cy + transform.offsetY);
  if (transform.rotation !== 0) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }
  ctx.scale(
    (transform.flipX ? -1 : 1) * effectiveScale,
    effectiveScale
  );

  if (transform.dropShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 28 / effectiveScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10 / effectiveScale;
  }

  ctx.drawImage(drawable, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();
}

export function renderFlyerToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderOptions
): void {
  const {
    templateImage,
    backgroundImage,
    subjectDrawable,
    template,
    transform,
    showSlotOutline = false,
    snapGuides,
    opaqueBackground = false,
  } = options;

  const { width, height } = template;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  if (opaqueBackground) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  if (template.layerMode === 'photo-under-template') {
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, width, height);
    }
    if (subjectDrawable) {
      drawSubject(ctx, subjectDrawable, template, transform);
    }
    ctx.drawImage(templateImage, 0, 0, width, height);
  } else {
    ctx.drawImage(templateImage, 0, 0, width, height);
    if (subjectDrawable) {
      drawSubject(ctx, subjectDrawable, template, transform);
    }
  }

  if (showSlotOutline && !subjectDrawable) {
    const bounds = getSlotBounds(template);
    const hasBackdrop = Boolean(backgroundImage);
    ctx.save();
    buildSlotPath(
      ctx,
      template.slot,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height
    );
    ctx.strokeStyle = hasBackdrop
      ? 'rgba(20, 20, 19, 0.26)'
      : 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.setLineDash([10, 10]);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = hasBackdrop
      ? 'rgba(20, 20, 19, 0.62)'
      : 'rgba(255, 255, 255, 0.55)';
    const fontSize = Math.max(16, Math.round(width * 0.019));
    ctx.font = `500 ${fontSize}px Poppins, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Votre photo détourée ici', bounds.cx, bounds.cy);
    ctx.restore();
  }

  if (snapGuides && (snapGuides.x || snapGuides.y)) {
    const bounds = getSlotBounds(template);
    ctx.save();
    ctx.strokeStyle = '#FF4D00';
    ctx.lineWidth = Math.max(1.5, width * 0.0018);
    ctx.setLineDash([6, 6]);
    if (snapGuides.x) {
      ctx.beginPath();
      ctx.moveTo(bounds.cx, bounds.top);
      ctx.lineTo(bounds.cx, bounds.top + bounds.height);
      ctx.stroke();
    }
    if (snapGuides.y) {
      ctx.beginPath();
      ctx.moveTo(bounds.left, bounds.cy);
      ctx.lineTo(bounds.left + bounds.width, bounds.cy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}
