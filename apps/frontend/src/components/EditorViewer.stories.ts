import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import EditorViewer from './EditorViewer.vue';

const meta: Meta<typeof EditorViewer> = {
  title: 'common/EditorViewer',
  component: EditorViewer,
};

export default meta;
type Story = StoryObj<typeof EditorViewer>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { EditorViewer },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <EditorViewer
    />`,
  }),
};
