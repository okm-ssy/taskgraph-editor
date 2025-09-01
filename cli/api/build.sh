#!/bin/sh

set -e

echo "🔨 APIクライアントバイナリをビルドしています..."

# まずOpenAPI定義を生成
echo "📝 OpenAPI定義を生成しています..."
cd "${REPOSITORY_ROOT}/apps/api-server"
if [ -f "typespec/main.tsp" ]; then
  npx tsp compile typespec >/dev/null 2>&1 || {
    echo "⚠️  TypeSpecのコンパイルに失敗しました" >&2
    echo "   手動で実行: cd apps/api-server && npx tsp compile typespec" >&2
  }
  if [ -f "generated/@typespec/openapi3/openapi.json" ]; then
    echo "✅ OpenAPI定義を生成しました: apps/api-server/generated/@typespec/openapi3/openapi.json"
  fi
else
  echo "⚠️  TypeSpec定義が見つかりません" >&2
fi
echo ""

# ディレクトリが存在しない場合は作成
if [ ! -d "${REPOSITORY_ROOT}/apps/api-client" ]; then
  mkdir -p "${REPOSITORY_ROOT}/apps/api-client"
fi

# APIクライアントのディレクトリに移動
cd "${REPOSITORY_ROOT}/apps/api-client"

# package.jsonが存在しない場合は作成
if [ ! -f "package.json" ]; then
  echo "📦 package.jsonを作成しています..."
  cat > package.json << 'EOF'
{
  "name": "taskgraph-api-client",
  "version": "1.0.0",
  "type": "module",
  "description": "Taskgraph API Client",
  "main": "cli.js",
  "scripts": {
    "build": "pkg . --targets node18-linux-x64,node18-macos-x64,node18-win-x64 --output ../bin/api-client"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "node-fetch": "^3.3.2",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "pkg": "^5.8.1"
  },
  "pkg": {
    "targets": ["node18"],
    "outputPath": "../bin"
  }
}
EOF
fi

# CLIクライアントが存在しない場合は作成
if [ ! -f "cli.js" ]; then
  echo "📝 APIクライアントを作成しています..."
  cat > cli.js << 'EOF'
#!/usr/bin/env node
import { program } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL || 'http://localhost:9393/api';

// OpenAPI定義を読み込む
async function loadOpenAPI() {
  try {
    const openApiPath = path.join(__dirname, '..', 'api-server', 'generated', '@typespec', 'openapi3', 'openapi.json');
    const data = await fs.readFile(openApiPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.yellow('Warning: OpenAPI definition not found. Run "tg api build" first.'));
    return null;
  }
}

// APIリクエストを実行
async function callAPI(method, endpoint, data) {
  const url = `${API_URL}${endpoint}`;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (data && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    if (response.status >= 400) {
      console.error(chalk.red(`Error: HTTP ${response.status}`));
    }
    
    try {
      const json = JSON.parse(responseData);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      if (responseData) {
        console.log(responseData);
      }
    }
    
    if (response.status >= 400) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Request failed: ${error.message}`));
    process.exit(1);
  }
}

// API情報を表示
async function showInfo() {
  const openapi = await loadOpenAPI();
  
  if (!openapi) {
    console.log('OpenAPI definition not found.');
    return;
  }
  
  console.log(chalk.bold('Available API Endpoints:\n'));
  
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
  
  endpoints.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
  
  for (const endpoint of endpoints) {
    console.log(chalk.green(`${endpoint.method} ${endpoint.path}`));
    if (endpoint.summary) {
      console.log(`  ${endpoint.summary}`);
    }
    
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    if (pathParams.length > 0) {
      console.log(`  ${chalk.gray('Params:')} ${pathParams.map(p => p.name).join(', ')}`);
    }
    
    if (endpoint.requestBody) {
      const content = endpoint.requestBody.content || {};
      const schema = content['application/json']?.schema;
      if (schema) {
        if (schema.required && schema.required.length > 0) {
          console.log(`  ${chalk.gray('Required body fields:')} ${schema.required.join(', ')}`);
        }
        const properties = schema.properties || {};
        const optional = Object.keys(properties).filter(k => !schema.required?.includes(k));
        if (optional.length > 0) {
          console.log(`  ${chalk.gray('Optional body fields:')} ${optional.join(', ')}`);
        }
      }
    }
    console.log('');
  }
  
  console.log(chalk.bold('Usage:'));
  console.log('  api-client call GET /projects');
  console.log('  api-client call POST /projects/myproject/tasks \'{"name":"task1","description":"Test"}\'');
}

program
  .name('api-client')
  .description('Taskgraph API Client')
  .version('1.0.0');

program
  .command('info')
  .description('Show API endpoints information')
  .action(showInfo);

program
  .command('call <method> <endpoint> [data]')
  .description('Call an API endpoint')
  .action(async (method, endpoint, data) => {
    let parsedData = null;
    if (data) {
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        console.error(chalk.red('Invalid JSON data'));
        process.exit(1);
      }
    }
    await callAPI(method.toUpperCase(), endpoint, parsedData);
  });

program.parse();
EOF
fi

# 依存関係をインストール
if [ ! -d "node_modules" ]; then
  echo "📦 依存関係をインストールしています..."
  npm install --silent
fi

# pkgをインストール（グローバルまたはローカル）
if ! command -v pkg >/dev/null 2>&1; then
  echo "📦 pkgをインストールしています..."
  npm install --save-dev pkg --silent
fi

# バイナリをビルド
echo "🔨 バイナリをビルドしています..."
mkdir -p "${REPOSITORY_ROOT}/apps/bin"

# Node.jsスクリプトとして実行可能なラッパーを作成
cat > "${REPOSITORY_ROOT}/apps/bin/api-client" << 'EOF'
#!/usr/bin/env node
import('./api-client/cli.js');
EOF

chmod +x "${REPOSITORY_ROOT}/apps/bin/api-client"

# 実際のCLIファイルをコピー
cp cli.js "${REPOSITORY_ROOT}/apps/bin/api-client.js"

echo "✅ APIクライアントバイナリのビルドが完了しました"
echo ""
echo "使用方法:"
echo "  ${REPOSITORY_ROOT}/apps/bin/api-client info"
echo "  ${REPOSITORY_ROOT}/apps/bin/api-client call GET /projects"
echo ""
echo "または、tgコマンド経由で:"
echo "  tg api info"
echo "  tg api call GET /projects"