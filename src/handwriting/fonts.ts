import { fontData as print } from './font-data';
import { fontData as pen } from './font-neat';
import klee from './text-metrics.json';
import zen from './text-metrics-zen.json';

export type StrokeFont = typeof print;
export const englishFonts = {
 print: {label:'整った丸文字', name:'Sentence Notebook Print', data:print},
 pen: {label:'軽やかなペン文字', name:'Sentence Notebook Pen', data:pen},
} as const;
export const japaneseFonts = {
 klee: {label:'繊細な手書き · Klee One', family:'Notebook Klee', file:'KleeOne-Regular', metrics:klee},
 zen: {label:'やわらかな手書き · Zen Kurenaido', family:'Notebook Zen', file:'ZenKurenaido-Regular', metrics:zen},
} as const;
export type EnglishFontId = keyof typeof englishFonts;
export type JapaneseFontId = keyof typeof japaneseFonts;
export interface FontSettings {english:EnglishFontId; japanese:JapaneseFontId;}
export const defaultFonts:FontSettings={english:'print',japanese:'klee'};
