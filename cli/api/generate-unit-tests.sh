#!/bin/sh

set -e

echo "🧪 OpenAPIからユニットテスト生成"
echo "================================="

# OpenAPIファイルのパス
OPENAPI_FILE="${REPOSITORY_ROOT}/apps/api-server/generated/@typespec/openapi3/openapi.json"
OUTPUT_FILE="${REPOSITORY_ROOT}/apps/api-server/test/generated-api-tests.js"

# OpenAPIファイルが存在しない場合は生成
if [ ! -f "$OPENAPI_FILE" ]; then
  echo "📝 OpenAPIファイルを生成しています..."
  cd "${REPOSITORY_ROOT}/apps/api-server"
  npx tsp compile typespec >/dev/null 2>&1
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

# テストディレクトリを作成
mkdir -p "${REPOSITORY_ROOT}/apps/api-server/test"

# Node.jsスクリプトでテストコードを生成
$NODE_CMD -e "
const fs = require('fs');
const path = require('path');

// OpenAPI定義を読み込む
const openapi = JSON.parse(fs.readFileSync('$OPENAPI_FILE', 'utf8'));

// テストコードを生成
let testCode = \`// 自動生成されたAPIテストコード
// Generated from: $OPENAPI_FILE
// Generated at: \${new Date().toISOString()}

const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');

// APIハンドラーのインポート（実装に応じて調整）
// const { handleRequest } = require('../server');

describe('API Endpoints (OpenAPI Generated)', () => {
\`;

// モックデータ生成関数
function generateMockValue(schema, name = 'value') {
  if (!schema) return 'null';
  
  if (schema.\$ref) {
    const refName = schema.\$ref.split('/').pop();
    return \`mockData.\${refName}\`;
  }
  
  switch (schema.type) {
    case 'string':
      if (schema.enum) return \`'\${schema.enum[0]}'\`;
      if (schema.format === 'date-time') return \`new Date().toISOString()\`;
      return \`'test-\${name}'\`;
    case 'number':
    case 'integer':
      return '1';
    case 'boolean':
      return 'true';
    case 'array':
      return \`[\${generateMockValue(schema.items, name)}]\`;
    case 'object':
      const props = [];
      for (const [key, prop] of Object.entries(schema.properties || {})) {
        props.push(\`    \${key}: \${generateMockValue(prop, key)}\`);
      }
      return \`{
\${props.join(',\\n')}
  }\`;
    default:
      return 'null';
  }
}

// モックデータオブジェクトを生成
testCode += \`
  // モックデータ定義
  const mockData = {
\`;

const components = openapi.components || {};
const schemas = components.schemas || {};
for (const [name, schema] of Object.entries(schemas)) {
  testCode += \`
    \${name}: \${generateMockValue(schema, name)},\`;
}

testCode += \`
  };

  // テスト用のプロジェクトIDとタスク名
  const testProjectId = 'test-project';
  const testTaskName = 'test-task';
\`;

// 各エンドポイントのテストを生成
const paths = openapi.paths || {};
for (const [pathPattern, pathItem] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (method === 'parameters' || method === 'servers') continue;
    
    const operationId = operation.operationId || \`\${method}_\${pathPattern.replace(/[{}\/]/g, '_')}\`;
    const summary = operation.summary || '';
    
    testCode += \`

  describe('\${method.toUpperCase()} \${pathPattern}', () => {
    it('should \${summary.toLowerCase() || 'handle request correctly'}', async () => {
      // Arrange - テストデータの準備
\`;
    
    // パラメータの準備
    const params = operation.parameters || [];
    for (const param of params) {
      if (param.in === 'path') {
        testCode += \`
      const \${param.name} = \${param.name === 'projectId' ? 'testProjectId' : param.name === 'taskName' ? 'testTaskName' : generateMockValue(param.schema, param.name)};\`;
      }
    }
    
    // リクエストボディの準備
    if (operation.requestBody) {
      const content = operation.requestBody.content || {};
      const jsonContent = content['application/json'];
      if (jsonContent && jsonContent.schema) {
        testCode += \`
      const requestBody = \${generateMockValue(jsonContent.schema, 'request')};\`;
      }
    }
    
    testCode += \`

      // Act - メソッドの実行
      // TODO: 実際のAPIハンドラー関数を呼び出す
      // const result = await handleRequest({
      //   method: '\${method.toUpperCase()}',
      //   path: '\${pathPattern}',\`;
    
    if (params.some(p => p.in === 'path')) {
      testCode += \`
      //   params: { \${params.filter(p => p.in === 'path').map(p => p.name).join(', ')} },\`;
    }
    
    if (operation.requestBody) {
      testCode += \`
      //   body: requestBody,\`;
    }
    
    testCode += \`
      // });

      // Assert - 結果の検証\`;
    
    // レスポンスの検証
    const responses = operation.responses || {};
    for (const [statusCode, response] of Object.entries(responses)) {
      if (statusCode === 'default') continue;
      
      testCode += \`
      // Status \${statusCode}: \${response.description || ''}\`;
      
      const content = response.content || {};
      const jsonContent = content['application/json'];
      if (jsonContent && jsonContent.schema) {
        testCode += \`
      // assert.strictEqual(result.status, \${statusCode});
      // assert.deepStrictEqual(result.body, expectedResponse);\`;
      }
    }
    
    testCode += \`
      
      // TODO: 実装に応じた検証を追加
      assert.ok(true, 'Test needs implementation');
    });
\`;
    
    // エラーケースのテスト
    if (responses['400'] || responses['404'] || responses['500']) {
      testCode += \`

    it('should handle errors correctly', async () => {
      // TODO: エラーケースのテストを実装
      assert.ok(true, 'Error case test needs implementation');
    });
\`;
    }
    
    testCode += \`
  });\`;
  }
}

testCode += \`
});

// データ永続化のテスト
describe('Data Persistence', () => {
  it('should persist changes to file system', async () => {
    // TODO: ファイルシステムへの書き込みテスト
    assert.ok(true, 'Persistence test needs implementation');
  });

  it('should handle concurrent access', async () => {
    // TODO: 同時アクセステスト
    assert.ok(true, 'Concurrency test needs implementation');
  });
});

// スキーマ検証のテスト
describe('Schema Validation', () => {
  it('should validate request against OpenAPI schema', () => {
    // TODO: リクエストスキーマ検証テスト
    assert.ok(true, 'Request validation test needs implementation');
  });

  it('should validate response against OpenAPI schema', () => {
    // TODO: レスポンススキーマ検証テスト
    assert.ok(true, 'Response validation test needs implementation');
  });
});

module.exports = { mockData };
\`;

// テストファイルを出力
fs.writeFileSync('$OUTPUT_FILE', testCode, 'utf8');

console.log('✅ ユニットテストコードを生成しました:');
console.log('   $OUTPUT_FILE');
console.log('');
console.log('📝 生成されたテストの内容:');
console.log('  • 各エンドポイントの基本テスト');
console.log('  • モックデータの定義');
console.log('  • エラーケースのテスト枠組み');
console.log('  • データ永続化のテスト枠組み');
console.log('  • スキーマ検証のテスト枠組み');
console.log('');
console.log('🔧 次のステップ:');
console.log('  1. 実際のAPIハンドラー関数をインポート');
console.log('  2. TODOコメントの部分を実装');
console.log('  3. npm test でテストを実行');
console.log('');
console.log('💡 ヒント:');
console.log('  • Mochaやjestでテストを実行できます');
console.log('  • sinonでモック/スタブを作成できます');
console.log('  • supetestでHTTPレベルのテストも可能です');
"