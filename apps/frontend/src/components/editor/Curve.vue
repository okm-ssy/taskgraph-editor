<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, type PropType } from 'vue';

import { useDragDropStore } from '../../store/drag_drop_store';

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

const emit = defineEmits<{
  (e: 'connection-click', connection: Connection): void;
}>();

const dragDropStore = useDragDropStore();

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

// 仮矢印用の位置情報を別管理
const tempConnectionPosition = ref<{ start: Position; end: Position } | null>(
  null,
);

const svgElement = ref<SVGSVGElement | null>(null);

const updatePositions = () => {
  if (!svgElement.value) return;

  const svgRect = svgElement.value.getBoundingClientRect();

  // 通常の接続を処理（mouse-pointerは除外）
  const normalConnections = props.connections.filter(
    (conn) => conn.targetId !== 'mouse-pointer',
  );

  normalConnections.forEach((connection) => {
    const startElement = document.getElementById(connection.sourceId);
    const endElement = document.getElementById(connection.targetId);

    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();

      const key = `${connection.sourceId}-${connection.targetId}`;
      connectionPosition.value.set(key, {
        start: {
          x: startRect.x + startRect.width / 2 - svgRect.x,
          y: startRect.y + startRect.height / 2 - svgRect.y,
        },
        end: {
          // targetの左端を指すように調整（endRect.x はtargetの左端）
          x: endRect.x - svgRect.x,
          y: endRect.y + endRect.height / 2 - svgRect.y,
        },
      });
    }
  });

  // 仮矢印の位置を別途更新
  updateTempConnection();
};

const updateTempConnection = () => {
  if (!svgElement.value) return;

  if (
    dragDropStore.isDragging &&
    dragDropStore.draggingSourceId &&
    dragDropStore.dragPosition
  ) {
    const svgRect = svgElement.value.getBoundingClientRect();
    const startElement = document.getElementById(
      `source-${dragDropStore.draggingSourceId}`,
    );

    if (startElement) {
      const startRect = startElement.getBoundingClientRect();
      tempConnectionPosition.value = {
        start: {
          x: startRect.x + startRect.width / 2 - svgRect.x,
          y: startRect.y + startRect.height / 2 - svgRect.y,
        },
        end: {
          x: dragDropStore.dragPosition.x,
          y: dragDropStore.dragPosition.y,
        },
      };
    }
  } else {
    tempConnectionPosition.value = null;
  }
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

// 接続線クリックハンドラ
const handleConnectionClick = (connection: Connection) => {
  emit('connection-click', connection);
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
        } else if (
          mutation.attributeName === 'class' ||
          mutation.attributeName === 'transform'
        ) {
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
          subtree: false,
        });

        // グリッドアイテムの親コンテナも監視
        const gridItem = element.closest('.vue-grid-item');
        if (gridItem && !observedElements.has(gridItem)) {
          mutationObserver.value?.observe(gridItem, {
            attributes: true,
            attributeFilter: ['style', 'class', 'transform'],
            subtree: false,
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

// ドラッグ中のマウス位置変更を監視
watch(
  () => dragDropStore.dragPosition,
  () => {
    updateTempConnection(); // 仮矢印のみ更新
  },
  { deep: true },
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
  <svg
    ref="svgElement"
    :class="[
      'w-full h-full pointer-events-none',
      dragDropStore.isDragging ? 'dragging' : '',
    ]"
  >
    <defs>
      <!-- 通常の矢印マーカー -->
      <marker
        v-for="connection in connections.filter(
          (c) => c.targetId !== 'mouse-pointer',
        )"
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

    <!-- 通常の接続線 -->
    <g
      v-for="connection in connections.filter(
        (c) => c.targetId !== 'mouse-pointer',
      )"
      :key="`${connection.sourceId}-${connection.targetId}`"
    >
      <!-- クリック可能な太い透明パス -->
      <path
        :d="
          connectionPosition.get(
            `${connection.sourceId}-${connection.targetId}`,
          )
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
        stroke="transparent"
        stroke-width="20"
        :class="[
          dragDropStore.isDragging
            ? 'pointer-events-none'
            : 'cursor-pointer pointer-events-auto',
        ]"
        style="z-index: 5"
        @click="handleConnectionClick(connection)"
      ></path>
      <!-- 表示用のパス -->
      <path
        :d="
          connectionPosition.get(
            `${connection.sourceId}-${connection.targetId}`,
          )
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
        class="pointer-events-none"
      ></path>
    </g>

    <!-- 仮矢印（ドラッグ中のみ） -->
    <g v-if="tempConnectionPosition">
      <path
        :d="getPathD(tempConnectionPosition.start, tempConnectionPosition.end)"
        fill="none"
        stroke="#3b82f6"
        stroke-width="2"
        class="pointer-events-none"
      ></path>
    </g>
  </svg>
</template>

<style scoped>
svg:not(.dragging) path.cursor-pointer:hover + path {
  stroke: #ef4444;
  stroke-width: 3;
}
</style>
