<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
  disabled?: boolean;
}>();

// パスの曲線計算
const curve = computed(() => {
  const { x: startX, y: startY } = props.start;
  const { x: endX, y: endY } = props.end;
  const diffX = endX - startX;

  return [
    `M ${startX},${startY}`,
    `C ${startX + diffX * 0.4},${startY} ${endX - diffX * 0.4},${endY} ${endX},${endY}`,
  ].join(' ');
});
</script>

<template>
  <svg class="w-full h-full">
    <defs>
      <marker
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"></path>
      </marker>
    </defs>
    <path
      v-bind="$attrs"
      class="pointer-events-none"
      :d="curve"
      stroke="#94a3b8"
      stroke-width="1.5"
      stroke-dasharray="4,3"
      fill="none"
      marker-end="url(#arrowhead)"
    ></path>
  </svg>
</template>
