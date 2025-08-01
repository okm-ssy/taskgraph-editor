import { DIFFICULTY, TASK_STATUS } from '../constants';

import type { TaskStatus } from '@/constants';
import { Field } from '@/model/Taskgraph';

export const difficultyColorClass = (difficulty: number) => {
  if (difficulty < DIFFICULTY.COLOR_THRESHOLDS[0]) return 'text-gray-400';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[1]) return 'text-blue-500';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[2]) return 'text-green-500';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[3]) return 'text-yellow-500';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[4]) return 'text-red-500';
  return 'text-gray-800';
};

export const difficultyBackgroundClass = (difficulty: number) => {
  if (difficulty < DIFFICULTY.BACKGROUND_THRESHOLDS[0])
    return 'bg-gray-200 border-gray-400';
  if (difficulty <= DIFFICULTY.BACKGROUND_THRESHOLDS[1])
    return 'bg-blue-100 border-blue-400';
  if (difficulty <= DIFFICULTY.BACKGROUND_THRESHOLDS[2])
    return 'bg-emerald-100 border-emerald-500';
  if (difficulty <= DIFFICULTY.BACKGROUND_THRESHOLDS[3])
    return 'bg-yellow-100 border-yellow-500';
  if (difficulty <= DIFFICULTY.BACKGROUND_THRESHOLDS[4])
    return 'bg-orange-100 border-orange-500';
  if (difficulty <= DIFFICULTY.BACKGROUND_THRESHOLDS[5])
    return 'bg-red-100 border-red-500';
  return 'bg-purple-100 border-purple-500';
};

export const fieldBackgroundClass = (field: string, status?: TaskStatus) => {
  const getColorVariant = (
    baseColor: string,
    borderColor: string,
    baseLevel = '100',
  ) => {
    if (!status)
      return `bg-${baseColor}-${baseLevel} border-${borderColor}-400`;

    switch (status) {
      case TASK_STATUS.DOING:
        return baseLevel === '200'
          ? `bg-${baseColor}-400 border-${borderColor}-600` // gray-200の場合は400に
          : `bg-${baseColor}-300 border-${borderColor}-600`; // より濃い
      case TASK_STATUS.DONE:
        return `bg-gray-100 border-${borderColor}-300`; // 完了は薄い灰色背景
      default:
        return `bg-${baseColor}-${baseLevel} border-${borderColor}-400`; // 未着手（標準）
    }
  };

  switch (field) {
    case 'back':
      return getColorVariant('blue', 'blue');
    case 'front':
      return getColorVariant('green', 'green');
    case 'infra':
      return getColorVariant('yellow', 'yellow');
    case 'other':
      return getColorVariant('gray', 'gray', '200');
    case 'parent':
      return getColorVariant('red', 'red');
    default:
      return getColorVariant('gray', 'gray', '200');
  }
};

export const stringToField = (field: string): Field => {
  switch (field) {
    case 'front':
      return 'front';
    case 'back':
      return 'back';
    case 'infra':
      return 'infra';
    case 'other':
      return 'other';
    case 'parent':
      return 'parent';
    default:
      return '';
  }
};
