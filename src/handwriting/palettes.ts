export const palettes = {
  purple: { label:'パープル', title:'#66547e', body:'#383A3D', annotation:'#6b5d81', personal:'#383A3D', marker:'#E1D9F0' },
  orange: { label:'オレンジ', title:'#78552f', body:'#383A3D', annotation:'#776338', personal:'#383A3D', marker:'#F5D9B8' },
  pink: { label:'ピンク', title:'#7c465c', body:'#383A3D', annotation:'#785369', personal:'#383A3D', marker:'#F2D5DE' },
  lavender: { label:'ラベンダー', title:'#66547e', body:'#383A3D', annotation:'#6b5d81', personal:'#383A3D', marker:'#cbbde6' },
  blue: { label:'ブルー', title:'#47627A', body:'#383A3D', annotation:'#4c687f', personal:'#383A3D', marker:'#D5E7F2' },
  green: { label:'グリーン', title:'#485747', body:'#383A3D', annotation:'#526a57', personal:'#383A3D', marker:'#DCE7D5' },
  yellow: { label:'イエロー', title:'#76602f', body:'#383A3D', annotation:'#776338', personal:'#383A3D', marker:'#e5d384' },
  gray: { label:'グレー', title:'#565b61', body:'#383A3D', annotation:'#60656b', personal:'#383A3D', marker:'#E2E4E6' },
} as const;
export type PaletteId = keyof typeof palettes;
export type InkPalette = (typeof palettes)[PaletteId];
export const paletteIds = ['pink','lavender','blue','green','yellow','gray'] as PaletteId[];
