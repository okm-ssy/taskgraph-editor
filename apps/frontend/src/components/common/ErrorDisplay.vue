<template>
  <div
    v-if="errorStore.hasErrors"
    class="fixed top-4 right-4 z-50 max-w-md space-y-2"
  >
    <div
      v-for="error in errorStore.errors"
      :key="error.id"
      class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
      :class="getErrorClassByType(error.type)"
    >
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="flex items-center">
            <div
              class="text-sm font-medium"
              :class="getTextColorByType(error.type)"
            >
              {{ getErrorTypeLabel(error.type) }}
            </div>
            <div class="ml-2 text-xs text-gray-500">
              {{ formatTimestamp(error.timestamp) }}
            </div>
          </div>
          <div class="mt-1 text-sm" :class="getTextColorByType(error.type)">
            {{ error.message }}
          </div>
        </div>
        <button
          @click="errorStore.removeError(error.id)"
          class="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppError } from '../../store/error_store';
import { useErrorStore } from '../../store/error_store';

const errorStore = useErrorStore();

const getErrorClassByType = (type: AppError['type']) => {
  switch (type) {
    case 'validation':
      return 'bg-yellow-50 border-yellow-200';
    case 'network':
      return 'bg-blue-50 border-blue-200';
    case 'system':
      return 'bg-red-50 border-red-200';
    case 'user':
      return 'bg-orange-50 border-orange-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getTextColorByType = (type: AppError['type']) => {
  switch (type) {
    case 'validation':
      return 'text-yellow-800';
    case 'network':
      return 'text-blue-800';
    case 'system':
      return 'text-red-800';
    case 'user':
      return 'text-orange-800';
    default:
      return 'text-gray-800';
  }
};

const getErrorTypeLabel = (type: AppError['type']) => {
  switch (type) {
    case 'validation':
      return '⚠️ バリデーションエラー';
    case 'network':
      return '🌐 ネットワークエラー';
    case 'system':
      return '🚨 システムエラー';
    case 'user':
      return '👤 ユーザーエラー';
    default:
      return '❓ 不明なエラー';
  }
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
</script>

<style scoped></style>
