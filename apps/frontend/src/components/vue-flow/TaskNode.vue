<template>
  <div
    class="task-node px-4 py-3 bg-white border-2 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer min-w-[180px] relative"
    :class="[
      fieldClass,
      {
        'border-blue-500': isSelected,
        'border-gray-300': !isSelected,
      },
    ]"
    @click="handleClick"
  >
    <Handle 
      id="left"
      type="target" 
      :position="Position.Left" 
      :style="{ left: '-8px', top: '50%', transform: 'translateY(-50%)' }"
    />
    <Handle 
      id="right"
      type="source" 
      :position="Position.Right" 
      :style="{ right: '-8px', top: '50%', transform: 'translateY(-50%)' }"
    />
    <div class="flex items-center justify-between mb-1">
      <h3 class="font-semibold text-sm truncate">{{ data.label }}</h3>
      <span
        v-if="data.issueNumber"
        class="text-xs text-gray-500 ml-2 flex-shrink-0"
      >
        #{{ data.issueNumber }}
      </span>
    </div>

    <p class="text-xs text-gray-600 line-clamp-2 mb-2">
      {{ data.description }}
    </p>

    <div class="flex items-center justify-between text-xs">
      <span v-if="data.category" class="px-2 py-1 bg-gray-100 rounded">
        {{ data.category }}
      </span>
      <div class="flex items-center gap-1">
        <span
          v-if="data.difficulty"
          class="px-2 py-1 rounded"
          :class="difficultyClass"
        >
          難易度: {{ data.difficulty }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';

import { DIFFICULTY } from '../../constants';
import { useEditorUIStore } from '../../store/editor_ui_store';

const props = defineProps<{
  data: {
    label: string;
    description: string;
    difficulty?: number;
    field?: string;
    category?: string;
    issueNumber?: number;
  };
  id: string;
}>();

const emit = defineEmits<{
  click: [];
}>();

const uiStore = useEditorUIStore();

const isSelected = computed(() => uiStore.selectedTaskId === props.id);

// フィールドに応じたクラス
const fieldClass = computed(() => {
  switch (props.data.field) {
    case 'front':
      return 'field-front';
    case 'back':
      return 'field-back';
    case 'infra':
      return 'field-infra';
    case 'parent':
      return 'field-parent';
    default:
      return 'field-other';
  }
});

// 難易度に応じたクラス
const difficultyClass = computed(() => {
  const difficulty = props.data.difficulty || 0;
  const thresholds = DIFFICULTY.COLOR_THRESHOLDS;

  if (difficulty <= thresholds[0]) {
    return 'bg-green-100 text-green-800';
  } else if (difficulty <= thresholds[1]) {
    return 'bg-yellow-100 text-yellow-800';
  } else if (difficulty <= thresholds[2]) {
    return 'bg-orange-100 text-orange-800';
  } else {
    return 'bg-red-100 text-red-800';
  }
});

const handleClick = () => {
  emit('click');
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.field-front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.field-front h3,
.field-front p {
  color: white;
}

.field-back {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.field-back h3,
.field-back p {
  color: white;
}

.field-infra {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.field-infra h3,
.field-infra p {
  color: white;
}

.field-parent {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.field-parent h3,
.field-parent p {
  color: white;
}

.field-other {
  background: white;
}

/* Handleのスタイル */
:deep(.vue-flow__handle) {
  width: 12px;
  height: 12px;
  border: 2px solid #555;
  background-color: white;
}

:deep(.vue-flow__handle-left) {
  left: -6px;
}

:deep(.vue-flow__handle-right) {
  right: -6px;
}
</style>
