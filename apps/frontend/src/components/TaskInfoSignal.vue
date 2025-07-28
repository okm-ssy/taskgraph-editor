<template>
  <div class="flex items-center gap-[1px]" :title="tooltipText">
    <span
      v-for="(signal, index) in signals"
      :key="index"
      :class="[
        'inline-block w-[6px] h-[6px] rounded-full transition-all',
        signal === 'o' ? 'bg-green-500' : 'bg-gray-300',
        compact ? 'w-[4px] h-[4px]' : '',
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTaskAdditionalInfo } from '../composables/useTaskAdditionalInfo';
import type { Task } from '../model/Taskgraph';

const props = defineProps<{
  task: Task;
  compact?: boolean;
}>();

const { getSignalDisplay, checkTaskAdditionalInfo } = useTaskAdditionalInfo();

const signals = computed(() => getSignalDisplay(props.task).split(''));

const tooltipText = computed(() => {
  const info = checkTaskAdditionalInfo(props.task);
  const items = [];

  items.push(info.hasImplementationNotes ? '✓ 実装方針' : '○ 実装方針');
  items.push(info.hasDataRequirements ? '✓ API仕様' : '○ API仕様');
  items.push(info.hasAcceptanceCriteria ? '✓ 要件' : '○ 要件');
  items.push(info.hasDesignImages ? '✓ 画面設計画像' : '○ 画面設計画像');

  return items.join('\n');
});
</script>

<style scoped></style>
