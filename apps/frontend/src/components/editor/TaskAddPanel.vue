<template>
  <div
    class="absolute z-30 bg-white shadow-lg rounded-lg border border-gray-200 p-4 w-80"
    :style="panelPosition"
  >
    <div class="flex justify-between items-center mb-4">
      <h4 class="font-semibold">新規タスク追加</h4>
      <button @click="handleCancel" class="text-gray-500 hover:text-gray-700">
        ×
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label
          for="task-name"
          class="block text-sm font-medium text-gray-700 mb-1"
          >タスク名</label
        >
        <input
          id="task-name"
          v-model="nameInput"
          type="text"
          placeholder="タスク名を入力"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label
          for="task-description"
          class="block text-sm font-medium text-gray-700 mb-1"
          >概要(1行)</label
        >
        <input
          id="task-description"
          v-model="descriptionInput"
          type="text"
          placeholder="タスクの概要を1行で入力"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label
          for="task-notes"
          class="block text-sm font-medium text-gray-700 mb-1"
          >説明</label
        >
        <textarea
          id="task-notes"
          v-model="notesInput"
          placeholder="詳細な説明やメモを入力"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          rows="3"
        />
      </div>

      <div>
        <label
          for="task-category"
          class="block text-sm font-medium text-gray-700 mb-1"
          >タスク分類</label
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
          id="task-category"
          v-model="categoryInput"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          @change="handleCategoryChange"
          :disabled="!isLoaded || !!loadError"
        >
          <option value="">分類を選択してください</option>
          <option
            v-for="category in allCategories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
        <!-- 推奨難易度表示（分類選択の下） -->
        <div
          v-if="
            categoryInput && getDifficultyByCategory(categoryInput) !== null
          "
          class="mt-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-center text-xs font-medium text-blue-700"
        >
          推奨難易度: {{ getDifficultyByCategory(categoryInput) }}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >難易度</label
        >
        <div class="grid grid-cols-2 gap-2 items-center">
          <!-- 左側：入力用 -->
          <div>
            <label
              for="task-difficulty"
              class="block text-xs text-gray-600 mb-1"
              >入力値 (0.5刻み)</label
            >
            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="decreaseDifficulty"
                class="px-1 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-semibold transition-colors"
                :disabled="difficultyInput <= 0"
              >
                −
              </button>
              <input
                id="task-difficulty"
                v-model="difficultyInput"
                type="number"
                min="0"
                step="0.1"
                class="min-w-0 flex-1 px-1 py-1 border border-gray-300 rounded text-center text-xs"
                :class="[
                  getInputColorClass(),
                  { 'bg-yellow-50': isAutoDifficulty },
                ]"
              />
              <button
                type="button"
                @click="increaseDifficulty"
                class="px-1 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-semibold transition-colors"
              >
                ＋
              </button>
            </div>
          </div>
          <!-- 右側：動作確認込み -->
          <div>
            <label class="block text-xs text-gray-600 mb-1"
              >動作確認込み (×1.2)</label
            >
            <div
              class="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-center text-xs font-medium"
            >
              {{ Math.round(difficultyInput * 1.2 * 10) / 10 }}
            </div>
          </div>
        </div>
        <p v-if="isAutoDifficulty" class="text-xs text-yellow-600 mt-1">
          分類から自動設定されました
        </p>
      </div>

      <div>
        <label
          for="task-relations"
          class="block text-sm font-medium text-gray-700 mb-1"
          >関連ファイル</label
        >
        <textarea
          id="task-relations"
          v-model="relationsInput"
          placeholder="関連ファイルパスを1行ずつ入力"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          rows="2"
        />
      </div>

      <!-- 実装支援情報セクション -->
      <div class="col-span-2 border-t pt-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span class="text-blue-600 mr-2">🛠️</span>
          実装支援情報
        </h3>

        <div class="space-y-4">
          <!-- 受け入れ基準 (最重要) -->
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label
              for="acceptance-criteria"
              class="block text-sm font-semibold text-blue-800 mb-2"
              >✅ 受け入れ基準 (必須)</label
            >
            <textarea
              id="acceptance-criteria"
              v-model="acceptanceCriteriaInput"
              rows="4"
              class="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="このタスクが完了したと判断できる基準を記載してください（各行に1つずつ）&#10;例：&#10;- ユーザーがログインできる&#10;- エラーメッセージが適切に表示される&#10;- レスポンシブデザインに対応している"
            />
          </div>

          <!-- UI要件 -->
          <div class="bg-green-50 p-4 rounded-lg border border-green-200">
            <label
              for="ui-requirements"
              class="block text-sm font-semibold text-green-800 mb-2"
              >🎨 UI・画面要件</label
            >
            <textarea
              id="ui-requirements"
              v-model="uiRequirementsInput"
              rows="3"
              class="w-full px-3 py-2 border border-green-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="UI/画面に関する要件を記載してください&#10;例：レスポンシブデザイン、アクセシビリティ対応、特定のデザインシステム準拠など"
            />
          </div>

          <!-- データ要件 -->
          <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <label
              for="data-requirements"
              class="block text-sm font-semibold text-purple-800 mb-2"
              >💾 データ・API要件</label
            >
            <textarea
              id="data-requirements"
              v-model="dataRequirementsInput"
              rows="3"
              class="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="データ処理・API・バックエンドに関する要件を記載してください&#10;例：特定のAPIエンドポイント、データベーススキーマ、バリデーションルールなど"
            />
          </div>

          <!-- 実装メモ -->
          <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <label
              for="implementation-notes"
              class="block text-sm font-semibold text-orange-800 mb-2"
              >📝 実装時の注意点・参考情報</label
            >
            <textarea
              id="implementation-notes"
              v-model="implementationNotesInput"
              rows="4"
              class="w-full px-3 py-2 border border-orange-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="実装時に注意すべき点や参考になる情報を記載してください（各行に1つずつ）&#10;例：&#10;- 既存のXXコンポーネントを参考にする&#10;- パフォーマンスに注意（大量データ対応）&#10;- セキュリティ要件：XSS対策必須"
            />
          </div>

          <!-- 関連画面設計 -->
          <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <label
              for="design-images"
              class="block text-sm font-semibold text-indigo-800 mb-2"
              >🖼️ 関連画面設計・モックアップ</label
            >
            <textarea
              id="design-images"
              v-model="designImagesInput"
              rows="2"
              class="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="関連する画面設計やモックアップのID・ファイル名を記載してください（各行に1つずつ）&#10;例：login-screen-v2.png、user-dashboard-mockup.figma"
            />
          </div>
        </div>
      </div>

      <div class="col-span-2 flex justify-end gap-2 mt-6">
        <button
          type="button"
          @click="handleCancel"
          class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm transition-colors"
        >
          キャンセル
        </button>
        <button
          type="button"
          @click="addNewTask"
          class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
        >
          追加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

