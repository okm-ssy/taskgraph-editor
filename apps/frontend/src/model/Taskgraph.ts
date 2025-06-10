import * as zod from 'zod';

// タスク名のバリデーション: 空文字列を禁止し、英数字とハイフン、アンダースコアのみ許可
const taskNameSchema = zod
  .string()
  .min(1, 'タスク名は必須です')
  .regex(
    /^[a-zA-Z0-9-_]+$/,
    'タスク名は英数字、ハイフン、アンダースコアのみ使用できます',
  );

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
  })
  .strict();

export const taskZodSchema = zod
  .object({
    depends: dependsSchema,
    description: zod.string().min(0, '説明は空文字でも構いません'),
    difficulty: zod.number().int().min(1).max(5).default(1),
    name: taskNameSchema,
    notes: zod.array(zod.string()).default([]),
    issueNumber: zod.number().int().min(1).optional(),
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
  .strict();

export type Task = zod.infer<typeof taskZodSchema>;
export type Taskgraph = zod.infer<typeof taskgraphZodSchema>;
