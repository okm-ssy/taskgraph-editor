#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskgraphStorage } from './storage.js';
import { Task, TaskSchema, TaskInputSchema, TaskgraphSchema } from './types.js';

// ストレージインスタンス
const storage = new TaskgraphStorage();

// TSVファイルからカテゴリデータを読み込む関数
async function loadCategoriesFromTSV(): Promise<Array<{ category: string; baseDifficulty: number; field: string }>> {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const tsvPath = path.join(__dirname, '..', '..', '..', 'apps', 'frontend', 'public', 'task-categories.tsv');
    const tsvContent = await fs.readFile(tsvPath, 'utf-8');
    
    const lines = tsvContent.split('\n').filter(line => line.trim());
    const categories = lines.map(line => {
      const [category, baseDifficulty, field] = line.split('\t');
      return {
        category: category.trim(),
        baseDifficulty: parseFloat(baseDifficulty) || 0,
        field: field ? field.trim() : ''
      };
    });
    
    return categories;
  } catch (error) {
    console.error('Failed to load categories from TSV:', error);
    return [];
  }
}

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
      return `${message}. Available: taskgraph_list_projects, taskgraph_get_taskgraph, taskgraph_get_task, taskgraph_create_task, taskgraph_update_task, taskgraph_delete_task, taskgraph_update_notes, taskgraph_update_implementation_notes, taskgraph_update_api_schemas, taskgraph_update_requirements, taskgraph_get_schema, taskgraph_get_categories`;
    }
    
    return `Error: ${message}`;
  }
  
  return 'Unknown error';
}

// タスクスキーマの説明を取得する関数
function getTaskSchemaHelp(): string {
  return `Task schema:
Required: name (string), description (string)
Optional: difficulty (number=0), baseDifficulty (number=0), depends (string[]), notes (string[]), issueNumber (number), category (string=""), implementation_notes (string[]), api_schemas (string[]), requirements (string[]), design_images (string[])

Field descriptions:
- implementation_notes: Implementation guidelines, library requirements, performance constraints, security considerations
- api_schemas: API specifications, OpenAPI definitions, endpoint references
- requirements: Requirements and test cases that must be satisfied
- design_images: IDs of related UI design images

Example: {"name": "task-1", "description": "My task", "difficulty": 2.5, "depends": ["task-0"], "addition": {"implementation_notes": ["Use React hooks", "Performance: < 100ms"], "api_schemas": ["GET /api/users/{id}"], "requirements": ["Feature works as expected", "Tests pass"]}}`;
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

const GetCategoriesSchema = z.object({});

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

// 個別フィールド更新用のスキーマ
const UpdateNotesSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  notes: z.array(z.string()),
});

const UpdateImplementationNotesSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  implementation_notes: z.array(z.string()),
});

const UpdateApiSchemasSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  api_schemas: z.array(z.string()),
});

const UpdateRequirementsSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  requirements: z.array(z.string()),
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
                  category: { type: 'string', description: 'Category (optional, default: "")' },
                  field: { type: 'string', enum: ['front', 'back', 'infra', 'other', 'parent', ''], description: 'Field (optional)' },
                  implementation_notes: { type: 'array', items: { type: 'string' }, description: 'Implementation guidelines and technical constraints (optional)' },
                  api_schemas: { type: 'array', items: { type: 'string' }, description: 'API specifications and endpoints (optional)' },
                  requirements: { type: 'array', items: { type: 'string' }, description: 'Requirements and test cases (optional)' },
                  design_images: { type: 'array', items: { type: 'string' }, description: 'Design image IDs (optional)' },
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
                  category: { type: 'string', description: 'New category (optional)' },
                  field: { type: 'string', enum: ['front', 'back', 'infra', 'other', 'parent', ''], description: 'New field (optional)' },
                  implementation_notes: { type: 'array', items: { type: 'string' }, description: 'New implementation guidelines and technical constraints (optional)' },
                  api_schemas: { type: 'array', items: { type: 'string' }, description: 'New API specifications and endpoints (optional)' },
                  requirements: { type: 'array', items: { type: 'string' }, description: 'New requirements and test cases (optional)' },
                  design_images: { type: 'array', items: { type: 'string' }, description: 'New design image IDs (optional)' },
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
      name: 'taskgraph_update_notes',
      description: 'Update task notes',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name' },
          notes: { type: 'array', items: { type: 'string' }, description: 'New notes array' },
        },
        required: ['projectId', 'name', 'notes'],
      },
    },
    {
      name: 'taskgraph_update_implementation_notes',
      description: 'Update task implementation notes',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name' },
          implementation_notes: { type: 'array', items: { type: 'string' }, description: 'New implementation notes array' },
        },
        required: ['projectId', 'name', 'implementation_notes'],
      },
    },
    {
      name: 'taskgraph_update_api_schemas',
      description: 'Update task API schemas (API specifications)',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name' },
          api_schemas: { type: 'array', items: { type: 'string' }, description: 'New API schemas array' },
        },
        required: ['projectId', 'name', 'api_schemas'],
      },
    },
    {
      name: 'taskgraph_update_requirements',
      description: 'Update task requirements',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Task name' },
          requirements: { type: 'array', items: { type: 'string' }, description: 'New requirements array' },
        },
        required: ['projectId', 'name', 'requirements'],
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
    {
      name: 'taskgraph_get_categories',
      description: 'Get all available task categories from TSV master data',
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
            category: inputTask.addition?.category ?? '',
            field: inputTask.addition?.field ?? '',
            implementation_notes: inputTask.addition?.implementation_notes ?? [],
            api_schemas: inputTask.addition?.api_schemas ?? [],
            requirements: inputTask.addition?.requirements ?? [],
            design_images: inputTask.addition?.design_images ?? [],
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

      case 'taskgraph_update_notes': {
        const { projectId, name: taskName, notes } = UpdateNotesSchema.parse(args);
        await storage.updateTask(projectId, taskName, { notes });
        return {
          content: [
            {
              type: 'text',
              text: `Notes updated for task "${taskName}" in project "${projectId}"`,
            },
          ],
        };
      }

      case 'taskgraph_update_implementation_notes': {
        const { projectId, name: taskName, implementation_notes } = UpdateImplementationNotesSchema.parse(args);
        await storage.updateTask(projectId, taskName, { 
          addition: { implementation_notes } 
        });
        return {
          content: [
            {
              type: 'text',
              text: `Implementation notes updated for task "${taskName}" in project "${projectId}"`,
            },
          ],
        };
      }

      case 'taskgraph_update_api_schemas': {
        const { projectId, name: taskName, api_schemas } = UpdateApiSchemasSchema.parse(args);
        await storage.updateTask(projectId, taskName, { 
          addition: { api_schemas } 
        });
        return {
          content: [
            {
              type: 'text',
              text: `API schemas updated for task "${taskName}" in project "${projectId}"`,
            },
          ],
        };
      }

      case 'taskgraph_update_requirements': {
        const { projectId, name: taskName, requirements } = UpdateRequirementsSchema.parse(args);
        await storage.updateTask(projectId, taskName, { 
          addition: { requirements } 
        });
        return {
          content: [
            {
              type: 'text',
              text: `Requirements updated for task "${taskName}" in project "${projectId}"`,
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

      case 'taskgraph_get_categories': {
        GetCategoriesSchema.parse(args);
        
        // TSVファイルからカテゴリデータを読み込む
        const categoriesData = await loadCategoriesFromTSV();
        
        // フィールドごとにグループ化
        const categoriesByField: Record<string, Array<{ category: string; baseDifficulty: number }>> = {};
        
        for (const item of categoriesData) {
          const field = item.field || 'その他';
          if (!categoriesByField[field]) {
            categoriesByField[field] = [];
          }
          categoriesByField[field].push({
            category: item.category,
            baseDifficulty: item.baseDifficulty
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                totalCount: categoriesData.length,
                categoriesByField,
                allCategories: categoriesData.map(c => c.category)
              }, null, 2),
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
