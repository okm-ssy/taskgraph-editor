<template>
  <div
    v-if="uiStore.isInfoDialogVisible"
    class="fixed inset-0 bg-black/50 z-50 pointer-events-auto"
    id="info-edit-dialog-overlay"
    @mousedown="handleOverlayMouseDown"
    @click="handleOverlayClick"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-[60vw] max-h-[80dvh] flex flex-col fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <div class="border-b px-6 py-4 flex-shrink-0">
        <h3 class="text-lg font-medium">プロジェクト情報編集</h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 overflow-y-auto flex-1">
        <div class="mb-4">
          <label
            for="project-name"
            class="block text-sm font-medium text-gray-700 mb-1"
            >プロジェクト名</label
          >
          <input
            id="project-name"
            v-model="nameInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="プロジェクト名を入力"
          />
        </div>

        <div class="mb-6 pb-6 border-b border-gray-200">
          <h4 class="text-sm font-semibold text-blue-600 mb-4">GitHub 情報</h4>

          <div class="mb-4">
            <label
              for="github-organization"
              class="block text-sm font-medium text-blue-700 mb-1"
              >Organization</label
            >
            <input
              id="github-organization"
              v-model="githubOrganizationInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="organization-name"
            />
          </div>

          <div class="mb-4">
            <label
              for="github-repository"
              class="block text-sm font-medium text-blue-700 mb-1"
              >Repository</label
            >
            <input
              id="github-repository"
              v-model="githubRepositoryInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="repository-name"
            />
          </div>

          <div class="mb-4">
            <label
              for="github-project-number"
              class="block text-sm font-medium text-blue-700 mb-1"
              >Project Number</label
            >
            <input
              id="github-project-number"
              v-model="githubProjectNumberInput"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="1"
            />
          </div>

          <div class="mb-4">
            <label
              for="github-tracking-issue"
              class="block text-sm font-medium text-blue-700 mb-1"
              >Tracking Issue Number</label
            >
            <input
              id="github-tracking-issue"
              v-model="githubTrackingIssueInput"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="123"
            />
          </div>
        </div>

        <div class="mb-4">
          <label
            for="version"
            class="block text-sm font-medium text-gray-700 mb-1"
            >バージョン</label
          >
          <input
            id="version"
            v-model="versionInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="1.0.0"
          />
        </div>

        <div class="mb-4">
          <label
            for="assignee"
            class="block text-sm font-medium text-gray-700 mb-1"
            >アサイニー</label
          >
          <input
            id="assignee"
            v-model="assigneeInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="担当者名"
          />
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            type="button"
            @click="handleCancel"
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();

const nameInput = ref('');
const githubOrganizationInput = ref('');
const githubRepositoryInput = ref('');
const githubProjectNumberInput = ref<number | null>(null);
const githubTrackingIssueInput = ref<number | null>(null);
const versionInput = ref('');
const assigneeInput = ref('');

// ドラッグ検出用の状態
const isDragging = ref(false);
const dragStartedInDialog = ref(false);

// ダイアログが開いている間、背景のスクロールを防ぐ
watch(
  () => uiStore.isInfoDialogVisible,
  (isVisible) => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true },
);

// コンポーネントがアンマウントされるときにも確実にスクロールを復元
onUnmounted(() => {
  document.body.style.overflow = '';
});

// info データが変更されたら入力フィールドを更新
watch(
  () => taskStore.info,
  (newInfo) => {
    if (newInfo) {
      nameInput.value = newInfo.name || '';
      githubOrganizationInput.value = newInfo.github?.organization || '';
      githubRepositoryInput.value = newInfo.github?.repository || '';
      githubProjectNumberInput.value = newInfo.github?.projectNumber || null;
      githubTrackingIssueInput.value =
        newInfo.github?.trackingIssueNumber || null;
      versionInput.value = newInfo.version || '';
      assigneeInput.value = newInfo.assignee || '';
    }
  },
  { immediate: true },
);

// フォーム送信時の処理
const handleSubmit = () => {
  const updatedInfo = {
    name: nameInput.value || undefined,
    version: versionInput.value || undefined,
    assignee: assigneeInput.value || undefined,
    github: {
      organization: githubOrganizationInput.value || undefined,
      repository: githubRepositoryInput.value || undefined,
      projectNumber: githubProjectNumberInput.value || undefined,
      trackingIssueNumber: githubTrackingIssueInput.value || undefined,
    },
  };

  // 空のgithubオブジェクトは削除
  if (
    !updatedInfo.github.organization &&
    !updatedInfo.github.repository &&
    !updatedInfo.github.projectNumber &&
    !updatedInfo.github.trackingIssueNumber
  ) {
    const { github: _github, ...infoWithoutGithub } = updatedInfo;
    taskStore.updateInfo(infoWithoutGithub);
  } else {
    taskStore.updateInfo(updatedInfo);
  }
  uiStore.closeInfoDialog();
};

const handleCancel = () => {
  uiStore.closeInfoDialog();
};

// オーバーレイでのマウスダウン検出
const handleOverlayMouseDown = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const isFormElement =
    target.matches('input, textarea, button, select') ||
    target.closest('input, textarea, button, select');

  if (isFormElement) {
    return;
  }

  const dialogContent = (event.currentTarget as Element).querySelector(
    '.bg-white',
  );
  if (dialogContent && dialogContent.contains(event.target as Node)) {
    dragStartedInDialog.value = true;
  } else {
    dragStartedInDialog.value = false;
  }
  isDragging.value = false;

  const handleMouseMove = () => {
    isDragging.value = true;
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// オーバーレイクリックの処理
const handleOverlayClick = (event: MouseEvent) => {
  if (isDragging.value) {
    return;
  }

  if (dragStartedInDialog.value) {
    return;
  }

  if (event.target === event.currentTarget) {
    handleCancel();
  }
};
</script>

<style scoped></style>
