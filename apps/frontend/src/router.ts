import { createWebHistory, createRouter } from 'vue-router';

import TaskgraphEditor from '@/pages/TaskgraphEditor.vue';

const routes = [
  {
    path: '/',
    component: TaskgraphEditor,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
