import { createPinia } from 'pinia';
import { createApp } from 'vue';

import './style.scss';
import App from './App.vue';
import router from './router';

const pinia = createPinia();

createApp(App).use(pinia).use(router).mount('#app');
