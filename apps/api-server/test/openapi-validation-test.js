#!/usr/bin/env node
// OpenAPIスキーマ検証テスト - APIサーバーなしで実行可能

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { MockAPIHandler, MockRequest, MockResponse } from './mock-api-test.js';

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

// AJVバリデーターの初期化
function createValidator(schema) {
  const ajv = new Ajv({ 
    strict: false,
    allErrors: true,
    verbose: true
  });
  addFormats(ajv);
  
  // OpenAPIスキーマ定義を登録
  if (schema.components?.schemas) {
    for (const [name, schemaDefinition] of Object.entries(schema.components.schemas)) {
      ajv.addSchema(schemaDefinition, `#/components/schemas/${name}`);
    }
  }
  
  return ajv;
}

// レスポンス検証
function validateResponse(ajv, openAPISchema, method, path, statusCode, responseData) {
  // パスパラメータを正規化
  const normalizedPath = path.replace(/\/[^\/]+$/g, (match) => {
    if (match.match(/\/test-project$|\/task\d+$|\/new-task$/)) {
      return '/{param}';
    }
    return match;
  }).replace(/\/test-project\//, '/{projectId}/')
    .replace(/\/task1|\/new-task/, '/{taskName}');
  
  // OpenAPIパスを検索
  let pathSpec = null;
  let actualPath = null;
  
  for (const [specPath, spec] of Object.entries(openAPISchema.paths)) {
    const pathRegex = new RegExp('^' + specPath.replace(/{[^}]+}/g, '[^/]+') + '$');
    if (pathRegex.test(path)) {
      pathSpec = spec;
      actualPath = specPath;
      break;
    }
  }
  
  if (!pathSpec) {
    throw new Error(`Path ${path} not found in OpenAPI specification`);
  }
  
  const operation = pathSpec[method.toLowerCase()];
  if (!operation) {
    throw new Error(`Method ${method} not found for path ${actualPath}`);
  }
  
  const responseSpec = operation.responses[statusCode] || operation.responses.default;
  if (!responseSpec) {
    throw new Error(`Response ${statusCode} not defined for ${method} ${actualPath}`);
  }
  
  // 204 No Contentの場合はボディなし
  if (statusCode === 204) {
    if (responseData !== null && responseData !== undefined && responseData !== '') {
      throw new Error('204 No Content should not have a response body');
    }
    return true;
  }
  
  // レスポンススキーマの取得
  const contentType = 'application/json';
  const responseSchema = responseSpec.content?.[contentType]?.schema;
  
  if (!responseSchema) {
    // スキーマが定義されていない場合はスキップ
    return true;
  }
  
  // バリデーション実行
  const validate = ajv.compile(responseSchema);
  const valid = validate(responseData);
  
  if (!valid) {
    const errors = validate.errors.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw new Error(`Response validation failed: ${errors}`);
  }
  
  return true;
}

// リクエストボディの検証
function validateRequestBody(ajv, openAPISchema, method, path, requestBody) {
  // パスパラメータを正規化
  let pathSpec = null;
  let actualPath = null;
  
  for (const [specPath, spec] of Object.entries(openAPISchema.paths)) {
    const pathRegex = new RegExp('^' + specPath.replace(/{[^}]+}/g, '[^/]+') + '$');
    if (pathRegex.test(path)) {
      pathSpec = spec;
      actualPath = specPath;
      break;
    }
  }
  
  if (!pathSpec) {
    throw new Error(`Path ${path} not found in OpenAPI specification`);
  }
  
  const operation = pathSpec[method.toLowerCase()];
  if (!operation) {
    throw new Error(`Method ${method} not found for path ${actualPath}`);
  }
  
  const requestBodySpec = operation.requestBody;
  if (!requestBodySpec) {
    // リクエストボディが定義されていない場合
    if (requestBody) {
      console.log(colors.yellow(`  Warning: Request body provided but not defined in spec for ${method} ${actualPath}`));
    }
    return true;
  }
  
  const contentType = 'application/json';
  const requestSchema = requestBodySpec.content?.[contentType]?.schema;
  
  if (!requestSchema) {
    return true;
  }
  
  // バリデーション実行
  const validate = ajv.compile(requestSchema);
  const valid = validate(requestBody);
  
  if (!valid) {
    const errors = validate.errors.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw new Error(`Request validation failed: ${errors}`);
  }
  
  return true;
}

