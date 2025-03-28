<script setup>
import { defineEmits } from 'vue';

const emit = defineEmits(['update:selecting']);
const toggleSelection = (selecting) => {
  emit('update:selecting', !selecting);
};

defineProps({
  selecting: {
    type: Boolean,
    required: true,
  },
});
</script>

<template>
  <button
    @click.stop="toggleSelection(selecting)"
    class="fixed bottom-4 right-4 px-4 py-2 bg-blue-500 text-white rounded"
    :class="{ 'bg-green-500': selecting }"
  >
    {{ selecting ? '配置モード中' : 'アイテムを追加' }}
  </button>
</template>
