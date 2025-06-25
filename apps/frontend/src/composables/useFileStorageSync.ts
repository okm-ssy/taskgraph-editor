import { ref } from 'vue';

import { useCurrentTasks } from '../store/task_store';

export const useFileStorageSync = () => {
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
   * API経由でファイルに自動保存
   */
  const syncToFile = async () => {
    if (isSyncing.value) return false;

    isSyncing.value = true;
    try {
      const jsonData = taskStore.exportTaskgraphToJson();
      const response = await fetch('/api/save-taskgraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
      });

      if (!response.ok) {
        throw new Error('Failed to sync to file');
      }

      lastSyncTime.value = new Date();
      return true;
    } catch (error) {
      console.error('Failed to sync to file:', error);
      return false;
    } finally {
      isSyncing.value = false;
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
    syncToFile,
    getSyncStatus,
  };
};