import { useTaskCategories } from '../../composables/useTaskCategories';
import { LAYOUT } from '../../constants';
import { useCurrentTasks } from '../../store/task_store';

// propsは使用されていないため削除

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const taskStore = useCurrentTasks();
const { getDifficultyByCategory, allCategories, isLoaded, loadError } =
  useTaskCategories();

const nameInput = ref('');
const descriptionInput = ref('');
const notesInput = ref('');
const relationsInput = ref('');
const categoryInput = ref('');
const difficultyInput = ref(0);
const isAutoDifficulty = ref(false);

// 実装支援情報の状態（全フィールド）
const acceptanceCriteriaInput = ref('');
const uiRequirementsInput = ref('');
const dataRequirementsInput = ref('');
const implementationNotesInput = ref('');
const designImagesInput = ref('');

// スクロール位置を追跡
const scrollTop = ref(0);

// パネルの位置（スクロールに追従）
const panelPosition = computed(() => {
  return {
    top: `${scrollTop.value + LAYOUT.MODAL.MIN_MARGIN}px`,
    right: `${LAYOUT.MODAL.MIN_MARGIN}px`,
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

// 分類選択時の処理
const handleCategoryChange = () => {
  const autoDifficulty = getDifficultyByCategory(categoryInput.value);
  if (autoDifficulty !== null) {
    difficultyInput.value = autoDifficulty;
    isAutoDifficulty.value = true;
  } else {
    isAutoDifficulty.value = false;
  }
};

// 難易度の増減ボタン処理
const increaseDifficulty = () => {
  const newValue = difficultyInput.value + 0.5;
  difficultyInput.value = Math.round(newValue * 10) / 10; // 小数点誤差対策
  isAutoDifficulty.value = false; // 手動変更時は自動設定フラグをオフ
};

const decreaseDifficulty = () => {
  const newValue = Math.max(0, difficultyInput.value - 0.5);
  difficultyInput.value = Math.round(newValue * 10) / 10; // 小数点誤差対策
  isAutoDifficulty.value = false; // 手動変更時は自動設定フラグをオフ
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

// スクロール位置を考慮した位置計算（EditorGridと同じロジック）
const getVisibleAreaPosition = () => {
  const container = document.querySelector('.overflow-auto');
  if (!container) return { x: 0, y: 0 };

  const scrollTop = container.scrollTop;

  // GridLayoutの実際の設定値を使用（EditorGridと同じ）
  const rowHeight = LAYOUT.GRID.ROW_HEIGHT.NORMAL;
  const margin = LAYOUT.GRID.MARGIN.NORMAL;

  // スクロール位置をグリッド座標に変換（マージンも考慮）
  const gridY = Math.floor(scrollTop / (rowHeight + margin));

  // X座標は左端（0）に固定
  return { x: 0, y: gridY };
};

// 新規タスク追加
const addNewTask = () => {
  // EditorGridと同じ位置計算を使用
  const position = getVisibleAreaPosition();
  const newTask = taskStore.addTaskAtPosition(position.x, position.y);

  // タスク情報の更新（依存関係は空配列）
  taskStore.updateTask(newTask.id, {
    name: nameInput.value || 'new-task',
    description: descriptionInput.value || '',
    notes: notesInput.value ? notesInput.value.split('\n') : [],
    depends: [],
    addition: {
      baseDifficulty: parseFloat(difficultyInput.value.toString()),
      relations: relationsInput.value
        ? relationsInput.value.split('\n').filter((r) => r.trim())
        : [],
      category: categoryInput.value,
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

  // 入力フィールドをリセット
  nameInput.value = '';
  descriptionInput.value = '';
  notesInput.value = '';
  relationsInput.value = '';
  categoryInput.value = '';
  difficultyInput.value = 0;
  isAutoDifficulty.value = false;
  // 実装支援情報のリセット（全フィールド）
  acceptanceCriteriaInput.value = '';
  uiRequirementsInput.value = '';
  dataRequirementsInput.value = '';
  implementationNotesInput.value = '';
  designImagesInput.value = '';

  // パネルを閉じる
  emit('close');
};

// キャンセル処理
const handleCancel = () => {
  emit('close');
};
</script>

<style scoped></style>
