import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import TaskConnection from './TaskConnection.vue';

const meta: Meta<typeof TaskConnection> = {
  title: 'common/TaskConnection',
  component: TaskConnection,
};

export default meta;
type Story = StoryObj<typeof TaskConnection>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { TaskConnection },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <TaskConnection
    />`,
  }),
};
