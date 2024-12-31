<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed, type PropType } from 'vue';

import type { Task } from '../model/Taskgraph';

const props = defineProps({
  modelValue: {
    type: Object as PropType<Task>,
    required: true,
  },
});

const emits = defineEmits(['update:modelValue']);

const task = useVModel(props, 'modelValue', emits);

const taskNotes = computed({
  get() {
    return task.value.notes.join('\n');
  },
  set(value: string) {
    task.value.notes = value.split('\n');
  },
});

const taskDifficulty = computed({
  get() {
    return task.value.difficulty;
  },
  set(value) {
    task.value.difficulty = Number(value) || 0;
  },
});

const difficultyColorClass = (difficulty: number) => {
  if (difficulty <= 1) return 'text-blue-500';
  if (difficulty <= 2) return 'text-green-500';
  if (difficulty <= 4) return 'text-yellow-500';
  if (difficulty <= 8) return 'text-red-500';
  return 'text-gray-800';
};

const rowWidth = {
  width: '8rem',
};
</script>

<template>
  <div class="flex flex-col border rounded-lg">
    <div
      class="flex p-2 pl-5 rounded-t-lg bg-green-600 text-white font-bold text-xl"
    >
      {{ task.name }}
      <div v-if="task.issueNumber">#{{ task.issueNumber }}</div>
    </div>
    <div class="p-4 flex flex-col space-y-4">
      <div class="flex">
        <div :style="rowWidth">タスク ID</div>
        <div class="m-4" />
        <div class="w-full">
          <input
            v-model="task.name"
            type="text"
            class="border rounded-lg w-full px-2"
          />
        </div>
      </div>
      <div class="flex">
        <div :style="rowWidth">難易度</div>
        <div class="m-4" />
        <div class="w-full">
          <select
            v-model="taskDifficulty"
            class="font-bold"
            :class="difficultyColorClass(taskDifficulty)"
          >
            <option :class="difficultyColorClass(1)">1</option>
            <option :class="difficultyColorClass(2)">2</option>
            <option :class="difficultyColorClass(4)">4</option>
            <option :class="difficultyColorClass(8)">8</option>
          </select>
        </div>
      </div>
      <div class="flex">
        <div :style="rowWidth">説明 (要約・1行)</div>
        <div class="m-4" />
        <div class="w-full">
          <input
            v-model="task.description"
            type="text"
            class="border rounded-lg w-full px-2"
          />
        </div>
      </div>
      <div class="flex">
        <div :style="rowWidth">説明 (複数行)</div>
        <div class="m-4" />
        <div class="w-full">
          <textarea
            v-model="taskNotes"
            :rows="task.notes.length"
            class="border rounded-lg w-full px-2 py-1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
