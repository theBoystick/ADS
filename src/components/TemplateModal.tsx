import React, { useRef } from 'react';
import { Upload, X, RotateCcw } from 'lucide-react';
import { LayerMode, SlotShape, TemplateConfig } from '../types';
import { loadImageFromUrl } from '../utils/canvasComposer';

interface TemplateModalProps {
  isOpen: boolean;
  template: TemplateConfig;
  onChange: (next: TemplateConfig) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  template,
  onChange,
  onResetDefault,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImageFromUrl(objectUrl);
      const isPng = file.type === 'image/png';
      onChange({
        ...template,
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        width: img.naturalWidth || 1080,
        height: img.naturalHeight || 1350,
        imageUrl: objectUrl,
        backgroundImageUrl: undefined,
        layerMode: isPng ? 'photo-under-template' : 'photo-over-template',
        isPlaceholder: false,
      });
    } catch {
      URL.revokeObjectURL(objectUrl);
    }
    e.target.value = '';
  };

  const updateSlot = (patch: Partial<TemplateConfig['slot']>) => {
    onChange({
      ...template,
      slot: {
        ...template.slot,
        ...patch,
      },
    });
  };

  const setLayerMode = (layerMode: LayerMode) => {
    onChange({ ...template, layerMode });
  };

  const setShape = (shape: SlotShape) => {
    updateSlot({ shape });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Modèle du flyer</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              Importer un fichier modèle (PNG, JPG, WebP)
            </button>
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
                color: 'var(--ink-muted)',
              }}
            >
              Format actuel : {template.width} × {template.height} px
              {template.isPlaceholder ? ' (modèle provisoire)' : ''}
            </div>
          </div>

          <div>
            <div className="control-label-row">
              <span className="control-label">Ordre des calques</span>
            </div>
            <div className="segmented">
              <button
                type="button"
                className={`segmented-btn ${
                  template.layerMode === 'photo-over-template' ? 'is-active' : ''
                }`}
                onClick={() => setLayerMode('photo-over-template')}
              >
                Photo devant
              </button>
              <button
                type="button"
                className={`segmented-btn ${
                  template.layerMode === 'photo-under-template' ? 'is-active' : ''
                }`}
                onClick={() => setLayerMode('photo-under-template')}
              >
                Photo derrière (PNG)
              </button>
            </div>
          </div>

          <div className="modal-grid-2">
            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">Position X</span>
                <span className="control-value">
                  {Math.round(template.slot.x * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="range-input"
                min={0.1}
                max={0.9}
                step={0.005}
                value={template.slot.x}
                onChange={(e) => updateSlot({ x: parseFloat(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">Position Y</span>
                <span className="control-value">
                  {Math.round(template.slot.y * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="range-input"
                min={0.1}
                max={0.9}
                step={0.005}
                value={template.slot.y}
                onChange={(e) => updateSlot({ y: parseFloat(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">Largeur zone</span>
                <span className="control-value">
                  {Math.round(template.slot.width * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="range-input"
                min={0.2}
                max={1}
                step={0.005}
                value={template.slot.width}
                onChange={(e) =>
                  updateSlot({ width: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">Hauteur zone</span>
                <span className="control-value">
                  {Math.round(template.slot.height * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="range-input"
                min={0.2}
                max={1}
                step={0.005}
                value={template.slot.height}
                onChange={(e) =>
                  updateSlot({ height: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <div className="control-label-row">
              <span className="control-label">Forme du cadre</span>
            </div>
            <div
              className="segmented"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
            >
              <button
                type="button"
                className={`segmented-btn ${
                  template.slot.shape === 'rect' ? 'is-active' : ''
                }`}
                onClick={() => setShape('rect')}
              >
                Rectangle
              </button>
              <button
                type="button"
                className={`segmented-btn ${
                  template.slot.shape === 'rounded' ? 'is-active' : ''
                }`}
                onClick={() => setShape('rounded')}
              >
                Arrondi
              </button>
              <button
                type="button"
                className={`segmented-btn ${
                  template.slot.shape === 'circle' ? 'is-active' : ''
                }`}
                onClick={() => setShape('circle')}
              >
                Cercle
              </button>
            </div>
          </div>

          <div className="cutout-toggle-row" style={{ marginTop: 0 }}>
            <div className="cutout-toggle-label">
              <strong>Rogner aux bords du cadre</strong>
              <span>Masque ce qui dépasse de la zone définie</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={template.slot.clipToSlot}
              className={`switch ${template.slot.clipToSlot ? 'is-on' : ''}`}
              onClick={() =>
                updateSlot({ clipToSlot: !template.slot.clipToSlot })
              }
            >
              <span className="switch-knob" />
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetDefault}
          >
            <RotateCcw size={13} />
            Réinitialiser
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
};
