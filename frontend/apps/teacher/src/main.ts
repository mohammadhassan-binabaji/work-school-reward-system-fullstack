import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { setupPwa } from './pwa';
import { api } from '@student-reward/shared';
import './style.css';

api.setBaseUrl('/api/v1');

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount('#app');

setupPwa();
