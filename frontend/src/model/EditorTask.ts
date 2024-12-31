import type { GridTask } from './GridTask';
import type { Task } from './Taskgraph';

export class EditorTask {
  grid: GridTask = {
    i: '',
    x: 0,
    y: 0,
    w: 2,
    h: 3,
  };
  task: Task = {
    depends: [''],
    description: 'タスクの説明',
    difficulty: 1,
    name: 'new-task',
    notes: [''],
  };
}
