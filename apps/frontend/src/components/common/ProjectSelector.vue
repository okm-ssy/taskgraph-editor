<template>
  <div class="project-selector">
    <select
      id="project-select"
      v-model="selectedProjectId"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      :disabled="isLoading"
      @change="handleProjectChange"
    >
      <option value="" disabled>プロジェクトを選択してください</option>
      <option v-if="isLoading" value="" disabled>読み込み中...</option>
      <option
        v-for="project in projects"
        :key="project.id"
        :value="project.id"
      >
        {{ project.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import { useProject } from '@/composables/useProject';

const { selectedProjectId, projects, isLoading, fetchProjects, selectProject } = useProject();

const handleProjectChange = () => {
  if (selectedProjectId.value) {
    selectProject(selectedProjectId.value);
    // プロジェクト変更時にページをリロードしてデータを更新
    window.location.reload();
  }
};

onMounted(async () => {
  await fetchProjects();
});
</script>

<style scoped>
.project-selector {
  min-width: 200px;
}
</style>