<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, type PropType } from 'vue';

interface Position {
  x: number;
  y: number;
}

export interface Connection {
  startId: string;
  endId: string;
  color?: string;
  strokeWidth?: number;
  interval?: number;
}

const props = defineProps({
  connections: {
    type: Object as PropType<Connection[]>,
    required: true,
  },
});

// 各線の位置情報を保持
const connectionPosition = ref<Map<string, { start: Position; end: Position }>>(
  new Map(),
);

const updatePositions = () => {
  props.connections.forEach((connection) => {
    const startElement = document.getElementById(connection.startId);
    const endElement = document.getElementById(connection.endId);

    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();

      const key = `${connection.startId}-${connection.endId}`;
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

// 各線のパスを計算
const getPathD = (start: Position, end: Position) => {
  const diffX = end.x - start.x;

  return [
    `M ${start.x},${start.y}`,
    `C ${start.x + diffX * 0.1},${start.y} ${end.x - diffX * 0.1},${end.y} ${end.x},${end.y}`,
  ].join(' ');
};

let intervalId: number | null = null;

onMounted(() => {
  updatePositions();
  // 最小のintervalを使用（デフォルトは25ms）
  const minInterval = Math.min(
    ...props.connections.map((connection) => connection.interval ?? 25),
  );
  intervalId = window.setInterval(updatePositions, minInterval);
});

onBeforeUnmount(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <svg class="relative top-0 left-0 w-full h-full pointer-events-none z-10">
    <path
      v-for="connection in connections"
      :key="`${connection.startId}-${connection.endId}`"
      :d="
        connectionPosition.get(`${connection.startId}-${connection.endId}`)
          ? getPathD(
              connectionPosition.get(
                `${connection.startId}-${connection.endId}`,
              )!.start,
              connectionPosition.get(
                `${connection.startId}-${connection.endId}`,
              )!.end,
            )
          : ''
      "
      fill="none"
      :stroke="connection.color ?? '#2563eb'"
      :stroke-width="connection.strokeWidth ?? 2"
    ></path>
  </svg>
</template>
