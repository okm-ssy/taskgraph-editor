import { DIFFICULTY } from '../constants';

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

export const fieldBackgroundClass = (field: string) => {
  switch (field) {
    case 'back':
      return 'bg-blue-100 border-blue-400';
    case 'front':
      return 'bg-green-100 border-green-400';
    case 'infra':
      return 'bg-yellow-100 border-yellow-400';
    case 'other':
      return 'bg-gray-200 border-gray-400';
    case 'parent':
      return 'bg-red-100 border-red-400';
    default:
      return 'bg-gray-200 border-gray-400';
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
