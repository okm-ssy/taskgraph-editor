import { ref, watch } from 'vue';

import { STORAGE_KEYS } from '../constants';
import { useCurrentTasks } from '../store/task_store';

export const useLocalStorageSync = () => {
  const taskStore = useCurrentTasks();
  const isSyncing = ref(false);
  const lastSyncTime = ref<Date | null>(null);

  /**
   * LocalStorageのデータをファイルとしてダウンロードする
   */
  const exportToFile = async () => {
    try {
      const jsonData = taskStore.exportTaskgraphToJson();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'taskgraph-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      lastSyncTime.value = new Date();
      return true;
    } catch (error) {
      console.error('Failed to export taskgraph:', error);
      return false;
    }
  };

  /**
   * 手動でファイルをインポートする
   */
  const importFromFile = async (file: File) => {
    try {
      const text = await file.text();
      const success = taskStore.parseJsonToTaskgraph(text);
      if (success) {
        lastSyncTime.value = new Date();
      }
      return success;
    } catch (error) {
      console.error('Failed to import taskgraph:', error);
      return false;
    }
  };

  /**
   * MCPサーバー用の自動同期を設定
   * ブラウザのFile System Access APIを使用して特定の場所に自動保存
   */
  const setupAutoSync = async () => {
    // File System Access APIがサポートされているかチェック
    if (!('showSaveFilePicker' in window)) {
      console.warn('File System Access API is not supported');
      return false;
    }

    try {
      // ユーザーに保存場所を選択させる（初回のみ）
      const handle = await (
        window as unknown as {
          showSaveFilePicker: (options: unknown) => Promise<unknown>;
        }
      ).showSaveFilePicker({
        suggestedName: 'taskgraph-data.json',
        types: [
          {
            description: 'JSON files',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      // LocalStorageの変更を監視して自動保存
      const stopWatcher = watch(
        () => localStorage.getItem(STORAGE_KEYS.TASKGRAPH_DATA),
        async (newValue) => {
          if (!newValue || isSyncing.value) return;

          isSyncing.value = true;
          try {
            const writable = await handle.createWritable();
            await writable.write(newValue);
            await writable.close();
            lastSyncTime.value = new Date();
          } catch (error) {
            console.error('Failed to sync to file:', error);
          } finally {
            isSyncing.value = false;
          }
        },
      );

      return stopWatcher;
    } catch (error) {
      console.error('Failed to setup auto sync:', error);
      return false;
    }
  };

  /**
   * 同期ステータスの取得
   */
  const getSyncStatus = () => {
    return {
      isSyncing: isSyncing.value,
      lastSyncTime: lastSyncTime.value,
    };
  };

  return {
    exportToFile,
    importFromFile,
    setupAutoSync,
    getSyncStatus,
  };
};
