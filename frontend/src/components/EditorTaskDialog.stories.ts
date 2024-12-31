import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { EditorTask } from '../model/EditorTask';

import EditorTaskDialog from './EditorTaskDialog.vue';

const meta: Meta<typeof EditorTaskDialog> = {
  title: 'common/EditorTaskDialog',
  component: EditorTaskDialog,
};

export default meta;
type Story = StoryObj<typeof EditorTaskDialog>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { EditorTaskDialog },
    setup() {
      const editorTask = ref<EditorTask>(new EditorTask());
      editorTask.value.task = {
        depends: ['aaa'],
        description: 'なにかをする',
        difficulty: 1,
        name: 'task',
        notes: ['desc1', 'desc2'],
        issueNumber: 1234,
      };

      return {
        editorTask,
      };
    },
    template: `
    <EditorTaskDialog
      v-model="editorTask.task"
    />`,
  }),
};
