import { z } from 'zod';

// Taskgraph型定義（frontendと同じ）
export const TaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.number().default(0),
  baseDifficulty: z.number().default(0),
  depends: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  relations: z.array(z.string()).default([]),
  issueNumber: z.number().optional(),
  category: z.string().default(''),
  layout: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});

// MCP用の入力スキーマ（より柔軟）
export const TaskInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.number().optional(),
  baseDifficulty: z.number().optional(),
  depends: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  relations: z.array(z.string()).optional(),
  issueNumber: z.number().optional(),
  category: z.string().optional(),
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