import { createWebHistory, createRouter } from 'vue-router';

import TaskgraphEditor from '@/pages/TaskgraphEditor.vue';

const routes = [
  {
    path: '/',
    redirect: '/view',
  },
  {
    path: '/edit',
    component: TaskgraphEditor,
    props: { initialPage: 'editor' },
  },
  {
    path: '/view',
    component: TaskgraphEditor,
    props: { initialPage: 'viewer' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
