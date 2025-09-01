#!/bin/sh

set -e

echo "🔍 全APIエンドポイント自動テスト"
echo "================================"

API_BASE="${API_BASE:-http://localhost:9393/api}"

# Node.jsを探して使用
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif [ -x "/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node" ]; then
  NODE_CMD="/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node"
else
  echo "Error: Node.js is not installed" >&2
  exit 1
fi

# Node.jsスクリプトでテストを実行
$NODE_CMD -e "
const http = require('http');
const fs = require('fs');

// テスト結果を格納
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

// HTTPリクエストを実行
function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL('$API_BASE' + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = responseData ? JSON.parse(responseData) : null;
          resolve({ data: json, status: res.statusCode });
        } catch (e) {
          resolve({ data: responseData, status: res.statusCode });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data && method !== 'GET' && method !== 'DELETE') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// テスト実行とレポート
async function runTest(name, method, path, data, expectedStatus) {
  try {
    const result = await makeRequest(method, path, data);
    const success = expectedStatus.includes(result.status);
    
    if (success) {
      console.log('✅ ' + name);
      testsPassed++;
    } else {
      console.log('❌ ' + name + ' (期待: ' + expectedStatus.join('/') + ', 実際: ' + result.status + ')');
      testsFailed++;
    }
    
    testResults.push({
      name: name,
      method: method,
      path: path,
      status: result.status,
      success: success,
      response: result.data
    });
    
    return result;
  } catch (error) {
    console.log('❌ ' + name + ' - エラー: ' + error.message);
    testsFailed++;
    testResults.push({
      name: name,
      method: method,
      path: path,
      error: error.message,
      success: false
    });
    return null;
  }
}

