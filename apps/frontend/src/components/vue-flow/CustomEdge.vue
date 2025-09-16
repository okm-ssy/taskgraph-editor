<template>
  <g>
    <path
      :id="id"
      :style="edgeStyle"
      class="vue-flow__edge-path animated-edge"
      :d="path"
    />
    <!-- エッジ上を動く円 -->
    <circle v-if="animated" r="4" :fill="edgeColor" class="edge-dot">
      <animateMotion
        :dur="`${animationDuration}s`"
        repeatCount="indefinite"
        :path="path"
      />
    </circle>
  </g>
</template>

<script setup lang="ts">
import { getBezierPath } from '@vue-flow/core';
import type { EdgeProps } from '@vue-flow/core';
import { computed } from 'vue';

const props = defineProps<
  EdgeProps & {
    animated?: boolean;
  }
>();

// ベジェ曲線のパスを計算
const path = computed(() => {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } =
    props;
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return edgePath;
});

// エッジの色
const edgeColor = computed(() => {
  return '#6366f1'; // indigo-500
});

// エッジのスタイル
const edgeStyle = computed(() => ({
  stroke: edgeColor.value,
  strokeWidth: 2,
  fill: 'none',
  strokeDasharray: '5,5',
}));

// アニメーション時間（一定）
const animationDuration = computed(() => {
  return 6; // 6秒で固定
});
</script>

<style scoped>
.edge-dot {
  filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.5));
}

.animated-edge {
  opacity: 0.8;
  transition: opacity 0.3s;
}

.animated-edge:hover {
  opacity: 1;
}
</style>
