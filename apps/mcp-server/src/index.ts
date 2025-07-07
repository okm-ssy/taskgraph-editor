#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TaskgraphStorage } from './storage.js';
import { Task, TaskSchema, TaskInputSchema, TaskgraphSchema } from './types.js';

// ストレージインスタンス
const storage = new TaskgraphStorage();

// エラーメッセージをシンプルにするヘルパー関数
function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issues = error.issues.map(issue => {
      const path = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
      return `${issue.message}${path}`;
    }).join(', ');
    
    return `Validation error: ${issues}`;
  }
  
  if (error instanceof Error) {
    const message = error.message;
    
    if (message.includes('not found')) {
      return `${message}. Use taskgraph_list_projects or taskgraph_get_taskgraph to check available resources`;
    }
    
    if (message.includes('already exists')) {
      return `${message}. Use taskgraph_update_task to modify it`;
    }
    
    if (message.includes('Unknown tool')) {
      return `${message}. Available: taskgraph_list_projects, taskgraph_get_taskgraph, taskgraph_get_task, taskgraph_create_task, taskgraph_update_task, taskgraph_delete_task`;
    }
    
    return `Error: ${message}`;
  }
  
  return 'Unknown error';
}

// タスクスキーマの説明を取得する関数
function getTaskSchemaHelp(): string {
  return `Task schema:
Required: name (string), description (string)
Optional: difficulty (number=0), baseDifficulty (number=0), depends (string[]), notes (string[]), relations (string[]), issueNumber (number), category (string="")
Example: {"name": "task-1", "description": "My task", "difficulty": 2.5, "depends": ["task-0"]}`;
}

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
const ListProjectsSchema = z.object({});

const GetTaskgraphSchema = z.object({
  projectId: z.string(),
});

const CreateTaskSchema = z.object({
  projectId: z.string(),
  task: TaskInputSchema,
});

const UpdateTaskSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  task: TaskInputSchema.partial(),
});

const GetTaskSchema = z.object({
  projectId: z.string(),
  name: z.string(),
});

const DeleteTaskSchema = z.object({
  projectId: z.string(),
  name: z.string(),
});

// ツール一覧の定義
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'taskgraph_list_projects',
      description: 'List all available projects',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'taskgraph_get_taskgraph',
      description: 'Get taskgraph for a specific project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'taskgraph_get_task',
      description: 'Get a specific task by name from a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name' },
        },
        required: ['projectId', 'name'],
      },
    },
    {
      name: 'taskgraph_create_task',
      description: 'Create a new task in a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          task: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique task name' },
              description: { type: 'string', description: 'Task description' },
              difficulty: { type: 'number', description: 'Task difficulty (optional, default: 0)' },
              depends: { type: 'array', items: { type: 'string' }, description: 'Dependencies (optional, default: [])' },
              notes: { type: 'array', items: { type: 'string' }, description: 'Notes (optional, default: [])' },
              issueNumber: { type: 'number', description: 'Issue number (optional)' },
              addition: {
                type: 'object',
                properties: {
                  baseDifficulty: { type: 'number', description: 'Base difficulty (optional, default: 0)' },
                  relations: { type: 'array', items: { type: 'string' }, description: 'Related files (optional, default: [])' },
                  category: { type: 'string', description: 'Category (optional, default: "")' },
                },
              },
            },
            required: ['name', 'description'],
          },
        },
        required: ['projectId', 'task'],
      },
    },
    {
      name: 'taskgraph_update_task',
      description: 'Update an existing task in a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name to update' },
          task: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'New task name (optional)' },
              description: { type: 'string', description: 'New description (optional)' },
              difficulty: { type: 'number', description: 'New difficulty (optional)' },
              depends: { type: 'array', items: { type: 'string' }, description: 'New dependencies (optional)' },
              notes: { type: 'array', items: { type: 'string' }, description: 'New notes (optional)' },
              issueNumber: { type: 'number', description: 'New issue number (optional)' },
              addition: {
                type: 'object',
                properties: {
                  baseDifficulty: { type: 'number', description: 'New base difficulty (optional)' },
                  relations: { type: 'array', items: { type: 'string' }, description: 'New relations (optional)' },
                  category: { type: 'string', description: 'New category (optional)' },
                },
              },
            },
          },
        },
        required: ['projectId', 'name', 'task'],
      },
    },
    {
      name: 'taskgraph_delete_task',
      description: 'Delete a task from a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name to delete' },
        },
        required: ['projectId', 'name'],
      },
    },
    {
      name: 'taskgraph_get_schema',
      description: 'Get the task schema and usage help',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'taskgraph_list_projects': {
        const projects = await storage.listProjects();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case 'taskgraph_get_taskgraph': {
        const { projectId } = GetTaskgraphSchema.parse(args);
        const taskgraph = await storage.readTaskgraph(projectId);
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
        const { projectId, name: taskName } = GetTaskSchema.parse(args);
        const task = await storage.getTask(projectId, taskName);

        if (!task) {
          throw new Error(`Task "${taskName}" not found in project "${projectId}"`);
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
        const { projectId, task: inputTask } = CreateTaskSchema.parse(args);

        // TaskSchemaを使ってデフォルト値を適用
        const taskWithDefaults = TaskSchema.parse({
          name: inputTask.name,
          description: inputTask.description,
          difficulty: inputTask.difficulty ?? 0,
          depends: inputTask.depends ?? [],
          notes: inputTask.notes ?? [],
          issueNumber: inputTask.issueNumber,
          addition: {
            baseDifficulty: inputTask.addition?.baseDifficulty ?? 0,
            relations: inputTask.addition?.relations ?? [],
            category: inputTask.addition?.category ?? '',
          },
        });

        await storage.createTask(projectId, taskWithDefaults);

        return {
          content: [
            {
              type: 'text',
              text: `Task "${inputTask.name}" created successfully in project "${projectId}"`,
            },
          ],
        };
      }

      case 'taskgraph_update_task': {
        const { projectId, name: taskName, task: updates } = UpdateTaskSchema.parse(args);

        await storage.updateTask(projectId, taskName, updates);

        return {
          content: [
            {
              type: 'text',
              text: `Task "${taskName}" updated successfully in project "${projectId}"`,
            },
          ],
        };
      }

      case 'taskgraph_delete_task': {
        const { projectId, name: taskName } = DeleteTaskSchema.parse(args);

        await storage.deleteTask(projectId, taskName);

        return {
          content: [
            {
              type: 'text',
              text: `Task "${taskName}" deleted successfully from project "${projectId}"`,
            },
          ],
        };
      }

      case 'taskgraph_get_schema': {
        return {
          content: [
            {
              type: 'text',
              text: getTaskSchemaHelp(),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = formatError(error);
    
    // Zodエラーの場合はスキーマヘルプも含める
    const helpMessage = error instanceof z.ZodError 
      ? `\n${getTaskSchemaHelp()}`
      : '';
    
    return {
      content: [
        {
          type: 'text',
          text: `${errorMessage}${helpMessage}`,
        },
      ],
    };
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // デバッグ: 起動時にプロジェクト一覧を確認
  try {
    const projects = await storage.listProjects();
    console.error(`Taskgraph MCP server started - Projects found: ${projects.length}`);
    console.error(`Available projects: ${projects.join(', ')}`);
    
    // 各プロジェクトのタスク数を表示
    for (const projectId of projects) {
      const taskgraph = await storage.readTaskgraph(projectId);
      console.error(`${projectId}: ${taskgraph?.tasks?.length || 0} tasks`);
    }
  } catch (error) {
    console.error('Error loading projects on startup:', error);
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
