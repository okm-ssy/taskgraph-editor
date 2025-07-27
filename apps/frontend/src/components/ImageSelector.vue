<template>
  <div>
    <label class="block text-sm font-medium text-blue-700 mb-2">
      画面設計画像選択
    </label>

    <div v-if="loading" class="text-sm text-gray-500 mb-2">
      画像一覧を読み込み中...
    </div>

    <div v-else-if="images.length === 0" class="text-sm text-gray-500 mb-2">
      プロジェクトに登録された画像がありません
    </div>

    <div
      v-else
      class="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3"
    >
      <div
        v-for="image in images"
        :key="image.path"
        class="flex flex-col items-center p-2 hover:bg-gray-50 rounded border border-gray-100"
      >
        <!-- チェックボックス -->
        <input
          :id="`image-${image.id || image.path}`"
          v-model="selectedIds"
          :value="image.id"
          :disabled="!image.id"
          type="checkbox"
          class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mb-2"
        />

        <!-- 画像プレビュー -->
        <div
          class="relative w-16 h-16 mb-2"
          @mouseenter="showPreview(image.path, $event)"
          @mouseleave="hidePreview"
        >
          <img
            :src="getImageUrl(image.path)"
            :alt="image.filename"
            class="w-full h-full object-cover rounded border border-gray-300 cursor-pointer"
            @error="handleImageError"
          />
        </div>

        <!-- ファイル名 -->
        <div class="text-center w-full">
          <label
            :for="`image-${image.id || image.path}`"
            class="block text-xs font-medium cursor-pointer truncate"
            :class="image.id ? 'text-gray-900' : 'text-gray-400'"
          >
            {{ image.filename }}
            <span v-if="!image.id" class="text-xs text-red-400">(未登録)</span>
          </label>
        </div>
      </div>
    </div>

    <!-- ホバー時の拡大画像表示 -->
    <div
      v-if="previewImage"
      ref="previewTooltip"
      class="fixed z-[70] pointer-events-none bg-white border border-gray-300 rounded-lg shadow-xl p-2"
      :style="tooltipStyle"
    >
      <img
        :src="previewImage"
        alt="プレビュー"
        class="max-w-xs max-h-48 object-contain"
      />
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
import { ref, computed, onMounted, watch } from 'vue';

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
const loading = ref(false);
const selectedIds = ref<string[]>([]);

// プレビュー用の状態
const previewImage = ref<string | null>(null);
const previewTooltip = ref<HTMLElement | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

// Computed
const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
}));

// Watch
watch(
  () => props.modelValue,
  (newValue) => {
    selectedIds.value = [...newValue];
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

const showPreview = (imagePath: string, event: MouseEvent) => {
  previewImage.value = getImageUrl(imagePath);

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  tooltipPosition.value = {
    x: rect.right + 10,
    y: rect.top,
  };
};

const hidePreview = () => {
  previewImage.value = null;
};

const handleImageError = (_event: Event) => {
  // 画像読み込みエラーは静かに処理
};

// Lifecycle
onMounted(() => {
  loadProjectImages();
});
</script>

<style scoped></style>
