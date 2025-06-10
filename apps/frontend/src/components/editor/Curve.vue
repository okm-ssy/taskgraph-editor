<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, type PropType } from 'vue';

interface Position {
  x: number;
  y: number;
}

export interface Connection {
  sourceId: string;
  targetId: string;
  color?: string;
  strokeWidth?: number;
  interval?: number;
}

const props = defineProps({
  connections: {
    type: Array as PropType<Connection[]>,
    required: true,
    default: () => [],
  },
  forceUpdate: {
    type: Number,
    default: 0,
  },
});

const connectionPosition = ref<Map<string, { start: Position; end: Position }>>(
  new Map(),
);

const updatePositions = () => {
  props.connections.forEach((connection) => {
    const startElement = document.getElementById(connection.sourceId);
    const endElement = document.getElementById(connection.targetId);

    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();

      const key = `${connection.sourceId}-${connection.targetId}`;
      connectionPosition.value.set(key, {
        start: {
          x: startRect.x + startRect.width / 2,
          y: startRect.y + startRect.height / 2,
        },
        end: {
          x: endRect.x + endRect.width / 2,
          y: endRect.y + endRect.height / 2,
        },
      });
    }
  });
};

const getPathD = (start: Position, end: Position) => {
  const diffX = end.x - start.x;
  const diffY = end.y - start.y;
  const isMoreVertical = Math.abs(diffY) > Math.abs(diffX);

  if (isMoreVertical) {
    // 縦方向が長い場合、Y軸方向の制御点を使用
    const controlPointOffset = diffY * 0.5;
    return [
      `M ${start.x},${start.y}`,
      `C ${start.x},${start.y + controlPointOffset} ${end.x},${end.y - controlPointOffset} ${end.x},${end.y}`,
    ].join(' ');
  } else {
    // 横方向が長い場合、X軸方向の制御点を使用
    const controlPointOffset = diffX * 0.5;
    return [
      `M ${start.x},${start.y}`,
      `C ${start.x + controlPointOffset},${start.y} ${end.x - controlPointOffset},${end.y} ${end.x},${end.y}`,
    ].join(' ');
  }
};

// グリッドレイアウト対応の効率的な更新システム
const resizeObserver = ref<ResizeObserver | null>(null);
const mutationObserver = ref<MutationObserver | null>(null);
const observedElements = new Set<Element>();
let animationFrameId: number | null = null;

// アニメーションフレームを使った効率的な更新
const scheduleUpdate = (immediate = false) => {
  if (immediate) {
    // 即座に更新（CSS Transformの完了を待つ）
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    setTimeout(() => {
      updatePositions();
    }, 16); // 約1フレーム分待機
    return;
  }
  
  if (animationFrameId) return; // 既にスケジュール済みの場合はスキップ
  
  animationFrameId = requestAnimationFrame(() => {
    updatePositions();
    animationFrameId = null;
  });
};

const setupObservers = () => {
  // ResizeObserverのセットアップ
  resizeObserver.value = new ResizeObserver(() => {
    scheduleUpdate();
  });

  // MutationObserverのセットアップ（CSS変更を包括的に監視）
  mutationObserver.value = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    let hasTransformChange = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        // style属性やclass属性の変更を監視
        if (mutation.attributeName === 'style') {
          // transform: translate3d の変更を特別に検知
          const element = mutation.target as HTMLElement;
          if (element.style.transform.includes('translate3d')) {
            hasTransformChange = true;
          }
          shouldUpdate = true;
        } else if (mutation.attributeName === 'class' ||
                   mutation.attributeName === 'transform') {
          shouldUpdate = true;
        }
      }
      
      // 子要素の変更も監視（グリッドアイテムの構造変更対応）
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldUpdate = true;
      }
    });
    
    if (shouldUpdate) {
      // Transform変更の場合は少し遅延して確実に更新
      if (hasTransformChange) {
        setTimeout(() => scheduleUpdate(), 20);
      } else {
        scheduleUpdate();
      }
    }
  });

  // 各接続の要素を監視
  props.connections.forEach((connection) => {
    const sourceElement = document.getElementById(connection.sourceId);
    const targetElement = document.getElementById(connection.targetId);

    [sourceElement, targetElement].forEach((element) => {
      if (element && !observedElements.has(element)) {
        resizeObserver.value?.observe(element);
        
        // 要素自体とその親コンテナを監視
        mutationObserver.value?.observe(element, {
          attributes: true,
          attributeFilter: ['style', 'class', 'transform'],
          subtree: false
        });
        
        // グリッドアイテムの親コンテナも監視
        const gridItem = element.closest('.vue-grid-item');
        if (gridItem && !observedElements.has(gridItem)) {
          mutationObserver.value?.observe(gridItem, {
            attributes: true,
            attributeFilter: ['style', 'class', 'transform'],
            subtree: false
          });
          observedElements.add(gridItem);
        }
        
        observedElements.add(element);
      }
    });
  });
};

const cleanupObservers = () => {
  resizeObserver.value?.disconnect();
  mutationObserver.value?.disconnect();
  observedElements.clear();
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

// 接続が変更されたときにオブザーバーを再設定
watch(
  () => props.connections,
  () => {
    cleanupObservers();
    setupObservers();
    updatePositions();
  },
  { deep: true },
);

// 強制更新用のwatcher（より確実な更新）
watch(
  () => props.forceUpdate,
  () => {
    scheduleUpdate(true); // immediate = true で即座に更新
  },
);

onMounted(() => {
  updatePositions();
  setupObservers();
  window.addEventListener('resize', updatePositions);
});

onBeforeUnmount(() => {
  cleanupObservers();
  window.removeEventListener('resize', updatePositions);
});
</script>

<template>
  <svg class="w-full h-full pointer-events-none">
    <defs>
      <marker
        v-for="connection in connections"
        :key="`arrow-${connection.sourceId}-${connection.targetId}`"
        :id="`arrow-${connection.sourceId}-${connection.targetId}`"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          :fill="connection.color ?? '#2563eb'"
        ></polygon>
      </marker>
    </defs>

    <path
      v-for="connection in connections"
      :key="`${connection.sourceId}-${connection.targetId}`"
      :d="
        connectionPosition.get(`${connection.sourceId}-${connection.targetId}`)
          ? getPathD(
              connectionPosition.get(
                `${connection.sourceId}-${connection.targetId}`,
              )!.start,
              connectionPosition.get(
                `${connection.sourceId}-${connection.targetId}`,
              )!.end,
            )
          : ''
      "
      fill="none"
      :stroke="connection.color ?? '#2563eb'"
      :stroke-width="connection.strokeWidth ?? 2"
      :marker-end="`url(#arrow-${connection.sourceId}-${connection.targetId})`"
    ></path>
  </svg>
</template>
