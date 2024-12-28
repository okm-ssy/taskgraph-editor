import { createMemoryHistory, createRouter } from 'vue-router'

import EditorPage from '@/pages/EditorPage.vue'
import ViewerPage from '@/pages/ViewerPage.vue'
import TaskgraphEditor from '@/pages/TaskgraphEditor.vue'

const routes = [
  { path: '/',
    component: TaskgraphEditor,
    children: [
      {
        path: '',
        redirect: 'edit'
      },
      { path: 'edit', component: EditorPage },
      { path: 'view', component: ViewerPage },
    ]
  }
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router
