import { computed } from 'vue';

import { useProject } from '@/composables/useProject';
import type { Task } from '@/model/Taskgraph';
import type { ProjectInfo } from '@/model/Taskgraph';
import { useCurrentTasks } from '@/store/task_store';

export function useTaskExport() {
  const taskStore = useCurrentTasks();

  const exportedTasks = computed(() => {
    return taskStore.tasks;
  });

  const projectInfo = computed(() => {
    return taskStore.info;
  });

  function topologicalSort(tasks: Task[]): Task[] {
    const visited = new Set<string>();
    const result: Task[] = [];
    const visiting = new Set<string>();

    const taskMap = new Map<string, Task>();
    tasks.forEach((task) => taskMap.set(task.name, task));

    function visit(taskName: string): void {
      if (visited.has(taskName)) return;

      if (visiting.has(taskName)) {
        throw new Error(`循環依存が検出されました: ${taskName}`);
      }

      visiting.add(taskName);

      const task = taskMap.get(taskName);
      if (task) {
        task.depends.forEach((dep) => {
          if (taskMap.has(dep)) {
            visit(dep);
          }
        });

        visited.add(taskName);
        result.push(task);
      }

      visiting.delete(taskName);
    }

    tasks.forEach((task) => visit(task.name));

    return result;
  }

  function generateRequirements(tasks: Task[], info: ProjectInfo): string {
    const sortedTasks = topologicalSort(tasks);

    const businessPurpose = info.addition?.business_purpose || '未設定';
    const targetUsers = info.addition?.target_users || '未設定';
    const businessContext = info.addition?.current_problem || '未設定';

    let content = `# ${info.name} - 要件定義\n\n`;
    content += `## プロジェクト概要\n\n`;
    content += `### ビジネス背景\n\n`;
    content += `- **目的**: ${businessPurpose}\n`;
    content += `- **対象ユーザー**: ${targetUsers}\n`;
    content += `- **ビジネス背景**: ${businessContext}\n\n`;
    content += `\n## タスク別要件\n`;

    sortedTasks.forEach((task, index) => {
      if (index > 0) content += '\n---\n';
      content += `\n### ${task.name}\n\n`;
      content += `**概要**: ${task.description}\n\n`;

      content += `**受け入れ基準**:\n`;
      if (
        task.addition?.requirements &&
        task.addition.requirements.length > 0
      ) {
        task.addition.requirements.forEach((req) => {
          content += `- ${req}\n`;
        });
      } else {
        content += '未設定\n';
      }

      if (task.notes && task.notes.length > 0) {
        content += `\n**備考**:\n`;
        task.notes.forEach((note) => {
          content += `- ${note}\n`;
        });
      }
    });

    return content;
  }

  // 画像IDからパスを取得する関数
  function getImagePath(imageId: string, info: ProjectInfo): string {
    // プロジェクト情報の design_images から ID でパスを検索
    const projectImage = info.addition?.design_images?.find(
      (img) => img.id === imageId,
    );

    if (projectImage) {
      return projectImage.path;
    }

    // プロジェクトに登録されていない場合は、IDをそのまま返す
    // （既にパスの場合や、外部URLの場合に対応）
    return imageId;
  }

  function generateDesign(tasks: Task[], info: ProjectInfo): string {
    const sortedTasks = topologicalSort(tasks);

    let content = `# ${info.name} - 設計仕様\n\n`;
    content += `## プロジェクト情報\n\n`;
    if (info.github) {
      content += `- **リポジトリ**: ${info.github.organization}/${info.github.repository}\n`;
      content += `- **プロジェクト**: #${info.github.projectNumber}\n`;
    }

    sortedTasks.forEach((task, index) => {
      if (index > 0) content += '\n---\n';
      content += `\n\n## ${task.name}\n\n`;
      content += `### 概要\n\n`;
      content += `${task.description}\n\n`;

      if (
        task.addition?.design_images &&
        task.addition.design_images.length > 0
      ) {
        content += `### 画面設計\n\n`;
        task.addition.design_images.forEach((img: string) => {
          // 画像IDを絶対パスに変換
          const imagePath = getImagePath(img, info);
          content += `![画面設計](${imagePath})\n`;
        });
        content += '\n';
      }

      content += `\n### 実装方針\n\n`;
      if (
        task.addition?.implementation_notes &&
        task.addition.implementation_notes.length > 0
      ) {
        task.addition.implementation_notes.forEach((note) => {
          content += `- ${note}\n`;
        });
      } else {
        content += '未設定\n';
      }

      content += `\n### API仕様\n\n`;
      if (task.addition?.api_schemas && task.addition.api_schemas.length > 0) {
        task.addition.api_schemas.forEach((api) => {
          content += `- ${api}\n`;
        });
      } else {
        content += 'なし\n';
      }

      if (task.issueNumber) {
        content += `\n### 関連Issue\n\n`;
        content += `- GitHub Issue: #${task.issueNumber}\n`;
      }

      // 関連ファイルの追加
      if (task.addition?.relations && task.addition.relations.length > 0) {
        content += `\n### 関連ファイル\n\n`;

        content += `**関連ファイル**:\n`;
        task.addition.relations.forEach((filePath) => {
          content += `- \`${filePath}\`\n`;
        });

        // 注意: 現在は区別せずに全てを関連ファイルとして出力
        // 将来的にファイル存在チェックを実装する場合は既存/新規ファイルを分類可能
      }
    });

    return content;
  }

  function generateProgress(tasks: Task[], info: ProjectInfo): string {
    const sortedTasks = topologicalSort(tasks);

    let content = `# ${info.name} - 実装進捗\n\n`;
    content += `## 実装順序（依存関係順）\n\n`;

    sortedTasks.forEach((task, index) => {
      const paddedIndex = String(index + 1).padStart(3, '0');
      const difficulty = task.difficulty || 0;
      const field = task.addition?.field || '未設定';
      const category = task.addition?.category || '未設定';
      const depends =
        task.depends.length > 0 ? task.depends.join(', ') : 'なし';

      content += `- [ ] **${paddedIndex}** ${task.name} \`${difficulty}h\`\n`;
      content += `  - [要件](REQUIREMENTS.md#${encodeURIComponent(task.name)}) | [設計](DESIGN.md#${encodeURIComponent(task.name)})\n`;
      content += `  - **依存**: ${depends}\n`;
      content += `  - **分野**: ${field} | **分類**: ${category}\n`;
    });

    content += `\n## 実装方針\n\n`;
    content += `要件と設計を見て実装してください。\n`;
    content += `タスクの実装が終わったら、マークダウンのチェックボックスをチェックしてください。\n`;
    content += `タスクの実装が終わったら、次の実装はせず、方針を確認してください。\n`;
    content += `情報が足りないときは聞いてください。情報が不明なまま実装をしてはいけません。\n`;

    return content;
  }

  function exportToMarkdown() {
    const tasks = exportedTasks.value;
    const info = projectInfo.value;

    if (!tasks || tasks.length === 0) {
      throw new Error('エクスポートするタスクがありません');
    }

    if (!info) {
      throw new Error('プロジェクト情報がありません');
    }

    const requirements = generateRequirements(tasks, info);
    const design = generateDesign(tasks, info);
    const progress = generateProgress(tasks, info);

    return {
      'REQUIREMENTS.md': requirements,
      'DESIGN.md': design,
      'PROGRESS.md': progress,
    };
  }

  function downloadFiles() {
    try {
      const files = exportToMarkdown();
      const { selectedProjectId } = useProject();
      const projectId = selectedProjectId.value || 'project';

      Object.entries(files).forEach(([filename, content]) => {
        // ファイル名を ${project-id}-[TYPE].md 形式に変換
        const fileType = filename.replace('.md', '');
        const customFilename = `${projectId}-${fileType}.md`;

        const blob = new Blob([content], {
          type: 'text/markdown;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = customFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      return true;
    } catch (error) {
      console.error('エクスポートエラー:', error);
      return false;
    }
  }

  return {
    exportToMarkdown,
    downloadFiles,
  };
}
