// ファイル拡張子ごとの色定義（プロジェクトの実際の使用状況に基づく）
export const FILE_EXTENSION_COLORS: Record<string, string> = {
  // 最も使用頻度が高い言語
  ts: 'text-blue-600', // 1148件 - TypeScript
  rs: 'text-orange-700', // 791件 - Rust
  vue: 'text-green-600', // 787件 - Vue
  sql: 'text-blue-500', // 769件 - SQL

  // Ruby関連
  rb: 'text-red-600', // 312件 - Ruby
  erb: 'text-red-500', // 2件 - Embedded Ruby
  rake: 'text-red-700', // 1件 - Rake

  // データファイル
  csv: 'text-green-500', // 179件 - CSV
  json: 'text-orange-600', // 140件 - JSON

  // 設定ファイル（YAML）
  yaml: 'text-purple-600', // 176件 - YAML
  yml: 'text-purple-600', // 162件 - YAML

  // シェルスクリプト
  sh: 'text-green-700', // 91件 - Shell

  // ドキュメント
  md: 'text-gray-600', // 81件 - Markdown
  txt: 'text-gray-500', // 1件 - Text

  // テンプレート
  ejs: 'text-amber-600', // 72件 - EJS
  hbs: 'text-orange-500', // 8件 - Handlebars

  // Web技術
  html: 'text-orange-500', // 4件 - HTML
  css: 'text-pink-600', // 1件 - CSS
  scss: 'text-pink-700', // 8件 - SCSS
  js: 'text-yellow-600', // 12件 - JavaScript
  mjs: 'text-yellow-700', // 2件 - ES Module JS

  // 画像・アセット
  svg: 'text-teal-700', // 56件 - SVG
  png: 'text-teal-600', // 11件 - PNG

  // Python
  py: 'text-blue-500', // 28件 - Python

  // 設定・ビルドファイル
  toml: 'text-purple-500', // 24件 - TOML
  lock: 'text-gray-400', // 14件 - Lock files
  env: 'text-yellow-700', // 5件 - Environment
  properties: 'text-gray-600', // 4件 - Properties
  conf: 'text-gray-600', // 3件 - Config

  // Git関連
  gitignore: 'text-gray-500', // 23件 - Git ignore
  gitmodules: 'text-gray-500', // 1件 - Git submodules
  gitattributes: 'text-gray-500', // 1件 - Git attributes
  gitleaksignore: 'text-gray-500', // 1件 - GitLeaks ignore

  // NPM関連
  npmrc: 'text-red-500', // 2件 - NPM config
  npmignore: 'text-gray-500', // 2件 - NPM ignore

  // バージョン管理ファイル
  'ruby-version': 'text-red-400', // 4件 - Ruby version
  'node-version': 'text-green-400', // 3件 - Node version

  // Docker
  dockerignore: 'text-blue-400', // 1件 - Docker ignore

  // その他
  keep: 'text-gray-400', // 21件 - Keep files
  pem: 'text-yellow-500', // 1件 - Certificate
  jar: 'text-red-700', // 2件 - Java Archive
  gz: 'text-gray-600', // 1件 - Gzip
  enc: 'text-red-500', // 1件 - Encrypted
  drawio: 'text-blue-300', // 3件 - Draw.io
  'code-snippets': 'text-purple-400', // 5件 - VS Code snippets
  'code-workspace': 'text-purple-400', // 1件 - VS Code workspace
  browserslistrc: 'text-gray-500', // 2件 - Browserslist
  eslintrc: 'text-purple-500', // 1件 - ESLint config
  config: 'text-gray-600', // 1件 - Config

  // 特殊なファイル名（カード名？）
  queen: 'text-purple-700',
  king: 'text-yellow-700',
  jack: 'text-red-700',
  ace: 'text-black',
  pu: 'text-blue-400',
  ru: 'text-red-400',

  // ログイン関連
  'development-login-local': 'text-green-400',
  'development-login-asparagus': 'text-green-500',
};

// デフォルトの色
export const DEFAULT_FILE_COLOR = 'text-gray-700';

// 拡張子を取得するヘルパー関数
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    // .test.ts のような複合拡張子に対応
    if (
      parts.length > 2 &&
      (parts[parts.length - 2] === 'test' || parts[parts.length - 2] === 'spec')
    ) {
      return parts[parts.length - 2];
    }
    return parts[parts.length - 1].toLowerCase();
  }
  // ドットなしファイル（.gitignoreなど）
  return filename.toLowerCase().replace('.', '');
}

// ファイル名から色クラスを取得
export function getFileColorClass(filename: string): string {
  const ext = getFileExtension(filename);
  return FILE_EXTENSION_COLORS[ext] || DEFAULT_FILE_COLOR;
}
