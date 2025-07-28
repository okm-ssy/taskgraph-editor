<template>
  <div>
    <label class="block text-sm font-medium text-blue-700 mb-2">
      画面設計画像選択
    </label>

    <!-- ローディング中も高さを確保 -->
    <div
      v-if="loading"
      class="border border-gray-300 rounded-md p-3"
      :class="getGridHeightClassForCount(expectedImageCount)"
    >
      <div class="text-sm text-gray-500 text-center py-10">
        画像一覧を読み込み中...
      </div>
    </div>

    <div v-else-if="images.length === 0" class="text-sm text-gray-500 mb-2">
      プロジェクトに登録された画像がありません
    </div>

    <div
      v-else
      class="grid grid-cols-3 gap-3 overflow-y-auto border border-gray-300 rounded-md p-3"
      :class="getGridHeightClass()"
    >
      <div
        v-for="image in images"
        :key="image.path"
        class="flex flex-col items-center p-2 hover:bg-gray-50 rounded border cursor-pointer relative"
        :class="
          selectedIds.includes(image.id || '')
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-100'
        "
        @click="toggleSelection(image.id || '')"
        @mouseenter="showPreview(image.path, $event)"
        @mouseleave="hidePreview"
      >
        <!-- 選択インジケーター -->
        <div
          v-if="selectedIds.includes(image.id || '')"
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

        <!-- 画像プレビュー（真下に表示） -->
        <div
          v-if="previewImage && currentPreviewPath === image.path"
          class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-2"
        >
          <img
            :src="previewImage"
            alt="プレビュー"
            class="max-w-xs max-h-48 object-contain"
          />
        </div>
      </div>
    </div>

    <!-- 選択された画像の表示 -->
    <div v-if="selectedIds.length > 0" class="mt-3">
      <p class="text-sm font-medium text-gray-700 mb-1">
        選択中: {{ selectedIds.length }}件
      </p>
      <div class="text-xs text-gray-600">
        <div v-for="id in selectedIds" :key="id" class="truncate">
          {{ getFilenameFromId(id) }}
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
const selectedIds = ref<string[]>([]);
const expectedImageCount = ref(4); // デフォルトで2行分（4つ）の高さを確保

// プレビュー用の状態
const previewImage = ref<string | null>(null);
const currentPreviewPath = ref<string | null>(null);

// Watch
watch(
  () => props.modelValue,
  (newValue) => {
    selectedIds.value = [...newValue];
    // modelValueが変更されたタイミングで画像数を推定
    if (newValue && newValue.length > 0 && expectedImageCount.value === 0) {
      // 既に選択されている画像がある場合、少なくともその数以上の画像があるはず
      expectedImageCount.value = Math.max(newValue.length, 4); // 最低でも4つ（2行分）確保
    }
  },
  { immediate: true },
);

watch(
  selectedIds,
  (newValue) => {
    emit('update:modelValue', [...newValue]);
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
      images.value = designImages
        .map((img: unknown) => {
          if (
            typeof img === 'object' &&
            img !== null &&
            'id' in img &&
            'path' in img
          ) {
            const objImg = img as { id: string; path: string };
            // 新形式: {id, path}
            return {
              id: objImg.id,
              filename: objImg.path.split('/').pop() || objImg.path,
              path: objImg.path,
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

const getFilenameFromId = (id: string): string => {
  const image = images.value.find((img) => img.id === id);
  return image ? image.filename : id;
};

const showPreview = (imagePath: string, _event: MouseEvent) => {
  previewImage.value = getImageUrl(imagePath);
  currentPreviewPath.value = imagePath;
};

const hidePreview = () => {
  previewImage.value = null;
  currentPreviewPath.value = null;
};

const toggleSelection = (imageId: string) => {
  if (!imageId) return;

  const index = selectedIds.value.indexOf(imageId);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(imageId);
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

// Lifecycle
onMounted(async () => {
  // 初期値として最低限の高さ（2行分）を確保
  if (expectedImageCount.value === 0) {
    expectedImageCount.value = 4; // デフォルトで2行分の高さを確保
  }

  // 画像を読み込む
  await loadProjectImages();
});
</script>

<style scoped></style>
