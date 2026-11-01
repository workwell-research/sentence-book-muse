import { z } from 'zod';
import { createA5Layout, outerMarginMm, wrapInk } from '../handwriting/a5-layout';
import type { PaperSettings } from '../handwriting/a5-layout';
import { englishFonts, japaneseFonts } from '../handwriting/fonts';
import type { FontSettings, JapaneseFontId } from '../handwriting/fonts';
import { supported } from '../handwriting/model';
import { studySample } from '../handwriting/study-content';
import type { AnchoredGloss, StudyContent, StudySentence } from '../handwriting/study-content';
import { practiceKey } from '../desk/core';
import type { LookupEntry } from '../desk/core';
import { readLibrary } from './library';
import type { Binder, Library, LibraryPage } from './library';

// A filed page becomes desk material: the same A5 notebook the sample uses, fed from the learner's shelf.
// Nothing here edits the library; the page is read, folded into typeable text, and checked against the paper.

const replacements: [RegExp, string][] = [
  [/[‘’‚′]/g, "'"], [/[“”„″]/g, '"'],
  [/[–—―−]/g, '-'], [/…/g, '...'],
  [/[​-‍﻿]/g, ''], [/[  -  　]/g, ' '],
];
// Typographic variants the model may emit are folded to what a learner can type on any keyboard.
export function normalizeHandText(text: string): string {
  let out = text.normalize('NFC');
  for (const [pattern, value] of replacements) out = out.replace(pattern, value);
  return out.replace(/\s+/g, ' ').trim();
}

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function notebookDate(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const paperWidth = (paper: PaperSettings) => 148 - (paper.side === 'right' ? paper.binding : outerMarginMm) - (paper.side === 'left' ? paper.binding : outerMarginMm);
// Header fields must stay on one line; the title is shortened word by word, never cut mid-word.
function fitLine(text: string, size: number, width: number, fonts: FontSettings): string | null {
  const clean = normalizeHandText(text);
  if (!clean || !supported(clean, englishFonts[fonts.english].data)) return null;
  const words = clean.split(' ');
  for (let n = words.length; n > 0; n--) {
    const candidate = words.slice(0, n).join(' ');
    if (wrapInk(candidate, width, size, 'hand', fonts).length === 1) return candidate;
  }
  return null;
}

export type DeskLesson =
  | { kind: 'ready'; content: StudyContent; trimmed: boolean }
  | { kind: 'unavailable'; reason: 'unsupported-text' | 'does-not-fit' };

export function studyContentFromPage(page: LibraryPage, binder: Binder | null, paper: PaperSettings, fonts: FontSettings): DeskLesson {
  const font = englishFonts[fonts.english].data;
  // Muse's review expression for a sentence becomes that sentence's Reconstruction hint.
  const hintFor = (index: number) => page.review_items.find(item => item.sentence_index === index)?.expression;
  const sentences: StudySentence[] = page.sentences.map((pair, index) => ({
    id: `sentence-${String(index + 1).padStart(2, '0')}`, text: normalizeHandText(pair.en), meaning: pair.native,
    ...(hintFor(index) ? { hint: hintFor(index) } : {}),
  }));
  const questions = page.questions.map((question, index) => ({ id: `question-${index + 1}`, en: question.en, native: question.native, sample: { en: question.sample_answer.en, native: question.sample_answer.native } }));
  if (sentences.some(sentence => !sentence.text || !supported(sentence.text, font))) return { kind: 'unavailable', reason: 'unsupported-text' };

  // Muse's review expressions are candidates in the words list only; lines on the paper are the learner's.
  const vocabulary: StudyContent['vocabulary'] = [];
  page.review_items.forEach((item, n) => {
    const expression = normalizeHandText(item.expression);
    if (!expression || !supported(expression, font)) return;
    vocabulary.push({ id: `word-${n + 1}`, english: expression, meaning: item.native, checked: false });
  });

  const width = paperWidth(paper);
  const title = fitLine(page.title, 5.65, width, fonts) ?? fitLine(sentences[0].text, 5.65, width, fonts) ?? 'My sentences';
  const label = (binder && fitLine(binder.title, 3.2, width, fonts)) ?? `Level ${page.level}`;
  const base: StudyContent = {
    id: page.id, title, date: notebookDate(page.filedAt),
    classification: { id: binder?.id ?? `level-${page.level}`, label },
    sentences, vocabulary, personal: '', questions,
  };
  // Review meanings may use characters the notebook's Japanese face lacks; sentences alone are still a lesson.
  if (fits(base, paper, fonts)) return { kind: 'ready', content: base, trimmed: false };
  const plain: StudyContent = { ...base, sentences, vocabulary: [] };
  if (fits(plain, paper, fonts)) return { kind: 'ready', content: plain, trimmed: true };
  return { kind: 'unavailable', reason: 'does-not-fit' };
}

function fits(content: StudyContent, paper: PaperSettings, fonts: FontSettings): boolean {
  try { createA5Layout(content, paper, fonts); return true; } catch { return false; }
}

// The notebook's Japanese face cannot write every character; keep what it can, drop the rest.
export function writableMeaning(text: string, japanese: JapaneseFontId): string {
  const ranges = japaneseFonts[japanese].metrics.ranges as [number, number][];
  const kept = [...text.normalize('NFC')].filter(char => { const cp = char.codePointAt(0)!; return ranges.some(([a, b]) => cp >= a && cp <= b); }).join('');
  return kept.replace(/\s+/g, ' ').trim();
}

// Lines the learner drew become glosses under their sentence and words in the list; stale or unwritable ones are skipped.
export function lessonWithLookups(lesson: StudyContent, lookups: readonly LookupEntry[], fonts: FontSettings): StudyContent {
  if (lookups.length === 0) return lesson;
  const font = englishFonts[fonts.english].data;
  const added = new Map<string, AnchoredGloss[]>();
  const words = [...lesson.vocabulary];
  for (const lookup of lookups) {
    const sentence = lesson.sentences.find(item => item.id === lookup.sentenceId);
    if (!sentence) continue;
    const quote = [...sentence.text].slice(lookup.start, lookup.end).join('');
    if (quote !== lookup.expression || !supported(quote, font)) continue;
    const meaning = writableMeaning(lookup.native, fonts.japanese);
    if (!meaning) continue;
    const list = added.get(sentence.id) ?? [];
    if (![...(sentence.glosses ?? []), ...list].some(gloss => gloss.start === lookup.start)) {
      list.push({ id: lookup.id, start: lookup.start, end: lookup.end, quote, meaning });
      added.set(sentence.id, list);
    }
    if (!words.some(word => word.english.toLowerCase() === lookup.expression.toLowerCase()))
      words.push({ id: `${lookup.id}-word`, english: lookup.expression, meaning, checked: false });
  }
  return {
    ...lesson,
    sentences: lesson.sentences.map(sentence => { const extra = added.get(sentence.id); return extra ? { ...sentence, glosses: [...(sentence.glosses ?? []), ...extra] } : sentence; }),
    vocabulary: words,
  };
}

// Which page the desk opens: the URL names one explicitly, otherwise the last one opened; `sample` returns to the fixture.
export const DESK_SELECTION_KEY = 'sentence-book-muse:desk-selection:v1';
export const SAMPLE_PAGE = 'sample';
export const copyKey = (pageId: string) => `sentence-book-muse:copy:v1:${pageId}`;
const selectionSchema = z.strictObject({ version: z.literal(1), pageId: z.uuid().nullable() });
type SelectionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function requestedPageId(search: string): string | null {
  const value = new URLSearchParams(search).get('page');
  if (value === SAMPLE_PAGE) return SAMPLE_PAGE;
  return value && z.uuid().safeParse(value).success ? value : null;
}
export function readSelection(storage: SelectionStorage): string | null {
  try {
    const raw = storage.getItem(DESK_SELECTION_KEY);
    if (raw === null) return null;
    const parsed = selectionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.pageId : null;
  } catch { return null; }
}
export function rememberSelection(storage: SelectionStorage, pageId: string | null): void {
  try { storage.setItem(DESK_SELECTION_KEY, JSON.stringify({ version: 1, pageId })); } catch { /* a forgotten selection only reopens the sample */ }
}
export function findPage(library: Library, pageId: string): { page: LibraryPage; binder: Binder } | null {
  const page = library.pages.find(item => item.id === pageId);
  const binder = page && library.binders.find(item => item.id === page.binderId);
  return page && binder ? { page, binder } : null;
}

export interface ResolvedLesson {
  lesson: StudyContent; page: LibraryPage | null; binder: Binder | null; copyKey: string; notice: string; trimmed: boolean;
}
const sampleLesson = (notice: string): ResolvedLesson => ({ lesson: studySample, page: null, binder: null, copyKey: practiceKey, notice, trimmed: false });

export function resolveDeskLesson(storage: SelectionStorage, search: string, paper: PaperSettings, fonts: FontSettings): ResolvedLesson {
  const requested = requestedPageId(search);
  if (requested === SAMPLE_PAGE) { rememberSelection(storage, null); return sampleLesson(''); }
  const pageId = requested ?? readSelection(storage);
  if (!pageId) return sampleLesson('');
  let library: ReturnType<typeof readLibrary>;
  try { library = readLibrary(storage); } catch { library = { kind: 'unreadable' }; }
  if (library.kind === 'unreadable') return sampleLesson('保存した本棚を読み込めないため、サンプル教材を開いています。本棚のデータは変更していません。');
  const found = findPage(library.library, pageId);
  if (!found) { rememberSelection(storage, null); return sampleLesson('選んだページが本棚に見つからなかったため、サンプル教材を開いています。'); }
  const lesson = studyContentFromPage(found.page, found.binder, paper, fonts);
  if (lesson.kind === 'unavailable') return sampleLesson('このページには、ノートの書体で書けない文字が含まれているため、まだ机では練習できません。サンプル教材を開いています。');
  if (requested) rememberSelection(storage, pageId);
  return {
    lesson: lesson.content, page: found.page, binder: found.binder, copyKey: copyKey(found.page.id), trimmed: lesson.trimmed,
    notice: lesson.trimmed ? 'このページの復習メモはノートに収まらなかったため、英文だけを載せています。' : '',
  };
}
