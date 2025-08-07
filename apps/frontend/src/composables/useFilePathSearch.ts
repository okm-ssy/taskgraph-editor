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

  // ファイル一覧を取得する関数
  const loadFiles = async () => {
    if (!rootPath) {
      error.value = 'ルートパスが設定されていません';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // APIを呼び出してファイル一覧を取得
      const response = await fetch(
        `/api/file-list?rootPath=${encodeURIComponent(rootPath)}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ファイル一覧の取得に失敗しました');
      }

      const data = await response.json();
      files.value = data.files || [];
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
