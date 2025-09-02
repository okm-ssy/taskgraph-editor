#!/bin/sh

set -e

echo "🔍 OpenAPIモックテスト（サーバー不要）"
echo "======================================="

# OpenAPIファイルのパス
OPENAPI_FILE="${REPOSITORY_ROOT}/apps/api-server/generated/@typespec/openapi3/openapi.json"

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

# ajvとopenapi-schema-validatorをインストール
cd "${REPOSITORY_ROOT}/apps/api-server"
if [ ! -d "node_modules/ajv" ] || [ ! -d "node_modules/@apidevtools/swagger-parser" ]; then
  echo "📦 テストライブラリをインストールしています..."
  npm install --save-dev ajv ajv-formats @apidevtools/swagger-parser openapi-types --silent
fi

# Node.jsスクリプトでモックテストを実行
$NODE_CMD -e "
const fs = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const SwaggerParser = require('@apidevtools/swagger-parser');

// テスト結果を格納
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

// OpenAPI定義を読み込む
const openapi = JSON.parse(fs.readFileSync('$OPENAPI_FILE', 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

// スキーマを登録
function registerSchemas() {
  const components = openapi.components || {};
  const schemas = components.schemas || {};
  
  for (const [name, schema] of Object.entries(schemas)) {
    schema.\$id = '#/components/schemas/' + name;
    ajv.addSchema(schema, schema.\$id);
  }
}

// モックデータを生成
function generateMockData(schema) {
  if (!schema) return null;
  
  // $refを解決
  if (schema.\$ref) {
    const refPath = schema.\$ref.replace('#/', '').split('/');
    schema = refPath.reduce((obj, key) => obj[key], openapi);
  }
  
  if (schema.type === 'object') {
    const mock = {};
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    for (const [key, prop] of Object.entries(properties)) {
      if (required.includes(key) || Math.random() > 0.5) {
        mock[key] = generateMockData(prop);
      }
    }
    return mock;
  }
  
  if (schema.type === 'array') {
    const items = schema.items || {};
    return [generateMockData(items)];
  }
  
  if (schema.type === 'string') {
    if (schema.enum) {
      return schema.enum[0];
    }
    if (schema.format === 'date-time') {
      return new Date().toISOString();
    }
    return 'test-string';
  }
  
  if (schema.type === 'number' || schema.type === 'integer') {
    return 1;
  }
  
  if (schema.type === 'boolean') {
    return true;
  }
  
  return null;
}

// リクエストボディをテスト
function testRequestBody(path, method, operation) {
  if (!operation.requestBody) return true;
  
  const content = operation.requestBody.content || {};
  const jsonContent = content['application/json'];
  if (!jsonContent || !jsonContent.schema) return true;
  
  const mockRequest = generateMockData(jsonContent.schema);
  const validate = ajv.compile(jsonContent.schema);
  const valid = validate(mockRequest);
  
  if (!valid) {
    console.log('❌ リクエストボディ検証失敗: ' + method.toUpperCase() + ' ' + path);
    console.log('   エラー:', JSON.stringify(validate.errors, null, 2));
    testsFailed++;
    return false;
  }
  
  console.log('✅ リクエストボディ検証成功: ' + method.toUpperCase() + ' ' + path);
  testsPassed++;
  return true;
}

// レスポンスをテスト
function testResponse(path, method, operation) {
  const responses = operation.responses || {};
  
  for (const [statusCode, response] of Object.entries(responses)) {
    if (statusCode === 'default') continue;
    
    const content = response.content || {};
    const jsonContent = content['application/json'];
    if (!jsonContent || !jsonContent.schema) {
      console.log('⚠️  レスポンススキーマなし: ' + method.toUpperCase() + ' ' + path + ' [' + statusCode + ']');
      continue;
    }
    
    const mockResponse = generateMockData(jsonContent.schema);
    const validate = ajv.compile(jsonContent.schema);
    const valid = validate(mockResponse);
    
    if (!valid) {
      console.log('❌ レスポンス検証失敗: ' + method.toUpperCase() + ' ' + path + ' [' + statusCode + ']');
      console.log('   エラー:', JSON.stringify(validate.errors, null, 2));
      testsFailed++;
    } else {
      console.log('✅ レスポンス検証成功: ' + method.toUpperCase() + ' ' + path + ' [' + statusCode + ']');
      testsPassed++;
    }
  }
}

// パラメータをテスト
function testParameters(path, method, operation) {
  const parameters = operation.parameters || [];
  
  for (const param of parameters) {
    if (param.required) {
      console.log('📍 必須パラメータ: ' + param.name + ' (' + param.in + ')');
    }
    
    if (param.schema) {
      const mockValue = generateMockData(param.schema);
      const validate = ajv.compile(param.schema);
      const valid = validate(mockValue);
      
      if (!valid) {
        console.log('❌ パラメータ検証失敗: ' + param.name);
        testsFailed++;
      } else {
        console.log('✅ パラメータ検証成功: ' + param.name);
        testsPassed++;
      }
    }
  }
}

// テストを実行
async function runTests() {
  console.log('');
  console.log('📋 OpenAPI定義を検証しています...');
  
  try {
    // OpenAPI定義自体の検証
    const api = await SwaggerParser.validate('$OPENAPI_FILE');
    console.log('✅ OpenAPI定義は有効です');
    console.log('   API名: ' + api.info.title);
    console.log('   バージョン: ' + api.info.version);
  } catch (err) {
    console.log('❌ OpenAPI定義が無効です:', err.message);
    testsFailed++;
  }
  
  console.log('');
  console.log('📋 スキーマを登録しています...');
  registerSchemas();
  
  console.log('');
  console.log('🧪 エンドポイントごとのモックテスト');
  console.log('====================================');
  
  const paths = openapi.paths || {};
  
  for (const [path, pathItem] of Object.entries(paths)) {
    console.log('');
    console.log('📍 ' + path);
    console.log('-'.repeat(40));
    
    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === 'parameters' || method === 'servers') continue;
      
      console.log('');
      console.log('🔸 ' + method.toUpperCase() + ' ' + path);
      if (operation.summary) {
        console.log('   説明: ' + operation.summary);
      }
      
      // パラメータのテスト
      testParameters(path, method, operation);
      
      // リクエストボディのテスト
      testRequestBody(path, method, operation);
      
      // レスポンスのテスト
      testResponse(path, method, operation);
    }
  }
  
  console.log('');
  console.log('📊 モックテスト結果サマリー');
  console.log('===========================');
  console.log('✅ 成功: ' + testsPassed);
  console.log('❌ 失敗: ' + testsFailed);
  
  if (testsFailed > 0) {
    console.log('');
    console.log('💡 改善提案:');
    console.log('  1. スキーマ定義の一貫性を確認');
    console.log('  2. 必須フィールドの見直し');
    console.log('  3. データ型の整合性チェック');
  }
  
  // Contract Testing の情報
  console.log('');
  console.log('📚 Contract Testing について');
  console.log('============================');
  console.log('このテストはAPIサーバーなしで実行可能な契約テストです。');
  console.log('');
  console.log('利点:');
  console.log('  • サーバー起動不要で高速実行');
  console.log('  • OpenAPI定義の正確性を保証');
  console.log('  • CI/CDパイプラインで容易に実行可能');
  console.log('  • 実装前の仕様検証が可能');
  console.log('');
  console.log('次のステップ:');
  console.log('  1. Prism等のモックサーバーツールの導入');
  console.log('  2. Postman/Insomnia等でのコレクション生成');
  console.log('  3. OpenAPI Generatorでのクライアント/サーバーコード生成');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('テスト実行エラー:', err);
  process.exit(1);
});
"