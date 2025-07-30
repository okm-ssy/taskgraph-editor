import { z } from 'zod';

// 画面設計画像の型定義
export const DesignImageSchema = z.object({
  id: z.string(),
  path: z.string(),
  title: z.string().optional(),
  filepath: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// 分野の定義
const fieldSchema = z.enum(['front', 'back', 'infra', 'other', 'parent', '']);

// Taskgraph型定義（frontendと同じ）
export const TaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.number().default(0),
  depends: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  issueNumber: z.number().optional(),
  addition: z.object({
    baseDifficulty: z.number().default(0),
    category: z.string().default(''),
    field: fieldSchema.optional(),
    layout: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    // 実装支援用の新規フィールド
    implementation_notes: z.array(z.string()).optional(),
    api_schemas: z.array(z.string()).optional(), // API仕様・エンドポイント情報
    requirements: z.array(z.string()).optional(),
    design_images: z.array(z.string()).optional(),
  }),
});

// MCP用の入力スキーマ（より柔軟）
export const TaskInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.number().optional(),
  depends: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  issueNumber: z.number().optional(),
  addition: z.object({
    baseDifficulty: z.number().optional(),
    relations: z.array(z.string()).optional(),
    category: z.string().optional(),
    field: fieldSchema.optional(),
    implementation_notes: z.array(z.string()).optional(),
    api_schemas: z.array(z.string()).optional(), // API仕様・エンドポイント情報
    requirements: z.array(z.string()).optional(),
    design_images: z.array(z.string()).optional(),
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
    addition: z.object({
      project_overview: z.string().optional(),
      tech_stack: z.array(z.string()).optional(),
      coding_guidelines: z.string().optional(),
      deployment_notes: z.string().optional(),
      design_images: z.array(DesignImageSchema).optional(),
    }).optional(),
  }),
  tasks: z.array(TaskSchema),
});

export type DesignImage = z.infer<typeof DesignImageSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Taskgraph = z.infer<typeof TaskgraphSchema>;