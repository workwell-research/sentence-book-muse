import { describe, expect, it } from 'vitest';
import { validateLessonDraft } from '../shared/lesson-schema';
import type { DraftContext, LessonDraft } from '../shared/lesson-schema';

const binderId = 'a785f741-e09f-4657-885a-2c2bed838c2e';
const context: DraftContext = {
  draftId: 'bb0d7008-d519-40d0-8330-432eb193283c',
  level: 'A2', nativeLanguage: 'es', learningStateVersion: null, binderIds: [],
};
function fixture(): LessonDraft {
  return {
    draft_id: context.draftId, title: 'A quiet morning', level: 'A2', native_language: 'es',
    sentences: [
      { en: 'I open the window.', native: 'Abro la ventana.' },
      { en: 'The air is cool.', native: 'El aire está fresco.' },
      { en: 'I make some tea.', native: 'Preparo té.' },
      { en: 'I sit by the window.', native: 'Me siento junto a la ventana.' },
    ],
    questions: [{ en: 'What do you drink?', native: '¿Qué bebes?',
      sample_answer: { en: 'I drink tea.', native: 'Bebo té.' } }],
    review_items: [{ expression: 'by the window', native: 'junto a la ventana', sentence_index: 3 }],
    estimated_minutes: 5, based_on_learning_state_version: null,
    filing: { kind: 'new', newBinder: { title: 'Mornings', description: 'Small morning routines' },
      reason: 'Son frases sobre la mañana.', sceneTags: ['morning'] },
  };
}
function check(value: unknown, input = context) { return validateLessonDraft(value, input); }

describe('new generation contract', () => {
  it('accepts a first-page proposal with an empty catalogue and generic native translations', () => {
    expect(check(fixture())).toEqual({ success: true, draft: fixture() });
  });
  it('accepts any existing binder ID in the supplied catalogue, including beyond five themes', () => {
    const draft = fixture();
    draft.filing = { kind: 'existing', binderId, reason: 'La misma rutina.', sceneTags: ['morning'] };
    const ids = Array.from({ length: 6 }, (_, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
    expect(check(draft, { ...context, binderIds: [...ids, binderId] }).success).toBe(true);
    expect(check(draft)).toEqual({ success: false, reason: 'unknown_binder' });
  });
  it.each([
    ['draft_id', '4fc15635-0393-4faa-ab2a-6ebd95dc8c42'],
    ['level', 'B1'],
    ['native_language', 'ja'],
    ['based_on_learning_state_version', 1],
  ])('rejects a response for a different request: %s', (field, value) => {
    expect(check({ ...fixture(), [field]: value })).toEqual({ success: false, reason: 'request_mismatch' });
  });
  it('rejects dual destinations instead of silently dropping one', () => {
    const draft = fixture();
    expect(check({ ...draft, filing: { ...draft.filing, binderId } }))
      .toEqual({ success: false, reason: 'invalid_shape' });
  });
  it('rejects unknown fields in the root and nested lesson content', () => {
    expect(check({ ...fixture(), unexpected: true }).success).toBe(false);
    const draft = fixture();
    expect(check({ ...draft, sentences: [{ ...draft.sentences[0], ja: 'legacy key' }, ...draft.sentences.slice(1)] }).success).toBe(false);
  });
  it('rejects whitespace-only content and invalid or missing educational fields', () => {
    expect(check({ ...fixture(), title: '  \n ' }).success).toBe(false);
    expect(check({ ...fixture(), questions: [] }).success).toBe(false);
    expect(check({ ...fixture(), questions: [{ en: 'Why?', native: '¿Por qué?' }] }).success).toBe(false);
    expect(check({ ...fixture(), review_items: undefined }).success).toBe(false);
  });
  it('rejects unbounded content, coercion and unsupported levels', () => {
    expect(check({ ...fixture(), sentences: Array(13).fill(fixture().sentences[0]) }).success).toBe(false);
    expect(check({ ...fixture(), title: 'x'.repeat(121) }).success).toBe(false);
    expect(check({ ...fixture(), estimated_minutes: '5' }).success).toBe(false);
    expect(check({ ...fixture(), level: 'C2' }).success).toBe(false);
  });
  it('rejects review references that do not exist in the returned page', () => {
    const draft = fixture();
    draft.review_items[0].sentence_index = 4;
    expect(check(draft)).toEqual({ success: false, reason: 'invalid_review_reference' });
  });
});
