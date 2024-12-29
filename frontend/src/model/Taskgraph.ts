import * as zod from 'zod';

export const taskgraphZodSchema = zod
  .object({
    info: zod
      .object({
        github: zod.object({
          organization: zod.string(),
          projectNumber: zod.number().int().min(1),
          repository: zod.string(),
          trackingIssueNumber: zod.number().int().min(1),
        }),
      })
      .optional(),
    tasks: zod.array(
      zod.object({
        depends: zod.array(zod.string()),
        description: zod.string(),
        difficulty: zod.number(),
        name: zod.string(),
        notes: zod.array(zod.string()),
        issueNumber: zod.number().int().min(1).optional(),
      }),
    ),
  })
  .strict();

export type Taskgraph = zod.infer<typeof taskgraphZodSchema>;
