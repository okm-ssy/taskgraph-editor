import * as zod from 'zod';

export const infoZodSchema = zod
  .object({
    github: zod
      .object({
        organization: zod.string(),
        projectNumber: zod.number().int().min(1),
        repository: zod.string(),
        trackingIssueNumber: zod.number().int().min(1),
      })
      .optional(),
    name: zod.string().optional(),
    version: zod.string().optional(),
    assignee: zod.string().optional(),
  })
  .strict();

export const taskZodSchema = zod
  .object({
    depends: zod.array(zod.string()),
    description: zod.string(),
    difficulty: zod.number(),
    name: zod.string(),
    notes: zod.array(zod.string()),
    issueNumber: zod.number().int().min(1).optional(),
  })
  .strict();

export const taskgraphZodSchema = zod
  .object({
    info: infoZodSchema,
    tasks: zod.array(taskZodSchema),
  })
  .strict();

export type Task = zod.infer<typeof taskZodSchema>;
export type Taskgraph = zod.infer<typeof taskgraphZodSchema>;
