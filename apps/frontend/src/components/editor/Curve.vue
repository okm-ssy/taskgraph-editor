<template>
  <svg
    ref="svgElement"
    :class="[
      'pointer-events-none absolute top-0 left-0',
      props.isDragging ? 'dragging' : '',
    ]"
    :width="props.gridBounds.width"
    :height="props.gridBounds.height"
    :viewBox="`0 0 ${props.gridBounds.width} ${props.gridBounds.height}`"
  >
    <defs v-if="!props.clickLayerOnly">
      <!-- 通常の矢印マーカー -->
      <marker
        v-for="connection in connections.filter(
          (c) => c.targetId !== 'mouse-pointer',
        )"
        :key="`arrow-${connection.sourceId}-${connection.targetId}`"
        :id="`arrow-${connection.sourceId}-${connection.targetId}`"
        markerWidth="12"
        markerHeight="9"
        refX="12"
        refY="4.5"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <polygon
          points="0 0, 12 4.5, 0 9"
          :fill="
            getConnectionColor(
              connection,
              (props.hoveredConnectionKey || hoveredConnection) ===
                `${connection.sourceId}-${connection.targetId}`,
            ) ||
            connection.color ||
            '#94a3b8'
          "
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
      <!-- クリック可能な太い透明パス（クリックレイヤーモードでのみ表示） -->
      <path
        v-if="props.clickLayerOnly"
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
        stroke-width="15"
        :class="[
          props.isDragging
            ? 'pointer-events-none'
            : 'cursor-pointer pointer-events-auto',
        ]"
        @click="handleConnectionClick($event, connection)"
        @mouseenter="handleConnectionMouseEnter($event, connection)"
        @mouseleave="handleConnectionMouseLeave"
      ></path>
      <!-- 表示用のパス（通常モードでのみ表示） -->
      <path
        v-if="!props.clickLayerOnly"
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
        :stroke="
          getConnectionColor(
            connection,
            (props.hoveredConnectionKey || hoveredConnection) ===
              `${connection.sourceId}-${connection.targetId}`,
          ) ||
          connection.color ||
          '#94a3b8'
        "
        :stroke-width="
          (props.hoveredConnectionKey || hoveredConnection) ===
          `${connection.sourceId}-${connection.targetId}`
            ? 3
            : (connection.strokeWidth ?? 2)
        "
        :marker-end="`url(#arrow-${connection.sourceId}-${connection.targetId})`"
        class="pointer-events-none"
      ></path>
    </g>

    <!-- 仮矢印（ドラッグ中のみ、通常モードでのみ表示） -->
    <g v-if="tempConnectionPosition && !props.clickLayerOnly">
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

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, type PropType } from 'vue';

