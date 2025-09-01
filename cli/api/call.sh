#!/bin/sh

set -e

# 引数チェック
if [ "$1" != "call" ]; then
  echo "Usage: tg api call <METHOD> <PATH> [DATA]" >&2
  echo "Example: tg api call GET /projects" >&2
  echo "Example: tg api call POST /projects/myproject/tasks '{\"name\":\"task1\",\"description\":\"Test\"}'" >&2
  exit 1
fi

shift # "call"を削除

METHOD="$1"
PATH="$2"
DATA="$3"

# 引数チェック
if [ -z "$METHOD" ] || [ -z "$PATH" ]; then
  echo "Usage: tg api call <METHOD> <PATH> [DATA]" >&2
  echo "Example: tg api call GET /projects" >&2
  echo "Example: tg api call POST /projects/myproject/tasks '{\"name\":\"task1\",\"description\":\"Test\"}'" >&2
  exit 1
fi

# APIサーバーのURL（環境変数で変更可能）
API_URL="${API_URL:-http://localhost:9393/api}"

# Node.jsを探して使用
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif [ -x "/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node" ]; then
  NODE_CMD="/home/okm-uv/.anyenv/envs/nodenv/versions/24.1.0/bin/node"
else
  echo "Error: Node.js is not installed" >&2
  exit 1
fi

# Node.jsスクリプトでHTTPリクエストを実行
$NODE_CMD -e "
const http = require('http');
const url = require('url');

const method = '$METHOD';
const path = '$PATH';
const data = process.argv[1];

// URLを構築
const apiUrl = '$API_URL' + path;
const parsedUrl = url.parse(apiUrl);

// リクエストオプション
const options = {
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || 80,
  path: parsedUrl.path,
  method: method,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// リクエストを送信
const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    // ステータスコードを表示
    if (res.statusCode >= 400) {
      console.error(\`Error: HTTP \${res.statusCode}\`);
    }
    
    // レスポンスを表示（整形なし）
    if (responseData) {
      console.log(responseData);
    }
    
    // エラーステータスの場合は非ゼロで終了
    if (res.statusCode >= 400) {
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(\`Request failed: \${e.message}\`);
  process.exit(1);
});

// データがある場合は送信
if (data && method !== 'GET' && method !== 'DELETE') {
  req.write(data);
}

req.end();
" "$DATA"