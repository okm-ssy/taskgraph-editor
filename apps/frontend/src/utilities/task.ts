import { DIFFICULTY, TASK_STATUS } from '../constants';

import type { TaskStatus } from '@/constants';
import { Field } from '@/model/Taskgraph';

export const difficultyColorClass = (difficulty: number) => {
  if (difficulty < DIFFICULTY.COLOR_THRESHOLDS[0]) return 'text-gray-400';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[1]) return 'text-blue-500';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[2]) return 'text-green-500';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[3]) return 'text-yellow-500';
  if (difficulty <= DIFFICULTY.COLOR_THRESHOLDS[4]) return 'text-red-500';
  return 'text-purple-800';
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

// フィールドカラー定義
const FIELD_COLORS: Record<
  string,
  { baseColor: string; borderColor: string; baseLevel?: string }
> = {
  back: { baseColor: 'blue', borderColor: 'blue' },
  front: { baseColor: 'green', borderColor: 'green' },
  infra: { baseColor: 'yellow', borderColor: 'yellow' },
  other: { baseColor: 'gray', borderColor: 'gray', baseLevel: '200' },
  parent: { baseColor: 'red', borderColor: 'red' },
};

export const fieldBackgroundClass = (field: string, status?: TaskStatus) => {
  const colorConfig = FIELD_COLORS[field] || FIELD_COLORS.other;
  const { baseColor, borderColor, baseLevel = '100' } = colorConfig;

  if (!status) {
    return `bg-${baseColor}-${baseLevel} border-${borderColor}-400`;
  }

  switch (status) {
    case TASK_STATUS.DOING:
      return baseLevel === '200'
        ? `bg-${baseColor}-400 border-black`
        : `bg-${baseColor}-300 border-black`;
    case TASK_STATUS.DONE:
      return `bg-gray-100 border-${borderColor}-300`;
    default:
      return `bg-${baseColor}-${baseLevel} border-${borderColor}-400`;
  }
};

const VALID_FIELDS = new Set<Field>([
  'front',
  'back',
  'infra',
  'other',
  'parent',
]);

export const stringToField = (field: string): Field => {
  return VALID_FIELDS.has(field as Field) ? (field as Field) : '';
};
