#!/bin/sh

set -e

echo "🔍 OpenAPIスキーマ検証テスト"
echo "================================"

# OpenAPIファイルのパス
OPENAPI_FILE="${REPOSITORY_ROOT}/apps/api-server/generated/@typespec/openapi3/openapi.json"
API_BASE="${API_BASE:-http://localhost:9393/api}"

# OpenAPIファイルが存在しない場合は生成
if [ ! -f "$OPENAPI_FILE" ]; then
  echo "📝 OpenAPIファイルを生成しています..."
  cd "${REPOSITORY_ROOT}/apps/api-server"
  npx tsp compile typespec >/dev/null 2>&1
fi

if [ ! -f "$OPENAPI_FILE" ]; then
  echo "❌ OpenAPIファイルが見つかりません"
  exit 1
fi

# Node.jsを探して使用
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif [ -x "/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node" ]; then
  NODE_CMD="/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node"
else
  echo "Error: Node.js is not installed" >&2
  exit 1
fi

# ajvをインストール（スキーマ検証ライブラリ）
cd "${REPOSITORY_ROOT}/apps/api-server"
if [ ! -d "node_modules/ajv" ]; then
  echo "📦 検証ライブラリをインストールしています..."
  npm install --save-dev ajv ajv-formats --silent
fi

# Node.jsスクリプトでスキーマ検証を実行
$NODE_CMD -e "
const fs = require('fs');
const http = require('http');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// OpenAPI定義を読み込む
const openapi = JSON.parse(fs.readFileSync('$OPENAPI_FILE', 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

// テスト結果を格納
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

// スキーマを登録
function registerSchemas() {
  const components = openapi.components || {};
  const schemas = components.schemas || {};
  
  for (const [name, schema] of Object.entries(schemas)) {
    // \$idを追加してスキーマを識別可能にする
    schema.\$id = '#/components/schemas/' + name;
    ajv.addSchema(schema, schema.\$id);
  }
}

// レスポンスを検証
function validateResponse(endpoint, method, response, statusCode) {
  const path = openapi.paths[endpoint];
  if (!path || !path[method]) {
    console.log('⚠️  エンドポイント定義が見つかりません: ' + method.toUpperCase() + ' ' + endpoint);
    return false;
  }
  
  const operation = path[method];
  const responses = operation.responses || {};
  const responseSpec = responses[statusCode] || responses.default;
  
  if (!responseSpec) {
    console.log('⚠️  レスポンス定義が見つかりません: ' + statusCode);
    return false;
  }
  
  const content = responseSpec.content || {};
  const jsonContent = content['application/json'];
  if (!jsonContent || !jsonContent.schema) {
    // スキーマがない場合はスキップ
    return true;
  }
  
  const schema = jsonContent.schema;
  
  // \$refを解決
  let resolvedSchema = schema;
  if (schema.\$ref) {
    const refPath = schema.\$ref.replace('#/', '').split('/');
    resolvedSchema = refPath.reduce((obj, key) => obj[key], openapi);
  }
  
  const validate = ajv.compile(resolvedSchema);
  const valid = validate(response);
  
  if (!valid) {
    console.log('❌ スキーマ検証失敗: ' + method.toUpperCase() + ' ' + endpoint);
    console.log('   エラー:', JSON.stringify(validate.errors, null, 2));
    failures.push({
      endpoint: method.toUpperCase() + ' ' + endpoint,
      errors: validate.errors
    });
    testsFailed++;
    return false;
  }
  
  testsPassed++;
  return true;
}

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

// テストを実行
async function runTests() {
  console.log('');
  console.log('📋 スキーマを登録しています...');
  registerSchemas();
  
  console.log('🧪 エンドポイントテストを開始...');
  console.log('');
  
  // GET /projects のテスト
  try {
    console.log('📍 GET /projects');
    const result = await makeRequest('GET', '/projects');
    if (validateResponse('/projects', 'get', result.data, result.status.toString())) {
      console.log('✅ GET /projects: スキーマ検証成功');
    }
  } catch (error) {
    console.log('❌ GET /projects: リクエスト失敗 -', error.message);
    testsFailed++;
  }
  
  console.log('');
  
  // 結果サマリー
  console.log('📊 テスト結果サマリー');
  console.log('====================');
  console.log('✅ 成功: ' + testsPassed);
  console.log('❌ 失敗: ' + testsFailed);
  
  if (failures.length > 0) {
    console.log('');
    console.log('❌ 失敗の詳細:');
    failures.forEach(f => {
      console.log('  ' + f.endpoint + ':');
      f.errors.forEach(e => {
        console.log('    - ' + e.instancePath + ' ' + e.message);
      });
    });
  }
  
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