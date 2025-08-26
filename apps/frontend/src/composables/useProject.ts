import { ref, watch } from 'vue';

import { PROJECT_CONSTANTS } from '@/constants';
import { apiService } from '@/services/api';

export interface Project {
  id: string;
  name: string;
}

export const useProject = () => {
  const selectedProjectId = ref<string>('');
  const projects = ref<Project[]>([]);
  const isLoading = ref(false);

  // LocalStorageから選択されたプロジェクトIDを読み込み
  const loadSelectedProject = () => {
    const saved = localStorage.getItem(PROJECT_CONSTANTS.STORAGE_KEY);
    if (saved) {
      selectedProjectId.value = saved;
    }
  };

  // プロジェクト一覧を取得
  const fetchProjects = async (): Promise<Project[]> => {
    isLoading.value = true;
    try {
      const projectList = await apiService.fetchProjects();
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
  const selectProject = (projectId: string) => {
    if (projectId) {
      selectedProjectId.value = projectId;
      localStorage.setItem(PROJECT_CONSTANTS.STORAGE_KEY, projectId);
    }
  };

  // 選択されたプロジェクトIDの変更を監視
  watch(selectedProjectId, (newProjectId) => {
    if (newProjectId) {
      localStorage.setItem(PROJECT_CONSTANTS.STORAGE_KEY, newProjectId);
    }
  });

  // 初期化時にLocalStorageから読み込み
  loadSelectedProject();

  return {
    selectedProjectId,
    projects,
    isLoading,
    fetchProjects,
    selectProject,
  };
};
