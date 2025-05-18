#!/bin/bash

# 使用方法を表示する関数
usage() {
  echo "使用方法: $0 <入力フォルダ> <出力ファイル>"
  echo "  <入力フォルダ>: Gitリポジトリのパス"
  echo "  <出力ファイル>: 結果を出力するファイルのパス"
  exit 1
}

# 引数のチェック
if [ $# -ne 2 ]; then
  usage
fi

INPUT_DIR="$1"
OUTPUT_FILE="$2"

# 絶対パスに変換
OUTPUT_FILE_ABS=$(realpath "$OUTPUT_FILE")

# 入力ディレクトリの存在確認
if [ ! -d "$INPUT_DIR" ]; then
  echo "エラー: 入力フォルダ '$INPUT_DIR' が見つかりません。"
  exit 1
fi

# 入力ディレクトリがGitリポジトリかチェック
if [ ! -d "$INPUT_DIR/.git" ]; then
  echo "エラー: 入力フォルダ '$INPUT_DIR' はGitリポジトリではありません。"
  exit 1
fi

# 出力ファイルを初期化
>"$OUTPUT_FILE"

# 現在のディレクトリを保存
CURRENT_DIR=$(pwd)

# 入力ディレクトリに移動
cd "$INPUT_DIR"

# Git管理下のファイルを取得して処理
git ls-files | while read -r file; do
  # 出力ファイル自体は処理しない
  file_abs=$(realpath "$file")
  if [ "$file_abs" = "$OUTPUT_FILE_ABS" ]; then
    continue
  fi

  # file コマンドでファイルタイプをチェック
  file_type=$(file -b --mime-type "$file")

  # テキストファイルのみ処理する
  if [[ $file_type == text/* || $file_type == application/json || $file_type == application/xml || $file_type == application/javascript ]]; then
    echo "========================================" >>"$OUTPUT_FILE"
    echo "ファイルパス: $file" >>"$OUTPUT_FILE"
    echo "========================================" >>"$OUTPUT_FILE"
    cat "$file" >>"$OUTPUT_FILE"
    echo -e "\n\n" >>"$OUTPUT_FILE"
  fi
done

# 元のディレクトリに戻る
cd "$CURRENT_DIR"

echo "完了！Git管理下のすべてのテキストファイルが '$OUTPUT_FILE' にマージされました。"
