<template>
  <div
    v-if="uiStore.isDetailDialogVisible"
    class="fixed inset-0 bg-black/50 z-50"
    @mousedown="handleOverlayMouseDown"
    @click="handleOverlayClick"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-[70vw] mx-4 absolute"
      :style="modalPosition"
    >
      <div class="border-b px-6 py-4">
        <h3 class="text-lg font-medium">タスク詳細</h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6">
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1"
            >タスク名</label
          >
          <input
            id="name"
            v-model="nameInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div class="mb-4">
          <label
            for="description"
            class="block text-sm font-medium text-gray-700 mb-1"
            >概要(1行)</label
          >
          <input
            id="description"
            v-model="descriptionInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="タスクの概要を1行で入力してください"
          />
        </div>

        <div class="mb-4">
          <label
            for="notes"
            class="block text-sm font-medium text-gray-700 mb-1"
            >説明</label
          >
          <textarea
            id="notes"
            v-model="notesInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="5"
            placeholder="詳細な説明やメモを入力してください"
          />
        </div>

        <div class="mb-4">
          <label
            for="relations"
            class="block text-sm font-medium text-gray-700 mb-1"
            >関連ファイル</label
          >
          <textarea
            id="relations"
            v-model="relationsInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="3"
            placeholder="関連するファイルパスを1行ずつ入力してください"
          />
        </div>

        <div class="mb-4">
          <label
            for="category"
            class="block text-sm font-medium text-gray-700 mb-1"
            >カテゴリ</label
          >
          <select
            id="category"
            v-model="categoryInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            @change="onCategoryChange"
          >
            <option value="">カテゴリを選択してください</option>
            <option
              v-for="category in allCategories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label
            for="difficulty"
            class="block text-sm font-medium text-gray-700 mb-1"
            >難易度 (0以上)</label
          >
          <input
            id="difficulty"
            v-model="difficultyInput"
            type="number"
            min="0"
            step="0.5"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p v-if="categoryInput" class="text-xs text-gray-500 mt-1">
            カテゴリ「{{ categoryInput }}」の推奨難易度:
            {{ getDifficultyByCategory(categoryInput) }}
          </p>
        </div>

        <!-- エラーメッセージ表示 -->
        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
        >
          {{ errorMessage }}
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
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

import { useTaskCategories } from '../../composables/useTaskCategories';
import { LAYOUT } from '../../constants';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const { allCategories, getDifficultyByCategory } = useTaskCategories();

const nameInput = ref('');
const descriptionInput = ref('');
const notesInput = ref('');
const relationsInput = ref('');
const difficultyInput = ref(0);
const categoryInput = ref('');

// ドラッグ検出用の状態
const isDragging = ref(false);
const dragStartedInDialog = ref(false);

// エラーメッセージ表示用の状態
const errorMessage = ref('');

// スクロール位置を考慮したモーダル位置の計算
const scrollPosition = ref({ x: 0, y: 0 });

const modalPosition = computed(() => {
  // gridContainerの位置を取得
  const gridContainer = document.querySelector(
    '.flex-1.overflow-auto.p-4.relative',
  ) as HTMLElement;

  if (!gridContainer) {
    return {
      top: `${LAYOUT.MODAL.MIN_MARGIN}px`,
      left: `${LAYOUT.MODAL.MIN_MARGIN}px`,
      transform: 'none',
    };
  }

  const containerRect = gridContainer.getBoundingClientRect();

  // gridContainerの最上部 + スクロール位置 + マージン
  const top = Math.max(
    containerRect.top + scrollPosition.value.y + LAYOUT.MODAL.MIN_MARGIN,
    containerRect.top + LAYOUT.MODAL.MIN_MARGIN,
  );
  const left = Math.max(
    containerRect.left + scrollPosition.value.x + LAYOUT.MODAL.MIN_MARGIN,
    containerRect.left + LAYOUT.MODAL.MIN_MARGIN,
  );

  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: 'none', // flexboxのcenterを無効化
  };
});

// スクロール位置を取得する関数
const updateScrollPosition = () => {
  // エディタグリッドのスクロールコンテナを取得（より具体的なクラス構成で特定）
  const gridContainer = document.querySelector(
    '.flex-1.overflow-auto.p-4.relative',
  ) as HTMLElement;
  if (gridContainer) {
    scrollPosition.value = {
      x: gridContainer.scrollLeft,
      y: gridContainer.scrollTop,
    };
  }
};

