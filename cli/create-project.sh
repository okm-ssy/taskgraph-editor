#!/bin/sh

set -e

# プロジェクト名の取得
project_name=$1

if [ -z "$project_name" ]; then
  echo "エラー: プロジェクト名を指定してください" >&2
  echo "使用方法: tg create-project <プロジェクト名>" >&2
  exit 1
fi

# 特殊文字のチェック
if echo "$project_name" | grep -q '[^a-zA-Z0-9_-]'; then
  echo "エラー: プロジェクト名に使用できるのは英数字、ハイフン、アンダースコアのみです" >&2
  exit 1
fi

# dataディレクトリの確認と作成
data_dir="${REPOSITORY_ROOT}/data"
if [ ! -d "$data_dir" ]; then
  mkdir -p "$data_dir"
  echo "📁 dataディレクトリを作成しました"
fi

# ファイルパスの設定
file_path="$data_dir/${project_name}.taskgraph.json"

# 既存ファイルのチェック
if [ -f "$file_path" ]; then
  echo "エラー: プロジェクト '$project_name' は既に存在します" >&2
  exit 1
fi

# プロジェクトファイルの作成
cat > "$file_path" << EOF
{
  "info": {
    "name": "$project_name"
  },
  "tasks": []
}
EOF

echo "✅ プロジェクト '$project_name' を作成しました"
echo "📍 ファイル: $file_path"
echo ""
echo "次のステップ:"
echo "1. 'tg run' でアプリケーションを起動"
echo "2. ブラウザで http://localhost:5353 にアクセス"
echo "3. '$project_name' プロジェクトを選択して編集開始"