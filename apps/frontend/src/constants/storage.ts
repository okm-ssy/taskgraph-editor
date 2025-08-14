export const STORAGE_KEYS = {
  TASKGRAPH_DATA: 'taskgraph-data',
  TASKGRAPH_DATA_EXPIRY: 'taskgraph-data-expiry',
  READ_ONLY_MODE: 'taskgraph-read-only-mode',
} as const;

export const STORAGE_EXPIRY = {
  TASKGRAPH_DATA_DAYS: 30,
  TASKGRAPH_DATA_MS: 30 * 24 * 60 * 60 * 1000,
} as const;
