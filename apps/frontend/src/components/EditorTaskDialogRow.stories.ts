import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import EditorTaskDialogRow from './EditorTaskDialogRow.vue';

const meta: Meta<typeof EditorTaskDialogRow> = {
  title: 'common/EditorTaskDialogRow',
  component: EditorTaskDialogRow,
};

export default meta;
type Story = StoryObj<typeof EditorTaskDialogRow>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { EditorTaskDialogRow },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <EditorTaskDialogRow
    />`,
  }),
};
