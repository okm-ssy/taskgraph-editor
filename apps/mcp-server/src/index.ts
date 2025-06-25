#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TaskgraphStorage } from './storage.js';
import { Task, TaskSchema } from './types.js';

// ストレージインスタンス
const storage = new TaskgraphStorage();

// MCPサーバーの作成
const server = new Server(
  {
    name: 'taskgraph-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール入力スキーマの定義
const CreateTaskSchema = z.object({
  task: TaskSchema.omit({ name: true }).extend({
    name: z.string(),
  }),
});

const UpdateTaskSchema = z.object({
  name: z.string(),
  task: TaskSchema.partial(),
});

const GetTaskSchema = z.object({
  name: z.string(),
});

const DeleteTaskSchema = z.object({
  name: z.string(),
});

// ツール一覧の定義
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'taskgraph_list_tasks',
      description: 'List all tasks in the taskgraph',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'taskgraph_get_task',
      description: 'Get a specific task by name',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name' },
        },
        required: ['name'],
      },
    },
    {
      name: 'taskgraph_create_task',
      description: 'Create a new task',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique task name' },
              description: { type: 'string' },
              difficulty: { type: 'number' },
              baseDifficulty: { type: 'number' },
              depends: { type: 'array', items: { type: 'string' } },
              notes: { type: 'array', items: { type: 'string' } },
              relations: { type: 'array', items: { type: 'string' } },
              issueNumber: { type: 'number' },
              category: { type: 'string' },
            },
            required: ['name', 'description'],
          },
        },
        required: ['task'],
      },
    },
    {
      name: 'taskgraph_update_task',
      description: 'Update an existing task',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name to update' },
          task: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              difficulty: { type: 'number' },
              baseDifficulty: { type: 'number' },
              depends: { type: 'array', items: { type: 'string' } },
              notes: { type: 'array', items: { type: 'string' } },
              relations: { type: 'array', items: { type: 'string' } },
              issueNumber: { type: 'number' },
              category: { type: 'string' },
            },
          },
        },
        required: ['name', 'task'],
      },
    },
    {
      name: 'taskgraph_delete_task',
      description: 'Delete a task',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name to delete' },
        },
        required: ['name'],
      },
    },
  ],
}));

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'taskgraph_list_tasks': {
        const taskgraph = await storage.readTaskgraph();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(taskgraph, null, 2),
            },
          ],
        };
      }

      case 'taskgraph_get_task': {
        const { name: taskName } = GetTaskSchema.parse(args);
        const taskgraph = await storage.readTaskgraph();
        const task = taskgraph?.tasks.find(t => t.name === taskName);

        if (!task) {
          throw new Error(`Task "${taskName}" not found`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case 'taskgraph_create_task': {
        const { task: newTask } = CreateTaskSchema.parse(args);

        const taskgraph = await storage.updateTaskgraph((current) => {
          // 重複チェック
          if (current.tasks.some(t => t.name === newTask.name)) {
            throw new Error(`Task "${newTask.name}" already exists`);
          }

          // デフォルト値の設定
          const taskWithDefaults: Task = {
            ...newTask,
            description: newTask.description || '',
            difficulty: newTask.difficulty ?? 0,
            baseDifficulty: newTask.baseDifficulty ?? 0,
            depends: newTask.depends || [],
            notes: newTask.notes || [],
            relations: newTask.relations || [],
            category: newTask.category || '',
          };

          return {
            ...current,
            tasks: [...current.tasks, taskWithDefaults],
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: `Task "${newTask.name}" created successfully`,
            },
          ],
        };
      }

      case 'taskgraph_update_task': {
        const { name: taskName, task: updates } = UpdateTaskSchema.parse(args);

        const taskgraph = await storage.updateTaskgraph((current) => {
          const taskIndex = current.tasks.findIndex(t => t.name === taskName);

          if (taskIndex === -1) {
            throw new Error(`Task "${taskName}" not found`);
          }

          // タスク名を変更する場合の重複チェック
          if (updates.name && updates.name !== taskName) {
            if (current.tasks.some(t => t.name === updates.name)) {
              throw new Error(`Task "${updates.name}" already exists`);
            }
          }

          const updatedTasks = [...current.tasks];
          updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            ...updates,
          };

          // 依存関係の更新（タスク名が変更された場合）
          if (updates.name && updates.name !== taskName) {
            updatedTasks.forEach(task => {
              task.depends = task.depends.map(dep =>
                dep === taskName ? updates.name! : dep
              );
            });
          }

          return {
            ...current,
            tasks: updatedTasks,
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: `Task "${taskName}" updated successfully`,
            },
          ],
        };
      }

      case 'taskgraph_delete_task': {
        const { name: taskName } = DeleteTaskSchema.parse(args);

        const taskgraph = await storage.updateTaskgraph((current) => {
          const taskIndex = current.tasks.findIndex(t => t.name === taskName);

          if (taskIndex === -1) {
            throw new Error(`Task "${taskName}" not found`);
          }

          // 依存関係からも削除
          const updatedTasks = current.tasks
            .filter(t => t.name !== taskName)
            .map(task => ({
              ...task,
              depends: task.depends.filter(dep => dep !== taskName),
            }));

          return {
            ...current,
            tasks: updatedTasks,
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: `Task "${taskName}" deleted successfully`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Taskgraph MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
