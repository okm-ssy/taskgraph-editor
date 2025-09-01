#!/bin/sh

set -e

# OpenAPIファイルのパス
OPENAPI_FILE="${REPOSITORY_ROOT}/apps/api-server/generated/@typespec/openapi3/openapi.json"

# OpenAPIファイルが存在しない場合は生成
if [ ! -f "$OPENAPI_FILE" ]; then
  echo "OpenAPIファイルが見つかりません。TypeSpecをコンパイルしています..." >&2
  cd "${REPOSITORY_ROOT}/apps/api-server"
  npx tsp compile typespec >/dev/null 2>&1
fi

# OpenAPIファイルを解析してAPI情報を表示
if [ -f "$OPENAPI_FILE" ]; then
  # Node.jsを探して使用
  if command -v node >/dev/null 2>&1; then
    NODE_CMD="node"
  elif [ -x "/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node" ]; then
    NODE_CMD="/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node"
  else
    echo "Error: Node.js is not installed" >&2
    exit 1
  fi

  # Node.jsスクリプトを使用してOpenAPIを解析
  $NODE_CMD -e "
    const fs = require('fs');
    const openapi = JSON.parse(fs.readFileSync('$OPENAPI_FILE', 'utf8'));
    
    console.log('Available API Endpoints:');
    console.log('');
    
    // パスごとにエンドポイントを表示
    const paths = openapi.paths || {};
    const endpoints = [];
    
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods)) {
        if (method === 'parameters') continue;
        
        endpoints.push({
          method: method.toUpperCase(),
          path: path,
          summary: details.summary || '',
          parameters: details.parameters || [],
          requestBody: details.requestBody
        });
      }
    }
    
    // メソッドとパスでソート
    endpoints.sort((a, b) => {
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      return a.method.localeCompare(b.method);
    });
    
    // エンドポイントを表示
    for (const endpoint of endpoints) {
      console.log(\`\${endpoint.method} \${endpoint.path}\`);
      if (endpoint.summary) {
        console.log(\`  \${endpoint.summary}\`);
      }
      
      // パスパラメータ
      const pathParams = endpoint.parameters.filter(p => p.in === 'path');
      if (pathParams.length > 0) {
        console.log(\`  Params: \${pathParams.map(p => p.name).join(', ')}\`);
      }
      
      // リクエストボディ
      if (endpoint.requestBody) {
        const content = endpoint.requestBody.content || {};
        const schema = content['application/json']?.schema;
        if (schema) {
          if (schema.required && schema.required.length > 0) {
            console.log(\`  Required body fields: \${schema.required.join(', ')}\`);
          }
          const properties = schema.properties || {};
          const optional = Object.keys(properties).filter(k => !schema.required?.includes(k));
          if (optional.length > 0) {
            console.log(\`  Optional body fields: \${optional.join(', ')}\`);
          }
        }
      }
      console.log('');
    }
    
    console.log('Usage:');
    console.log('  tg api call GET /projects');
    console.log('  tg api call POST /projects/myproject/tasks \'{\"name\":\"task1\",\"description\":\"Test\"}\'');
    console.log('');
    console.log('OpenAPI Specification:');
    console.log('  $OPENAPI_FILE');
  "
else
  echo "OpenAPIファイルの生成に失敗しました" >&2
  exit 1
fi