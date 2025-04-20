import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import EditorGrid from './EditorGrid.vue';

const meta: Meta<typeof EditorGrid> = {
  title: 'common/EditorGrid',
  component: EditorGrid,
};

export default meta;
type Story = StoryObj<typeof EditorGrid>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { EditorGrid },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <EditorGrid
    />`,
  }),
};
