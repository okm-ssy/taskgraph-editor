import '@/style.scss';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import JsonInput from './JsonInput.vue';

const meta: Meta<typeof JsonInput> = {
  title: 'common/JsonInput',
  component: JsonInput,
};

export default meta;
type Story = StoryObj<typeof JsonInput>;

export const basic: Story = {
  name: 'basic',
  render: () => ({
    components: { JsonInput },
    setup() {
      const v = ref(0);

      return {
        v,
      };
    },
    template: `
    <JsonInput
    />`,
  }),
};
