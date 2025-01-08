<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed, type PropType } from 'vue';

import type { Task } from '../model/Taskgraph';
import { difficultyColorClass } from '../utilities/task';

import EditorTaskDialogRow from './EditorTaskDialogRow.vue';

const props = defineProps({
  modelValue: {
    type: Object as PropType<Task>,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'close']);

const task = useVModel(props, 'modelValue', emit);

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

const rowWidth = {
  width: '8rem',
};
</script>

<template>
  <div class="flex flex-col border rounded-lg bg-slate-50 w-full">
    <div
      class="flex p-2 pl-5 rounded-t-lg bg-green-600 text-white font-bold text-xl justify-between items-center"
    >
      <div class="flex">
        {{ task.name }}
        <div v-if="task.issueNumber">#{{ task.issueNumber }}</div>
      </div>
      <button class="bg-red-500 w-8 h-8 rounded-md" @click="emit('close')">
        ×
      </button>
    </div>
    <div class="p-4 flex flex-col space-y-4">
      <EditorTaskDialogRow :title-style="rowWidth" title="タスク ID">
        <input
          v-model="task.name"
          type="text"
          class="border rounded-lg w-full px-2"
        />
      </EditorTaskDialogRow>
      <EditorTaskDialogRow :title-style="rowWidth" title="難易度">
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
      </EditorTaskDialogRow>
      <EditorTaskDialogRow :title-style="rowWidth" title="説明 (要約・1行)">
        <input
          v-model="task.description"
          type="text"
          class="border rounded-lg w-full px-2"
        />
      </EditorTaskDialogRow>
      <EditorTaskDialogRow :title-style="rowWidth" title="説明 (複数行)">
        <textarea
          v-model="taskNotes"
          :rows="task.notes.length"
          class="border rounded-lg w-full px-2 py-1"
        />
      </EditorTaskDialogRow>
    </div>
    <div class="w-full flex justify-center">
      <button
        class="border rounded-full px-10 py-1 hover:bg-green-100"
        @click="emit('close')"
      >
        閉じる
      </button>
    </div>
    <div class="m-1" />
  </div>
</template>

<style scoped></style>
