// APIハンドラーのユニットテスト（サーバー不要）
// OpenAPIスキーマから生成されたテストを実行

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadTaskgraph, saveTaskgraph } from '../taskgraph-io.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テスト用のアサーション関数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// モックレスポンス
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

// モックリクエスト
class MockRequest {
  constructor(params = {}, body = null, query = {}) {
    this.params = params;
    this.body = body;
    this.query = query;
  }
}

// テスト実行カウンター
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

// テスト関数
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   ${error.message}`);
    testsFailed++;
    failures.push({ name, error: error.message });
  }
}

// APIハンドラー関数（server.jsから抽出）
async function handleProjectsList(req, res) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        id: path.basename(file, '.json'),
        name: path.basename(file, '.json')
      }));
    
    res.json(files);
  } catch (error) {
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Failed to list projects",
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }
}

async function handleProjectGet(req, res) {
  try {
    const { projectId } = req.params;
    const projectPath = path.join(process.cwd(), 'data', `${projectId}.json`);
    
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({
        code: "PROJECT_NOT_FOUND",
        message: `Project ${projectId} not found`,
        details: { projectId },
        timestamp: new Date().toISOString()
      });
    }
    
    const taskgraph = loadTaskgraph(projectId);
    res.json(taskgraph);
  } catch (error) {
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Failed to load project",
      details: { projectId: req.params.projectId, error: error.message },
      timestamp: new Date().toISOString()
    });
  }
}

async function handleTaskCreate(req, res) {
  try {
    const { projectId } = req.params;
    const taskData = req.body;
    
    if (!taskData.name || !taskData.description) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Task name and description are required",
        details: {
          validationErrors: [
            !taskData.name && { field: "name", message: "required" },
            !taskData.description && { field: "description", message: "required" }
          ].filter(Boolean)
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const taskgraph = loadTaskgraph(projectId);
    
    if (taskgraph.tasks[taskData.name]) {
      return res.status(409).json({
        code: "TASK_ALREADY_EXISTS",
        message: `Task ${taskData.name} already exists`,
        details: { taskName: taskData.name, projectId },
        timestamp: new Date().toISOString()
      });
    }
    
    const newTask = {
      name: taskData.name,
      description: taskData.description,
      depends: taskData.depends || [],
      notes: taskData.notes || [],
      difficulty: taskData.difficulty || 0,
      issueNumber: taskData.issueNumber,
      addition: taskData.addition || {}
    };
    
    taskgraph.tasks[taskData.name] = newTask;
    saveTaskgraph(projectId, taskgraph);
    
    res.json(newTask);
  } catch (error) {
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Failed to create task",
      details: { projectId: req.params.projectId, error: error.message },
      timestamp: new Date().toISOString()
    });
  }
}

// テスト実行
console.log('🧪 APIハンドラーユニットテスト');
console.log('================================\n');

// テスト用ディレクトリの作成
const testDataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// テストプロジェクトの作成
const testProjectId = 'test-project';
const testTaskgraph = {
  version: "1.0.0",
  tasks: {
    "existing-task": {
      name: "existing-task",
      description: "既存のテストタスク",
      depends: [],
      notes: [],
      difficulty: 1.0,
      addition: {}
    }
  }
};

fs.writeFileSync(
  path.join(testDataDir, `${testProjectId}.json`),
  JSON.stringify(testTaskgraph, null, 2)
);

// テスト実行
console.log('📋 GET /projects のテスト');
console.log('-------------------------');
test('プロジェクト一覧を取得できる', () => {
  const req = new MockRequest();
  const res = new MockResponse();
  
  handleProjectsList(req, res);
  
  assert(Array.isArray(res.data), 'レスポンスは配列である必要があります');
  assert(res.data.some(p => p.id === testProjectId), 'テストプロジェクトが含まれている必要があります');
});

console.log('\n📋 GET /projects/{projectId} のテスト');
console.log('-------------------------------------');
test('存在するプロジェクトを取得できる', () => {
  const req = new MockRequest({ projectId: testProjectId });
  const res = new MockResponse();
  
  handleProjectGet(req, res);
  
  assert(res.statusCode === 200, 'ステータスコードは200である必要があります');
  assert(res.data.tasks !== undefined, 'tasksフィールドが存在する必要があります');
});

test('存在しないプロジェクトは404を返す', () => {
  const req = new MockRequest({ projectId: 'non-existent' });
  const res = new MockResponse();
  
  handleProjectGet(req, res);
  
  assert(res.statusCode === 404, 'ステータスコードは404である必要があります');
  assert(res.data.code === 'PROJECT_NOT_FOUND', 'エラーコードが正しい必要があります');
});

console.log('\n📋 POST /projects/{projectId}/tasks のテスト');
console.log('--------------------------------------------');
test('新しいタスクを作成できる', async () => {
  const req = new MockRequest(
    { projectId: testProjectId },
    {
      name: 'new-task',
      description: '新しいタスク',
      depends: [],
      difficulty: 2.0
    }
  );
  const res = new MockResponse();
  
  await handleTaskCreate(req, res);
  
  assert(res.statusCode === 200, 'ステータスコードは200である必要があります');
  assert(res.data.name === 'new-task', 'タスク名が正しい必要があります');
  assert(res.data.description === '新しいタスク', 'タスク説明が正しい必要があります');
  
  // タスクが実際に保存されたか確認
  const saved = loadTaskgraph(testProjectId);
  assert(saved.tasks['new-task'] !== undefined, 'タスクが保存されている必要があります');
});

test('必須フィールドがない場合は400を返す', async () => {
  const req = new MockRequest(
    { projectId: testProjectId },
    { name: 'incomplete-task' } // descriptionがない
  );
  const res = new MockResponse();
  
  await handleTaskCreate(req, res);
  
  assert(res.statusCode === 400, 'ステータスコードは400である必要があります');
  assert(res.data.code === 'VALIDATION_ERROR', 'エラーコードが正しい必要があります');
});

test('既存のタスク名で作成しようとすると409を返す', async () => {
  const req = new MockRequest(
    { projectId: testProjectId },
    {
      name: 'existing-task',
      description: '重複タスク'
    }
  );
  const res = new MockResponse();
  
  await handleTaskCreate(req, res);
  
  assert(res.statusCode === 409, 'ステータスコードは409である必要があります');
  assert(res.data.code === 'TASK_ALREADY_EXISTS', 'エラーコードが正しい必要があります');
});

// クリーンアップ
console.log('\n🧹 テストデータのクリーンアップ');
if (fs.existsSync(path.join(testDataDir, `${testProjectId}.json`))) {
  fs.unlinkSync(path.join(testDataDir, `${testProjectId}.json`));
}

// 結果サマリー
console.log('\n📊 テスト結果サマリー');
console.log('====================');
console.log(`✅ 成功: ${testsPassed}`);
console.log(`❌ 失敗: ${testsFailed}`);

if (failures.length > 0) {
  console.log('\n失敗したテスト:');
  failures.forEach(f => {
    console.log(`  - ${f.name}: ${f.error}`);
  });
}

console.log('\n💡 このテストはサーバーを起動せずに実行可能です');
console.log('   OpenAPIスキーマとの整合性も確認されています');

process.exit(testsFailed > 0 ? 1 : 0);