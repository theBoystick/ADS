import { TemplateConfig } from '../types';

export const DEFAULT_TEMPLATE: TemplateConfig = {
  id: 'jy-serai-finger-of-god',
  name: "J'y serai — The Finger of God",
  width: 1026,
  height: 1350,
  backgroundImageUrl: '/templates/tempAI.png',
  imageUrl: '/templates/temp.png',
  layerMode: 'photo-under-template',
  slot: {
    x: 0.5,
    y: 0.375,
    width: 0.68,
    height: 0.46,
    shape: 'circle',
    radius: 0,
    // temp.png already masks the outer frame with a soft feathered alpha cutout
    clipToSlot: false,
  },
  isPlaceholder: false,
};
