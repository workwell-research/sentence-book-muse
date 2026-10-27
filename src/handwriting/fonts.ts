import { fontData as print } from './font-data';
import { fontData as pen } from './font-neat';
import { fontData as readability } from './font-readability';
import { fontData as tech } from './font-tech';
import klee from './text-metrics.json';
import zen from './text-metrics-zen.json';

export type StrokeFont = typeof print;
export const englishFonts = {
 readability: {label:'Readability Italic · 標準', name:'Sentence Notebook Readability', data:readability, titleLift:0},
 tech: {label:'EMS Tech · のびやかな手書き', name:'Sentence Notebook Tech', data:tech, titleLift:25},
 print: {label:'整った丸文字', name:'Sentence Notebook Print', data:print, titleLift:0},
 pen: {label:'軽やかなペン文字', name:'Sentence Notebook Pen', data:pen, titleLift:0},
} as const;
export const japaneseFonts = {
 klee: {label:'繊細な手書き · Klee One', family:'Notebook Klee', file:'KleeOne-Regular', metrics:klee},
 zen: {label:'やわらかな手書き · Zen Kurenaido', family:'Notebook Zen', file:'ZenKurenaido-Regular', metrics:zen},
} as const;
export type EnglishFontId = keyof typeof englishFonts;
export type JapaneseFontId = keyof typeof japaneseFonts;
export interface FontSettings {english:EnglishFontId; japanese:JapaneseFontId;}
export const defaultFonts:FontSettings={english:'readability',japanese:'klee'};
