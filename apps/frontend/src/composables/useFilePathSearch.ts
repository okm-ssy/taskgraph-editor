import Fuse from 'fuse.js';
import { ref, computed } from 'vue';

interface FileItem {
  path: string;
  name: string;
  directory: string;
}

export function useFilePathSearch(rootPath: string) {
  const searchQuery = ref('');
  const files = ref<FileItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Fuse.jsの設定
  const fuseOptions = {
    keys: ['path', 'name'],
    threshold: 0.3,
    includeScore: true,
  };

  const fuse = computed(() => {
    if (files.value.length === 0) return null;
    return new Fuse(files.value, fuseOptions);
  });

  // 検索結果
  const searchResults = computed(() => {
    if (!searchQuery.value || !fuse.value) {
      return files.value.slice(0, 100); // 最初の100件を表示
    }

    const results = fuse.value.search(searchQuery.value);
    return results.map((result) => result.item).slice(0, 100); // 最初の100件を表示
  });

  // ファイル一覧を取得する関数（実際の実装では、APIやNode.jsのfsモジュールを使用）
  const loadFiles = async () => {
    if (!rootPath) {
      error.value = 'ルートパスが設定されていません';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // TODO: 実際の実装では、バックエンドAPIを呼び出してファイル一覧を取得
      // 現在はサンプルデータを使用
      const sampleFiles: FileItem[] = [
        {
          path: 'src/components/common/Button.vue',
          name: 'Button.vue',
          directory: 'src/components/common',
        },
        {
          path: 'src/components/editor/TaskDetailDialog.vue',
          name: 'TaskDetailDialog.vue',
          directory: 'src/components/editor',
        },
        {
          path: 'src/store/task_store.ts',
          name: 'task_store.ts',
          directory: 'src/store',
        },
        {
          path: 'src/model/Taskgraph.ts',
          name: 'Taskgraph.ts',
          directory: 'src/model',
        },
        {
          path: 'src/utilities/task.ts',
          name: 'task.ts',
          directory: 'src/utilities',
        },
        { path: 'package.json', name: 'package.json', directory: '.' },
        { path: 'README.md', name: 'README.md', directory: '.' },
        {
          path: 'src/composables/useTaskCategories.ts',
          name: 'useTaskCategories.ts',
          directory: 'src/composables',
        },
        {
          path: 'src/constants/index.ts',
          name: 'index.ts',
          directory: 'src/constants',
        },
      ];

      files.value = sampleFiles;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : '不明なエラーが発生しました';
    } finally {
      isLoading.value = false;
    }
  };

  // 検索クエリをリセット
  const clearSearch = () => {
    searchQuery.value = '';
  };

  return {
    searchQuery,
    searchResults,
    isLoading,
    error,
    loadFiles,
    clearSearch,
  };
}
