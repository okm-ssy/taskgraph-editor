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
        <select
          id="task-category"
          v-model="categoryInput"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          @change="handleCategoryChange"
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
                class="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs"
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

      <div class="flex justify-end gap-2 mt-4">
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
const { getDifficultyByCategory, allCategories } = useTaskCategories();

const nameInput = ref('');
const descriptionInput = ref('');
const notesInput = ref('');
const relationsInput = ref('');
const categoryInput = ref('');
const difficultyInput = ref(0);
const isAutoDifficulty = ref(false);

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
    relations: relationsInput.value ? relationsInput.value.split('\n') : [],
    baseDifficulty: parseFloat(difficultyInput.value.toString()),
    category: categoryInput.value,
    depends: [],
  });

  // 入力フィールドをリセット
  nameInput.value = '';
  descriptionInput.value = '';
  notesInput.value = '';
  relationsInput.value = '';
  categoryInput.value = '';
  difficultyInput.value = 0;
  isAutoDifficulty.value = false;

  // パネルを閉じる
  emit('close');
};

// キャンセル処理
const handleCancel = () => {
  emit('close');
};
</script>

<style scoped></style>
