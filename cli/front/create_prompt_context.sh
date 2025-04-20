#!/bin/bash

set -eu

# 環境変数 REPOSITORY_ROOT が設定されていることを確認
if [ -z "${REPOSITORY_ROOT:-}" ]; then
  echo "環境変数 REPOSITORY_ROOT が設定されていません。" 1>&2
  exit 1
fi

# 出力ファイル名
OUTPUT_FILE="/tmp/combined_code.txt"

# 処理対象のディレクトリ（デフォルトは model と store）
TARGETS=("model" "store")

# 引数があれば処理対象のディレクトリとして設定
if [ $# -gt 0 ]; then
  TARGETS=("$@")
fi

cat >"$OUTPUT_FILE" <<-EOF
# コード結合ファイル
# 作成日時: $(date '+%Y-%m-%d %H:%M:%S')
# 対象ディレクトリ: ${TARGETS[@]}

EOF

# 各対象ディレクトリを処理
for target in "${TARGETS[@]}"; do
  # ディレクトリヘッダー
  cat >>"$OUTPUT_FILE" <<EOF

# ${target^^} ディレクトリ構造
# ==================================================

EOF

  # ディレクトリのファイルを処理
  TARGET_DIR="${REPOSITORY_ROOT}/apps/frontend/src/${target}"
  if [ -d "$TARGET_DIR" ]; then
    find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.vue" \) ! -name "*stories.ts" | sort | while read -r file; do
      filename=$(basename "$file")
      relpath=$(realpath --relative-to="$TARGET_DIR" "$(dirname "$file")")

      # ファイル情報をヘッダーに追加
      if [ "$relpath" = "." ]; then
        echo "# ファイル: ${filename}" >>"$OUTPUT_FILE"
      else
        echo "# ファイル: ${relpath}/${filename}" >>"$OUTPUT_FILE"
      fi

      echo "# --------------------------------------------------" >>"$OUTPUT_FILE"
      echo "" >>"$OUTPUT_FILE"

      # ファイル内容を追加
      cat "$file" >>"$OUTPUT_FILE"
      echo "" >>"$OUTPUT_FILE"
      echo "# --------------------------------------------------" >>"$OUTPUT_FILE"
      echo "" >>"$OUTPUT_FILE"
    done
  else
    echo "# ディレクトリ ${TARGET_DIR} は存在しません" >>"$OUTPUT_FILE"
    echo "" >>"$OUTPUT_FILE"
  fi
done

# クリップボードにコピー
if command -v clip.exe &>/dev/null; then
  # WSL環境
  cat "$OUTPUT_FILE" | clip.exe
  echo 'クリップボードにコピーしました' 1>&2
elif command -v xclip &>/dev/null; then
  # Linux環境
  cat "$OUTPUT_FILE" | xclip -selection clipboard
  echo 'クリップボードにコピーしました' 1>&2
elif command -v pbcopy &>/dev/null; then
  # macOS環境
  cat "$OUTPUT_FILE" | pbcopy
  echo 'クリップボードにコピーしました' 1>&2
else
  echo 'クリップボードにコピーできません。対応するコマンドがインストールされていません。' 1>&2
  exit 0
fi

# 一時ファイルを削除
rm -f "${OUTPUT_FILE}"
