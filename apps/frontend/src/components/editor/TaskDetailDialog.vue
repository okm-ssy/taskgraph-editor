<template>
  <div
    v-if="uiStore.isDetailDialogVisible"
    class="fixed inset-0 bg-black/50 z-50 pointer-events-auto"
    @mousedown="handleOverlayMouseDown"
    @click="handleOverlayClick"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-[70vw] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
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

        <!-- 実装支援情報セクション -->
        <div class="mb-6 border-t pt-4">
          <h3
            class="text-lg font-semibold text-gray-800 mb-4 flex items-center"
          >
            <span class="text-blue-600 mr-2">🛠️</span>
            実装支援情報
          </h3>

          <div class="space-y-6">
            <!-- 受け入れ基準 (最重要) -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label
                for="detail-acceptance-criteria"
                class="block text-sm font-semibold text-blue-800 mb-2"
                >✅ 受け入れ基準 (必須)</label
              >
              <textarea
                id="detail-acceptance-criteria"
                v-model="acceptanceCriteriaInput"
                rows="4"
                class="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="このタスクが完了したと判断できる基準を記載してください（各行に1つずつ）&#10;例：&#10;- ユーザーがログインできる&#10;- エラーメッセージが適切に表示される&#10;- レスポンシブデザインに対応している"
              />
            </div>

            <!-- UI要件 -->
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <label
                for="detail-ui-requirements"
                class="block text-sm font-semibold text-green-800 mb-2"
                >🎨 UI・画面要件</label
              >
              <textarea
                id="detail-ui-requirements"
                v-model="uiRequirementsInput"
                rows="3"
                class="w-full px-3 py-2 border border-green-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="UI/画面に関する要件を記載してください&#10;例：レスポンシブデザイン、アクセシビリティ対応、特定のデザインシステム準拠など"
              />
            </div>

            <!-- データ要件 -->
            <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <label
                for="detail-data-requirements"
                class="block text-sm font-semibold text-purple-800 mb-2"
                >💾 データ・API要件</label
              >
              <textarea
                id="detail-data-requirements"
                v-model="dataRequirementsInput"
                rows="3"
                class="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="データ処理・API・バックエンドに関する要件を記載してください&#10;例：特定のAPIエンドポイント、データベーススキーマ、バリデーションルールなど"
              />
            </div>

            <!-- 実装メモ -->
            <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <label
                for="detail-implementation-notes"
                class="block text-sm font-semibold text-orange-800 mb-2"
                >📝 実装時の注意点・参考情報</label
              >
              <textarea
                id="detail-implementation-notes"
                v-model="implementationNotesInput"
                rows="4"
                class="w-full px-3 py-2 border border-orange-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="実装時に注意すべき点や参考になる情報を記載してください（各行に1つずつ）&#10;例：&#10;- 既存のXXコンポーネントを参考にする&#10;- パフォーマンスに注意（大量データ対応）&#10;- セキュリティ要件：XSS対策必須"
              />
            </div>

            <!-- 関連画面設計 -->
            <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <label
                for="detail-design-images"
                class="block text-sm font-semibold text-indigo-800 mb-2"
                >🖼️ 関連画面設計・モックアップ</label
              >
              <textarea
                id="detail-design-images"
                v-model="designImagesInput"
                rows="2"
                class="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="関連する画面設計やモックアップのID・ファイル名を記載してください（各行に1つずつ）&#10;例：login-screen-v2.png、user-dashboard-mockup.figma"
              />
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label
            for="category"
            class="block text-sm font-medium text-gray-700 mb-1"
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

        <div class="mb-4">
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
            <!-- 右側：動作確認込み -->
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
import { ref, watch } from 'vue';

import { useTaskCategories } from '../../composables/useTaskCategories';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const { allCategories, getDifficultyByCategory, isLoaded, loadError } =
  useTaskCategories();

const nameInput = ref('');
const descriptionInput = ref('');
const notesInput = ref('');
const relationsInput = ref('');

// 実装支援情報の状態
const uiRequirementsInput = ref('');
const dataRequirementsInput = ref('');
const implementationNotesInput = ref('');
const acceptanceCriteriaInput = ref('');
const designImagesInput = ref('');
const difficultyInput = ref(0);
const categoryInput = ref('');

// ドラッグ検出用の状態
const isDragging = ref(false);
const dragStartedInDialog = ref(false);

// エラーメッセージ表示用の状態
const errorMessage = ref('');

// 選択中のタスクが変更されたら入力フィールドを更新
watch(
  () => taskStore.selectedTask,
  (newTask) => {
    if (newTask) {
      nameInput.value = newTask.task.name;
      descriptionInput.value = newTask.task.description;
      notesInput.value = newTask.task.notes.join('\n');
      relationsInput.value = newTask.task.addition?.relations?.join('\n') || '';
      difficultyInput.value = newTask.task.addition?.baseDifficulty || 0;
      categoryInput.value = newTask.task.addition?.category || '';

      // 実装支援情報の更新
      uiRequirementsInput.value = newTask.task.addition?.ui_requirements || '';
      dataRequirementsInput.value =
        newTask.task.addition?.data_requirements || '';
      implementationNotesInput.value =
        newTask.task.addition?.implementation_notes?.join('\n') || '';
      acceptanceCriteriaInput.value =
        newTask.task.addition?.acceptance_criteria?.join('\n') || '';
      designImagesInput.value =
        newTask.task.addition?.design_images?.join('\n') || '';
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

// フォーム送信時の処理
const handleSubmit = () => {
  if (!taskStore.selectedTask) return;

  // エラーメッセージをクリア
  errorMessage.value = '';

  // タスク更新（依存関係は変更しない）
  const updateSuccess = taskStore.updateTask(taskStore.selectedTask.id, {
    name: nameInput.value,
    description: descriptionInput.value,
    notes: notesInput.value.split('\n').filter((n) => n.trim()),
    addition: {
      relations: relationsInput.value.split('\n').filter((r) => r.trim()),
      baseDifficulty: difficultyInput.value,
      category: categoryInput.value,
      layout: selectedTask.task.addition?.layout,
      // 実装支援情報（全フィールド）
      acceptance_criteria:
        acceptanceCriteriaInput.value
          .split('\n')
          .map((c) => c.trim())
          .filter((c) => c) || undefined,
      ui_requirements: uiRequirementsInput.value || undefined,
      data_requirements: dataRequirementsInput.value || undefined,
      implementation_notes:
        implementationNotesInput.value
          .split('\n')
          .map((n) => n.trim())
          .filter((n) => n) || undefined,
      design_images:
        designImagesInput.value
          .split('\n')
          .map((i) => i.trim())
          .filter((i) => i) || undefined,
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