// OpenAPIスキーマ検証テストの実行
async function runOpenAPIValidationTests() {
  console.log(colors.cyan('\n=== OpenAPI Schema Validation Tests ===\n'));
  
  const openAPISchema = await loadOpenAPISchema();
  const ajv = createValidator(openAPISchema);
  const handler = new MockAPIHandler(openAPISchema);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // テストケース定義（リクエスト/レスポンス検証用）
  const testCases = [
    {
      name: 'GET /projects - Validate response schema',
      method: 'GET',
      path: '/projects',
      body: null,
      expectedStatus: 200
    },
    
    {
      name: 'GET /projects/{projectId} - Validate taskgraph response',
      method: 'GET',
      path: '/projects/test-project',
      body: null,
      expectedStatus: 200
    },
    
    {
      name: 'GET /projects/{projectId} - Validate error response',
      method: 'GET',
      path: '/projects/non-existent',
      body: null,
      expectedStatus: 404
    },
    
    {
      name: 'POST /projects/{projectId}/tasks - Validate request and response',
      method: 'POST',
      path: '/projects/test-project/tasks',
      body: {
        name: 'schema-test-task',
        description: 'Task for schema validation',
        depends: ['task1'],
        difficulty: 2,
        issueNumber: 999,
        addition: {
          field: 'back',
          category: 'bugfix',
          baseDifficulty: 2,
          requirements: ['Test requirement'],
          implementation_notes: ['Test implementation'],
          design_images: ['image1.png'],
          api_schemas: ['GET /test']
        }
      },
      expectedStatus: 200
    },
    
    {
      name: 'GET /projects/{projectId}/tasks/{taskName} - Validate task response',
      method: 'GET',
      path: '/projects/test-project/tasks/task1',
      body: null,
      expectedStatus: 200
    },
    
    {
      name: 'PUT /projects/{projectId}/tasks/{taskName} - Validate update request',
      method: 'PUT',
      path: '/projects/test-project/tasks/task1',
      body: {
        name: 'task1',
        description: 'Updated for schema validation',
        depends: [],
        notes: ['Updated note'],
        difficulty: 5,
        issueNumber: 200,
        addition: {
          field: 'infra',
          category: 'refactor',
          baseDifficulty: 3
        }
      },
      expectedStatus: 200
    },
    
    {
      name: 'DELETE /projects/{projectId}/tasks/{taskName} - Validate delete',
      method: 'DELETE',
      path: '/projects/test-project/tasks/schema-test-task',
      body: null,
      expectedStatus: 204
    },
    
    {
      name: 'PATCH /projects/{projectId}/tasks/{taskName}/notes - Validate patch request',
      method: 'PATCH',
      path: '/projects/test-project/tasks/task1/notes',
      body: {
        notes: ['Note 1', 'Note 2', 'Note 3']
      },
      expectedStatus: 200
    },
    
    {
      name: 'PATCH /projects/{projectId}/tasks/{taskName}/implementation - Validate implementation update',
      method: 'PATCH',
      path: '/projects/test-project/tasks/task1/implementation',
      body: {
        implementation_notes: ['Step 1', 'Step 2', 'Step 3']
      },
      expectedStatus: 200
    },
    
    {
      name: 'PATCH /projects/{projectId}/tasks/{taskName}/requirements - Validate requirements update',
      method: 'PATCH',
      path: '/projects/test-project/tasks/task1/requirements',
      body: {
        requirements: ['Requirement 1', 'Requirement 2']
      },
      expectedStatus: 200
    }
  ];
  
  // 各テストケースを実行
  for (const testCase of testCases) {
    totalTests++;
    
    try {
      // リクエストの作成
      const request = new MockRequest(testCase.method, testCase.path, testCase.body);
      const response = new MockResponse();
      
      // リクエストボディの検証（POSTやPUTの場合）
      if (testCase.body && (testCase.method === 'POST' || testCase.method === 'PUT' || testCase.method === 'PATCH')) {
        validateRequestBody(ajv, openAPISchema, testCase.method, testCase.path, testCase.body);
        console.log(`${colors.green('✓')} ${testCase.name} - Request validation`);
      }
      
      // APIハンドラーの実行
      await handler.handleRequest(request, response);
      
      // ステータスコードの確認
      if (response.statusCode !== testCase.expectedStatus) {
        throw new Error(`Expected status ${testCase.expectedStatus}, got ${response.statusCode}`);
      }
      
      // レスポンスの検証
      validateResponse(ajv, openAPISchema, testCase.method, testCase.path, response.statusCode, response.data);
      
      passedTests++;
      console.log(`${colors.green('✓')} ${testCase.name} - Response validation`);
      console.log(colors.dim(`  Status: ${response.statusCode}, Response validated against OpenAPI schema`));
      
    } catch (error) {
      failedTests++;
      console.log(`${colors.red('✗')} ${testCase.name}`);
      console.log(colors.red(`  Error: ${error.message}`));
    }
  }
  
  // パラメータ検証テスト
  console.log(colors.cyan('\n=== Path Parameter Validation ===\n'));
  
  const paramTests = [
    {
      name: 'Validate projectId parameter format',
      paths: ['/projects/test-123', '/projects/my-project', '/projects/sample_project'],
      valid: true
    },
    {
      name: 'Validate taskName parameter format',
      paths: ['/projects/test/tasks/task-1', '/projects/test/tasks/my_task', '/projects/test/tasks/feature123'],
      valid: true
    }
  ];
  
  for (const paramTest of paramTests) {
    for (const testPath of paramTest.paths) {
      totalTests++;
      try {
        const request = new MockRequest('GET', testPath);
        const response = new MockResponse();
        await handler.handleRequest(request, response);
        
        if (paramTest.valid && response.statusCode >= 500) {
          throw new Error(`Server error for valid path: ${testPath}`);
        }
        
        passedTests++;
        console.log(`${colors.green('✓')} ${paramTest.name}: ${testPath}`);
      } catch (error) {
        failedTests++;
        console.log(`${colors.red('✗')} ${paramTest.name}: ${testPath}`);
        console.log(colors.red(`  Error: ${error.message}`));
      }
    }
  }
  
  // 結果サマリー
  console.log(colors.cyan('\n=== OpenAPI Validation Summary ===\n'));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green('Passed')}: ${passedTests}`);
  console.log(`${colors.red('Failed')}: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log(colors.red('\n❌ OpenAPI validation failed'));
    process.exit(1);
  } else {
    console.log(colors.green('\n✅ All OpenAPI validations passed!'));
    process.exit(0);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runOpenAPIValidationTests().catch(error => {
    console.error(colors.red('OpenAPI validation test failed:'), error);
    process.exit(1);
  });
}

export { runOpenAPIValidationTests };