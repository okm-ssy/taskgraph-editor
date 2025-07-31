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
      <div
        class="border-b px-6 py-4 flex-shrink-0 flex justify-between items-center"
      >
        <h3 class="text-lg font-medium">プロジェクト情報編集</h3>
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
            form="info-edit-form"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      <form
        @submit.prevent="handleSubmit"
        class="p-6 overflow-y-auto flex-1"
        id="info-edit-form"
      >
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
        </div>

        <!-- 軽量ビジネス要件セクション -->
        <div class="mb-6 pb-6 border-b border-gray-200">
          <h4 class="text-sm font-semibold text-green-600 mb-4">
            軽量ビジネス要件フォーマット
          </h4>

          <div class="mb-4">
            <label
              for="business-purpose"
              class="block text-sm font-medium text-green-700 mb-1"
              >目的（なぜこの機能が必要か）</label
            >
            <input
              id="business-purpose"
              v-model="businessPurposeInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="ユーザーの操作効率を向上させるため"
            />
          </div>

          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label
                for="target-users"
                class="block text-sm font-medium text-green-700 mb-1"
                >対象ユーザー（規模感含む）</label
              >
              <input
                id="target-users"
                v-model="targetUsersInput"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="管理者・約50名"
              />
            </div>

            <div>
              <label
                for="usage-frequency"
                class="block text-sm font-medium text-green-700 mb-1"
                >使用頻度</label
              >
              <input
                id="usage-frequency"
                v-model="usageFrequencyInput"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1日数回、月1回"
              />
            </div>
          </div>

          <div class="mb-4">
            <label
              for="current-problem"
              class="block text-sm font-medium text-green-700 mb-1"
              >現在の問題（解決したいこと）</label
            >
            <input
              id="current-problem"
              v-model="currentProblemInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="手動で処理していて時間がかかる"
            />
          </div>
        </div>

        <!-- 画像設計セクション -->
        <div class="mb-6 pb-6 border-b border-gray-200">
          <h4 class="text-sm font-semibold text-green-600 mb-4">
            画面設計画像
          </h4>

          <div class="mb-4">
            <label class="block text-sm font-medium text-green-700 mb-2">
              画像パス一覧
            </label>

            <!-- 複数パス一括追加 -->
            <div class="mb-3">
              <label class="block text-sm font-medium text-green-700 mb-2">
                複数パスを一括追加（カンマ・改行区切り）
              </label>
              <div class="flex gap-2">
                <textarea
                  v-model="bulkPathInput"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm resize-y min-h-[80px]"
                  placeholder="/path/to/image1.png&#10;/path/to/image2.jpg&#10;data/project/image3.png"
                />
                <button
                  type="button"
                  @click="addBulkPaths"
                  class="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors self-start"
                >
                  一括追加
                </button>
              </div>
            </div>

            <!-- パス追加ボタン -->
            <button
              type="button"
              @click="addImagePath"
              class="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
            >
              パスを追加
            </button>
          </div>

          <!-- 画像アップロード -->
          <div class="mb-4">
            <div class="flex items-center gap-3 mb-2">
              <label class="text-sm font-medium text-green-700">
                画像をアップロード
              </label>
              <input
                type="file"
                ref="fileInput"
                @change="handleFileSelect"
                accept="image/*"
                multiple
                class="text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>
            <p class="text-xs text-gray-500">
              画像は data/{{ getCurrentProjectId() }}/ に保存されます
            </p>
          </div>

          <!-- 既存の画像パスリスト -->
          <div class="space-y-2 mb-3">
            <div
              v-for="(imageObj, index) in designImagesInput"
              :key="imageObj.id"
              class="flex items-center gap-2"
            >
              <!-- 画像プレビュー -->
              <div
                class="relative w-12 h-12 flex-shrink-0"
                @mouseenter="showPreview(imageObj.path, $event)"
                @mouseleave="hidePreview"
              >
                <img
                  v-if="imageObj.path && isValidImagePath(imageObj.path)"
                  :src="getImageUrl(imageObj.path)"
                  :alt="imageObj.path"
                  class="w-full h-full object-cover rounded border border-gray-300 cursor-pointer"
                  @error="handleImageError"
                />
                <div
                  v-else
                  class="w-full h-full bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs"
                >
                  No Image
                </div>
              </div>

              <input
                v-model="designImagesInput[index].path"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="画像パスを入力"
              />
              <button
                type="button"
                @click="removeImagePath(index)"
                class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm transition-colors"
              >
                削除
              </button>
            </div>
          </div>

          <!-- ホバー時の拡大画像表示 -->
          <div
            v-if="previewImage"
            ref="previewTooltip"
            class="fixed z-[60] pointer-events-none bg-white border border-gray-300 rounded-lg shadow-xl p-2"
            :style="tooltipStyle"
          >
            <img
              :src="previewImage"
              alt="プレビュー"
              class="max-w-xs max-h-48 object-contain"
            />
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';
import { ref, watch, onUnmounted, computed } from 'vue';

import type { ProjectImage } from '../../model/Taskgraph';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();

const nameInput = ref('');
const githubOrganizationInput = ref('');
const githubRepositoryInput = ref('');
const githubProjectNumberInput = ref<number | null>(null);
const designImagesInput = ref<ProjectImage[]>([]);
const bulkPathInput = ref('');
const businessPurposeInput = ref('');
const targetUsersInput = ref('');
const usageFrequencyInput = ref('');
const currentProblemInput = ref('');

// ファイル入力参照
const fileInput = ref<HTMLInputElement | null>(null);

