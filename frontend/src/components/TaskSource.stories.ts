import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';

import TaskSource from './TaskSource.vue';

const meta: Meta<typeof TaskSource> = {
  title: 'common/TaskSource',
  component: TaskSource,
};

export default meta;
type Story = StoryObj<typeof TaskSource>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { TaskSource },
    setup() {},
    template: '<TaskSource />',
  }),
};