// テストを実行
async function runTests() {
  console.log('');
  console.log('🧪 既存APIエンドポイントのテスト');
  console.log('--------------------------------');
  
  // GET /api/projects
  await runTest(
    'GET /api/projects - プロジェクト一覧取得',
    'GET', '/projects', null, [200]
  );
  
  // GET /api/load-taskgraph
  await runTest(
    'GET /api/load-taskgraph - デフォルトプロジェクト取得',
    'GET', '/load-taskgraph', null, [200]
  );
  
  // GET /api/load-taskgraph?projectId=default
  await runTest(
    'GET /api/load-taskgraph?projectId=default - 特定プロジェクト取得',
    'GET', '/load-taskgraph?projectId=default', null, [200]
  );
  
  // POST /api/projects - 新規プロジェクト作成
  const newProjectId = 'test-project-' + Date.now();
  const createResult = await runTest(
    'POST /api/projects - 新規プロジェクト作成',
    'POST', '/projects', { projectId: newProjectId }, [200, 201]
  );
  
  if (createResult && createResult.status === 200) {
    // 作成したプロジェクトの読み込み
    await runTest(
      'GET /api/load-taskgraph?projectId=' + newProjectId + ' - 新規作成プロジェクト取得',
      'GET', '/load-taskgraph?projectId=' + newProjectId, null, [200]
    );
    
    // タスクグラフの保存
    const taskgraphData = {
      projectId: newProjectId,
      taskgraph: {
        version: '1.0.0',
        tasks: {
          'test-task': {
            name: 'test-task',
            description: 'テストタスク',
            depends: [],
            notes: ['テストノート'],
            difficulty: 1,
            issueNumber: null,
            addition: {
              field: '',
              category: '',
              baseDifficulty: 0,
              requirements: [],
              implementation_notes: [],
              api_schemas: [],
              design_images: []
            }
          }
        }
      }
    };
    
    await runTest(
      'POST /api/save-taskgraph - タスクグラフ保存',
      'POST', '/save-taskgraph', taskgraphData, [200]
    );
    
    // 保存したタスクグラフの取得
    await runTest(
      'GET /api/load-taskgraph?projectId=' + newProjectId + ' - 保存後のタスクグラフ取得',
      'GET', '/load-taskgraph?projectId=' + newProjectId, null, [200]
    );
    
    // 更新時刻の取得
    await runTest(
      'GET /api/taskgraph-mtime?projectId=' + newProjectId + ' - 更新時刻取得',
      'GET', '/taskgraph-mtime?projectId=' + newProjectId, null, [200]
    );
    
    // バックアップ作成
    await runTest(
      'POST /api/backup-taskgraph - バックアップ作成',
      'POST', '/backup-taskgraph', { projectId: newProjectId }, [200]
    );
  }
  
  // ファイル一覧取得
  await runTest(
    'GET /api/file-list - ファイル一覧取得',
    'GET', '/file-list', null, [200]
  );
  
  // プロジェクト画像一覧取得
  await runTest(
    'GET /api/project-images/default - プロジェクト画像一覧',
    'GET', '/project-images/default', null, [200]
  );
  
  console.log('');
  console.log('🧪 TypeSpec定義エンドポイントのテスト（未実装）');
  console.log('-----------------------------------------------');
  
  // TypeSpecで定義されているが未実装のエンドポイント
  const unimplementedTests = [
    ['GET /projects/{projectId}', 'GET', '/projects/default'],
    ['POST /projects/{projectId}/tasks', 'POST', '/projects/default/tasks', { name: 'test', description: 'test' }],
    ['GET /projects/{projectId}/tasks/{taskName}', 'GET', '/projects/default/tasks/test'],
    ['PUT /projects/{projectId}/tasks/{taskName}', 'PUT', '/projects/default/tasks/test', { description: 'updated' }],
    ['DELETE /projects/{projectId}/tasks/{taskName}', 'DELETE', '/projects/default/tasks/test'],
    ['PATCH /projects/{projectId}/tasks/{taskName}/notes', 'PATCH', '/projects/default/tasks/test/notes', { notes: ['note1'] }],
    ['PATCH /projects/{projectId}/tasks/{taskName}/implementation', 'PATCH', '/projects/default/tasks/test/implementation', { implementation_notes: ['impl1'] }],
    ['PATCH /projects/{projectId}/tasks/{taskName}/requirements', 'PATCH', '/projects/default/tasks/test/requirements', { requirements: ['req1'] }]
  ];
  
  for (const [name, method, path, data] of unimplementedTests) {
    const result = await makeRequest(method, path, data);
    if (result.status === 404) {
      console.log('⚠️  ' + name + ' - 未実装 (404)');
    } else {
      console.log('🔍 ' + name + ' - ステータス: ' + result.status);
    }
  }
  
  console.log('');
  console.log('📊 テスト結果サマリー');
  console.log('====================');
  console.log('✅ 成功: ' + testsPassed);
  console.log('❌ 失敗: ' + testsFailed);
  console.log('');
  
  // 詳細レポート
  if (testsFailed > 0) {
    console.log('❌ 失敗したテストの詳細:');
    testResults.filter(t => !t.success).forEach(t => {
      console.log('  - ' + t.name);
      if (t.error) {
        console.log('    エラー: ' + t.error);
      } else {
        console.log('    ステータス: ' + t.status);
      }
    });
    console.log('');
  }
  
  console.log('💡 実装推奨事項:');
  console.log('  1. TypeSpecで定義されたエンドポイントの実装');
  console.log('  2. 既存エンドポイントのTypeSpec定義への移行');
  console.log('  3. エラーレスポンスの構造化');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// サーバーが起動しているか確認
const checkServer = http.get('$API_BASE/projects', (res) => {
  if (res.statusCode >= 200 && res.statusCode < 500) {
    runTests();
  } else {
    console.log('❌ APIサーバーが応答しません');
    process.exit(1);
  }
}).on('error', () => {
  console.log('⚠️  APIサーバーが起動していません');
  console.log('   tg run でサーバーを起動してください');
  process.exit(0);
});
"