// 画像プレビュー用の状態
const previewImage = ref<string | null>(null);
const previewTooltip = ref<HTMLElement | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

// ドラッグ検出用の状態
const isDragging = ref(false);
const dragStartedInDialog = ref(false);
const mouseDownOnOverlay = ref(false);

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
      // 既存データとの互換性を保つため、文字列配列の場合はオブジェクト配列に変換
      const designImages = newInfo.addition?.design_images || [];
      designImagesInput.value = designImages as ProjectImage[];

      // ビジネス要件フィールドの設定
      businessPurposeInput.value = newInfo.addition?.business_purpose || '';
      targetUsersInput.value = newInfo.addition?.target_users || '';
      usageFrequencyInput.value = newInfo.addition?.usage_frequency || '';
      currentProblemInput.value = newInfo.addition?.current_problem || '';
    }
  },
  { immediate: true },
);

// フォーム送信時の処理
const handleSubmit = () => {
  const updatedInfo: {
    name?: string;
    github: {
      organization?: string;
      repository?: string;
      projectNumber?: number;
    };
    addition?: {
      design_images?: ProjectImage[];
      business_purpose?: string;
      target_users?: string;
      usage_frequency?: string;
      current_problem?: string;
    };
  } = {
    name: nameInput.value || undefined,
    github: {
      organization: githubOrganizationInput.value || undefined,
      repository: githubRepositoryInput.value || undefined,
      projectNumber: githubProjectNumberInput.value || undefined,
    },
  };

  // additionフィールドの構築
  const hasDesignImages = designImagesInput.value.length > 0;
  const hasBusinessRequirements =
    businessPurposeInput.value ||
    targetUsersInput.value ||
    usageFrequencyInput.value ||
    currentProblemInput.value;

  if (hasDesignImages || hasBusinessRequirements) {
    updatedInfo.addition = {};

    if (hasDesignImages) {
      updatedInfo.addition.design_images = designImagesInput.value;
    }

    if (businessPurposeInput.value) {
      updatedInfo.addition.business_purpose = businessPurposeInput.value;
    }
    if (targetUsersInput.value) {
      updatedInfo.addition.target_users = targetUsersInput.value;
    }
    if (usageFrequencyInput.value) {
      updatedInfo.addition.usage_frequency = usageFrequencyInput.value;
    }
    if (currentProblemInput.value) {
      updatedInfo.addition.current_problem = currentProblemInput.value;
    }
  }

  // 空のgithubオブジェクトは削除
  if (
    !updatedInfo.github.organization &&
    !updatedInfo.github.repository &&
    !updatedInfo.github.projectNumber
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

// 現在のプロジェクトIDを取得
const getCurrentProjectId = (): string => {
  // taskStoreから直接取得
  return taskStore.getCurrentProjectId();
};

// 画像パスを追加
const addImagePath = () => {
  designImagesInput.value.push({
    id: nanoid(),
    path: '',
  });
};

// 画像パスを削除
const removeImagePath = (index: number) => {
  designImagesInput.value.splice(index, 1);
};

// 複数パスを一括追加
const addBulkPaths = () => {
  if (!bulkPathInput.value.trim()) return;

  // 改行とカンマの両方で分割して各パスをトリム
  const paths = bulkPathInput.value
    .split(/[,\n]/) // カンマまたは改行で分割
    .map((path) => path.trim())
    .filter((path) => path.length > 0);

  // 既存のパスリストに追加（重複チェック）
  paths.forEach((path) => {
    const exists = designImagesInput.value.some((img) => img.path === path);
    if (!exists) {
      designImagesInput.value.push({
        id: nanoid(),
        path: path,
      });
    }
  });

  // 入力フィールドをクリア
  bulkPathInput.value = '';
};

// ファイル選択時の処理
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  const projectId = getCurrentProjectId();

  // 各ファイルをアップロード
  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // アップロード成功したらオブジェクトとして追加
        designImagesInput.value.push({
          id: nanoid(),
          path: data.filepath,
        });
      } else {
        console.error('Failed to upload image:', file.name);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }

  // ファイル入力をリセット
  if (fileInput.value) {
    fileInput.value.value = '';
  }
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
    mouseDownOnOverlay.value = false;
  } else {
    dragStartedInDialog.value = false;
    // オーバーレイ（背景）でマウスダウンされた場合のみフラグを立てる
    mouseDownOnOverlay.value = event.target === event.currentTarget;
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

// ツールチップスタイルの計算
const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
}));

// 画像パスの妥当性チェック
const isValidImagePath = (path: string): boolean => {
  if (!path) return false;
  const imageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.bmp',
    '.svg',
  ];
  return imageExtensions.some((ext) => path.toLowerCase().endsWith(ext));
};

// 画像URLの取得
const getImageUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // 絶対パス（/から始まる）の場合は直接そのパスを使用
  if (path.startsWith('/')) {
    return `/api/images/absolute${path}`;
  }
  return `/api/images/${path}`;
};

// プレビュー表示
const showPreview = (imagePath: string, event: MouseEvent) => {
  if (!isValidImagePath(imagePath)) return;

  previewImage.value = getImageUrl(imagePath);

  // マウス位置を基にツールチップの位置を計算
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  tooltipPosition.value = {
    x: rect.right + 10,
    y: rect.top,
  };
};

// プレビュー非表示
const hidePreview = () => {
  previewImage.value = null;
};

// 画像エラーハンドリング
const handleImageError = (_event: Event) => {
  // 画像読み込みエラーは静かに処理
};
</script>

<style scoped></style>