// コンポーネントマウント時にスクロール位置を取得
onMounted(() => {
  updateScrollPosition();
  // エディタ内のスクロールコンテナを対象にリスン
  const gridContainer = document.querySelector(
    '.flex-1.overflow-auto.p-4.relative',
  ) as HTMLElement;
  if (gridContainer) {
    gridContainer.addEventListener('scroll', updateScrollPosition);
  }
});

// コンポーネントアンマウント時にイベントリスナーを削除
onUnmounted(() => {
  const gridContainer = document.querySelector(
    '.flex-1.overflow-auto.p-4.relative',
  ) as HTMLElement;
  if (gridContainer) {
    gridContainer.removeEventListener('scroll', updateScrollPosition);
  }
});

// 選択中のタスクが変更されたら入力フィールドを更新
watch(
  () => taskStore.selectedTask,
  (newTask) => {
    if (newTask) {
      nameInput.value = newTask.task.name;
      descriptionInput.value = newTask.task.description;
      notesInput.value = newTask.task.notes.join('\n');
      relationsInput.value = newTask.task.relations?.join('\n') || '';
      difficultyInput.value = newTask.task.difficulty;
      categoryInput.value = newTask.task.category || '';
      // ダイアログが開かれたときはエラーメッセージをクリア
      errorMessage.value = '';
    }
  },
  { immediate: true },
);

// 入力値が変更されたらエラーメッセージをクリア
watch(
  [
    nameInput,
    descriptionInput,
    notesInput,
    relationsInput,
    difficultyInput,
    categoryInput,
  ],
  () => {
    if (errorMessage.value) {
      errorMessage.value = '';
    }
  },
);

// カテゴリが変更された時の処理
const onCategoryChange = () => {
  if (categoryInput.value) {
    const suggestedDifficulty = getDifficultyByCategory(categoryInput.value);
    if (suggestedDifficulty !== null) {
      difficultyInput.value = suggestedDifficulty;
    }
  }
};

// フォーム送信時の処理
const handleSubmit = () => {
  if (!taskStore.selectedTask) return;

  // エラーメッセージをクリア
  errorMessage.value = '';

  // タスク更新（依存関係は変更しない）
  const updateSuccess = taskStore.updateTask(taskStore.selectedTask.id, {
    name: nameInput.value,
    description: descriptionInput.value,
    notes: notesInput.value.split('\n'),
    relations: relationsInput.value.split('\n'),
    difficulty: difficultyInput.value,
    category: categoryInput.value,
  });

  if (!updateSuccess) {
    // 更新失敗時（タスク名重複など）はエラーメッセージを表示
    errorMessage.value =
      'タスク名が重複しています。別の名前を入力してください。';
    return;
  }

  // ダイアログを閉じる
  uiStore.closeDetailDialog();
};

const handleCancel = () => {
  // エラーメッセージをクリア
  errorMessage.value = '';
  uiStore.closeDetailDialog();
};

// オーバーレイでのマウスダウン検出
const handleOverlayMouseDown = (event: MouseEvent) => {
  // ダイアログ内容部分でマウスダウンされた場合はダイアログ内フラグを立てる
  const dialogContent = (event.currentTarget as Element).querySelector(
    '.bg-white',
  );
  if (dialogContent && dialogContent.contains(event.target as Node)) {
    dragStartedInDialog.value = true;
  } else {
    dragStartedInDialog.value = false;
  }
  isDragging.value = false;

  // マウス移動でドラッグ状態を検出
  const handleMouseMove = () => {
    isDragging.value = true;
  };

  // マウスアップでイベントリスナーを削除
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// オーバーレイクリックの処理
const handleOverlayClick = (event: MouseEvent) => {
  // ドラッグ操作だった場合はダイアログを閉じない
  if (isDragging.value) {
    return;
  }

  // ダイアログ内でマウスダウンが開始された場合はダイアログを閉じない
  if (dragStartedInDialog.value) {
    return;
  }

  // ダイアログの背景部分がクリックされた場合のみ閉じる
  if (event.target === event.currentTarget) {
    handleCancel();
  }
};
</script>

<style scoped></style>
