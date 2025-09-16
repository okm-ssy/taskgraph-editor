<template>
  <g>
    <path
      :id="id"
      :style="edgeStyle"
      class="vue-flow__edge-path animated-edge"
      :d="path"
    />
    <!-- エッジ上を動く円 -->
    <circle
      v-if="animated"
      r="4"
      :fill="edgeColor"
      :opacity="0.5"
      class="edge-dot"
    >
      <animateMotion
        :dur="`${animationDuration}s`"
        repeatCount="indefinite"
        :path="path"
        :keyTimes="keyTimesString"
        :keyPoints="keyPointsString"
        calcMode="linear"
      />
    </circle>
  </g>
</template>

<script setup lang="ts">
import { getBezierPath } from '@vue-flow/core';
import type { EdgeProps } from '@vue-flow/core';
import { computed } from 'vue';

// メモ化用のキャッシュ
const easingCache = new Map<string, string>();

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

// 累乗関数のイージング計算（メモ化付き）
const generateEasingPoints = (steps: number) => {
  const cacheKey = `easing_${steps}`;

  // キャッシュから取得
  const cached = easingCache.get(cacheKey);
  if (cached) {
    const [keyTimes, keyPoints] = cached.split('|');
    return { keyTimes, keyPoints };
  }

  const keyTimesArr: number[] = [];
  const keyPointsArr: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    keyTimesArr.push(t);
    // 逆ease-in-out関数: 初めと終わりが速く、中間がゆっくり
    // 3次関数を使用して、より急激な加速・減速を実現
    let eased;
    if (t < 0.5) {
      // 前半：速く開始してゆっくりに
      eased = 1 - Math.pow(1 - 2 * t, 3) / 2;
    } else {
      // 後半：ゆっくりから速く終了
      eased = (1 + Math.pow(2 * t - 1, 3)) / 2;
    }
    keyPointsArr.push(eased);
  }

  const keyTimes = keyTimesArr.join(';');
  const keyPoints = keyPointsArr.join(';');

  // キャッシュに保存
  easingCache.set(cacheKey, `${keyTimes}|${keyPoints}`);

  return { keyTimes, keyPoints };
};

// イージング用のキーフレーム（20ステップで計算）
const { keyTimes, keyPoints } = generateEasingPoints(20);
const keyTimesString = computed(() => keyTimes);
const keyPointsString = computed(() => keyPoints);
</script>

<style scoped>
.edge-dot {
  filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.3));
}

.animated-edge {
  opacity: 0.8;
  transition: opacity 0.3s;
}

.animated-edge:hover {
  opacity: 1;
}
</style>
