export const palettes = {
  pink: { label:'ピンク', title:'#7c465c', body:'#59464d', annotation:'#785369', personal:'#634652', marker:'#edbeca' },
  lavender: { label:'ラベンダー', title:'#66547e', body:'#4d485b', annotation:'#6b5d81', personal:'#5b4f70', marker:'#cbbde6' },
  blue: { label:'ブルー', title:'#415f7e', body:'#414f60', annotation:'#4c687f', personal:'#46647b', marker:'#b8d4e8' },
  green: { label:'グリーン', title:'#485747', body:'#3d443d', annotation:'#526a57', personal:'#4f6052', marker:'#c3d3b1' },
  yellow: { label:'イエロー', title:'#76602f', body:'#574f39', annotation:'#776338', personal:'#695b37', marker:'#e5d384' },
  gray: { label:'グレー', title:'#565b61', body:'#484c50', annotation:'#60656b', personal:'#545b62', marker:'#ccd0d4' },
} as const;
export type PaletteId = keyof typeof palettes;
export type InkPalette = (typeof palettes)[PaletteId];
export const paletteIds = Object.keys(palettes) as PaletteId[];
