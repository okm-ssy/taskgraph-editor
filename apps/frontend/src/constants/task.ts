export const TASK_STATUS = {
  UNTOUCH: 'untouch',
  DOING: 'doing',
  DONE: 'done',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TASK_STATUS.UNTOUCH]: '未着手',
  [TASK_STATUS.DOING]: '作業中',
  [TASK_STATUS.DONE]: '完了',
} as const;
