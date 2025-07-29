import * as zod from 'zod';

// プロジェクト内画像の型定義（簡易版）
export const projectImageZodSchema = zod.object({
  id: zod.string(), // 画像の一意ID (nanoid)
  path: zod.string(), // 画像ファイルのパス
});

// 画面設計画像の型定義（詳細版・将来拡張用）
export const designImageZodSchema = zod.object({
  id: zod.string(), // 画像の一意ID
  title: zod.string(), // 画像のタイトル・説明
  filepath: zod.string(), // 画像ファイルのパス
  tags: zod.array(zod.string()).optional(), // 検索用タグ（画面名、機能名等）
});

// タスク名のバリデーション: 空文字列を禁止し、空白文字以外を許可
const taskNameSchema = zod
  .string()
  .min(1, 'タスク名は必須です')
  .regex(/^\S+$/, 'タスク名に空白文字は使用できません');

// 依存関係のバリデーション: 空文字列と重複を除外
const dependsSchema = zod
  .array(taskNameSchema)
  .refine(
    (deps) => {
      const filtered = deps.filter((dep) => dep.trim() !== '');
      return new Set(filtered).size === filtered.length;
    },
    { message: '依存関係に重複があります' },
  )
  .transform((deps) => deps.filter((dep) => dep.trim() !== ''));

export const infoZodSchema = zod
  .object({
    github: zod
      .object({
        organization: zod.string().optional(),
        projectNumber: zod.number().int().min(1).optional(),
        repository: zod.string().optional(),
        trackingIssueNumber: zod.number().int().min(1).optional(),
      })
      .optional(),
    name: zod.string().optional(),
    version: zod.string().optional(),
    assignee: zod.string().optional(),
    addition: zod
      .object({
        project_overview: zod.string().optional(), // プロジェクト概要・目的
        tech_stack: zod.array(zod.string()).optional(), // 主要技術スタック
        coding_guidelines: zod.string().optional(), // コーディング規約・注意点
        deployment_notes: zod.string().optional(), // デプロイ・環境に関する注意事項
        design_images: zod.array(projectImageZodSchema).optional(), // プロジェクト内の画面設計画像
        // 軽量ビジネス要件フォーマット
        business_purpose: zod.string().optional(), // 目的: なぜこの機能が必要か（1行）
        target_users: zod.string().optional(), // 対象ユーザー: 誰が使うか + 規模感
        usage_frequency: zod.string().optional(), // 使用頻度: どのくらい使われるか
        current_problem: zod.string().optional(), // 現在の問題: 何を解決したいか（あれば）
      })
      .optional(),
  })
  .strict();

const fieldZodSchema = zod.enum([
  'front',
  'back',
  'infra',
  'other',
  'parent',
  '',
]);

export const taskZodSchema = zod
  .object({
    depends: dependsSchema,
    description: zod.string().min(0, '説明は空文字でも構いません'),
    difficulty: zod.number().min(0).default(0), // 表示・保存用（1.2倍された値）
    name: taskNameSchema,
    notes: zod.array(zod.string()).default([]),
    issueNumber: zod.number().int().min(1).optional(),
    addition: zod
      .object({
        baseDifficulty: zod.number().min(0).default(0), // 入力・編集用（元の値）
        category: zod.string().default(''),
        field: fieldZodSchema.optional(),
        layout: zod
          .object({
            x: zod.number(),
            y: zod.number(),
          })
          .optional(),
        // 実装支援用の新規フィールド
        implementation_notes: zod.array(zod.string()).optional(), // 実装時の注意点・参考情報
        api_schemas: zod.array(zod.string()).optional(), // API仕様・エンドポイント情報
        requirements: zod.array(zod.string()).optional(), // 受け入れ基準（必須）
        design_images: zod.array(zod.string()).optional(), // 関連する画面設計画像のID
      })
      .optional(),
  })
  .strict();

// 循環依存の検出
export const detectCycles = (tasks: Task[]): string[][] => {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // タスク名からタスクオブジェクトを引くためのマップ
  const taskMap = new Map<string, Task>();
  tasks.forEach((task) => taskMap.set(task.name, task));

  const dfs = (taskName: string, path: string[]): void => {
    visited.add(taskName);
    recursionStack.add(taskName);
    path.push(taskName);

    const task = taskMap.get(taskName);
    if (task) {
      for (const dep of task.depends) {
        if (!dep) continue;

        if (recursionStack.has(dep)) {
          // 循環を発見
          const cycleStart = path.indexOf(dep);
          cycles.push([...path.slice(cycleStart), dep]);
        } else if (!visited.has(dep)) {
          dfs(dep, [...path]);
        }
      }
    }

    recursionStack.delete(taskName);
  };

  // 全タスクをチェック
  tasks.forEach((task) => {
    if (!visited.has(task.name)) {
      dfs(task.name, []);
    }
  });

  return cycles;
};

// タスクグラフの検証（循環依存チェック付き）
export const validateTaskgraph = (data: unknown) => {
  const result = taskgraphZodSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      cycles: [],
    };
  }

  const cycles = detectCycles(result.data.tasks);

  return {
    success: true,
    data: result.data,
    cycles,
    hasCycles: cycles.length > 0,
  };
};

export const taskgraphZodSchema = zod
  .object({
    info: infoZodSchema,
    tasks: zod.array(taskZodSchema),
  })
  .strict()
  .refine(
    (data) => {
      const taskNames = data.tasks.map((task) => task.name);
      return new Set(taskNames).size === taskNames.length;
    },
    {
      message:
        'タスク名に重複があります。すべてのタスク名は一意である必要があります。',
      path: ['tasks'],
    },
  );

export type ProjectImage = zod.infer<typeof projectImageZodSchema>;
export type DesignImage = zod.infer<typeof designImageZodSchema>;
export type Task = zod.infer<typeof taskZodSchema>;
export type Taskgraph = zod.infer<typeof taskgraphZodSchema>;
export type Field = zod.infer<typeof fieldZodSchema>;
