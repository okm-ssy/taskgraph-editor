<template>
  <div class="project-selector">
    <div class="flex gap-2">
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
      <button
        class="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        :disabled="isLoading || showCreateForm"
        @click="showCreateForm = true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          ></path>
        </svg>
      </button>
    </div>

    <!-- 新規プロジェクト作成フォーム -->
    <div
      v-if="showCreateForm"
      class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 class="text-lg font-semibold mb-4">新規プロジェクト作成</h3>
        <input
          v-model="newProjectName"
          type="text"
          placeholder="プロジェクト名（英数字、ハイフン、アンダースコアのみ）"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          @keyup.enter="createProject"
        />
        <div v-if="createError" class="mt-2 text-red-600 text-sm">
          {{ createError }}
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            @click="cancelCreate"
          >
            キャンセル
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            :disabled="!newProjectName || isCreating"
            @click="createProject"
          >
            {{ isCreating ? '作成中...' : '作成' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useProject } from '@/composables/useProject';

const { selectedProjectId, projects, isLoading, fetchProjects, selectProject } =
  useProject();

const showCreateForm = ref(false);
const newProjectName = ref('');
const createError = ref('');
const isCreating = ref(false);

const handleProjectChange = () => {
  if (selectedProjectId.value) {
    selectProject(selectedProjectId.value);
    // プロジェクト変更時にページをリロードしてデータを更新
    window.location.reload();
  }
};

const createProject = async () => {
  if (!newProjectName.value) return;

  // バリデーション
  if (!/^[a-zA-Z0-9_-]+$/.test(newProjectName.value)) {
    createError.value =
      'プロジェクト名に使用できるのは英数字、ハイフン、アンダースコアのみです';
    return;
  }

  isCreating.value = true;
  createError.value = '';

  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newProjectName.value }),
    });

    const data = await response.json();

    if (!response.ok) {
      createError.value = data.error || 'プロジェクトの作成に失敗しました';
      return;
    }

    // 成功したら、プロジェクトリストを更新して新しいプロジェクトを選択
    await fetchProjects();
    selectProject(data.project.id);
    showCreateForm.value = false;
    newProjectName.value = '';
    // ページをリロードして新しいプロジェクトを読み込む
    window.location.reload();
  } catch (error) {
    createError.value = 'プロジェクトの作成中にエラーが発生しました';
    console.error('Failed to create project:', error);
  } finally {
    isCreating.value = false;
  }
};

const cancelCreate = () => {
  showCreateForm.value = false;
  newProjectName.value = '';
  createError.value = '';
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
