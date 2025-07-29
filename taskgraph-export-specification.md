# タスクエクスポート機能：JSON to 3ファイル マッピング仕様

## 概要
タスクグラフのJSONデータから、REQUIREMENTS.md / DESIGN.md / PROGRESS.md の3ファイルを生成する際のフィールド対応表とテンプレート。

## JSONフィールド対応表

### プロジェクト情報
| JSON Key | 出力先ファイル | 用途 |
|----------|---------------|------|
| `info.name` | 全ファイル | ヘッダータイトル |
| `info.github.*` | DESIGN.md | リポジトリ情報 |

### ビジネス情報（info.addition内）
| JSON Key | 出力先ファイル | 用途 |
|----------|---------------|------|
| `info.addition.business_purpose` | REQUIREMENTS.md | プロジェクト全体の目的・背景 |
| `info.addition.target_users` | REQUIREMENTS.md | プロジェクト対象ユーザー |
| `info.addition.business_context` | REQUIREMENTS.md | ビジネス背景・課題 |

### タスク基本情報
| JSON Key | 出力先ファイル | 用途 |
|----------|---------------|------|
| `name` | 全ファイル | タスク識別子・見出し |
| `description` | DESIGN.md | タスク概要説明 |
| `difficulty` | PROGRESS.md | 工数見積もり（時間） |
| `depends` | PROGRESS.md | 依存関係表示 |
| `notes` | REQUIREMENTS.md | 補足情報 |
| `issueNumber` | DESIGN.md | GitHub Issue リンク |

### 技術仕様（addition内）
| JSON Key | 出力先ファイル | 用途 |
|----------|---------------|------|
| `addition.category` | PROGRESS.md | タスク分類 |
| `addition.field` | PROGRESS.md | 担当領域（front/back/infra） |
| `addition.requirements` | REQUIREMENTS.md | テスト要件・受け入れ基準 |
| `addition.implementation_notes` | DESIGN.md | 実装指針・注意点 |
| `addition.api_schemas` | DESIGN.md | API仕様 |
| `addition.design_images` | DESIGN.md | 画面設計画像 |

### 除外フィールド
| JSON Key | 理由 |
|----------|------|
| `addition.layout` | エクスポート時は座標情報不要 |
| `addition.baseDifficulty` | `difficulty`と重複 |

---

## 出力ファイル別テンプレート

### REQUIREMENTS.md
```markdown
# ${info.name} - 要件定義

## プロジェクト概要

### ビジネス背景
- **目的**: ${info.addition?.business_purpose || "未設定"}
- **対象ユーザー**: ${info.addition?.target_users || "未設定"}
- **ビジネス背景**: ${info.addition?.business_context || "未設定"}

## タスク別要件

${tasks.map(task => `
### ${task.name}

**概要**: ${task.description}

**受け入れ基準**: 
${task.addition.requirements?.length > 0 ? task.addition.requirements.map(req => `- ${req}`).join('\n') : '未設定'}

${task.notes.length > 0 ? `**備考**: \n${task.notes.map(note => `- ${note}`).join('\n')}` : ''}
`).join('\n---\n')}
```

### DESIGN.md
```markdown
# ${info.name} - 設計仕様

## プロジェクト情報
- **リポジトリ**: ${info.github?.organization}/${info.github?.repository}
- **プロジェクト**: #${info.github?.projectNumber}

${tasks.map(task => `
## ${task.name}

### 概要
${task.description}

${task.addition.design_images?.length > 0 ? `### 画面設計\n${task.addition.design_images.map(img => `![画面設計](${img})`).join('\n')}` : ''}

### 実装方針
${task.addition.implementation_notes?.length > 0 ? task.addition.implementation_notes.map(note => `- ${note}`).join('\n') : '未設定'}

### API仕様
${task.addition.api_schemas?.length > 0 ? task.addition.api_schemas.map(api => `- ${api}`).join('\n') : 'なし'}

${task.issueNumber ? `### 関連Issue\n- GitHub Issue: #${task.issueNumber}` : ''}
`).join('\n---\n')}
```

### PROGRESS.md（メインファイル）
```markdown
# ${info.name} - 実装進捗

## 実装順序（依存関係順）

${topologicalSort(tasks).map((task, index) => `
- [ ] **${String(index + 1).padStart(3, '0')}** ${task.name} \`${task.difficulty}h\`
  - [要件](REQUIREMENTS.md#${encodeURIComponent(task.name)}) | [設計](DESIGN.md#${encodeURIComponent(task.name)})
  - **依存**: ${task.depends.length > 0 ? task.depends.join(', ') : 'なし'}
  - **分野**: ${task.addition.field || '未設定'} | **分類**: ${task.addition.category || '未設定'}
`).join('')}

## 進捗サマリー
- **総タスク数**: ${tasks.length}件
- **総見積工数**: ${tasks.reduce((sum, task) => sum + (task.difficulty || 0), 0)}時間
- **完了済み**: 0件
- **進行中**: 0件
- **未着手**: ${tasks.length}件
```

---

## 生成ロジック

### 1. トポロジカルソート
```javascript
function topologicalSort(tasks) {
  // 依存関係に基づく実装順序の算出
  // 循環依存の検出とエラーハンドリング
}
```

### 2. ファイル生成
```javascript
function generateFiles(jsonData) {
  const requirements = generateRequirements(jsonData);
  const design = generateDesign(jsonData);
  const progress = generateProgress(jsonData);
  
  return {
    'REQUIREMENTS.md': requirements,
    'DESIGN.md': design,  
    'PROGRESS.md': progress
  };
}
```

### 3. 新規フィールド追加時の対応
ビジネス要件フィールド（info.addition.business_purpose, info.addition.target_users, info.addition.business_context）は、既存JSONに追加予定。未設定時は「未設定」と表示。