import { ref, watch } from 'vue';

import { PROJECT_CONSTANTS } from '@/constants';

export interface Project {
  id: string;
  name: string;
}

export const useProject = () => {
  const selectedProjectId = ref<string>('');
  const selectedProjectNumber = ref<number | undefined>();
  const projects = ref<Project[]>([]);
  const isLoading = ref(false);

  // LocalStorageから選択されたプロジェクトIDとprojectNumberを読み込み
  const loadSelectedProject = () => {
    const savedId = localStorage.getItem(PROJECT_CONSTANTS.STORAGE_KEY);
    if (savedId) {
      selectedProjectId.value = savedId;
    }
    const savedNumber = localStorage.getItem(
      PROJECT_CONSTANTS.STORAGE_KEY_NUMBER,
    );
    if (savedNumber) {
      const parsed = parseInt(savedNumber, 10);
      if (!isNaN(parsed)) {
        selectedProjectNumber.value = parsed;
      }
    }
  };

  // プロジェクト一覧を取得
  const fetchProjects = async (): Promise<Project[]> => {
    isLoading.value = true;
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projectList = await response.json();
      projects.value = projectList;
      return projectList;
    } catch (error) {
      console.error('プロジェクト一覧取得エラー:', error);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  // プロジェクトを選択
  const selectProject = (projectId: string, projectNumber?: number) => {
    if (projectId) {
      selectedProjectId.value = projectId;
      localStorage.setItem(PROJECT_CONSTANTS.STORAGE_KEY, projectId);

      // projectNumberの保存
      if (projectNumber !== undefined) {
        selectedProjectNumber.value = projectNumber;
        localStorage.setItem(
          PROJECT_CONSTANTS.STORAGE_KEY_NUMBER,
          projectNumber.toString(),
        );
      } else {
        // projectNumberが未定義の場合はlocalStorageから削除
        selectedProjectNumber.value = undefined;
        localStorage.removeItem(PROJECT_CONSTANTS.STORAGE_KEY_NUMBER);
      }
    }
  };

  // 選択されたプロジェクトIDの変更を監視
  watch(selectedProjectId, (newProjectId) => {
    if (newProjectId) {
      localStorage.setItem(PROJECT_CONSTANTS.STORAGE_KEY, newProjectId);
    }
  });

  // 選択されたprojectNumberの変更を監視
  watch(selectedProjectNumber, (newProjectNumber) => {
    if (newProjectNumber !== undefined) {
      localStorage.setItem(
        PROJECT_CONSTANTS.STORAGE_KEY_NUMBER,
        newProjectNumber.toString(),
      );
    }
  });

  // 初期化時にLocalStorageから読み込み
  loadSelectedProject();

  return {
    selectedProjectId,
    selectedProjectNumber,
    projects,
    isLoading,
    fetchProjects,
    selectProject,
  };
};
