import { useTitle } from '@vueuse/core';
import { computed, watch } from 'vue';

import { useProject } from './useProject';

export const useAppTitle = () => {
  const { selectedProjectId, projects } = useProject();

  // プロジェクト名を取得
  const currentProjectName = computed(() => {
    if (!selectedProjectId.value) return null;
    const project = projects.value.find(
      (p) => p.id === selectedProjectId.value,
    );
    return project?.name || selectedProjectId.value;
  });

  // タイトルを計算
  const title = computed(() => {
    if (currentProjectName.value) {
      return `[${currentProjectName.value}] Taskgraph Editor`;
    }
    return 'Taskgraph Editor';
  });

  // VueUseのuseTitleを使用してブラウザタイトルを管理
  const browserTitle = useTitle(title.value);

  // タイトルが変わったらブラウザタイトルを更新
  watch(title, (newTitle) => {
    browserTitle.value = newTitle;
  });

  return {
    title,
    browserTitle,
  };
};
