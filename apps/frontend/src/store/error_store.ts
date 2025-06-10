import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface AppError {
  id: string;
  message: string;
  type: 'validation' | 'network' | 'system' | 'user';
  timestamp: number;
  details?: unknown;
}

export const useErrorStore = defineStore('errors', () => {
  const errors = ref<AppError[]>([]);
  
  // エラーの追加
  const addError = (
    message: string,
    type: AppError['type'] = 'system',
    details?: unknown
  ) => {
    const error: AppError = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: Date.now(),
      details,
    };
    
    errors.value.push(error);
    
    // 自動削除（10秒後）
    setTimeout(() => {
      removeError(error.id);
    }, 10000);
    
    return error.id;
  };
  
  // 特定のエラーを削除
  const removeError = (errorId: string) => {
    const index = errors.value.findIndex(error => error.id === errorId);
    if (index !== -1) {
      errors.value.splice(index, 1);
    }
  };
  
  // 全エラーをクリア
  const clearAllErrors = () => {
    errors.value = [];
  };
  
  // 特定のタイプのエラーをクリア
  const clearErrorsByType = (type: AppError['type']) => {
    errors.value = errors.value.filter(error => error.type !== type);
  };
  
  // バリデーションエラー専用のヘルパー
  const addValidationError = (message: string, details?: unknown) => {
    return addError(message, 'validation', details);
  };
  
  // ネットワークエラー専用のヘルパー
  const addNetworkError = (message: string, details?: unknown) => {
    return addError(message, 'network', details);
  };
  
  // ユーザーエラー専用のヘルパー
  const addUserError = (message: string, details?: unknown) => {
    return addError(message, 'user', details);
  };
  
  // システムエラー専用のヘルパー
  const addSystemError = (message: string, details?: unknown) => {
    return addError(message, 'system', details);
  };
  
  // 最新のエラーを取得
  const latestError = computed(() => {
    if (errors.value.length === 0) return null;
    return errors.value[errors.value.length - 1];
  });
  
  // エラーの数
  const errorCount = computed(() => errors.value.length);
  
  // タイプ別エラーカウント
  const errorCountByType = computed(() => {
    const counts = {
      validation: 0,
      network: 0,
      system: 0,
      user: 0,
    };
    
    errors.value.forEach(error => {
      counts[error.type]++;
    });
    
    return counts;
  });
  
  // エラーが存在するかどうか
  const hasErrors = computed(() => errors.value.length > 0);
  
  // 重大なエラー（validation以外）があるかどうか
  const hasCriticalErrors = computed(() => {
    return errors.value.some(error => error.type !== 'user');
  });
  
  return {
    // State
    errors,
    
    // Getters
    latestError,
    errorCount,
    errorCountByType,
    hasErrors,
    hasCriticalErrors,
    
    // Actions
    addError,
    removeError,
    clearAllErrors,
    clearErrorsByType,
    addValidationError,
    addNetworkError,
    addUserError,
    addSystemError,
  };
});