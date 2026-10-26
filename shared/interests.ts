import { z } from 'zod';

// Suggestions help people start; they are neither required categories nor binder IDs.
export const INTEREST_SUGGESTIONS = [
  '仕事・キャリア', '旅行・お出かけ', '食べもの・料理', '音楽・映画・本',
  '技術・ものづくり', '健康・スポーツ', '暮らし・人間関係', '自然・動物',
] as const;
export const MAX_INTERESTS = 12;
export const interestSchema = z.string().trim().min(1).max(40);
export const interestsSchema = z.array(interestSchema).max(MAX_INTERESTS)
  .refine(values => new Set(values.map(value => value.normalize('NFKC').toLocaleLowerCase('en-US'))).size === values.length,
    'Interests must be distinct');
export const interestProfileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  interests: interestsSchema,
});
export type InterestProfile = z.infer<typeof interestProfileSchema>;
