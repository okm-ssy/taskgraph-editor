import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import TaskgraphViewer from './TaskgraphViewer.vue';

const meta: Meta<typeof TaskgraphViewer> = {
  title: 'common/TaskgraphViewer',
  component: TaskgraphViewer,
};

export default meta;
type Story = StoryObj<typeof TaskgraphViewer>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { TaskgraphViewer },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <TaskgraphViewer
    />`,
  }),
};
