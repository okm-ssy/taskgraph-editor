import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import TaskDetailDialog from './TaskDetailDialog.vue';

const meta: Meta<typeof TaskDetailDialog> = {
  title: 'common/TaskDetailDialog',
  component: TaskDetailDialog,
};

export default meta;
type Story = StoryObj<typeof TaskDetailDialog>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { TaskDetailDialog },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <TaskDetailDialog
    />`,
  }),
};
