import { generationRequestSchema } from '../../shared/generation-request';
import { MUSE_PAGE_INSTRUCTIONS } from '../../shared/muse-instructions';

// No network or storage side effects. The same instructions back the learner's own-Muse guide.
export function buildMuseMessages(input: unknown) {
  const request = generationRequestSchema.parse(input);
  return [
    { role: 'system' as const, content: MUSE_PAGE_INSTRUCTIONS.join('\n') },
    { role: 'user' as const, content: JSON.stringify(request) },
  ];
}
