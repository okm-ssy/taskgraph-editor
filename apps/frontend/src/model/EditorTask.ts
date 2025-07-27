import { nanoid } from 'nanoid';

import { LAYOUT } from '../constants';

import type { GridTask } from './GridTask';
import type { Task } from './Taskgraph';

export class EditorTask {
  id: string;
  grid: GridTask;
  task: Task;

  constructor() {
    this.id = nanoid();

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
        field: 'other',
        layout: {
          x: 0,
          y: 0,
        },
      },
    };
  }
}
