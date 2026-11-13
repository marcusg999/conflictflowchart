import { z } from 'zod';

/**
 * Schema for content/resources.json.
 * A resource is an in-app exercise, a list of real links (calls, texts, sites),
 * or therapist-authored reading. Strict objects: unknown keys are errors.
 */

export const EXERCISES = ['physiological-sigh', 'box-breathing', 'extended-exhale', 'grounding-54321'] as const;
export const exerciseSchema = z.enum(EXERCISES);
export type ExerciseId = z.infer<typeof exerciseSchema>;

const text = z.string().trim().min(1);

const telLink = z.strictObject({
  kind: z.literal('tel'),
  label: text,
  display: text,
  value: z.string().regex(/^\+?[0-9]+$/, 'tel values are digits, optionally starting with +'),
});
const smsLink = z.strictObject({
  kind: z.literal('sms'),
  label: text,
  display: text,
  value: z.string().regex(/^\+?[0-9]+$/, 'sms values are digits, optionally starting with +'),
  body: z.string().optional(),
});
const webLink = z.strictObject({
  kind: z.literal('web'),
  label: text,
  display: text.optional(),
  value: z.string().regex(/^https:\/\/[^\s]+$/, 'web links must start with https://'),
});
export const linkSchema = z.discriminatedUnion('kind', [telLink, smsLink, webLink]);
export type ResourceLink = z.infer<typeof linkSchema>;

const markdownPath = z.string().regex(/^content\/resources\/[a-z0-9-]+\.md$/, 'markdown lives in content/resources/<id>.md');

const shared = {
  label: text,
  note: text.optional(),
  confirmed: z.boolean(),
};

const exerciseResource = z.strictObject({
  type: z.literal('exercise'),
  ...shared,
  exercise: exerciseSchema,
  /** Other exercises offered from inside this one ("try something else"). */
  also: z.array(exerciseSchema).optional(),
});

const linksResource = z.strictObject({
  type: z.literal('links'),
  ...shared,
  intro: text.optional(),
  /**
   * When true, the national hotline (phone, text, chat) is shown first, taken
   * from src/constants/safety.ts. Never copy those numbers into this file.
   */
  hotline: z.boolean().optional(),
  links: z.array(linkSchema),
  /** Shown when `links` is empty while the therapist supplies the list. */
  markdown: markdownPath.optional(),
});

const readingResource = z.strictObject({
  type: z.literal('reading'),
  ...shared,
  markdown: markdownPath,
});

export const resourceSchema = z.discriminatedUnion('type', [exerciseResource, linksResource, readingResource]);
export type Resource = z.infer<typeof resourceSchema>;

export const resourcesSchema = z.strictObject({
  version: z.literal(1),
  resources: z.record(z.string().regex(/^[a-z0-9-]+$/), resourceSchema),
});
export type Resources = z.infer<typeof resourcesSchema>;

export function parseResources(input: unknown): Resources {
  const result = resourcesSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`content/resources.json is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
