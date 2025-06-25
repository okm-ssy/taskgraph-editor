import { z } from 'zod';

// Taskgraph型定義（frontendと同じ）
export const TaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.number(),
  baseDifficulty: z.number(),
  depends: z.array(z.string()),
  notes: z.array(z.string()),
  relations: z.array(z.string()),
  issueNumber: z.number().optional(),
  category: z.string(),
  layout: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});

export const TaskgraphSchema = z.object({
  info: z.object({
    github: z.object({
      organization: z.string().optional(),
      repository: z.string().optional(),
      projectNumber: z.number().optional(),
      trackingIssueNumber: z.number().optional(),
    }).optional(),
    name: z.string().optional(),
    version: z.string().optional(),
    assignee: z.string().optional(),
  }),
  tasks: z.array(TaskSchema),
});

export type Task = z.infer<typeof TaskSchema>;
export type Taskgraph = z.infer<typeof TaskgraphSchema>;