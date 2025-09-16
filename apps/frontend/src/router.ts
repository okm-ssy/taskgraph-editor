import { createWebHistory, createRouter } from 'vue-router';

import TaskgraphFlowEditor from '@/pages/TaskgraphFlowEditor.vue';
import TaskgraphGridEditor from '@/pages/TaskgraphGridEditor.vue';

const routes = [
  {
    path: '/',
    redirect: '/grid',
  },
  {
    path: '/grid',
    component: TaskgraphGridEditor,
  },
  {
    path: '/flow',
    component: TaskgraphFlowEditor,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
