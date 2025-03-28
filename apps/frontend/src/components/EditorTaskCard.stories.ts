import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { EditorTask } from '../model/EditorTask';

import EditorTaskCard from './EditorTaskCard.vue';

const meta: Meta<typeof EditorTaskCard> = {
  title: 'common/EditorTaskCard',
  component: EditorTaskCard,
};

export default meta;
type Story = StoryObj<typeof EditorTaskCard>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { EditorTaskCard },
    setup() {
      const editorTask = ref<EditorTask>(new EditorTask());
      editorTask.value.task = {
        depends: ['aaa'],
        description: 'なにかをする',
        difficulty: 4,
        name: 'task',
        notes: ['desc1', 'desc2'],
        issueNumber: 1234,
      };

      return {
        editorTask,
      };
    },
    template: `
    <EditorTaskCard
      v-model="editorTask"
    />`,
  }),
};
