<template>
  <div
    v-if="uiStore.isDetailDialogVisible"
    class="fixed inset-0 bg-black/50 z-50 pointer-events-auto"
    id="task-detail-dialog-overlay"
    @mousedown="handleOverlayMouseDown"
    @click="handleOverlayClick"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-[70vw] max-h-[90dvh] flex flex-col fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <div
        class="border-b px-6 py-4 flex-shrink-0 flex justify-between items-center"
      >
        <h3 class="text-lg font-medium">タスク詳細</h3>
        <div class="flex gap-2 items-center">
          <div>
            <button
              type="button"
              @click="cycleStatus"
              class="px-3 py-2 rounded-md transition-colors border w-20 text-center"
              :class="getStatusButtonClass()"
            >
              {{ TASK_STATUS_LABELS[statusInput] }}
            </button>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              @click="handleCancel"
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="task-detail-form"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      <form
        @submit.prevent="handleSubmit"
        class="p-6 overflow-y-auto flex-1"
        id="task-detail-form"
      >
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
            :rows="notesRows"
            placeholder="詳細な説明やメモを入力してください"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >難易度</label
          >
          <div class="grid grid-cols-3 gap-3 items-center">
            <!-- 左側：入力用 -->
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
                  class="min-w-0 flex-1 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                  :class="getInputColorClass()"
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
            <!-- 中央：推奨難易度 -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">推奨難易度</label>
              <div
                class="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-center text-sm font-medium text-blue-700"
                v-if="
                  categoryInput &&
                  getDifficultyByCategory(categoryInput) !== null
                "
              >
                {{ getDifficultyByCategory(categoryInput) }}
              </div>
              <div
                v-else
                class="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-center text-sm text-gray-400"
              >
                −
              </div>
            </div>
            <!-- 右側：動作確認済み -->
            <div>
              <label class="block text-xs text-gray-600 mb-1"
                >動作確認済み (×1.2)</label
              >
              <div
                class="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-center text-sm font-medium"
              >
                {{ Math.round(difficultyInput * 1.2 * 10) / 10 }}
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Fields Section -->
        <div class="mb-6 pb-6 border-b border-gray-200">
          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label
                for="category"
                class="block text-sm font-medium text-blue-700 mb-1"
                >カテゴリ</label
              >
              <!-- カテゴリ読み込みエラー表示 -->
              <div
                v-if="loadError || !isLoaded"
                class="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
              >
                <span v-if="loadError">{{ loadError }}</span>
                <span v-else>カテゴリ情報を読み込み中...</span>
              </div>
              <select
                id="category"
                v-model="categoryInput"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                @change="onCategoryChange"
                :disabled="!isLoaded || !!loadError"
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

            <div>
              <label
                for="field"
                class="block text-sm font-medium text-blue-700 mb-1"
                >分野</label
              >
              <select
                id="field"
                v-model="fieldInput"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">分野を選択してください</option>
                <option
                  v-for="field in fieldOptions"
                  :key="field"
                  :value="field"
                >
                  {{ getFieldDisplayName(field) }}
                </option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label
              for="implementation_notes"
              class="block text-sm font-medium text-blue-700 mb-1"
              >実装方針</label
            >
            <textarea
              id="implementation_notes"
              v-model="implementationNotesInput"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              :rows="implementationNotesRows"
              placeholder="○○を参考にする、ファイルを分割する、Pinia を利用する"
            />
          </div>

          <div class="mb-4">
            <label
              for="api_schemas"
              class="block text-sm font-medium text-blue-700 mb-1"
              >API仕様・エンドポイント</label
            >
            <textarea
              id="api_schemas"
              v-model="apiSchemasInput"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              :rows="apiSchemasRows"
              placeholder="使用するエンドポイントやOpenAPI定義への参照を1行ずつ入力してください"
            />
          </div>

          <div class="mb-4">
            <label
              for="requirements"
              class="block text-sm font-medium text-blue-700 mb-1"
              >要件・テストケース</label
            >
            <textarea
              id="requirements"
              v-model="requirementsInput"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              :rows="requirementsRows"
              placeholder="満たすべき要件やテストケースを1行ずつ入力してください"
            />
          </div>

          <div class="mb-4">
            <ImageSelector v-model="designImagesInput" />
          </div>
        </div>

        <!-- エラーメッセージ表示 -->
        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
        >
          {{ errorMessage }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';

import { useTaskCategories } from '../../composables/useTaskCategories';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';
import ImageSelector from '../ImageSelector.vue';

import { TASK_STATUS, TASK_STATUS_LABELS, type TaskStatus } from '@/constants';
import { stringToField } from '@/utilities/task';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const {
  allCategories,
  getDifficultyByCategory,
  getFieldByCategory,
  getFieldDisplayName,
  fieldOptions,
  isLoaded,
  loadError,
} = useTaskCategories();

const nameInput = ref('');
const descriptionInput = ref('');
const notesInput = ref('');
const difficultyInput = ref(0);
const categoryInput = ref('');
const implementationNotesInput = ref('');
const apiSchemasInput = ref('');
const requirementsInput = ref('');
const designImagesInput = ref<string[]>([]);
const fieldInput = ref('');
const statusInput = ref<TaskStatus>(TASK_STATUS.UNTOUCH);

// ドラッグ検出用の状態
const isDragging = ref(false);
const dragStartedInDialog = ref(false);
const mouseDownOnOverlay = ref(false);

// エラーメッセージ表示用の状態
const errorMessage = ref('');

// textareaの行数を動的に計算
const notesRows = computed(() => {
  const content = notesInput.value;
  if (!content) return 5; // デフォルト行数
  const lineCount = content.split('\n').length;
  return Math.max(5, lineCount); // 最低5行、内容に応じて増加
});

const implementationNotesRows = computed(() => {
  const content = implementationNotesInput.value;
  if (!content) return 3; // デフォルト行数
  const lineCount = content.split('\n').length;
  return Math.max(3, lineCount); // 最低3行、内容に応じて増加
});

const apiSchemasRows = computed(() => {
  const content = apiSchemasInput.value;
  if (!content) return 2; // デフォルト行数
  const lineCount = content.split('\n').length;
  return Math.max(2, lineCount); // 最低2行、内容に応じて増加
});

const requirementsRows = computed(() => {
  const content = requirementsInput.value;
  if (!content) return 3; // デフォルト行数
  const lineCount = content.split('\n').length;
  return Math.max(3, lineCount); // 最低3行、内容に応じて増加
});

// ダイアログが開いている間、背景のスクロールを防ぐ
watch(
  () => uiStore.isDetailDialogVisible,
  (isVisible) => {
    if (isVisible) {
      // ダイアログが開いたときに背景のスクロールを無効化
      document.body.style.overflow = 'hidden';
    } else {
      // ダイアログが閉じたときに背景のスクロールを有効化
      document.body.style.overflow = '';
    }
  },
  { immediate: true },
);

// コンポーネントがアンマウントされるときにも確実にスクロールを復元
onUnmounted(() => {
  document.body.style.overflow = '';
});

// 選択中のタスクが変更されたら入力フィールドを更新
watch(
  () => taskStore.selectedTask,
  (newTask) => {
    if (newTask) {
      nameInput.value = newTask.task.name;
      descriptionInput.value = newTask.task.description;
      notesInput.value = newTask.task.notes.join('\n');
      difficultyInput.value = newTask.task.addition?.baseDifficulty || 0;
      categoryInput.value = newTask.task.addition?.category || '';
      fieldInput.value = newTask.task.addition?.field || '';
      implementationNotesInput.value =
        newTask.task.addition?.implementation_notes?.join('\n') || '';
      apiSchemasInput.value =
        newTask.task.addition?.api_schemas?.join('\n') || '';
      requirementsInput.value =
        newTask.task.addition?.requirements?.join('\n') || '';
      designImagesInput.value = newTask.task.addition?.design_images || [];
      statusInput.value =
        (newTask.task.addition?.status as TaskStatus) || TASK_STATUS.UNTOUCH;
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
    difficultyInput,
    categoryInput,
    fieldInput,
    implementationNotesInput,
    apiSchemasInput,
    requirementsInput,
    designImagesInput,
    statusInput,
  ],
  () => {
    if (errorMessage.value) {
      errorMessage.value = '';
    }
  },
  { flush: 'post' }, // DOMの更新後に実行
);

// カテゴリが変更された時の処理
const onCategoryChange = () => {
  if (categoryInput.value) {
    const suggestedDifficulty = getDifficultyByCategory(categoryInput.value);
    if (suggestedDifficulty !== null) {
      difficultyInput.value = suggestedDifficulty;
    }

    // カテゴリに応じた分野を自動設定
    const suggestedField = getFieldByCategory(categoryInput.value);
    if (suggestedField) {
      fieldInput.value = suggestedField;
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

// 入力値の文字色を推奨難易度との比較で決定
const getInputColorClass = () => {
  if (!categoryInput.value) return 'text-black';

  const recommended = getDifficultyByCategory(categoryInput.value);
  if (recommended === null) return 'text-black';

  const input = difficultyInput.value;
  if (input === recommended) return 'text-black';
  if (input < recommended) return 'text-blue-600';
  if (input > recommended) return 'text-red-600';
  return 'text-black';
};

// ステータスをループで切り替える関数
const cycleStatus = () => {
  const statuses = [TASK_STATUS.UNTOUCH, TASK_STATUS.DOING, TASK_STATUS.DONE];
  const currentIndex = statuses.indexOf(statusInput.value);
  const nextIndex = (currentIndex + 1) % statuses.length;
  statusInput.value = statuses[nextIndex];
};

// ステータスボタンのスタイルクラスを取得する関数
const getStatusButtonClass = () => {
  switch (statusInput.value) {
    case TASK_STATUS.UNTOUCH:
      return 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700';
    case TASK_STATUS.DOING:
      return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800';
    case TASK_STATUS.DONE:
      return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800';
    default:
      return 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700';
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
    addition: {
      baseDifficulty: difficultyInput.value,
      category: categoryInput.value,
      field: stringToField(fieldInput.value),
      implementation_notes: implementationNotesInput.value
        ? implementationNotesInput.value.split('\n')
        : undefined,
      api_schemas: apiSchemasInput.value
        ? apiSchemasInput.value.split('\n')
        : undefined,
      requirements: requirementsInput.value
        ? requirementsInput.value.split('\n')
        : undefined,
      design_images:
        designImagesInput.value.length > 0
          ? designImagesInput.value
          : undefined,
      status: statusInput.value,
    },
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

// 入力フィールドをリセットする関数
const resetInputs = () => {
  if (taskStore.selectedTask) {
    nameInput.value = taskStore.selectedTask.task.name;
    descriptionInput.value = taskStore.selectedTask.task.description;
    notesInput.value = taskStore.selectedTask.task.notes.join('\n');
    difficultyInput.value =
      taskStore.selectedTask.task.addition?.baseDifficulty || 0;
    categoryInput.value = taskStore.selectedTask.task.addition?.category || '';
    fieldInput.value = taskStore.selectedTask.task.addition?.field || 'other';
    implementationNotesInput.value =
      taskStore.selectedTask.task.addition?.implementation_notes?.join('\n') ||
      '';
    apiSchemasInput.value =
      taskStore.selectedTask.task.addition?.api_schemas?.join('\n') || '';
    requirementsInput.value =
      taskStore.selectedTask.task.addition?.requirements?.join('\n') || '';
    designImagesInput.value =
      taskStore.selectedTask.task.addition?.design_images || [];
    statusInput.value =
      (taskStore.selectedTask.task.addition?.status as TaskStatus) ||
      TASK_STATUS.UNTOUCH;
  }
};

const handleCancel = () => {
  // エラーメッセージをクリア
  errorMessage.value = '';
  // 入力フィールドを元の値にリセット
  resetInputs();
  uiStore.closeDetailDialog();
};

// オーバーレイでのマウスダウン検出
const handleOverlayMouseDown = (event: MouseEvent) => {
  // フォーム要素（input, textarea, button, select）での操作は無視
  const target = event.target as HTMLElement;
  const isFormElement =
    target.matches('input, textarea, button, select') ||
    target.closest('input, textarea, button, select');

  if (isFormElement) {
    return; // フォーム要素の場合は何もしない
  }

  // ダイアログ内容部分でマウスダウンされた場合はダイアログ内フラグを立てる
  const dialogContent = (event.currentTarget as Element).querySelector(
    '.bg-white',
  );
  if (dialogContent && dialogContent.contains(event.target as Node)) {
    dragStartedInDialog.value = true;
    mouseDownOnOverlay.value = false;
  } else {
    dragStartedInDialog.value = false;
    // オーバーレイ（背景）でマウスダウンされた場合のみフラグを立てる
    mouseDownOnOverlay.value = event.target === event.currentTarget;
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

  // オーバーレイでマウスダウンが開始され、かつオーバーレイでクリックされた場合のみ閉じる
  if (mouseDownOnOverlay.value && event.target === event.currentTarget) {
    handleCancel();
  }

  // 処理後はフラグをリセット
  mouseDownOnOverlay.value = false;
};

// ダイアログが閉じられた時の処理
watch(
  () => uiStore.isDetailDialogVisible,
  (isVisible, wasVisible) => {
    // ダイアログが閉じられた時（wasVisible: true → isVisible: false）
    if (wasVisible && !isVisible) {
      // 入力フィールドを元の値にリセット
      resetInputs();
      // エラーメッセージをクリア
      errorMessage.value = '';
    }
  },
);
</script>

<style scoped></style>
