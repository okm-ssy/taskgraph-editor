<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, type PropType } from 'vue';

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

let intervalId: number | null = null;

onMounted(() => {
  updatePositions();
  const minInterval = Math.min(
    ...props.connections.map((connection) => connection.interval ?? 25),
  );
  intervalId = window.setInterval(updatePositions, minInterval);

  window.addEventListener('resize', updatePositions);
});

onBeforeUnmount(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
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
