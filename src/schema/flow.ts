import { z } from 'zod';

/**
 * Schema for content/flow.json — the therapist's chart.
 *
 * Objects are strict: an unknown or misspelled key ("promt", "contine") is an
 * error, not silently ignored. A malformed file fails loudly in dev and in CI.
 */

const nodeId = z
  .string()
  .regex(/^[a-z0-9_]+$/, 'Node ids use lowercase letters, digits and underscores');

const resourceId = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Resource ids use lowercase letters, digits and hyphens');

const text = z.string().trim().min(1);

export const toneSchema = z.enum(['calm', 'action', 'hard', 'safety']);

const choiceSchema = z.strictObject({
  label: text,
  next: nodeId,
});

const shared = {
  phase: nodeId,
  resources: z.array(resourceId).optional(),
  confirmed: z.boolean(),
  note: text.optional(),
};

export const questionNodeSchema = z.strictObject({
  type: z.literal('question'),
  ...shared,
  prompt: text,
  help: text.optional(),
  choices: z.array(choiceSchema).min(2),
});

export const outcomeNodeSchema = z.strictObject({
  type: z.literal('outcome'),
  ...shared,
  title: text,
  body: text.optional(),
  tone: toneSchema,
  continue: nodeId.optional(),
  /** Optional opening phrases the therapist writes, shown as tappable, copyable lines. */
  stems: z.array(text).optional(),
});

export const nodeSchema = z.discriminatedUnion('type', [questionNodeSchema, outcomeNodeSchema]);

const phaseSchema = z.strictObject({ id: nodeId, title: text });

export const flowSchema = z
  .strictObject({
    version: z.literal(1),
    start: nodeId,
    phases: z.array(phaseSchema).min(1),
    nodes: z.record(nodeId, nodeSchema),
  })
  .superRefine((flow, ctx) => {
    const phaseIds = new Set(flow.phases.map((p) => p.id));
    if (!(flow.start in flow.nodes)) {
      ctx.addIssue({ code: 'custom', path: ['start'], message: `start "${flow.start}" is not a node` });
    }
    for (const [id, node] of Object.entries(flow.nodes)) {
      const at = ['nodes', id];
      if (!phaseIds.has(node.phase)) {
        ctx.addIssue({ code: 'custom', path: [...at, 'phase'], message: `unknown phase "${node.phase}"` });
      }
      if (!node.confirmed && !node.note) {
        ctx.addIssue({
          code: 'custom',
          path: [...at, 'note'],
          message: 'an unconfirmed node needs a note explaining what is uncertain',
        });
      }
      const targets =
        node.type === 'question'
          ? node.choices.map((c, i) => ({ to: c.next, path: [...at, 'choices', i, 'next'] }))
          : node.continue
            ? [{ to: node.continue, path: [...at, 'continue'] }]
            : [];
      for (const t of targets) {
        if (!(t.to in flow.nodes)) {
          ctx.addIssue({ code: 'custom', path: t.path, message: `points to "${t.to}", which is not a node` });
        }
      }
      if (node.type === 'question') {
        const labels = node.choices.map((c) => c.label.trim().toLowerCase());
        if (new Set(labels).size !== labels.length) {
          ctx.addIssue({ code: 'custom', path: [...at, 'choices'], message: 'two choices share a label' });
        }
      }
    }
  });

export type Flow = z.infer<typeof flowSchema>;
export type FlowNode = z.infer<typeof nodeSchema>;
export type QuestionNode = z.infer<typeof questionNodeSchema>;
export type OutcomeNode = z.infer<typeof outcomeNodeSchema>;
export type Tone = z.infer<typeof toneSchema>;

/** Parse and validate. Throws a readable error naming every problem. */
export function parseFlow(input: unknown): Flow {
  const result = flowSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`content/flow.json is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
