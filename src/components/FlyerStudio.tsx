import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  Contrast,
  Download,
  FlipHorizontal2,
  ImagePlus,
  Layers,
  Loader2,
  Move,
  Plus,
  Minus,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CutoutState,
  ExportFormat,
  PhotoTransform,
  PortraitPreset,
  TemplateConfig,
} from '../types';
import { GOOGLE_REGISTRATION_FORM_URL } from '../config/links';
import {
  buildStyledSubjectCanvas,
  loadImageFromUrl,
  renderFlyerToCanvas,
} from '../utils/canvasComposer';
import {
  runAiCutout,
  warmUpBackgroundModel,
} from '../utils/backgroundRemoval';

interface FlyerStudioProps {
  template: TemplateConfig;
  onBackHome: () => void;
  onOpenTemplateModal: () => void;
}

const INITIAL_TRANSFORM: PhotoTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipX: false,
  dropShadow: false,
  preset: 'bw-official',
  grayscale: true,
  contrast: 112,
  brightness: 103,
  bottomFade: true,
};

const PORTRAIT_PRESETS: Array<{
  id: PortraitPreset;
  label: string;
  swatchStyle: React.CSSProperties;
  patch: Partial<PhotoTransform>;
}> = [
  {
    id: 'bw-official',
    label: 'N&B Officiel',
    swatchStyle: {
      background:
        'radial-gradient(circle at 32% 30%, #e5e5e5 0%, #7d7d82 55%, #1d1d20 100%)',
    },
    patch: {
      preset: 'bw-official',
      grayscale: true,
      contrast: 112,
      brightness: 103,
    },
  },
  {
    id: 'bw-soft',
    label: 'N&B Doux',
    swatchStyle: {
      background:
        'radial-gradient(circle at 32% 30%, #f1f1f1 0%, #a4a4aa 60%, #414147 100%)',
    },
    patch: {
      preset: 'bw-soft',
      grayscale: true,
      contrast: 96,
      brightness: 106,
    },
  },
  {
    id: 'bw-dramatic',
    label: 'N&B Intense',
    swatchStyle: {
      background:
        'radial-gradient(circle at 32% 30%, #d4d4d8 0%, #4b4b52 50%, #09090b 100%)',
    },
    patch: {
      preset: 'bw-dramatic',
      grayscale: true,
      contrast: 128,
      brightness: 100,
    },
  },
  {
    id: 'color',
    label: 'Couleur',
    swatchStyle: {
      background:
        'radial-gradient(circle at 32% 30%, #ffd7ba 0%, #c97b53 55%, #3d2c2e 100%)',
    },
    patch: {
      preset: 'color',
      grayscale: false,
      contrast: 104,
      brightness: 102,
    },
  },
  {
    id: 'warm',
    label: 'Ton chaud',
    swatchStyle: {
      background:
        'radial-gradient(circle at 32% 30%, #ffe4bf 0%, #ff7a29 58%, #5c2208 100%)',
    },
    patch: {
      preset: 'warm',
      grayscale: false,
      contrast: 108,
      brightness: 103,
    },
  },
];

const SNAP_THRESHOLD_PX = 10;

