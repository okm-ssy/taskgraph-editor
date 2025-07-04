import { nanoid } from 'nanoid';

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
      w: 2,
      h: 2,
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
        relations: [],
        layout: {
          x: 0,
          y: 0,
        },
      },
    };
  }
}
