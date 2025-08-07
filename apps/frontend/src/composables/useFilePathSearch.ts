import Fuse from 'fuse.js';
import { ref, computed } from 'vue';

interface FileItem {
  path: string;
  name: string;
  directory: string;
  searchKey?: string; // 検索用の正規化されたキー
}

export function useFilePathSearch(rootPath: string) {
  const searchQuery = ref('');
  const files = ref<FileItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Fuse.jsの設定
  const fuseOptions = {
    keys: [
      { name: 'searchKey', weight: 2 }, // 正規化されたキーを優先
      { name: 'path', weight: 1 },
      { name: 'name', weight: 1.5 },
    ],
    threshold: 0.4, // より柔軟なマッチング
    includeScore: true,
    ignoreLocation: true, // 文字の位置を無視
    useExtendedSearch: true,
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

    // 検索クエリも正規化
    const normalizedQuery = searchQuery.value
      .toLowerCase()
      .replace(/[/\-_.]/g, '')
      .replace(/\s+/g, '');

    // 通常の検索と正規化検索の両方を試す
    let results = fuse.value.search(searchQuery.value);

    // 結果が少ない場合は正規化したクエリでも検索
    if (
      results.length < 5 &&
      normalizedQuery !== searchQuery.value.toLowerCase()
    ) {
      const normalizedResults = fuse.value.search(normalizedQuery);
      // スコアでマージして重複を除去
      const mergedMap = new Map();
      [...results, ...normalizedResults].forEach((result) => {
        const path = result.item.path;
        if (
          !mergedMap.has(path) ||
          (mergedMap.get(path).score ?? 1) > (result.score ?? 0)
        ) {
          mergedMap.set(path, result);
        }
      });
      results = Array.from(mergedMap.values()).sort(
        (a, b) => (a.score ?? 0) - (b.score ?? 0),
      );
    }

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
      // 検索用のキーを生成（パスから特殊文字を除去）
      files.value = (data.files || []).map((file: FileItem) => ({
        ...file,
        searchKey: file.path
          .toLowerCase()
          .replace(/[/\-_.]/g, '') // スラッシュ、ハイフン、アンダースコア、ドットを除去
          .replace(/\s+/g, ''), // 空白を除去
      }));
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

  // ファイルが存在するかチェック
  const isFileExists = (filePath: string): boolean => {
    return files.value.some((file) => file.path === filePath);
  };

  return {
    searchQuery,
    searchResults,
    isLoading,
    error,
    loadFiles,
    clearSearch,
    isFileExists,
  };
}
