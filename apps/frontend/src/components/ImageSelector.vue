<template>
  <div class="relative">
    <label class="block text-sm font-medium text-blue-700 mb-2">
      画面設計画像選択
    </label>

    <!-- 画像プレビュー（枠の直上、右側） -->
    <div
      v-if="previewImage"
      class="absolute z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 pointer-events-none"
      style="bottom: 100%; right: 0; margin-bottom: 8px"
    >
      <img
        :src="previewImage"
        alt="プレビュー"
        class="max-w-xs max-h-48 object-contain"
      />
      <div class="text-xs text-gray-500 mt-2 text-center">
        {{ getFilenameFromId(currentPreviewPath || '') }}
      </div>
    </div>

    <!-- ローディング中も高さを確保（画像がある場合のみ） -->
    <div
      v-if="loading && expectedImageCount > 0"
      class="border border-gray-300 rounded-md p-3"
      :class="getGridHeightClassForCount(expectedImageCount)"
    >
      <div class="text-sm text-gray-500 text-center py-10">
        画像一覧を読み込み中...
      </div>
    </div>

    <!-- ローディング中で画像がない場合 -->
    <div v-else-if="loading" class="text-sm text-gray-500 mb-2">
      画像一覧を読み込み中...
    </div>

    <div v-else-if="images.length === 0" class="text-sm text-gray-500 mb-2">
      プロジェクトに登録された画像がありません
    </div>

    <div
      v-else
      class="grid grid-cols-3 gap-3 overflow-y-auto overflow-x-visible border border-gray-300 rounded-md p-3 relative"
      :class="getGridHeightClass()"
    >
      <div
        v-for="image in images"
        :key="image.path"
        class="flex flex-col items-center p-2 rounded border relative"
        :class="[
          isSelected(image.path)
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-100',
          props.disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 cursor-pointer',
        ]"
        @click="!props.disabled && toggleSelection(image.path)"
        @mouseenter="(e) => !props.disabled && showPreview(image.path, e)"
        @mouseleave="!props.disabled && hidePreview"
      >
        <!-- 選択インジケーター -->
        <div
          v-if="isSelected(image.path)"
          class="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </div>

        <!-- 画像プレビュー -->
        <div
          class="relative w-16 h-16 mb-2 bg-gray-100 rounded border border-gray-300 overflow-hidden"
        >
          <img
            :src="getImageUrl(image.path)"
            :alt="image.filename"
            class="w-full h-full object-cover"
            @error="handleImageError"
          />
        </div>

        <!-- ファイル名 -->
        <div class="text-center w-full">
          <div
            class="block text-xs font-medium truncate"
            :class="image.id ? 'text-gray-900' : 'text-gray-400'"
          >
            {{ image.filename }}
            <span v-if="!image.id" class="text-xs text-red-400">(未登録)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 選択された画像の表示 -->
    <div v-if="selectedPaths.length > 0" class="mt-3">
      <p class="text-sm font-medium text-gray-700 mb-1">
        選択中: {{ selectedPaths.length }}件
      </p>
      <div class="text-xs text-gray-600">
        <div v-for="path in selectedPaths" :key="path" class="truncate">
          {{ getFilenameFromId(path) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

import { useCurrentTasks } from '../store/task_store';

// Props & Emits
const props = defineProps<{
  modelValue: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

// Store
const taskStore = useCurrentTasks();

// State
const images = ref<
  Array<{
    id: string | null;
    filename: string;
    path: string;
  }>
>([]);
const loading = ref(true); // 初期値をtrueに変更
const selectedPaths = ref<string[]>([]);
const expectedImageCount = ref(0); // 初期値は0

// プレビュー用の状態
const previewImage = ref<string | null>(null);
const currentPreviewPath = ref<string | null>(null);

// Watch
watch(
  () => props.modelValue,
  (newValue) => {
    selectedPaths.value = [...newValue];
    // modelValueが変更されたタイミングで画像数を推定
    if (newValue && newValue.length > 0 && expectedImageCount.value === 0) {
      // 既に選択されている画像がある場合、少なくともその数以上の画像があるはず
      expectedImageCount.value = newValue.length;
    }
  },
  { immediate: true },
);

watch(
  selectedPaths,
  (newValue) => {
    // 配列の内容が実際に変わった場合のみemitする
    if (JSON.stringify(newValue) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', [...newValue]);
    }
  },
  { deep: true },
);

// Methods
const loadProjectImages = async () => {
  loading.value = true;
  try {
    const projectId = taskStore.getCurrentProjectId();

    // プロジェクト情報から登録された画像を直接取得
    const taskgraphResponse = await fetch(
      `/api/load-taskgraph?projectId=${projectId}`,
    );
    if (taskgraphResponse.ok) {
      const taskgraphData = await taskgraphResponse.text();
      const taskgraph = JSON.parse(taskgraphData);
      const designImages = taskgraph.info?.addition?.design_images || [];

      // 期待される画像数を設定
      expectedImageCount.value = designImages.length;

      // 登録済み画像を画像リストに変換
      type DesignImageItem = { id: string; path: string } | string;

      images.value = (designImages as DesignImageItem[])
        .map((img) => {
          if (
            typeof img === 'object' &&
            img !== null &&
            'id' in img &&
            'path' in img
          ) {
            // 新形式: {id, path}
            return {
              id: img.id,
              filename: img.path.split('/').pop() || img.path,
              path: img.path,
            };
          } else if (typeof img === 'string') {
            // 旧形式: 文字列パス（フルパス対応）
            return {
              id: img, // パス自体をIDとして使用
              filename: img.split('/').pop() || img,
              path: img,
            };
          }
          return null;
        })
        .filter((img): img is NonNullable<typeof img> => img !== null);
    } else {
      console.error('Failed to load project taskgraph');
      images.value = [];
    }
  } catch (error) {
    console.error('Error loading project images:', error);
    images.value = [];
  } finally {
    loading.value = false;
  }
};

const getImageUrl = (path: string): string => {
  // 絶対パスの場合は特別なエンドポイントを使用
  if (path.startsWith('/')) {
    return `/api/images/absolute${path}`;
  }
  return `/api/images/${path}`;
};

const getFilenameFromId = (pathOrId: string): string => {
  const image = images.value.find(
    (img) => img.path === pathOrId || img.id === pathOrId,
  );
  return image ? image.filename : pathOrId.split('/').pop() || pathOrId;
};

// パスまたはIDが選択されているかチェック
const isSelected = (imagePath: string): boolean => {
  // 直接パスでチェック
  if (selectedPaths.value.includes(imagePath)) {
    return true;
  }
  // このパスに対応する画像のIDでもチェック
  const image = images.value.find((img) => img.path === imagePath);
  if (image && image.id && selectedPaths.value.includes(image.id)) {
    return true;
  }
  return false;
};

const showPreview = (imagePath: string, _event: MouseEvent) => {
  previewImage.value = getImageUrl(imagePath);
  currentPreviewPath.value = imagePath;
};

const hidePreview = () => {
  previewImage.value = null;
  currentPreviewPath.value = null;
};

const toggleSelection = (imagePath: string) => {
  if (!imagePath || props.disabled) return;

  const index = selectedPaths.value.indexOf(imagePath);
  if (index > -1) {
    selectedPaths.value.splice(index, 1);
  } else {
    selectedPaths.value.push(imagePath);
  }
};

const handleImageError = (_event: Event) => {
  // 画像読み込みエラーは静かに処理
};

// 画像グリッドの高さクラスを計算
const getGridHeightClass = (): string => {
  return getGridHeightClassForCount(images.value.length);
};

// 画像数から高さクラスを計算
const getGridHeightClassForCount = (count: number): string => {
  if (count <= 3) {
    // 1行分の高さ（約120px）
    return 'h-[120px]';
  } else {
    // 2行分の高さ（約252px）
    return 'h-[252px]';
  }
};

// プレビューのスタイルを計算（削除済み - 固定位置を使用）

// Lifecycle
onMounted(async () => {
  // 画像を読み込む
  await loadProjectImages();
});
</script>

<style scoped></style>
