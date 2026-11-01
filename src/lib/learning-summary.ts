import { learningSummarySchema } from '../../shared/muse-connection';
import type { LearningSummary } from '../../shared/muse-connection';
import { practiceSchema } from '../desk/core';
import { readNote } from './composer';
import { readLibrary, binderCatalogue } from './library';
import { readPendingDrafts } from './generation';
import { readWordbook } from './lookup';

// Build in memory for the learner's review. This function never sends or writes data.
export function buildLearningSummary(storage: Storage, now = new Date()): LearningSummary {
  const note = readNote(storage), library = readLibrary(storage);
  const pending = readPendingDrafts(storage), words = readWordbook(storage);
  if (note.kind === 'unreadable' || library.kind === 'unreadable'
    || pending.kind === 'unreadable' || words.kind === 'unreadable') throw new Error('unreadable-storage');
  let unpractised = 0, completed = 0;
  for (const page of library.library.pages) {
    const raw = storage.getItem(`sentence-book-muse:copy:v1:${page.id}`);
    if (raw === null) { unpractised++; continue; }
    const record = practiceSchema.parse(JSON.parse(raw));
    if (record.lessonId !== page.id) throw new Error('unreadable-storage');
    if (record.entries.length === 0) unpractised++;
    if (record.phase === 'complete' && record.entries.length === page.sentences.length) {
      const finished = Date.parse(record.entries.at(-1)!.confirmedAt);
      if (!Number.isFinite(finished)) throw new Error('unreadable-storage');
      if (finished <= now.getTime() && finished >= now.getTime() - 7 * 86400000) completed++;
    }
  }
  const seen = new Set<string>();
  const candidates = [...words.entries].sort((a,b) => b.lookedUpAt.localeCompare(a.lookedUpAt))
    .filter(word => { const key = word.expression.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0,12).map(({ expression,native }) => ({ expression,native }));
  return learningSummarySchema.parse({ level:note.note.level,native_language:note.note.nativeLanguage,
    // Interests are no longer asked for; Muse learns them in conversation.
    interests:[], binders:binderCatalogue(library.library),
    local_pending_count:pending.drafts.length,unpractised_count:unpractised,completed_last_7_days:completed,
    review_candidates:candidates,observed_at:now.toISOString(),
    lesson_source:note.note.source,delivery:{ days:note.note.days,time:note.note.time } });
}
