import { nanoid } from 'nanoid';

import { LAYOUT } from '../constants';

import type { GridTask } from './GridTask';
import type { Task } from './Taskgraph';

export class EditorTask {
  id: string;
  grid: GridTask;
  task: Task;
  depth: number; // タスクの深さ（依存関係の最大深度）

  constructor() {
    this.id = nanoid();
    this.depth = 0; // 初期値は0

    this.grid = {
      i: this.id,
      x: 0,
      y: 0,
      w: LAYOUT.GRID.ITEM_SIZE.WIDTH,
      h: LAYOUT.GRID.ITEM_SIZE.HEIGHT,
    };

    this.task = {
      depends: [],
      description: 'タスクの説明',
      difficulty: 0,
      name: 'new-task',
      notes: [],
      addition: {
        baseDifficulty: 0,
        category: '',
        field: '',
        layout: {
          x: 0,
          y: 0,
        },
      },
    };
  }
}