export const FlyerStudio: React.FC<FlyerStudioProps> = ({
  template,
  onBackHome,
  onOpenTemplateModal,
}) => {
  const [templateImg, setTemplateImg] = useState<HTMLImageElement | null>(null);
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(
    null
  );

  const [photoName, setPhotoName] = useState<string>('');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);
  const [cutoutImg, setCutoutImg] = useState<HTMLImageElement | null>(null);

  const [useCutout, setUseCutout] = useState<boolean>(true);
  const [cutoutState, setCutoutState] = useState<CutoutState>({
    status: 'idle',
    progress: 0,
    stageLabel: '',
  });

  const [transform, setTransform] = useState<PhotoTransform>(INITIAL_TRANSFORM);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [openSections, setOpenSections] = useState<{
    cutout: boolean;
    adjust: boolean;
    export: boolean;
  }>({
    cutout: true,
    adjust: true,
    export: false,
  });

  const [isDragOverStage, setIsDragOverStage] = useState<boolean>(false);
  const [isDraggingSubject, setIsDraggingSubject] = useState<boolean>(false);
  const [snapGuides, setSnapGuides] = useState<{ x: boolean; y: boolean }>({
    x: false,
    y: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobIdRef = useRef<number>(0);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    loadImageFromUrl(template.imageUrl)
      .then((img) => {
        if (active) setTemplateImg(img);
      })
      .catch(() => {
        if (active) setTemplateImg(null);
      });

    if (template.backgroundImageUrl) {
      loadImageFromUrl(template.backgroundImageUrl)
        .then((img) => {
          if (active) setBackgroundImg(img);
        })
        .catch(() => {
          if (active) setBackgroundImg(null);
        });
    } else {
      setBackgroundImg(null);
    }

    return () => {
      active = false;
    };
  }, [template.imageUrl, template.backgroundImageUrl]);

  useEffect(() => {
    return () => {
      if (originalUrl?.startsWith('blob:')) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      if (cutoutUrl?.startsWith('blob:')) URL.revokeObjectURL(cutoutUrl);
    };
  }, [cutoutUrl]);

  const activeSubjectImg = useMemo(() => {
    if (useCutout && cutoutImg) return cutoutImg;
    return originalImg;
  }, [useCutout, cutoutImg, originalImg]);

  const styledSubjectCanvas = useMemo(() => {
    if (!activeSubjectImg) return null;
    return buildStyledSubjectCanvas(activeSubjectImg, {
      grayscale: transform.grayscale,
      contrast: transform.contrast,
      brightness: transform.brightness,
      preset: transform.preset,
      bottomFade: transform.bottomFade,
    });
  }, [
    activeSubjectImg,
    transform.grayscale,
    transform.contrast,
    transform.brightness,
    transform.preset,
    transform.bottomFade,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImg) return;
    renderFlyerToCanvas(canvas, {
      templateImage: templateImg,
      backgroundImage: backgroundImg,
      subjectDrawable: styledSubjectCanvas,
      template,
      transform,
      showSlotOutline: true,
      snapGuides,
      opaqueBackground: false,
    });
  }, [
    templateImg,
    backgroundImg,
    styledSubjectCanvas,
    template,
    transform,
    snapGuides,
  ]);

  const processUploadedFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const currentJob = ++jobIdRef.current;
    const nextOriginalUrl = URL.createObjectURL(file);

    setPhotoName(file.name);
    setOriginalUrl(nextOriginalUrl);
    setCutoutUrl(null);
    setCutoutImg(null);
    setUseCutout(true);
    setTransform((prev) => ({
      ...INITIAL_TRANSFORM,
      preset: prev.preset,
      grayscale: prev.grayscale,
      contrast: prev.contrast,
      brightness: prev.brightness,
      bottomFade: prev.bottomFade,
    }));
    setCutoutState({
      status: 'processing',
      progress: 4,
      stageLabel: 'Initialisation…',
    });

    try {
      const loadedOriginal = await loadImageFromUrl(nextOriginalUrl);
      if (jobIdRef.current !== currentJob) return;
      setOriginalImg(loadedOriginal);
    } catch {
      if (jobIdRef.current !== currentJob) return;
      setCutoutState({
        status: 'error',
        progress: 0,
        stageLabel: '',
        errorMessage: "Impossible de lire ce fichier image.",
      });
      return;
    }

    try {
      const cutoutBlob = await runAiCutout(file, (info) => {
        if (jobIdRef.current !== currentJob) return;
        setCutoutState({
          status: 'processing',
          progress: Math.max(5, info.progress),
          stageLabel: info.stageLabel,
        });
      });

      if (jobIdRef.current !== currentJob) return;

      const nextCutoutUrl = URL.createObjectURL(cutoutBlob);
      const loadedCutout = await loadImageFromUrl(nextCutoutUrl);
      if (jobIdRef.current !== currentJob) {
        URL.revokeObjectURL(nextCutoutUrl);
        return;
      }

      setCutoutUrl(nextCutoutUrl);
      setCutoutImg(loadedCutout);
      setCutoutState({
        status: 'done',
        progress: 100,
        stageLabel: 'Personnage détouré',
      });
    } catch (err) {
      if (jobIdRef.current !== currentJob) return;
      setUseCutout(false);
      setCutoutState({
        status: 'error',
        progress: 0,
        stageLabel: '',
        errorMessage:
          err instanceof Error
            ? `Détourage indisponible (${err.message}).`
            : 'Détourage IA indisponible.',
      });
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverStage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleClearPhoto = () => {
    jobIdRef.current += 1;
    setPhotoName('');
    setOriginalUrl(null);
    setCutoutUrl(null);
    setOriginalImg(null);
    setCutoutImg(null);
    setCutoutState({ status: 'idle', progress: 0, stageLabel: '' });
  };

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (!styledSubjectCanvas || !canvasRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingSubject(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: transform.offsetX,
      startOffsetY: transform.offsetY,
    };
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const start = dragStartRef.current;
    const canvas = canvasRef.current;
    if (!start || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleToTemplateX = canvas.width / rect.width;
    const scaleToTemplateY = canvas.height / rect.height;

    let nextX =
      start.startOffsetX + (e.clientX - start.clientX) * scaleToTemplateX;
    let nextY =
      start.startOffsetY + (e.clientY - start.clientY) * scaleToTemplateY;

    const snapX = Math.abs(nextX) <= SNAP_THRESHOLD_PX;
    const snapY = Math.abs(nextY) <= SNAP_THRESHOLD_PX;

    if (snapX) nextX = 0;
    if (snapY) nextY = 0;

    setSnapGuides({ x: snapX, y: snapY });
    setTransform((prev) => ({
      ...prev,
      offsetX: nextX,
      offsetY: nextY,
    }));
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current) {
      dragStartRef.current = null;
      setIsDraggingSubject(false);
      setSnapGuides({ x: false, y: false });
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!styledSubjectCanvas) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.0012;
      setTransform((prev) => ({
        ...prev,
        scale: Math.min(
          2.6,
          Math.max(0.3, Number((prev.scale + delta).toFixed(3)))
        ),
      }));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [styledSubjectCanvas]);

  const handleExport = async () => {
    if (!templateImg || !styledSubjectCanvas) return;
    setIsExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      renderFlyerToCanvas(exportCanvas, {
        templateImage: templateImg,
        backgroundImage: backgroundImg,
        subjectDrawable: styledSubjectCanvas,
        template,
        transform,
        showSlotOutline: false,
        opaqueBackground: exportFormat === 'jpeg',
      });

      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = exportFormat === 'png' ? 1 : 0.94;

      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob(resolve, mimeType, quality)
      );
      if (!blob) return;

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `jy-serai-flyer.${exportFormat === 'png' ? 'png' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } finally {
      setIsExporting(false);
    }
  };

  const resetPosition = () => {
    setTransform((prev) => ({
      ...prev,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
    }));
  };

  const thumbSrc = useMemo(() => {
    if (useCutout && cutoutUrl) return cutoutUrl;
    return originalUrl;
  }, [useCutout, cutoutUrl, originalUrl]);

  const activePreset = PORTRAIT_PRESETS.find((p) => p.id === transform.preset);
  const zoomPercent = Math.round(transform.scale * 100);

  return (
    <div
      className="studio-shell"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOverStage(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverStage(false);
        }
      }}
      onDrop={handleDropFiles}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleFileInputChange}
      />

      {/* Top Floating Bar */}
      <header className="studio-topbar">
        <div className="studio-topbar-left">
          <button
            type="button"
            className="studio-icon-pill"
            onClick={onBackHome}
            title="Retour à l'accueil"
          >
            <ArrowLeft size={14} />
            <span>Accueil</span>
          </button>

          <div className="studio-icon-group">
            <button
              type="button"
              className="studio-icon-btn"
              disabled={!styledSubjectCanvas}
              onClick={resetPosition}
              title="Recentrer"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="studio-icon-btn"
              disabled={!styledSubjectCanvas}
              onClick={() =>
                setTransform((p) => ({ ...p, flipX: !p.flipX }))
              }
              title="Miroir horizontal"
            >
              <FlipHorizontal2 size={14} />
            </button>
          </div>
        </div>

        <div className="studio-topbar-center">
          <span>J&apos;Y SERAI · STUDIO FLYER</span>
          <span className="studio-dims">
            {template.width}×{template.height}
          </span>
        </div>

        <div className="studio-topbar-right">
          <a
            href={GOOGLE_REGISTRATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="studio-icon-pill"
          >
            <UserCheck size={14} />
            <span>S&apos;enregistrer</span>
          </a>

          <button
            type="button"
            className="studio-icon-btn"
            onClick={onOpenTemplateModal}
            title="Paramètres du modèle"
          >
            <SlidersHorizontal size={14} />
          </button>

          <button
            type="button"
            className="studio-icon-btn"
            onClick={onBackHome}
            title="Fermer le studio"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="studio-main">
        {/* Left Floating Column (Image 2 style) */}
        <aside className="studio-left-col">
          {/* Top-Left Source Preview Box */}
          <div className="studio-card studio-source-box">
            {!originalUrl ? (
              <div
                className="studio-upload-slot"
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={warmUpBackgroundModel}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="studio-upload-icon">
                  <ImagePlus size={20} />
                </div>
                <div className="studio-upload-label">Importer une photo</div>
                <div className="studio-upload-hint">
                  Détourage IA automatique
                </div>
              </div>
            ) : (
              <div className="studio-preview-loaded">
                <button
                  type="button"
                  className="studio-preview-clear"
                  onClick={handleClearPhoto}
                  title="Retirer la photo"
                >
                  <X size={13} />
                </button>

                <div className="studio-preview-thumb-frame">
                  {thumbSrc && (
                    <img
                      src={thumbSrc}
                      alt={photoName}
                      className="studio-preview-thumb"
                    />
                  )}
                </div>

                <div className="studio-preview-footer">
                  <div className="studio-preview-name" title={photoName}>
                    {photoName}
                  </div>

                  {cutoutState.status === 'processing' && (
                    <div className="studio-status-line">
                      <Loader2 size={11} className="spin" />
                      <span>
                        {cutoutState.stageLabel} {cutoutState.progress}%
                      </span>
                    </div>
                  )}

                  {cutoutState.status === 'done' && (
                    <div className="studio-status-line is-done">
                      <Check size={11} />
                      <span>
                        {useCutout ? 'Détourage actif' : 'Photo originale'}
                      </span>
                    </div>
                  )}

                  {cutoutState.status === 'error' && (
                    <div className="studio-status-line is-err">
                      <span>{cutoutState.errorMessage}</span>
                    </div>
                  )}

                  {cutoutState.status === 'processing' && (
                    <div className="studio-progress-track">
                      <div
                        className="studio-progress-fill"
                        style={{ width: `${cutoutState.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Left Accordion Tools Card */}
          <div className="studio-card studio-panel-scroll">
            <div className="studio-panel-heading">ATELIER PORTRAIT</div>

            {/* Section 1: AI Cutout & Effects */}
            <div className="studio-accordion">
              <button
                type="button"
                className="studio-acc-trigger"
                onClick={() =>
                  setOpenSections((s) => ({ ...s, cutout: !s.cutout }))
                }
              >
                <span>DÉTOURAGE &amp; EFFETS</span>
                {openSections.cutout ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {openSections.cutout && (
                <div className="studio-acc-body">
                  <div className="studio-toggle-item">
                    <span>Détourage IA</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useCutout}
                      disabled={!cutoutImg}
                      className={`studio-switch ${useCutout ? 'is-on' : ''}`}
                      onClick={() => setUseCutout((v) => !v)}
                    >
                      <span className="studio-switch-knob" />
                    </button>
                  </div>

                  <div className="studio-toggle-item">
                    <span>Noir &amp; Blanc officiel</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={transform.grayscale}
                      disabled={!styledSubjectCanvas}
                      className={`studio-switch ${
                        transform.grayscale ? 'is-on' : ''
                      }`}
                      onClick={() =>
                        setTransform((p) => ({
                          ...p,
                          grayscale: !p.grayscale,
                          preset: !p.grayscale ? 'bw-official' : 'color',
                        }))
                      }
                    >
                      <span className="studio-switch-knob" />
                    </button>
                  </div>

                  <div className="studio-toggle-item">
                    <span>Fondu bas progressif</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={transform.bottomFade}
                      disabled={!styledSubjectCanvas}
                      className={`studio-switch ${
                        transform.bottomFade ? 'is-on' : ''
                      }`}
                      onClick={() =>
                        setTransform((p) => ({
                          ...p,
                          bottomFade: !p.bottomFade,
                        }))
                      }
                    >
                      <span className="studio-switch-knob" />
                    </button>
                  </div>

                  <div className="studio-toggle-item">
                    <span>Ombre légère</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={transform.dropShadow}
                      disabled={!styledSubjectCanvas}
                      className={`studio-switch ${
                        transform.dropShadow ? 'is-on' : ''
                      }`}
                      onClick={() =>
                        setTransform((p) => ({
                          ...p,
                          dropShadow: !p.dropShadow,
                        }))
                      }
                    >
                      <span className="studio-switch-knob" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Cadrage & Lumière */}
            <div className="studio-accordion">
              <button
                type="button"
                className="studio-acc-trigger"
                onClick={() =>
                  setOpenSections((s) => ({ ...s, adjust: !s.adjust }))
                }
              >
                <span>CADRAGE &amp; LUMIÈRE</span>
                {openSections.adjust ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {openSections.adjust && (
                <div className="studio-acc-body">
                  <div className="studio-slider-row">
                    <div className="studio-slider-head">
                      <span>Taille</span>
                      <span>{zoomPercent}%</span>
                    </div>
                    <input
                      type="range"
                      className="studio-range"
                      min={0.3}
                      max={2.6}
                      step={0.01}
                      disabled={!styledSubjectCanvas}
                      value={transform.scale}
                      onChange={(e) =>
                        setTransform((p) => ({
                          ...p,
                          scale: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="studio-slider-row">
                    <div className="studio-slider-head">
                      <span>Rotation</span>
                      <span>{transform.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      className="studio-range"
                      min={-25}
                      max={25}
                      step={1}
                      disabled={!styledSubjectCanvas}
                      value={transform.rotation}
                      onChange={(e) =>
                        setTransform((p) => ({
                          ...p,
                          rotation: parseInt(e.target.value, 10),
                        }))
                      }
                    />
                  </div>

                  <div className="studio-slider-row">
                    <div className="studio-slider-head">
                      <span>Contraste</span>
                      <span>{transform.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      className="studio-range"
                      min={75}
                      max={150}
                      step={1}
                      disabled={!styledSubjectCanvas}
                      value={transform.contrast}
                      onChange={(e) =>
                        setTransform((p) => ({
                          ...p,
                          contrast: parseInt(e.target.value, 10),
                        }))
                      }
                    />
                  </div>

                  <div className="studio-slider-row">
                    <div className="studio-slider-head">
                      <span>Luminosité</span>
                      <span>{transform.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      className="studio-range"
                      min={75}
                      max={130}
                      step={1}
                      disabled={!styledSubjectCanvas}
                      value={transform.brightness}
                      onChange={(e) =>
                        setTransform((p) => ({
                          ...p,
                          brightness: parseInt(e.target.value, 10),
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Format */}
            <div className="studio-accordion">
              <button
                type="button"
                className="studio-acc-trigger"
                onClick={() =>
                  setOpenSections((s) => ({ ...s, export: !s.export }))
                }
              >
                <span>FORMAT D&apos;EXPORT</span>
                {openSections.export ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {openSections.export && (
                <div className="studio-acc-body">
                  <div className="studio-format-grid">
                    <button
                      type="button"
                      className={`studio-format-btn ${
                        exportFormat === 'png' ? 'is-active' : ''
                      }`}
                      onClick={() => setExportFormat('png')}
                    >
                      PNG (HD)
                    </button>
                    <button
                      type="button"
                      className={`studio-format-btn ${
                        exportFormat === 'jpeg' ? 'is-active' : ''
                      }`}
                      onClick={() => setExportFormat('jpeg')}
                    >
                      JPG (Léger)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Center Canvas + Right Floating Zoom Controls + Bottom Dock */}
        <div className="studio-center-col">
          <div className="studio-canvas-area">
            <div className="studio-canvas-wrap">
              {isDragOverStage && (
                <div className="studio-drop-overlay">
                  <ImagePlus size={24} />
                  <span>Déposez votre photo pour la détourer</span>
                </div>
              )}

              <canvas
                ref={canvasRef}
                className={`studio-canvas ${
                  styledSubjectCanvas
                    ? isDraggingSubject
                      ? 'is-dragging'
                      : 'can-drag'
                    : ''
                }`}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
              />
            </div>

            {/* Right Floating Vertical Zoom Rail (Image 2 style) */}
            <div className="studio-zoom-rail">
              <button
                type="button"
                className="studio-icon-btn"
                disabled={!styledSubjectCanvas}
                onClick={resetPosition}
                title="Recentrer le portrait"
              >
                <Move size={14} />
              </button>
              <div className="studio-zoom-stack">
                <button
                  type="button"
                  className="studio-icon-btn"
                  disabled={!styledSubjectCanvas}
                  onClick={() =>
                    setTransform((p) => ({
                      ...p,
                      scale: Math.min(2.6, Number((p.scale + 0.1).toFixed(2))),
                    }))
                  }
                  title="Zoomer"
                >
                  <Plus size={14} />
                </button>
                <span className="studio-zoom-pct">{zoomPercent}%</span>
                <button
                  type="button"
                  className="studio-icon-btn"
                  disabled={!styledSubjectCanvas}
                  onClick={() =>
                    setTransform((p) => ({
                      ...p,
                      scale: Math.max(0.3, Number((p.scale - 0.1).toFixed(2))),
                    }))
                  }
                  title="Dézoomer"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Floating Dock (Image 2 signature bar) */}
          <div className="studio-dock">
            <div className="studio-dock-swatches">
              <div className="studio-swatches-row">
                {PORTRAIT_PRESETS.map((preset) => {
                  const isActive = transform.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`studio-swatch-btn ${
                        isActive ? 'is-active' : ''
                      }`}
                      onClick={() =>
                        setTransform((p) => ({ ...p, ...preset.patch }))
                      }
                      title={preset.label}
                    >
                      <span
                        className="studio-swatch-circle"
                        style={preset.swatchStyle}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="studio-swatch-caption">
                {activePreset?.label ?? 'Personnalisé'}
              </div>
            </div>

            <div className="studio-dock-actions">
              <div className="studio-dock-tools">
                <button
                  type="button"
                  className="studio-dock-tool"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={15} />
                  <span>PHOTO</span>
                </button>

                <button
                  type="button"
                  className={`studio-dock-tool ${
                    useCutout && cutoutImg ? 'is-active' : ''
                  }`}
                  disabled={!cutoutImg}
                  onClick={() => setUseCutout((v) => !v)}
                >
                  <Scissors size={15} />
                  <span>DÉTOURAGE</span>
                </button>

                <button
                  type="button"
                  className={`studio-dock-tool ${
                    transform.grayscale ? 'is-active' : ''
                  }`}
                  disabled={!styledSubjectCanvas}
                  onClick={() =>
                    setTransform((p) => ({
                      ...p,
                      grayscale: !p.grayscale,
                      preset: !p.grayscale ? 'bw-official' : 'color',
                    }))
                  }
                >
                  <Contrast size={15} />
                  <span>N&amp;B</span>
                </button>

                <button
                  type="button"
                  className={`studio-dock-tool ${
                    transform.bottomFade ? 'is-active' : ''
                  }`}
                  disabled={!styledSubjectCanvas}
                  onClick={() =>
                    setTransform((p) => ({ ...p, bottomFade: !p.bottomFade }))
                  }
                >
                  <Sparkles size={15} />
                  <span>FONDU</span>
                </button>

                <button
                  type="button"
                  className={`studio-dock-tool ${
                    transform.flipX ? 'is-active' : ''
                  }`}
                  disabled={!styledSubjectCanvas}
                  onClick={() =>
                    setTransform((p) => ({ ...p, flipX: !p.flipX }))
                  }
                >
                  <FlipHorizontal2 size={15} />
                  <span>MIROIR</span>
                </button>

                <button
                  type="button"
                  className="studio-dock-tool"
                  onClick={() =>
                    setExportFormat((f) => (f === 'png' ? 'jpeg' : 'png'))
                  }
                >
                  <Layers size={15} />
                  <span>{exportFormat.toUpperCase()}</span>
                </button>
              </div>

              <button
                type="button"
                className="studio-download-cta"
                disabled={!styledSubjectCanvas || isExporting}
                onClick={handleExport}
              >
                {isExporting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>GÉNÉRATION…</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>TÉLÉCHARGER</span>
                    <ChevronsRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
