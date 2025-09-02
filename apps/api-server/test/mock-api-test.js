#!/usr/bin/env node
// モックサーバーを使用したAPIテスト（サーバー起動不要）

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// カラー出力用のヘルパー
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`
};

// OpenAPIスキーマの読み込み
async function loadOpenAPISchema() {
  const schemaPath = path.join(__dirname, '../generated/@typespec/openapi3/openapi.json');
  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

// モックレスポンスクラス
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.data = null;
    this.headers = {};
  }
  
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  json(data) {
    this.data = data;
    this.headers['content-type'] = 'application/json';
    return this;
  }
  
  send(data) {
    this.data = data;
    return this;
  }
  
  set(key, value) {
    this.headers[key] = value;
    return this;
  }
}

// モックリクエストクラス
class MockRequest {
  constructor(method, path, body = null, params = {}, query = {}) {
    this.method = method;
    this.path = path;
    this.body = body;
    this.params = params;
    this.query = query;
    this.headers = {
      'content-type': 'application/json'
    };
  }
}

// テスト用のモックデータ生成
function generateMockData(schema, definitions) {
  if (!schema) return null;
  
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return generateMockData(definitions[refName], definitions);
  }
  
  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date-time') return new Date().toISOString();
      return 'test-string';
    
    case 'number':
    case 'integer':
      return schema.minimum || 1;
    
    case 'boolean':
      return true;
    
    case 'array':
      return [generateMockData(schema.items, definitions)];
    
    case 'object':
      const obj = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (schema.required?.includes(key) || !schema.required) {
            obj[key] = generateMockData(propSchema, definitions);
          }
        }
      }
      return obj;
    
    default:
      return null;
  }
}

// モックAPIハンドラー
class MockAPIHandler {
  constructor(openAPISchema) {
    this.schema = openAPISchema;
    this.taskgraphs = new Map();
    
    // テスト用のサンプルプロジェクトを初期化
    this.taskgraphs.set('test-project', {
      version: '1.0.0',
      tasks: {
        'task1': {
          name: 'task1',
          description: 'Test task 1',
          depends: [],
          notes: ['Note 1'],
          difficulty: 1,
          issueNumber: 101,
          addition: {
            field: 'front',
            category: 'feature',
            baseDifficulty: 1,
            requirements: ['Requirement 1'],
            implementation_notes: ['Implementation note 1'],
            design_images: [],
            api_schemas: []
          }
        }
      }
    });
  }
  
  async handleRequest(req, res) {
    const { method, path } = req;
    
    // ルートマッチング
    if (method === 'GET' && path === '/projects') {
      return this.listProjects(req, res);
    }
    
    if (method === 'GET' && path.match(/^\/projects\/[^\/]+$/)) {
      const projectId = path.split('/')[2];
      req.params.projectId = projectId;
      return this.getProjectTaskgraph(req, res);
    }
    
    if (method === 'POST' && path.match(/^\/projects\/[^\/]+\/tasks$/)) {
      const projectId = path.split('/')[2];
      req.params.projectId = projectId;
      return this.createTask(req, res);
    }
    
    if (method === 'GET' && path.match(/^\/projects\/[^\/]+\/tasks\/[^\/]+$/)) {
      const parts = path.split('/');
      req.params.projectId = parts[2];
      req.params.taskName = parts[4];
      return this.getTask(req, res);
    }
    
    if (method === 'PUT' && path.match(/^\/projects\/[^\/]+\/tasks\/[^\/]+$/)) {
      const parts = path.split('/');
      req.params.projectId = parts[2];
      req.params.taskName = parts[4];
      return this.updateTask(req, res);
    }
    
    if (method === 'DELETE' && path.match(/^\/projects\/[^\/]+\/tasks\/[^\/]+$/)) {
      const parts = path.split('/');
      req.params.projectId = parts[2];
      req.params.taskName = parts[4];
      return this.deleteTask(req, res);
    }
    
    if (method === 'PATCH' && path.match(/^\/projects\/[^\/]+\/tasks\/[^\/]+\/notes$/)) {
      const parts = path.split('/');
      req.params.projectId = parts[2];
      req.params.taskName = parts[4];
      return this.updateTaskNotes(req, res);
    }
    
    if (method === 'PATCH' && path.match(/^\/projects\/[^\/]+\/tasks\/[^\/]+\/implementation$/)) {
      const parts = path.split('/');
      req.params.projectId = parts[2];
      req.params.taskName = parts[4];
      return this.updateTaskImplementation(req, res);
    }
    
    if (method === 'PATCH' && path.match(/^\/projects\/[^\/]+\/tasks\/[^\/]+\/requirements$/)) {
      const parts = path.split('/');
      req.params.projectId = parts[2];
      req.params.taskName = parts[4];
      return this.updateTaskRequirements(req, res);
    }
    
    // 404 Not Found
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Endpoint ${method} ${path} not found`,
      timestamp: new Date().toISOString(),
      requestId: `req-${Date.now()}`
    });
  }
  
  listProjects(req, res) {
    const projects = [
      { id: 'test-project', name: 'Test Project' },
      { id: 'sample-project', name: 'Sample Project' }
    ];
    res.json(projects);
  }
  
  getProjectTaskgraph(req, res) {
    const { projectId } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    res.json(taskgraph);
  }
  
  createTask(req, res) {
    const { projectId } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    const newTask = {
      ...req.body,
      notes: req.body.notes || [],
      addition: req.body.addition || {}
    };
    
    // 重複チェック
    if (taskgraph.tasks[newTask.name]) {
      res.status(409).json({
        code: 'TASK_ALREADY_EXISTS',
        message: `Task ${newTask.name} already exists`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    taskgraph.tasks[newTask.name] = newTask;
    res.json(newTask);
  }
  
  getTask(req, res) {
    const { projectId, taskName } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    const task = taskgraph.tasks[taskName];
    
    if (!task) {
      res.status(404).json({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskName} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    res.json(task);
  }
  
  updateTask(req, res) {
    const { projectId, taskName } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    const task = taskgraph.tasks[taskName];
    
    if (!task) {
      res.status(404).json({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskName} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    taskgraph.tasks[taskName] = {
      ...task,
      ...req.body
    };
    
    res.json(taskgraph.tasks[taskName]);
  }
  
  deleteTask(req, res) {
    const { projectId, taskName } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    if (!taskgraph.tasks[taskName]) {
      res.status(404).json({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskName} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    delete taskgraph.tasks[taskName];
    res.status(204).send();
  }
  
  updateTaskNotes(req, res) {
    const { projectId, taskName } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    const task = taskgraph.tasks[taskName];
    
    if (!task) {
      res.status(404).json({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskName} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    task.notes = req.body.notes || [];
    res.json(task);
  }
  
  updateTaskImplementation(req, res) {
    const { projectId, taskName } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    const task = taskgraph.tasks[taskName];
    
    if (!task) {
      res.status(404).json({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskName} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    if (!task.addition) task.addition = {};
    task.addition.implementation_notes = req.body.implementation_notes || [];
    res.json(task);
  }
  
  updateTaskRequirements(req, res) {
    const { projectId, taskName } = req.params;
    const taskgraph = this.taskgraphs.get(projectId);
    
    if (!taskgraph) {
      res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    const task = taskgraph.tasks[taskName];
    
    if (!task) {
      res.status(404).json({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskName} not found`,
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`
      });
      return;
    }
    
    if (!task.addition) task.addition = {};
    task.addition.requirements = req.body.requirements || [];
    res.json(task);
  }
}

// テストランナー
async function runTests() {
  console.log(colors.cyan('\n=== Mock API Tests ===\n'));
  
  const schema = await loadOpenAPISchema();
  const handler = new MockAPIHandler(schema);
  const definitions = schema.components?.schemas || {};
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const testResults = [];
  
  // テストケース定義
  const testCases = [
    {
      name: 'GET /projects - List all projects',
      request: new MockRequest('GET', '/projects'),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(Array.isArray(data), 'Response should be an array');
        assert(data.length > 0, 'Should have at least one project');
        assert(data[0].id, 'Project should have an id');
        assert(data[0].name, 'Project should have a name');
      }
    },
    
    {
      name: 'GET /projects/{projectId} - Get existing project',
      request: new MockRequest('GET', '/projects/test-project'),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(data.version, 'Response should have version');
        assert(data.tasks, 'Response should have tasks');
        assert(typeof data.tasks === 'object', 'Tasks should be an object');
      }
    },
    
    {
      name: 'GET /projects/{projectId} - Get non-existent project',
      request: new MockRequest('GET', '/projects/non-existent'),
      expectedStatus: 404,
      validateResponse: (data) => {
        assert(data.code, 'Error should have a code');
        assert(data.message, 'Error should have a message');
        assert(data.timestamp, 'Error should have a timestamp');
        assert(data.requestId, 'Error should have a requestId');
      }
    },
    
    {
      name: 'POST /projects/{projectId}/tasks - Create new task',
      request: new MockRequest('POST', '/projects/test-project/tasks', {
        name: 'new-task',
        description: 'New task description',
        depends: ['task1'],
        difficulty: 2,
        issueNumber: 102
      }),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(data.name === 'new-task', 'Task name should match');
        assert(data.description === 'New task description', 'Description should match');
      }
    },
    
    {
      name: 'POST /projects/{projectId}/tasks - Create duplicate task',
      request: new MockRequest('POST', '/projects/test-project/tasks', {
        name: 'task1',
        description: 'Duplicate task'
      }),
      expectedStatus: 409,
      validateResponse: (data) => {
        assert(data.code === 'TASK_ALREADY_EXISTS', 'Should return conflict error');
      }
    },
    
    {
      name: 'GET /projects/{projectId}/tasks/{taskName} - Get existing task',
      request: new MockRequest('GET', '/projects/test-project/tasks/task1'),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(data.name === 'task1', 'Task name should match');
        assert(data.description, 'Task should have description');
      }
    },
    
    {
      name: 'GET /projects/{projectId}/tasks/{taskName} - Get non-existent task',
      request: new MockRequest('GET', '/projects/test-project/tasks/non-existent'),
      expectedStatus: 404,
      validateResponse: (data) => {
        assert(data.code === 'TASK_NOT_FOUND', 'Should return not found error');
      }
    },
    
    {
      name: 'PUT /projects/{projectId}/tasks/{taskName} - Update task',
      request: new MockRequest('PUT', '/projects/test-project/tasks/task1', {
        name: 'task1',
        description: 'Updated description',
        difficulty: 3
      }),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(data.description === 'Updated description', 'Description should be updated');
        assert(data.difficulty === 3, 'Difficulty should be updated');
      }
    },
    
    {
      name: 'DELETE /projects/{projectId}/tasks/{taskName} - Delete task',
      request: new MockRequest('DELETE', '/projects/test-project/tasks/new-task'),
      expectedStatus: 204,
      validateResponse: () => {
        // No response body for 204
      }
    },
    
    {
      name: 'PATCH /projects/{projectId}/tasks/{taskName}/notes - Update notes',
      request: new MockRequest('PATCH', '/projects/test-project/tasks/task1/notes', {
        notes: ['Updated note 1', 'Updated note 2']
      }),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(Array.isArray(data.notes), 'Notes should be an array');
        assert(data.notes.length === 2, 'Should have 2 notes');
        assert(data.notes[0] === 'Updated note 1', 'First note should match');
      }
    },
    
    {
      name: 'PATCH /projects/{projectId}/tasks/{taskName}/implementation - Update implementation',
      request: new MockRequest('PATCH', '/projects/test-project/tasks/task1/implementation', {
        implementation_notes: ['Implementation step 1', 'Implementation step 2']
      }),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(data.addition, 'Should have addition field');
        assert(Array.isArray(data.addition.implementation_notes), 'Implementation notes should be an array');
        assert(data.addition.implementation_notes.length === 2, 'Should have 2 implementation notes');
      }
    },
    
    {
      name: 'PATCH /projects/{projectId}/tasks/{taskName}/requirements - Update requirements',
      request: new MockRequest('PATCH', '/projects/test-project/tasks/task1/requirements', {
        requirements: ['Requirement A', 'Requirement B', 'Requirement C']
      }),
      expectedStatus: 200,
      validateResponse: (data) => {
        assert(data.addition, 'Should have addition field');
        assert(Array.isArray(data.addition.requirements), 'Requirements should be an array');
        assert(data.addition.requirements.length === 3, 'Should have 3 requirements');
      }
    },
    
    {
      name: 'GET /invalid/endpoint - Test 404 for invalid endpoint',
      request: new MockRequest('GET', '/invalid/endpoint'),
      expectedStatus: 404,
      validateResponse: (data) => {
        assert(data.code === 'NOT_FOUND', 'Should return not found error');
      }
    }
  ];
  
  // テスト実行
  for (const testCase of testCases) {
    totalTests++;
    const res = new MockResponse();
    
    try {
      await handler.handleRequest(testCase.request, res);
      
      // ステータスコードの検証
      if (res.statusCode !== testCase.expectedStatus) {
        throw new Error(`Expected status ${testCase.expectedStatus}, got ${res.statusCode}`);
      }
      
      // レスポンスの検証
      if (testCase.validateResponse && res.statusCode !== 204) {
        testCase.validateResponse(res.data);
      }
      
      passedTests++;
      testResults.push({
        name: testCase.name,
        status: 'passed',
        message: `Status: ${res.statusCode}`
      });
      
      console.log(`${colors.green('✓')} ${testCase.name}`);
      console.log(colors.dim(`  Status: ${res.statusCode}`));
      
    } catch (error) {
      failedTests++;
      testResults.push({
        name: testCase.name,
        status: 'failed',
        message: error.message
      });
      
      console.log(`${colors.red('✗')} ${testCase.name}`);
      console.log(colors.red(`  Error: ${error.message}`));
    }
  }
  
  // 結果サマリー
  console.log(colors.cyan('\n=== Test Summary ===\n'));
  console.log(`Total: ${totalTests}`);
  console.log(`${colors.green('Passed')}: ${passedTests}`);
  console.log(`${colors.red('Failed')}: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log(colors.red('\n❌ Some tests failed'));
    process.exit(1);
  } else {
    console.log(colors.green('\n✅ All tests passed!'));
    process.exit(0);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error(colors.red('Test execution failed:'), error);
    process.exit(1);
  });
}

export { MockAPIHandler, MockRequest, MockResponse, runTests };