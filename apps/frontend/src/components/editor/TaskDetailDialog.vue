<template>
  <div
    v-if="uiStore.isDetailDialogVisible"
    class="absolute inset-0 bg-black/50 z-50 pointer-events-auto"
    @mousedown="handleOverlayMouseDown"
    @click="handleOverlayClick"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-[70vw] absolute"
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
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >難易度</label
          >
          <div class="grid grid-cols-4 gap-4">
            <!-- 左側：入力用（元の値） -->
            <div>
              <label for="difficulty" class="block text-xs text-gray-600 mb-1"
                >入力値 (0.5刻み)</label
              >
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  @click="decreaseDifficulty"
                  class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold transition-colors"
                  :disabled="difficultyInput <= 0"
                >
                  −
                </button>
                <input
                  id="difficulty"
                  v-model="difficultyInput"
                  type="number"
                  min="0"
                  step="0.1"
                  class="flex-1 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                />
                <button
                  type="button"
                  @click="increaseDifficulty"
                  class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold transition-colors"
                >
                  ＋
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1"
                >動作確認込み (×1.2)</label
              >
              <div
                class="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-center text-sm font-medium"
              >
                {{ Math.round(difficultyInput * 1.2 * 10) / 10 }}
              </div>
            </div>
          </div>
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

// スクロール位置を追跡
const scrollTop = ref(0);

// モーダルの位置（スクロールに追従）
const modalPosition = computed(() => {
  return {
    top: `${scrollTop.value + LAYOUT.MODAL.MIN_MARGIN}px`,
    left: `${LAYOUT.MODAL.MIN_MARGIN}px`,
  };
});

// スクロール位置を更新
const updateScrollPosition = () => {
  const container = document.querySelector('.overflow-auto');
  if (container) {
    scrollTop.value = container.scrollTop;
  }
};

onMounted(() => {
  updateScrollPosition();
  const container = document.querySelector('.overflow-auto');
  if (container) {
    container.addEventListener('scroll', updateScrollPosition);
  }
});

onUnmounted(() => {
  const container = document.querySelector('.overflow-auto');
  if (container) {
    container.removeEventListener('scroll', updateScrollPosition);
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

// 難易度の増減ボタン処理
const increaseDifficulty = () => {
  const newValue = difficultyInput.value + 0.5;
  difficultyInput.value = Math.round(newValue * 10) / 10; // 小数点誤差対策
};

const decreaseDifficulty = () => {
  const newValue = Math.max(0, difficultyInput.value - 0.5);
  difficultyInput.value = Math.round(newValue * 10) / 10; // 小数点誤差対策
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
