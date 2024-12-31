import type { GridTask } from './GridTask';
import type { Task } from './Taskgraph';

export class EditorTask {
  grid: GridTask = {
    i: '',
    x: 0,
    y: 0,
    w: 1,
    h: 1,
  };
  task: Task = {
    depends: [''],
    description: '',
    difficulty: 1,
    name: '',
    notes: [''],
  };
}
