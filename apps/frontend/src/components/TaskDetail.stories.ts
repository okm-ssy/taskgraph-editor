import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import TaskDetail from './TaskDetail.vue';

const meta: Meta<typeof TaskDetail> = {
  title: 'common/TaskDetail',
  component: TaskDetail,
};

export default meta;
type Story = StoryObj<typeof TaskDetail>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { TaskDetail },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <TaskDetail
    />`,
  }),
};
