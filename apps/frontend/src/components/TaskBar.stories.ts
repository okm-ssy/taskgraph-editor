import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';

import TaskBar from './TaskBar.vue';

const meta: Meta<typeof TaskBar> = {
  title: 'common/TaskBar',
  component: TaskBar,
};

export default meta;
type Story = StoryObj<typeof TaskBar>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { TaskBar },
    setup() {},
    template: '<TaskBar />',
  }),
};
