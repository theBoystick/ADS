import { removeBackground, preload, Config } from '@imgly/background-removal';

export interface CutoutProgress {
  progress: number;
  stageLabel: string;
}

let modelPreloaded = false;

export function warmUpBackgroundModel(): void {
  if (modelPreloaded) return;
  modelPreloaded = true;
  preload({ model: 'isnet_fp16' }).catch(() => {
    modelPreloaded = false;
  });
}

function formatStageLabel(key: string): string {
  if (key.includes('fetch')) {
    return 'Chargement du modèle IA…';
  }
  if (key.includes('compute') || key.includes('inference')) {
    return 'Détourage du personnage…';
  }
  return 'Traitement en cours…';
}

/**
 * Crops excess transparent padding around the cut-out subject so
 * auto-fit and centering inside the flyer slot are accurate.
 */
async function trimTransparentMargins(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        const alpha = data[rowOffset + x * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return blob;
    }

    const pad = 4;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(w - cropX, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(h - cropY, maxY - minY + 1 + pad * 2);

    const out = document.createElement('canvas');
    out.width = cropW;
    out.height = cropH;
    const outCtx = out.getContext('2d');
    if (!outCtx) return blob;

    outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const trimmed = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, 'image/png')
    );
    return trimmed ?? blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function runAiCutout(
  file: File,
  onProgress?: (info: CutoutProgress) => void
): Promise<Blob> {
  const config: Config = {
    model: 'isnet_fp16',
    output: {
      format: 'image/png',
      quality: 1,
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
      onProgress({
        progress: Math.round(ratio * 100),
        stageLabel: formatStageLabel(key),
      });
    },
  };

  const resultBlob = await removeBackground(file, config);
  return trimTransparentMargins(resultBlob);
}