import { TIMING } from '../../constants/timing';
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
  (e: 'connection-hover', connectionKey: string | null): void;
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
  continuousUpdate: {
    type: Boolean,
    default: false,
  },
  isDragging: {
    type: Boolean,
    default: false,
  },
  clickLayerOnly: {
    type: Boolean,
    default: false,
  },
  hoveredConnectionKey: {
    type: Object as PropType<string | null>,
    default: null,
  },
  gridBounds: {
    type: Object as PropType<{ width: number; height: number }>,
    default: () => ({ width: 800, height: 600 }),
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
let continuousUpdateId: number | null = null;
const updateRetryMap = new Map<string, number>();
const hoveredConnection = ref<string | null>(null);

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
    const key = `${connection.sourceId}-${connection.targetId}`;

    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();

      // サイズがゼロの場合は再試行をスケジュール
      if (
        startRect.width === 0 ||
        startRect.height === 0 ||
        endRect.width === 0 ||
        endRect.height === 0
      ) {
        const retryCount = updateRetryMap.get(key) || 0;
        if (retryCount < TIMING.RETRY_LIMITS.MAX_POSITION_RETRIES) {
          updateRetryMap.set(key, retryCount + 1);
          setTimeout(
            () => {
              updatePositions();
            },
            TIMING.RETRY.BASE_DELAY_MS * (retryCount + 1),
          ); // 徐々に間隔を長くする
        }
        return;
      }

      // 正常にサイズが取得できたらリトライカウントをリセット
      updateRetryMap.delete(key);

      connectionPosition.value.set(key, {
        start: {
          // 青い丸から少し離れた位置から開始
          x: startRect.x + startRect.width / 2 - svgRect.x + 7,
          y: startRect.y + startRect.height / 2 - svgRect.y,
        },
        end: {
          // targetの左端の青い丸から少し離れた位置で終了
          x: endRect.x - svgRect.x,
          y: endRect.y + endRect.height / 2 - svgRect.y,
        },
      });
    } else {
      // 要素が見つからない場合も再試行
      const retryCount = updateRetryMap.get(key) || 0;
      if (retryCount < TIMING.RETRY_LIMITS.MAX_ELEMENT_RETRIES) {
        updateRetryMap.set(key, retryCount + 1);
        setTimeout(() => {
          updatePositions();
        }, TIMING.INTERVALS.ELEMENT_CHECK_MS);
      }
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
const handleConnectionClick = (event: MouseEvent, connection: Connection) => {
  // ドラッグ中はクリックを無視
  if (props.isDragging) return;

  // クリック位置がタスクカード上かチェック
  const clickedElement = document.elementFromPoint(
    event.clientX,
    event.clientY,
  );
  if (clickedElement?.closest('.vue-grid-item')) {
    return; // タスクカード上ならクリックを無視
  }

  emit('connection-click', connection);
};

// ホバーイベントハンドラー
const handleConnectionMouseEnter = (
  event: MouseEvent,
  connection: Connection,
) => {
  if (props.isDragging) return;

  // ホバー位置がタスクカード上かチェック
  const hoveredElement = document.elementFromPoint(
    event.clientX,
    event.clientY,
  );
  if (hoveredElement?.closest('.vue-grid-item')) {
    return; // タスクカード上ならホバーを無視
  }

  const connectionKey = `${connection.sourceId}-${connection.targetId}`;
  hoveredConnection.value = connectionKey;
  emit('connection-hover', connectionKey);
};

const handleConnectionMouseLeave = () => {
  hoveredConnection.value = null;
  emit('connection-hover', null);
};

// ホバー状態に基づいて色を決定
const getConnectionColor = (_connection: Connection, isHovered: boolean) => {
  if (isHovered) {
    return '#ef4444'; // ホバー時は赤色
  }
  return null; // ホバーしていない時はnullを返して元の色を使用
};

// グリッドレイアウト対応の効率的な更新システム
const resizeObserver = ref<ResizeObserver | null>(null);
const mutationObserver = ref<MutationObserver | null>(null);
const observedElements = new Set<Element>();
const transitionElements = new Map<Element, boolean>();
let animationFrameId: number | null = null;

// 連続更新モード（ドラッグ中は低頻度）
const startContinuousUpdate = (isLowFrequency = false) => {
  if (continuousUpdateId) return;

  const update = () => {
    updatePositions();
    if (isLowFrequency) {
      // ドラッグ中は低頻度（30FPS）で更新
      setTimeout(() => {
        if (continuousUpdateId) {
          continuousUpdateId = requestAnimationFrame(update);
        }
      }, TIMING.FRAME_RATE.LOW_FREQUENCY_MS);
    } else {
      // 通常は60FPSで更新
      continuousUpdateId = requestAnimationFrame(update);
    }
  };
  continuousUpdateId = requestAnimationFrame(update);
};

const stopContinuousUpdate = () => {
  if (continuousUpdateId) {
    cancelAnimationFrame(continuousUpdateId);
    continuousUpdateId = null;
  }
};

// アニメーションフレームを使った効率的な更新
const scheduleUpdate = (immediate = false) => {
  // ドラッグ中は更新をスケジュールしない
  if (props.isDragging) {
    return;
  }

  if (props.continuousUpdate) {
    // 連続更新モードが有効な場合は何もしない（既に更新ループが回っている）
    return;
  }

  if (immediate) {
    // 即座に更新
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    updatePositions();
    return;
  }

  if (animationFrameId) return; // 既にスケジュール済みの場合はスキップ

  animationFrameId = requestAnimationFrame(() => {
    updatePositions();
    animationFrameId = null;
  });
};

// CSS Transitionイベントのハンドラー
const handleTransitionStart = (event: Event) => {
  const transitionEvent = event as TransitionEvent;
  if (transitionEvent.propertyName === 'transform') {
    const element = transitionEvent.target as Element;
    transitionElements.set(element, true);
    // トランジション中は通常頻度で連続更新を開始
    if (!props.continuousUpdate) {
      startContinuousUpdate(false);
    }
  }
};

const handleTransitionEnd = (event: Event) => {
  const transitionEvent = event as TransitionEvent;
  if (transitionEvent.propertyName === 'transform') {
    const element = transitionEvent.target as Element;
    transitionElements.delete(element);
    // すべてのトランジションが終了したら連続更新を停止
    if (transitionElements.size === 0 && !props.continuousUpdate) {
      stopContinuousUpdate();
      // 最終位置を確実に更新
      setTimeout(() => {
        updatePositions();
      }, TIMING.CURVE_UPDATE.IMMEDIATE_MS);
    }
  }
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
        setTimeout(() => scheduleUpdate(), TIMING.SCHEDULE.DELAY_MS);
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

          // CSS Transitionイベントリスナーを追加
          gridItem.addEventListener('transitionstart', handleTransitionStart);
          gridItem.addEventListener('transitionend', handleTransitionEnd);

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

  // トランジションイベントリスナーをクリーンアップ
  observedElements.forEach((element) => {
    const gridItem = element.closest('.vue-grid-item');
    if (gridItem) {
      gridItem.removeEventListener('transitionstart', handleTransitionStart);
      gridItem.removeEventListener('transitionend', handleTransitionEnd);
    }
  });

  observedElements.clear();
  transitionElements.clear();

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

// 連続更新モードの切り替え（ドラッグ中は無効）
watch(
  () => props.continuousUpdate,
  (newValue) => {
    // ドラッグ中は連続更新を無効化
    if (newValue) {
      // 何もしない（ドラッグ中は更新しない）
    } else {
      stopContinuousUpdate();
    }
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
  // 初期描画を少し遅延させて、要素が確実にレンダリングされるのを待つ
  setTimeout(() => {
    updatePositions();
  }, TIMING.INITIALIZATION.DELAY_MS);

  // 複数回の初期更新で確実に位置を取得
  setTimeout(() => {
    updatePositions();
  }, TIMING.INITIALIZATION.MEDIUM_DELAY_MS);

  setTimeout(() => {
    updatePositions();
  }, TIMING.INTERVALS.LONG_DELAY_MS);

  setupObservers();
  window.addEventListener('resize', updatePositions);

  if (props.continuousUpdate) {
    startContinuousUpdate();
  }
});

onBeforeUnmount(() => {
  cleanupObservers();
  window.removeEventListener('resize', updatePositions);
  stopContinuousUpdate();
  updateRetryMap.clear();
});
</script>

<style scoped>
/* ドラッグ中はホバー効果を無効化 */
svg.dragging path {
  pointer-events: none !important;
}

/* グリッドアイテムのトランジションを検知しやすくする */
:global(.vue-grid-item) {
  will-change: transform;
}
</style>
